import { useEffect, useRef, useState } from "react";
import { useEventListener } from "expo";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import { SynchronizedAudioTrack } from "@/components/studio/audio-preview";
import { CaptionModal, formatTime, TimelinePanel, ToolDock, type EditorToolKey } from "@/components/studio/video-editor";
import { AdvancedEditorSheet, PreviewTreatment, treatmentMotion, type AdvancedTab, type PreviewTreatmentValue } from "@/components/studio/advanced-editor";
import { palette } from "@/constants/studio";
import { StudioButton, TextBlock } from "@/components/studio/primitives";
import { createDefaultDocument, normalizeEditorDocument } from "@/features/editor/defaults";
import { EFFECT_PRESETS, TRANSITION_PRESETS } from "@/features/editor/catalog";
import { DEFAULT_COLOR_GRADE, DEFAULT_TRANSFORM, makeId, type CanvasRatio, type EditorDocument, type TimelineItem } from "@/features/editor/model";
import { interpolateKeyframes, speedAt } from "@/features/editor/interpolation";
import { getTimelineEnd, makeDefaultTracks, replaceTrackItems } from "@/features/editor/timeline";
import { loadEditorProject, persistMediaUri, saveEditorProject } from "@/features/editor/storage";

const SPEEDS = [1, 0.75, 1.25, 1.5];
const FILTERS = [
  { label: "أصلي", color: "transparent" },
  { label: "دافئ", color: "rgba(245, 158, 11, 0.14)" },
  { label: "سينمائي", color: "rgba(6, 182, 212, 0.13)" },
  { label: "ناعم", color: "rgba(99, 102, 241, 0.14)" },
];
const RATIOS = [
  { label: "9:16", value: 9 / 16 },
  { label: "16:9", value: 16 / 9 },
  { label: "1:1", value: 1 },
];
type Toast = { text: string; tone: "info" | "warning" | "success" };
type MediaKind = "video" | "image";

export default function VideoEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string; projectName?: string }>();
  const projectId = typeof params.projectId === "string" ? params.projectId : "quick-edit";
  const projectName = typeof params.projectName === "string" ? params.projectName : "مشروع لمعة";
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [assetKind, setAssetKind] = useState<MediaKind>("video");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [ratioIndex, setRatioIndex] = useState(0);
  const [filterIndex, setFilterIndex] = useState(0);
  const [document, setDocument] = useState<EditorDocument>(() => createDefaultDocument());
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [projectLoadError, setProjectLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error">("saved");
  const [compareOriginal, setCompareOriginal] = useState(false);
  const [activeTool, setActiveTool] = useState<EditorToolKey | null>(null);
  const [advancedTab, setAdvancedTab] = useState<AdvancedTab | null>(null);
  const [previewTreatment, setPreviewTreatment] = useState<PreviewTreatmentValue | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [captionModalOpen, setCaptionModalOpen] = useState(false);
  const player = useVideoPlayer(assetKind === "video" ? asset?.uri ?? null : null, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.2;
  });
  const playerRef = useRef(player);

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { playerRef.current.muted = muted; }, [muted]);
  const livePlaybackRate = speedAt(document.speedPoints, currentTime, speed);
  const timelineDuration = getTimelineEnd(document.tracks, Math.max(duration, document.duration));
  useEffect(() => { if (assetKind === "video") playerRef.current.playbackRate = livePlaybackRate; }, [assetKind, livePlaybackRate]);
  useEffect(() => {
    let mounted = true;
    void loadEditorProject(projectId).then((stored) => {
      if (!mounted) return;
      const restored = stored ? normalizeEditorDocument(stored) : null;
      const next = restored ?? { ...createDefaultDocument(), id: projectId, name: projectName };
      setDocument({ ...next, id: projectId, name: next.name || projectName });
      const ratio = RATIOS.findIndex((entry) => entry.label === next.canvasRatio);
      if (ratio >= 0) setRatioIndex(ratio);
      const selected = next.tracks.flatMap((track) => track.items).find((item) => item.id === next.selectedItemId && item.uri && (item.kind === "video" || item.kind === "image"));
      if (selected?.uri) {
        setAsset({ uri: selected.uri, fileName: selected.label, duration: selected.duration * 1000 } as ImagePicker.ImagePickerAsset);
        setAssetKind(selected.kind === "image" ? "image" : "video");
        setDuration(selected.duration);
        setCurrentTime(Math.min(next.playhead, selected.duration));
      } else {
        setAsset(null);
        setAssetKind("video");
        setDuration(next.duration);
        setCurrentTime(next.playhead);
      }
      setIsPlaying(false);
      setProjectLoadError(false);
      setSaveState("saved");
      setLoadedProjectId(projectId);
      setDocumentLoaded(true);
    }).catch(() => {
      if (!mounted) return;
      setDocumentLoaded(false);
      setLoadedProjectId(null);
      setProjectLoadError(true);
      setSaveState("error");
    });
    return () => { mounted = false; };
  }, [projectId, projectName, loadAttempt]);
  useEffect(() => {
    if (!documentLoaded || projectLoadError || loadedProjectId !== projectId) return;
    const timer = setTimeout(() => {
      setSaveState("saving");
      void saveEditorProject(projectId, { ...document, id: projectId }).then(() => setSaveState("saved")).catch(() => setSaveState("error"));
    }, 400);
    return () => clearTimeout(timer);
  }, [document, documentLoaded, loadedProjectId, projectId, projectLoadError]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!previewTreatment) return;
    const timer = setTimeout(() => setPreviewTreatment(null), Math.max(0, previewTreatment.durationMs));
    return () => clearTimeout(timer);
  }, [previewTreatment]);

  useEventListener(player, "timeUpdate", ({ currentTime: time }) => {
    if (Number.isFinite(time)) setCurrentTime(time);
  });
  useEventListener(player, "playingChange", ({ isPlaying: playing }) => setIsPlaying(playing));
  useEventListener(player, "sourceLoad", ({ duration: loadedDuration }) => {
    const nextDuration = Number.isFinite(loadedDuration) ? loadedDuration : 0;
    setDuration(nextDuration);
    setCurrentTime(0);
    if (nextDuration > 0) {
      setDocument((current) => ({
        ...current,
        duration: Math.max(current.duration, nextDuration),
        tracks: current.tracks.map((track) => ({
          ...track,
          items: track.items.map((item) => item.uri === asset?.uri && item.kind === "video" ? { ...item, duration: nextDuration, outPoint: item.inPoint + nextDuration } : item),
        })),
      }));
    }
  });
  useEffect(() => {
    if ((asset && assetKind !== "image") || !isPlaying || timelineDuration <= 0) return;
    const timer = setInterval(() => setCurrentTime((time) => Math.min(timelineDuration, time + 0.2 * livePlaybackRate)), 200);
    return () => clearInterval(timer);
  }, [asset, assetKind, isPlaying, livePlaybackRate, timelineDuration]);
  useEffect(() => {
    if ((asset && assetKind !== "image") || !isPlaying || currentTime < timelineDuration || timelineDuration <= 0) return;
    const timer = setTimeout(() => setIsPlaying(false), 0);
    return () => clearTimeout(timer);
  }, [asset, assetKind, currentTime, isPlaying, timelineDuration]);

  const showToast = (text: string, tone: Toast["tone"] = "info") => setToast({ text, tone });

  const updateEditorDocument = (next: EditorDocument) => {
    const normalized = { ...next, duration: getTimelineEnd(next.tracks, next.duration) };
    setDocument(normalized);
    const selected = normalized.tracks.flatMap((track) => track.items).find((item) => item.id === normalized.selectedItemId);
    const ratio = RATIOS.findIndex((entry) => entry.label === normalized.canvasRatio);
    if (ratio >= 0) setRatioIndex(ratio);
    if (selected?.uri && (selected.kind === "video" || selected.kind === "image") && selected.uri !== asset?.uri) {
      setAsset({ uri: selected.uri, fileName: selected.label, duration: selected.duration * 1000 } as ImagePicker.ImagePickerAsset);
      setAssetKind(selected.kind === "image" ? "image" : "video");
      setDuration(selected.duration);
      setCurrentTime(Math.min(selected.inPoint, selected.duration));
      setIsPlaying(false);
    }
  };

  const chooseMedia = async (kind: MediaKind) => {
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showToast("اسمح بالوصول إلى مكتبة الوسائط من إعدادات الجهاز ثم حاول مجدداً.", "warning");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [kind === "video" ? "videos" : "images"], allowsEditing: false, quality: 1 });
      if (result.canceled) return;
      const selected = result.assets[0];
      if (!selected) return;
      const seconds = kind === "image" ? 5 : selected.duration && selected.duration > 0 ? selected.duration / 1000 : 30;
      const id = makeId(kind);
      const label = selected.fileName || selected.uri.split("/").pop() || (kind === "image" ? "صورة" : "مقطع فيديو");
      const stored = await persistMediaUri(selected.uri, label);
      const stableAsset = { ...selected, uri: stored.uri };
      const trackId = `track-${kind}`;
      setAsset(stableAsset);
      setAssetKind(kind);
      setDuration(seconds);
      setCurrentTime(0);
      setIsPlaying(false);
      setDocument((current) => {
        const defaults = makeDefaultTracks();
        const currentTrack = current.tracks.find((track) => track.id === trackId) ?? defaults.find((track) => track.id === trackId)!;
        const start = Math.max(0, ...currentTrack.items.map((item) => item.start + item.duration));
        const item: TimelineItem = { id, kind, label, uri: stored.uri, persistentUri: stored.persistent, start, duration: seconds, inPoint: 0, outPoint: seconds };
        const hasTrack = current.tracks.some((track) => track.id === trackId);
        const tracks = hasTrack
          ? replaceTrackItems(current.tracks, trackId, [...currentTrack.items, item])
          : [...current.tracks, { ...currentTrack, items: [item] }];
        return { ...current, selectedItemId: id, duration: Math.max(current.duration, start + seconds), tracks };
      });
      showToast(stored.persistent ? "نُسخت الوسائط إلى مساحة المشروع المحفوظة." : "أُضيفت الوسائط للمعاينة؛ ملف الويب المؤقت قد يحتاج إعادة اختيار بعد إعادة التحميل.", stored.persistent ? "success" : "info");
    } catch {
      showToast("تعذّر فتح مكتبة الوسائط. تحقّق من الإذن أو اختر ملفاً آخر.", "warning");
    }
  };
  const chooseVideo = () => chooseMedia("video");
  const chooseImage = () => chooseMedia("image");

  const seekAt = (fraction: number) => {
    if ((!asset && audioItems.length === 0) || timelineDuration <= 0) return;
    const time = Math.max(0, Math.min(1, fraction)) * timelineDuration;
    seekTo(time);
  };
  const seekTo = (time: number) => {
    if (timelineDuration <= 0) return;
    const value = Math.max(0, Math.min(timelineDuration, time));
    if (asset && assetKind === "video") playerRef.current.currentTime = Math.min(duration, value);
    setCurrentTime(value);
    setDocument((current) => current.playhead === value ? current : { ...current, playhead: value });
  };

  const togglePlayback = () => {
    if (!asset && audioItems.length === 0) { void chooseVideo(); return; }
    if (!asset || assetKind === "image") { setIsPlaying((playing) => !playing); return; }
    if (playerRef.current.playing) playerRef.current.pause();
    else playerRef.current.play();
  };

  const onToolSelect = (tool: EditorToolKey) => {
    setActiveTool(tool);
    if (tool === "clips") {
      void chooseVideo();
    } else if (tool === "audio") {
      setAdvancedTab("audio");
    } else if (tool === "text") {
      setCaptionDraft(caption);
      setCaptionModalOpen(true);
    } else if (tool === "typography") {
      setAdvancedTab("typography");
    } else if (tool === "filters") {
      setFilterIndex((current) => (current + 1) % FILTERS.length);
      setAdvancedTab("effects");
    } else if (tool === "speed") {
      setSpeed((current) => SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length]);
      setAdvancedTab("speed");
    } else if (tool === "ratio") {
      const next = (ratioIndex + 1) % RATIOS.length;
      setRatioIndex(next);
      setDocument((saved) => ({ ...saved, canvasRatio: RATIOS[next].label as CanvasRatio }));
    } else if (tool === "split" || tool === "timeline") {
      setAdvancedTab("timeline");
    } else if (tool === "transitions") {
      setAdvancedTab("transitions");
    } else if (tool === "keyframes") {
      setAdvancedTab("keyframes");
    } else if (tool === "color") {
      setAdvancedTab("color");
    } else if (tool === "chroma") {
      setAdvancedTab("chroma");
    } else if (tool === "templates") {
      setAdvancedTab("templates");
    } else if (tool === "export") {
      setAdvancedTab("export");
    }
  };

  const saveQuickCaption = () => {
    setDocument((current) => ({ ...current, typography: { ...current.typography, text: captionDraft.trim() } }));
    setCaptionModalOpen(false);
    showToast("تم تحديث نص المعاينة؛ لن يُدمج في الفيديو المُصدّر.", "success");
  };
  const exportVideo = () => {
    showToast(asset ? "لم يبدأ التصدير: يتطلب ذلك تنفيذ محرك معالجة أصلياً وبناءً واختباراً." : "اختر مقطعاً أولاً. التصدير غير متاح في نموذج Expo.", "warning");
  };

  const fileName = asset?.fileName || asset?.uri.split("/").pop() || "";
  const filter = FILTERS[filterIndex];
  const ratio = RATIOS.find((entry) => entry.label === document.canvasRatio) ?? RATIOS[ratioIndex];
  const canvasAspectRatio = ratio.value;
  const grade = compareOriginal ? DEFAULT_COLOR_GRADE : document.colorGrade;
  const webColorFilter = `brightness(${Math.max(0.15, 1 + grade.brightness / 100)}) contrast(${Math.max(0.15, 1 + grade.contrast / 100)}) saturate(${Math.max(0, 1 + grade.saturation / 100)}) hue-rotate(${grade.tint}deg) sepia(${Math.max(0, grade.temperature) / 180})`;
  const caption = document.typography.text;
  const mediaFrames = document.keyframes.filter((frame) => frame.targetId === "video");
  const mediaTransform = mediaFrames.length ? interpolateKeyframes(mediaFrames, currentTime) : document.baseTransforms.video ?? DEFAULT_TRANSFORM;
  const textFrames = document.keyframes.filter((frame) => frame.targetId === "text");
  const textTransform = textFrames.length ? interpolateKeyframes(textFrames, currentTime) : document.baseTransforms.text ?? DEFAULT_TRANSFORM;
  const stickerFrames = document.keyframes.filter((frame) => frame.targetId === "sticker");
  const stickerTransform = stickerFrames.length ? interpolateKeyframes(stickerFrames, currentTime) : document.baseTransforms.sticker ?? DEFAULT_TRANSFORM;
  const playingEffect = document.effects
    .filter((effect) => currentTime >= effect.start && currentTime <= effect.start + effect.duration && (effect.scope === "project" || effect.targetId === document.selectedItemId))
    .sort((a, b) => b.start - a.start)[0];
  const effectPreset = playingEffect ? EFFECT_PRESETS.find((preset) => preset.id === playingEffect.presetId) : null;
  const targetTransition = document.transitions.map((transition) => {
    const target = document.tracks.flatMap((track) => track.items).find((item) => item.id === transition.toItemId);
    return target && currentTime >= Math.max(0, target.start - transition.duration) && currentTime <= target.start + 0.02 ? { transition, target } : null;
  }).find(Boolean)?.transition;
  const transitionPreset = targetTransition ? TRANSITION_PRESETS.find((preset) => preset.id === targetTransition.presetId) : null;
  const liveTreatment = previewTreatment
    ?? (effectPreset && playingEffect
      ? { kind: "effect" as const, presetId: effectPreset.id, preview: effectPreset.preview, intensity: playingEffect.intensity, durationMs: 0 }
      : transitionPreset && targetTransition
        ? { kind: "transition" as const, presetId: transitionPreset.id, preview: transitionPreset.preview, intensity: 75, durationMs: 0 }
        : null);
  const motion = liveTreatment ? treatmentMotion(liveTreatment.preview, liveTreatment.intensity, currentTime) : { x: 0, y: 0, scale: 1, rotation: 0 };
  const hasSticker = document.tracks.find((track) => track.kind === "sticker")?.items.length;
  const audioItems = document.tracks.filter((track) => track.kind === "music" || track.kind === "voice" || track.kind === "sfx").flatMap((track) => track.items);
  const voiceIsActive = document.tracks.some((track) => track.kind === "voice" && !track.muted && track.items.some((item) => currentTime >= item.start && currentTime < item.start + item.duration));

  if (projectLoadError || loadedProjectId !== projectId) {
    return (
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={screenStyles.safe}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
          <Ionicons name={projectLoadError ? "warning-outline" : "time-outline"} size={34} color={projectLoadError ? "#FFC479" : palette.cyan} />
          <TextBlock style={{ fontSize: 17, fontWeight: "900", textAlign: "center" }}>{projectLoadError ? "تعذّرت قراءة المشروع" : "جار فتح المشروع"}</TextBlock>
          <TextBlock muted style={{ fontSize: 11, textAlign: "center" }}>{projectLoadError ? "لم تُحمّل نسخة افتراضية ولم يُحفظ شيء فوق ملفك. تحقق من مساحة الجهاز ثم أعد المحاولة." : "نستعيد إعدادات المشروع من التخزين المحلي…"}</TextBlock>
          {projectLoadError ? <StudioButton icon="refresh-outline" onPress={() => setLoadAttempt((attempt) => attempt + 1)}>إعادة المحاولة</StudioButton> : null}
          <Pressable accessibilityRole="button" onPress={() => router.navigate("/")}><TextBlock muted style={{ fontSize: 11, padding: 8 }}>العودة إلى المشاريع</TextBlock></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={screenStyles.safe}>
      <View style={screenStyles.editor}>
        <View style={screenStyles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى الرئيسية" onPress={() => router.navigate("/")} style={screenStyles.topIcon}>
            <Ionicons name="chevron-back" size={21} color={palette.text} />
          </Pressable>
          <View style={screenStyles.projectHeading}>
            <TextBlock style={screenStyles.projectName}>{document.name || "مقطع جديد"}</TextBlock>
            <TextBlock muted style={screenStyles.projectSub}>{saveState === "saving" ? "جار الحفظ تلقائياً" : saveState === "error" ? "تعذّر الحفظ" : "حُفظ تلقائياً"} · {ratio.label} · {assetKind === "image" ? "صورة" : "فيديو"}</TextBlock>
          </View>
          <Pressable accessibilityRole="button" onPress={exportVideo} style={screenStyles.exportButton}>
            <TextBlock style={screenStyles.exportLabel}>تصدير</TextBlock>
            <Ionicons name="arrow-up-outline" size={15} color="#071318" />
          </Pressable>
        </View>

        <View style={screenStyles.previewStage}>
          <View style={[screenStyles.videoCanvas, { aspectRatio: canvasAspectRatio }]}>
            {asset ? (
              <>
                <View style={[screenStyles.mediaLayer, Platform.OS === "web" ? ({ filter: webColorFilter } as never) : null, {
                  opacity: mediaTransform.opacity,
                  transform: [
                    { translateX: mediaTransform.x + motion.x },
                    { translateY: mediaTransform.y + motion.y },
                    { scale: mediaTransform.scale * motion.scale },
                    { rotate: `${mediaTransform.rotation + motion.rotation}deg` },
                  ],
                }]}>
                {assetKind === "video"
                    ? <VideoView player={player} style={screenStyles.video} nativeControls={false} contentFit="contain" fullscreenOptions={{ enable: false }} />
                    : <Image source={{ uri: asset.uri }} style={screenStyles.video} resizeMode="contain" />}
                </View>
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: filter.color }]} />
                {Platform.OS !== "web" && !compareOriginal && (grade.temperature !== 0 || grade.tint !== 0) ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: grade.temperature >= 0 ? `rgba(255,142,62,${Math.min(0.28, Math.abs(grade.temperature) / 360)})` : `rgba(56,128,255,${Math.min(0.25, Math.abs(grade.temperature) / 400)})` }]} /> : null}
                {liveTreatment ? <PreviewTreatment treatment={liveTreatment} time={currentTime} /> : null}
                {!!caption && <View pointerEvents="none" style={[screenStyles.captionOverlay, {
                  opacity: textTransform.opacity,
                  transform: [{ translateX: textTransform.x }, { translateY: textTransform.y }, { scale: textTransform.scale }, { rotate: `${textTransform.rotation}deg` }],
                }]}><TextBlock style={[screenStyles.captionText, {
                  color: document.typography.color,
                  backgroundColor: document.typography.background,
                  fontSize: document.typography.size,
                  fontWeight: document.typography.bold ? "900" : "500",
                  textAlign: document.typography.align,
                  borderWidth: document.typography.outline ? 1 : 0,
                  borderColor: "#0A0A0A",
                }]}>{caption}</TextBlock></View>}
                {hasSticker ? <View pointerEvents="none" style={[screenStyles.stickerOverlay, {
                  opacity: stickerTransform.opacity,
                  transform: [{ translateX: stickerTransform.x }, { translateY: stickerTransform.y }, { scale: stickerTransform.scale }, { rotate: `${stickerTransform.rotation}deg` }],
                }]}><TextBlock style={screenStyles.stickerText}>✨</TextBlock></View> : null}
                {asset ? <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? "إيقاف المعاينة" : "تشغيل المعاينة"} onPress={togglePlayback} style={screenStyles.playButton}>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
                </Pressable> : null}
              </>
            ) : (
              <View style={screenStyles.emptyCanvas}>
                <View style={screenStyles.emptyGlyph}><Ionicons name="film-outline" size={25} color={palette.cyan} /></View>
                <TextBlock style={screenStyles.emptyTitle}>مساحة المعاينة</TextBlock>
                <TextBlock muted style={screenStyles.emptyHint}>أضف فيديو أو صورة لبدء مشروعك</TextBlock>
                <View style={screenStyles.emptyActions}>
                  <Pressable accessibilityRole="button" onPress={() => void chooseVideo()} style={screenStyles.importButton}><Ionicons name="videocam-outline" size={15} color="#061318" /><TextBlock style={screenStyles.importLabel}>فيديو</TextBlock></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => void chooseImage()} style={screenStyles.importButton}><Ionicons name="image-outline" size={15} color="#061318" /><TextBlock style={screenStyles.importLabel}>صورة</TextBlock></Pressable>
                  {audioItems.length > 0 ? <Pressable accessibilityRole="button" onPress={togglePlayback} style={screenStyles.importButton}><Ionicons name={isPlaying ? "pause" : "play"} size={14} color="#061318" /><TextBlock style={screenStyles.importLabel}>{isPlaying ? "إيقاف الصوت" : "تشغيل الصوت"}</TextBlock></Pressable> : null}
                </View>
              </View>
            )}
            <View style={screenStyles.canvasTopTags}>
              <View style={screenStyles.canvasTag}><Ionicons name="eye-outline" size={12} color="#D9F9FC" /><TextBlock style={screenStyles.canvasTagText}>{asset ? (liveTreatment ? "معاينة مؤثر" : filter.label) : "معاينة"}</TextBlock></View>
              <View style={screenStyles.ratioTag}><TextBlock style={screenStyles.ratioTagText}>{ratio.label}</TextBlock></View>
            </View>
          </View>
        </View>

        <View style={screenStyles.transportRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={muted ? "إلغاء كتم الصوت" : "كتم الصوت"} onPress={() => setMuted((value) => !value)} style={screenStyles.transportSide}>
            <Ionicons name={muted ? "volume-mute-outline" : "volume-high-outline"} size={18} color={muted ? palette.amber : "#D5D7E0"} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={togglePlayback} style={screenStyles.transportPlay}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={19} color={palette.text} />
          </Pressable>
          <View style={screenStyles.timeCodeGroup}>
            <TextBlock style={screenStyles.timeCurrent}>{formatTime(currentTime)}</TextBlock>
            <TextBlock muted style={screenStyles.timeDivider}>/</TextBlock>
            <TextBlock muted style={screenStyles.timeDuration}>{formatTime(timelineDuration)}</TextBlock>
          </View>
          <Pressable accessibilityRole="button" onPress={() => onToolSelect("speed")} style={screenStyles.speedPill}>
            <TextBlock style={screenStyles.speedLabel}>{livePlaybackRate.toFixed(livePlaybackRate % 1 ? 2 : 0)}×</TextBlock>
          </Pressable>
        </View>

        <TimelinePanel
          fileName={fileName}
          duration={timelineDuration}
          currentTime={currentTime}
          caption={caption}
          hasVideo={!!asset && assetKind === "video"}
          onSeek={(fraction) => seekAt(fraction)}
          onChooseVideo={() => void chooseVideo()}
          onAudio={() => onToolSelect("audio")}
        />

        <ToolDock activeTool={activeTool} onSelect={onToolSelect} />

        <View style={screenStyles.footerRow}>
          <TextBlock muted style={screenStyles.footerNote}>تعديلات المعاينة محفوظة محلياً · لا ترميز MP4</TextBlock>
          <View style={screenStyles.footerActions}>
            <Pressable accessibilityRole="button" onPress={() => setAdvancedTab("timeline")} style={screenStyles.addClipButton}><Ionicons name="reorder-three-outline" size={15} color={palette.cyan} /><TextBlock style={screenStyles.addClipLabel}>المسارات</TextBlock></Pressable>
            <Pressable accessibilityRole="button" onPress={() => void chooseImage()} style={screenStyles.addClipButton}><Ionicons name="image-outline" size={14} color={palette.cyan} /><TextBlock style={screenStyles.addClipLabel}>صورة</TextBlock></Pressable>
            <Pressable accessibilityRole="button" onPress={() => void chooseVideo()} style={screenStyles.addClipButton}><Ionicons name="add" size={16} color={palette.cyan} /><TextBlock style={screenStyles.addClipLabel}>مقطع</TextBlock></Pressable>
          </View>
        </View>

        {toast ? (
          <Pressable onPress={() => setToast(null)} style={[screenStyles.toast, toast.tone === "warning" && screenStyles.toastWarning, toast.tone === "success" && screenStyles.toastSuccess]}>
            <Ionicons name={toast.tone === "warning" ? "alert-circle-outline" : toast.tone === "success" ? "checkmark-circle-outline" : "information-circle-outline"} size={16} color={toast.tone === "warning" ? palette.amber : toast.tone === "success" ? palette.green : palette.cyan} />
            <TextBlock style={screenStyles.toastText}>{toast.text}</TextBlock>
          </Pressable>
        ) : null}
      </View>
      <AdvancedEditorSheet
        key={advancedTab ?? "closed"}
        visible={advancedTab !== null}
        initialTab={advancedTab ?? "timeline"}
        onClose={() => { setAdvancedTab(null); setCompareOriginal(false); }}
        document={document}
        onChangeDocument={updateEditorDocument}
        playhead={currentTime}
          mediaDuration={timelineDuration}
        onSeek={seekTo}
        onPickMedia={(kind) => void chooseMedia(kind)}
        onToast={showToast}
        onPreviewTreatment={setPreviewTreatment}
        compareOriginal={compareOriginal}
        onCompareOriginal={setCompareOriginal}
      />
      <CaptionModal
        visible={captionModalOpen}
        value={captionDraft}
        onChange={setCaptionDraft}
        onCancel={() => setCaptionModalOpen(false)}
        onSave={saveQuickCaption}
      />
      {audioItems.map((item) => <SynchronizedAudioTrack key={item.id} item={item} playhead={currentTime} isPlaying={isPlaying} muted={muted} duckGain={document.audioSettings.voiceDuckingGain} duckUnderVoice={document.audioSettings.duckMusicUnderVoice} voiceIsActive={voiceIsActive} playbackRate={livePlaybackRate} onDurationChange={(itemId, measuredDuration) => setDocument((current) => ({ ...current, duration: Math.max(current.duration, ...current.tracks.flatMap((track) => track.items.map((entry) => entry.id === itemId ? entry.start + measuredDuration : entry.start + entry.duration))), tracks: current.tracks.map((track) => ({ ...track, items: track.items.map((entry) => entry.id === itemId ? { ...entry, duration: measuredDuration, outPoint: entry.inPoint + measuredDuration } : entry) })) }))} />)}
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0C11" },
  editor: { flex: 1, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8, gap: 10, justifyContent: "space-between", position: "relative" },
  topBar: { minHeight: 44, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  topIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: "#1A1B23", borderColor: "#30313D", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  projectHeading: { flex: 1, alignItems: "center", gap: 3 },
  projectName: { fontSize: 12, fontWeight: "800" },
  projectSub: { fontSize: 8 },
  exportButton: { minWidth: 66, height: 34, paddingHorizontal: 11, borderRadius: 11, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: palette.cyan },
  exportLabel: { color: "#071318", fontSize: 10, fontWeight: "900" },
  previewStage: { height: "34%", minHeight: 190, maxHeight: 290, alignItems: "center", justifyContent: "center" },
  videoCanvas: { height: "100%", maxWidth: "100%", backgroundColor: "#05060A", borderColor: "#292C36", borderWidth: 1, borderRadius: 13, overflow: "hidden", alignItems: "center", justifyContent: "center", position: "relative" },
  mediaLayer: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  video: { width: "100%", height: "100%", backgroundColor: "#05060A" },
  emptyCanvas: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12 },
  emptyGlyph: { width: 43, height: 43, borderRadius: 15, backgroundColor: "#102D35", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  emptyTitle: { fontSize: 13, fontWeight: "800" },
  emptyHint: { fontSize: 9 },
  emptyActions: { flexDirection: "row-reverse", gap: 7 },
  importButton: { marginTop: 4, height: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: palette.cyan, flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  importLabel: { color: "#061318", fontSize: 10, fontWeight: "800" },
  canvasTopTags: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  canvasTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(14,16,22,0.83)" },
  canvasTagText: { color: "#D9F9FC", fontSize: 8, fontWeight: "700" },
  ratioTag: { minWidth: 34, alignItems: "center", paddingHorizontal: 6, paddingVertical: 4, borderRadius: 7, backgroundColor: "rgba(14,16,22,0.83)" },
  ratioTagText: { color: "#D9F9FC", fontSize: 8, fontWeight: "700" },
  playButton: { position: "absolute", width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(4,7,11,0.70)", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", alignItems: "center", justifyContent: "center", paddingLeft: 2 },
  captionOverlay: { position: "absolute", left: 8, right: 8, bottom: 22, alignItems: "center" },
  captionText: { maxWidth: "95%", paddingHorizontal: 8, paddingVertical: 5, color: "#FFFFFF", fontSize: 13, fontWeight: "900", textAlign: "center", backgroundColor: "rgba(0,0,0,0.52)", borderRadius: 5 },
  stickerOverlay: { position: "absolute", right: "18%", top: "30%", alignItems: "center" },
  stickerText: { fontSize: 32 },
  transportRow: { height: 36, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  transportSide: { width: 28, height: 30, alignItems: "center", justifyContent: "center" },
  transportPlay: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#1F202A" },
  timeCodeGroup: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  timeCurrent: { color: "#F5F6FA", fontSize: 10, fontFamily: "monospace", writingDirection: "ltr" },
  timeDivider: { fontSize: 9 },
  timeDuration: { fontSize: 9, fontFamily: "monospace", writingDirection: "ltr" },
  speedPill: { minWidth: 39, height: 25, borderRadius: 8, borderColor: "#373946", borderWidth: 1, backgroundColor: "#191A21", alignItems: "center", justifyContent: "center" },
  speedLabel: { fontSize: 9, fontWeight: "800" },
  footerRow: { minHeight: 25, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 4 },
  footerNote: { fontSize: 7, flex: 1 },
  footerActions: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  addClipButton: { flexDirection: "row-reverse", alignItems: "center", gap: 2, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: "#13252B" },
  addClipLabel: { color: "#9BEAF2", fontSize: 8, fontWeight: "700" },
  toast: { position: "absolute", left: 12, right: 12, bottom: 83, flexDirection: "row-reverse", alignItems: "flex-start", gap: 7, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12, backgroundColor: "#14232C", borderColor: "#28515C", borderWidth: 1 },
  toastWarning: { backgroundColor: "#292317", borderColor: "#594724" },
  toastSuccess: { backgroundColor: "#10271F", borderColor: "#265A43" },
  toastText: { flex: 1, color: "#D7DEE8", fontSize: 9, lineHeight: 15 },
});
