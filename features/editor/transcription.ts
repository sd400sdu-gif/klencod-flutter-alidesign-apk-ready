import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { getApiBaseUrl } from "@/constants/oauth";

export const MAX_TRANSCRIPTION_BYTES = 16 * 1024 * 1024;

export type TimedTranscriptionSegment = { start: number; end: number; text: string };

type TranscriptionPayload = {
  segments?: Array<{ start?: unknown; end?: unknown; text?: unknown }>;
  error?: string | { message?: string };
  message?: string;
};

const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  webm: "audio/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
};

export function getSupportedAudioMimeType(fileName: string, declaredType?: string | null): string {
  const extension = fileName.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  const byExtension = AUDIO_MIME_BY_EXTENSION[extension];
  if (!byExtension) throw new Error("يدعم التفريغ ملفات WEBM وMP3 وWAV وOGG وM4A فقط.");
  const normalized = declaredType?.split(";")[0]?.trim().toLowerCase();
  if (normalized && normalized.startsWith("audio/") && normalized !== "audio/mp4" && normalized !== byExtension) {
    throw new Error("نوع الملف الصوتي لا يطابق امتداده؛ أعد اختيار الملف بصيغته الأصلية.");
  }
  return byExtension;
}

function errorMessage(payload: TranscriptionPayload | null, status: number): string {
  if (typeof payload?.error === "string") return payload.error;
  if (payload?.error && typeof payload.error === "object" && typeof payload.error.message === "string") return payload.error.message;
  if (typeof payload?.message === "string") return payload.message;
  if (status === 503) return "خدمة تحويل الكلام إلى نص غير مهيأة في الخادم حالياً.";
  if (status === 413) return "حجم الملف يتجاوز الحد الأقصى وهو 16 ميغابايت.";
  if (status === 415) return "صيغة الملف الصوتي غير مدعومة.";
  if (status === 429) return "أُجريت طلبات تفريغ كثيرة؛ انتظر قليلاً ثم حاول مجدداً.";
  return `تعذّر تفريغ الصوت (HTTP ${status}).`;
}

function parsePayload(raw: string): TranscriptionPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" ? parsed as TranscriptionPayload : null;
  } catch {
    return null;
  }
}

/** Uploads an explicitly chosen audio file; it never sends a remote URL to the transcription server. */
export async function transcribeAudioUri(uri: string, fileName: string, declaredType?: string | null): Promise<TimedTranscriptionSegment[]> {
  const mimeType = getSupportedAudioMimeType(fileName, declaredType);
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error("عنوان خدمة المشروع غير متاح على هذا الجهاز؛ لا يمكن بدء التفريغ.");
  const endpoint = `${baseUrl}/api/voice/transcribe`;

  let status: number;
  let rawBody: string;
  if (Platform.OS === "web") {
    const source = await fetch(uri);
    if (!source.ok) throw new Error("تعذّر قراءة ملف الصوت المختار من المتصفح.");
    const blob = await source.blob();
    if (blob.size <= 0) throw new Error("ملف الصوت فارغ.");
    if (blob.size > MAX_TRANSCRIPTION_BYTES) throw new Error("حجم الملف يتجاوز الحد الأقصى وهو 16 ميغابايت.");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
    });
    status = response.status;
    rawBody = await response.text();
  } else {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory) throw new Error("ملف الصوت غير موجود في مساحة التطبيق.");
    if (typeof info.size === "number" && info.size <= 0) throw new Error("ملف الصوت فارغ.");
    if (typeof info.size === "number" && info.size > MAX_TRANSCRIPTION_BYTES) throw new Error("حجم الملف يتجاوز الحد الأقصى وهو 16 ميغابايت.");
    const response = await FileSystem.uploadAsync(endpoint, uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      mimeType,
      headers: { "Content-Type": mimeType },
    });
    status = response.status;
    rawBody = response.body;
  }

  const payload = parsePayload(rawBody);
  if (status < 200 || status >= 300) throw new Error(errorMessage(payload, status));
  const segments = payload?.segments;
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("لم تُرجع خدمة التعرف جملاً ذات توقيت؛ لم تُنشأ ترجمة تلقائية.");
  }

  const timed = segments.flatMap((segment) => {
    const start = segment.start;
    const end = segment.end;
    const text = segment.text;
    if (typeof start !== "number" || !Number.isFinite(start) || start < 0 || typeof end !== "number" || !Number.isFinite(end) || end <= start || typeof text !== "string" || !text.trim()) return [];
    return [{ start, end, text: text.trim() }];
  }).sort((a, b) => a.start - b.start);
  if (timed.length === 0) throw new Error("لم تتضمن استجابة خدمة التعرف أي جملة صالحة ذات توقيت.");
  return timed;
}
