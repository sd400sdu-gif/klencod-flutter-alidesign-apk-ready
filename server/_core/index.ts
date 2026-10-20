import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createCorsMiddleware } from "./cors";
import { clearLegacySessionCookie } from "./cookies";
import {
  isSupportedAudioMimeType,
  MAX_AUDIO_BYTES,
  normalizeAudioMimeType,
  transcribeAudio,
} from "./voiceTranscription";

const TRANSCRIPTION_RATE_WINDOW_MS = 60_000;
const TRANSCRIPTION_RATE_LIMIT = 10;
const transcriptionRateLimits = new Map<string, { count: number; resetAt: number }>();

function transcriptionRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  for (const [ip, entry] of transcriptionRateLimits) {
    if (entry.resetAt <= now) {
      transcriptionRateLimits.delete(ip);
    }
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const current = transcriptionRateLimits.get(ip);
  if (!current || current.resetAt <= now) {
    transcriptionRateLimits.set(ip, { count: 1, resetAt: now + TRANSCRIPTION_RATE_WINDOW_MS });
    next();
    return;
  }

  if (current.count >= TRANSCRIPTION_RATE_LIMIT) {
    res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
    res.status(429).json({ error: "Too many transcription requests" });
    return;
  }

  current.count += 1;
  next();
}

function transcriptionContentType(req: express.Request, res: express.Response, next: express.NextFunction) {
  const contentType = req.header("content-type") || "";
  if (!isSupportedAudioMimeType(contentType)) {
    res.status(415).json({ error: "Unsupported audio MIME type" });
    return;
  }
  next();
}

function parseTranscriptionBody(req: express.Request, res: express.Response, next: express.NextFunction) {
  express.raw({
    type: () => true,
    limit: MAX_AUDIO_BYTES,
    inflate: false,
  })(req, res, (error?: unknown) => {
    if (!error) {
      next();
      return;
    }

    const parserError = error as { status?: unknown; type?: unknown };
    if (parserError.type === "entity.too.large" || parserError.status === 413) {
      res.status(413).json({ error: "Audio file exceeds maximum size limit" });
      return;
    }
    if (parserError.type === "encoding.unsupported") {
      res.status(415).json({ error: "Unsupported content encoding" });
      return;
    }
    res.status(400).json({ error: "Invalid audio payload" });
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(createCorsMiddleware());
  app.use(clearLegacySessionCookie());

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.post(
    "/api/voice/transcribe",
    transcriptionRateLimit,
    transcriptionContentType,
    parseTranscriptionBody,
    async (req, res) => {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ error: "Audio payload is empty" });
        return;
      }

      const language = typeof req.query.language === "string" ? req.query.language : undefined;
      const prompt = typeof req.query.prompt === "string" ? req.query.prompt : undefined;
      const result = await transcribeAudio({
        audio: req.body,
        mimeType: normalizeAudioMimeType(req.header("content-type") || ""),
        language,
        prompt,
      });

      if ("error" in result) {
        if (result.code === "FILE_TOO_LARGE") {
          res.status(413).json({ error: result.error });
          return;
        }
        if (result.code === "INVALID_FORMAT") {
          res.status(400).json({ error: result.error });
          return;
        }
        if (result.code === "SERVICE_ERROR" || result.details) {
          res.status(503).json({ error: "Voice transcription service is unavailable" });
          return;
        }
        res.status(502).json({ error: result.error });
        return;
      }

      res.json(result);
    },
  );

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log("[api] server listening");
  });
}

startServer().catch(() => {
  console.error("[api] server failed to start");
});
