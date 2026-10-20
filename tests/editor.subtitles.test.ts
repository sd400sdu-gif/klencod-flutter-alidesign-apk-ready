import { describe, expect, it } from "vitest";
import {
  formatSrt,
  parseSrt,
  type SubtitleCue,
} from "../features/editor/subtitles";

describe("SubRip subtitle cues", () => {
  it("parses UTF-8 Arabic, CRLF input, multiline text, and exact milliseconds", () => {
    const source =
      "1\r\n00:00:00,001 --> 00:00:01,237\r\nمرحباً\r\nبكم\r\n\r\n2\r\n00:01:02,003 --> 00:01:03,004\r\nالنهاية\r\n";

    expect(parseSrt(source)).toEqual([
      { id: "1", start: 1, end: 1237, text: "مرحباً\nبكم" },
      { id: "2", start: 62003, end: 63004, text: "النهاية" },
    ]);
  });

  it("formats cues in their supplied order with stable three-digit millisecond precision", () => {
    const cues: SubtitleCue[] = [
      { id: "7", start: 3723004, end: 3724120, text: "first\nsecond" },
      { id: "3", start: 7, end: 1008, text: "مقطع" },
    ];

    expect(formatSrt(cues)).toBe(
      "7\n01:02:03,004 --> 01:02:04,120\nfirst\nsecond\n\n3\n00:00:00,007 --> 00:00:01,008\nمقطع",
    );
    expect(parseSrt(formatSrt(cues))).toEqual(cues);
  });

  it("rejects malformed, negative, empty, and non-positive cues with descriptive errors", () => {
    expect(() => parseSrt("1\n00:00:00,00 --> 00:00:01,000\ntext")).toThrow(
      /malformed timestamp/i,
    );
    expect(() => parseSrt("1\n-00:00:01,000 --> 00:00:02,000\ntext")).toThrow(
      /negative/i,
    );
    expect(() => parseSrt("1\n00:00:02,000 --> 00:00:02,000\ntext")).toThrow(
      /greater than start/i,
    );
    expect(() => parseSrt("1\n00:00:00,000 --> 00:00:01,000\n   ")).toThrow(
      /text.*empty/i,
    );
    expect(() =>
      formatSrt([{ id: "1", start: -1, end: 1, text: "text" }]),
    ).toThrow(/negative/i);
    expect(() =>
      formatSrt([{ id: "1", start: 1000, end: 1000, text: "text" }]),
    ).toThrow(/greater than start/i);
  });
});
