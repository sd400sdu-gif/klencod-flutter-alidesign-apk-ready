import { ENV } from "./env";

export const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

export const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/m4a",
  "audio/mp4",
]);

export type TranscribeOptions = {
  audio: Buffer;
  mimeType: string;
  language?: string;
  prompt?: string;
};

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "SERVICE_ERROR";
  details?: string;
};

export function normalizeAudioMimeType(contentType: string): string {
  return contentType.split(";", 1)[0].trim().toLowerCase();
}

export function isSupportedAudioMimeType(contentType: string): boolean {
  return SUPPORTED_AUDIO_MIME_TYPES.has(normalizeAudioMimeType(contentType));
}

/**
 * Send already-received audio bytes to the platform's OpenAI-compatible
 * speech-to-text endpoint. This function deliberately accepts no URL input.
 */
export async function transcribeAudio(
  options: TranscribeOptions,
): Promise<TranscriptionResponse | TranscriptionError> {
  const mimeType = normalizeAudioMimeType(options.mimeType);

  if (!isSupportedAudioMimeType(mimeType)) {
    return {
      error: "Unsupported audio format",
      code: "INVALID_FORMAT",
    };
  }

  if (options.audio.length === 0) {
    return {
      error: "Audio payload is empty",
      code: "INVALID_FORMAT",
    };
  }

  if (options.audio.length > MAX_AUDIO_BYTES) {
    return {
      error: "Audio file exceeds maximum size limit",
      code: "FILE_TOO_LARGE",
    };
  }

  if (!ENV.manusApiUrl || !ENV.manusApiKey) {
    return {
      error: "Voice transcription service is unavailable",
      code: "SERVICE_ERROR",
    };
  }

  const formData = new FormData();
  const audioBlob = new Blob([new Uint8Array(options.audio)], { type: mimeType });
  formData.append("file", audioBlob, `audio.${getFileExtension(mimeType)}`);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  if (options.language) {
    formData.append("language", options.language);
  }
  if (options.prompt) {
    formData.append("prompt", options.prompt);
  }

  const endpoint = getTranscriptionEndpoint(ENV.manusApiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${ENV.manusApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.body) {
        await response.body.cancel().catch(() => undefined);
      }
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: response.status >= 500 ? "The transcription service is unavailable" : undefined,
      };
    }

    const payload: unknown = await response.json();
    if (!isWhisperResponse(payload)) {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
      };
    }

    return payload;
  } catch {
    return {
      error: "Voice transcription service is unavailable",
      code: "SERVICE_ERROR",
    };
  }
}

function getTranscriptionEndpoint(apiUrl: string): string {
  const baseUrl = apiUrl.replace(/\/+$/, "");
  return `${baseUrl}${baseUrl.endsWith("/v1") ? "" : "/v1"}/audio/transcriptions`;
}

function isWhisperResponse(value: unknown): value is WhisperResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<WhisperResponse>;
  return (
    response.task === "transcribe" &&
    typeof response.language === "string" &&
    typeof response.duration === "number" &&
    typeof response.text === "string" &&
    Array.isArray(response.segments)
  );
}

function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case "audio/webm":
      return "webm";
    case "audio/mp3":
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
    case "audio/wave":
    case "audio/x-wav":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "audio/m4a":
    case "audio/mp4":
      return "m4a";
    default:
      return "audio";
  }
}
