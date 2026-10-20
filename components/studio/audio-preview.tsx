import { useEffect, useRef } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { TimelineItem } from "@/features/editor/model";

type Props = {
  item: TimelineItem;
  playhead: number;
  isPlaying: boolean;
  muted: boolean;
  duckGain: number;
  duckUnderVoice: boolean;
  voiceIsActive: boolean;
  playbackRate: number;
  onDurationChange?: (itemId: string, duration: number) => void;
};

/** A silent React component that schedules one audio stem against the editor playhead. */
export function SynchronizedAudioTrack({ item, playhead, isPlaying, muted, duckGain, duckUnderVoice, voiceIsActive, playbackRate, onDurationChange }: Props) {
  const player = useAudioPlayer(item.uri ?? null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const lastReportedDuration = useRef(0);
  const start = item.start;
  const end = item.start + item.duration;
  const sourceTime = item.inPoint + Math.max(0, playhead - start);
  const active = Boolean(item.uri) && playhead >= start && playhead < end;
  const gain = muted ? 0 : (item.audioGain ?? 0.85) * (duckUnderVoice && item.audioRole === "music" && voiceIsActive ? duckGain : 1);
  const fadeIn = item.fadeInDuration ?? 0;
  const fadeOut = item.fadeOutDuration ?? 0;
  const fadeFactor = Math.min(
    fadeIn > 0 ? Math.min(1, (playhead - start) / fadeIn) : 1,
    fadeOut > 0 ? Math.min(1, (end - playhead) / fadeOut) : 1,
  );

  useEffect(() => {
    const duration = status.duration;
    if (!item.uri || !status.isLoaded || !Number.isFinite(duration) || duration <= 0.25 || Math.abs(duration - item.duration) < 0.25 || Math.abs(duration - lastReportedDuration.current) < 0.25) return;
    lastReportedDuration.current = duration;
    const timer = setTimeout(() => onDurationChange?.(item.id, duration), 0);
    return () => clearTimeout(timer);
  }, [item.duration, item.id, item.uri, onDurationChange, status.duration, status.isLoaded]);

  useEffect(() => {
    if (!item.uri || !active || !isPlaying || !status.isLoaded) {
      if (player.playing) player.pause();
      return;
    }
    const drift = Math.abs(player.currentTime - sourceTime);
    if (drift > 0.55) void player.seekTo(sourceTime).catch(() => undefined);
    // Expo Audio exposes volume as a mutable property on its external native player handle.
    // eslint-disable-next-line react-hooks/immutability
    player.volume = Math.max(0, Math.min(1, gain * fadeFactor));
    player.setPlaybackRate(Math.max(0.1, Math.min(2, playbackRate)), "high");
    if (!player.playing) player.play();
  }, [active, fadeFactor, gain, isPlaying, item.uri, playbackRate, player, sourceTime, status.isLoaded]);

  return null;
}
