export type SubtitleCue = {
  id: string;
  start: number;
  end: number;
  text: string;
};

const TIMESTAMP_PATTERN =
  /^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;
const MAX_SRT_HOURS = 99;
const NEGATIVE_TIMESTAMP_PATTERN = /-(?=\d{2}:)/;

function cueError(index: number, message: string): Error {
  return new Error(`SRT cue ${index}: ${message}`);
}

function parseTimestamp(
  value: string,
  cueIndex: number,
  label: "start" | "end",
): number {
  if (NEGATIVE_TIMESTAMP_PATTERN.test(value)) {
    throw cueError(cueIndex, `${label} timestamp cannot be negative`);
  }

  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) {
    throw cueError(
      cueIndex,
      `malformed ${label} timestamp "${value}"; expected HH:MM:SS,mmm`,
    );
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);
  if (hours > MAX_SRT_HOURS || minutes > 59 || seconds > 59) {
    throw cueError(
      cueIndex,
      `malformed ${label} timestamp "${value}"; time fields are out of range`,
    );
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}

function parseTimestampLine(
  value: string,
  cueIndex: number,
): { start: number; end: number } {
  const match = value.match(TIMESTAMP_PATTERN);
  if (!match) {
    if (NEGATIVE_TIMESTAMP_PATTERN.test(value)) {
      throw cueError(cueIndex, "timestamp cannot be negative");
    }
    throw cueError(
      cueIndex,
      `malformed timestamp line "${value}"; expected HH:MM:SS,mmm --> HH:MM:SS,mmm`,
    );
  }

  const start = parseTimestamp(
    `${match[1]}:${match[2]}:${match[3]},${match[4]}`,
    cueIndex,
    "start",
  );
  const end = parseTimestamp(
    `${match[5]}:${match[6]}:${match[7]},${match[8]}`,
    cueIndex,
    "end",
  );
  if (end <= start) {
    throw cueError(
      cueIndex,
      `end timestamp (${end} ms) must be greater than start timestamp (${start} ms)`,
    );
  }
  return { start, end };
}

/** Parse UTF-8 SubRip text into cues, retaining cue order and exact millisecond values. */
export function parseSrt(input: string): SubtitleCue[] {
  if (typeof input !== "string") {
    throw new TypeError("SRT input must be a string");
  }

  const normalized = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const cues: SubtitleCue[] = [];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    while (lineIndex < lines.length && lines[lineIndex].trim() === "") {
      lineIndex += 1;
    }
    if (lineIndex >= lines.length) {
      break;
    }

    const block: string[] = [];
    while (lineIndex < lines.length && lines[lineIndex].trim() !== "") {
      block.push(lines[lineIndex]);
      lineIndex += 1;
    }

    const cueIndex = cues.length + 1;
    if (block.length < 2) {
      throw cueError(
        cueIndex,
        "malformed cue; expected an identifier and timestamp line",
      );
    }

    const id = block[0].trim();
    if (!/^\d+$/.test(id)) {
      throw cueError(
        cueIndex,
        `malformed identifier "${block[0]}"; expected a numeric cue number`,
      );
    }

    const { start, end } = parseTimestampLine(block[1].trim(), cueIndex);
    const text = block.slice(2).join("\n");
    if (text.trim() === "") {
      throw cueError(cueIndex, "cue text must not be empty");
    }

    cues.push({ id, start, end, text });
  }

  return cues;
}

function formatTimestamp(
  milliseconds: number,
  cueIndex: number,
  label: "start" | "end",
): string {
  if (
    typeof milliseconds !== "number" ||
    !Number.isFinite(milliseconds) ||
    !Number.isInteger(milliseconds)
  ) {
    throw cueError(
      cueIndex,
      `${label} must be a finite whole number of milliseconds`,
    );
  }
  if (milliseconds < 0) {
    throw cueError(cueIndex, `${label} timestamp cannot be negative`);
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > MAX_SRT_HOURS) {
    throw cueError(
      cueIndex,
      `${label} timestamp exceeds the HH:MM:SS,mmm range`,
    );
  }
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const remainder = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(remainder).padStart(3, "0")}`;
}

/** Format cues as valid LF-delimited SubRip text without changing their order or precision. */
export function formatSrt(cues: readonly SubtitleCue[]): string {
  if (!Array.isArray(cues)) {
    throw new TypeError("SRT cues must be an array");
  }

  return cues
    .map((cue, offset) => {
      const cueIndex = offset + 1;
      if (cue === null || typeof cue !== "object") {
        throw cueError(cueIndex, "cue must be an object");
      }

      const id = cue.id;
      if (typeof id !== "string" || !/^\d+$/.test(id)) {
        throw cueError(
          cueIndex,
          "identifier must be a non-empty numeric string",
        );
      }

      const start = formatTimestamp(cue.start, cueIndex, "start");
      const end = formatTimestamp(cue.end, cueIndex, "end");
      if (cue.end <= cue.start) {
        throw cueError(
          cueIndex,
          `end timestamp (${cue.end} ms) must be greater than start timestamp (${cue.start} ms)`,
        );
      }

      if (typeof cue.text !== "string" || cue.text.trim() === "") {
        throw cueError(cueIndex, "cue text must not be empty");
      }
      const text = cue.text.replace(/\r\n?/g, "\n");
      if (text.split("\n").some((line: string) => line.trim() === "")) {
        throw cueError(cueIndex, "cue text must not contain empty lines");
      }

      return `${id}\n${start} --> ${end}\n${text}`;
    })
    .join("\n\n");
}

export const parseSubRip = parseSrt;
export const formatSubRip = formatSrt;
export const parseSRT = parseSrt;
export const formatSRT = formatSrt;
