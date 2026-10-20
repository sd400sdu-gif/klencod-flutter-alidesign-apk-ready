import { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EFFECT_PRESETS, EDITOR_COLORS, KEYFRAME_CURVES, TRANSITION_PRESETS, type EffectPreset, type TransitionPreset } from "@/features/editor/catalog";
import { DEFAULT_TRANSFORM, makeId, type EditorDocument, type Easing, type EffectInstance, type Keyframe, type TimelineItem, type TimelineTrack, type TransformValue, type Typography } from "@/features/editor/model";
import { interpolateKeyframes, speedAt } from "@/features/editor/interpolation";
import { copyItem, makeDefaultTracks, moveItem, moveItemToTrack, removeItem, replaceTrackItems, splitItem, trimItemEnd, trimItemStart } from "@/features/editor/timeline";
import { StudioButton, TextBlock } from "@/components/studio/primitives";
import { AudioTracksEditor, ChromaKeyEditor, ColorGradeEditor, ExportSettingsEditor, TemplateEditor } from "@/components/studio/advanced-media-panels";
import { SubtitleEditor } from "@/components/studio/subtitle-editor";
import { isFontLibraryError, listFonts, loadFont, pickFont, type FontRecord } from "@/features/editor/font-library";
import { palette } from "@/constants/studio";

export type AdvancedTab = "timeline" | "effects" | "transitions" | "keyframes" | "speed" | "typography" | "subtitles" | "audio" | "color" | "chroma" | "templates" | "export";
export type PreviewTreatmentValue = { kind: "effect" | "transition"; presetId: string; preview: EffectPreset["preview"] | TransitionPreset["preview"]; intensity: number; durationMs: number };

const TABS: { id: AdvancedTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "timeline", label: "المسارات", icon: "reorder-three-outline" },
  { id: "effects", label: "المؤثرات", icon: "color-filter-outline" },
  { id: "transitions", label: "الانتقالات", icon: "swap-horizontal-outline" },
  { id: "keyframes", label: "المفاتيح", icon: "key-outline" },
  { id: "speed", label: "منحنى السرعة", icon: "speedometer-outline" },
  { id: "typography", label: "النص والخط", icon: "text-outline" },
  { id: "subtitles", label: "الترجمة", icon: "chatbox-ellipses-outline" },
  { id: "audio", label: "الصوت", icon: "musical-notes-outline" },
  { id: "color", label: "تصحيح اللون", icon: "color-palette-outline" },
  { id: "chroma", label: "الشاشة الخضراء", icon: "contrast-outline" },
  { id: "templates", label: "القوالب", icon: "albums-outline" },
  { id: "export", label: "التصدير", icon: "settings-outline" },
];

type SheetProps = {
  onClose: () => void;
  visible: boolean;
  initialTab: AdvancedTab;
  document: EditorDocument;
  onChangeDocument: (document: EditorDocument) => void;
  playhead: number;
  mediaDuration: number;
  onSeek: (time: number) => void;
  onPickMedia: (kind: "video" | "image") => void;
  onToast: (message: string, tone?: "info" | "warning" | "success") => void;
  onPreviewTreatment: (treatment: PreviewTreatmentValue | null) => void;
  compareOriginal: boolean;
  onCompareOriginal: (value: boolean) => void;
};
type PanelProps = Omit<SheetProps, "visible" | "initialTab" | "onClose">;

export function AdvancedEditorSheet(props: SheetProps) {
  const { visible, initialTab, document, onChangeDocument, playhead, mediaDuration, onSeek, onPickMedia, onToast, onPreviewTreatment } = props;
  const [tab, setTab] = useState<AdvancedTab>(initialTab);
  const panelProps: PanelProps = { document, onChangeDocument, playhead, mediaDuration, onSeek, onPickMedia, onToast, onPreviewTreatment, compareOriginal: props.compareOriginal, onCompareOriginal: props.onCompareOriginal };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Pressable onPress={props.onClose} accessibilityRole="button" style={styles.modePill}>
              <Ionicons name="sparkles-outline" size={13} color={palette.cyan} />
              <TextBlock style={styles.modePillText}>لمعة · أدوات احترافية</TextBlock>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="إغلاق الأدوات" onPress={props.onClose} style={styles.closeButton}>
              <Ionicons name="close" size={19} color={palette.text} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {TABS.map((item) => (
              <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: tab === item.id }} key={item.id} onPress={() => setTab(item.id)} style={[styles.tabButton, tab === item.id && styles.tabButtonActive]}>
                <Ionicons name={item.icon} size={15} color={tab === item.id ? palette.cyan : palette.muted} />
                <TextBlock style={[styles.tabLabel, tab === item.id && styles.tabLabelActive]}>{item.label}</TextBlock>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {tab === "timeline" && <TimelineEditor {...panelProps} />}
            {tab === "effects" && <EffectsEditor {...panelProps} />}
            {tab === "transitions" && <TransitionsEditor {...panelProps} />}
            {tab === "keyframes" && <KeyframesEditor {...panelProps} />}
            {tab === "speed" && <SpeedRampEditor {...panelProps} />}
            {tab === "typography" && <TypographyEditor {...panelProps} />}
            {tab === "subtitles" && <SubtitleEditor document={document} onChangeDocument={onChangeDocument} playhead={playhead} onSeek={onSeek} onToast={onToast} />}
            {tab === "audio" && <AudioTracksEditor {...panelProps} />}
            {tab === "color" && <ColorGradeEditor {...panelProps} compareOriginal={props.compareOriginal} onCompareOriginal={props.onCompareOriginal} />}
            {tab === "chroma" && <ChromaKeyEditor {...panelProps} />}
            {tab === "templates" && <TemplateEditor {...panelProps} />}
            {tab === "export" && <ExportSettingsEditor {...panelProps} />}
          </ScrollView>
          <TextBlock muted style={styles.bottomBoundary}>تعديل المعاينة ومخطط التحرير محليان؛ لا يوجد تصدير/ترميز فعلي للوسائط.</TextBlock>
        </View>
      </View>
    </Modal>
  );
}

function EffectsEditor(props: PanelProps) {
  const { document, onChangeDocument, playhead, onToast, onPreviewTreatment } = props;
  const [presetId, setPresetId] = useState(EFFECT_PRESETS[0].id);
  const [scope, setScope] = useState<EffectInstance["scope"]>("clip");
  const [intensity, setIntensity] = useState(65);
  const [duration, setDuration] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const selectedPreset = EFFECT_PRESETS.find((preset) => preset.id === presetId) ?? EFFECT_PRESETS[0];
  const activeInstance = document.effects.find((effect) => effect.id === editingId) ?? null;

  const updateDraftFromInstance = (effect: EffectInstance) => {
    setEditingId(effect.id);
    setPresetId(effect.presetId);
    setScope(effect.scope);
    setIntensity(effect.intensity);
    setDuration(effect.duration);
  };
  const applyEffect = () => {
    if (scope === "clip" && !document.selectedItemId) {
      onToast("اختر مقطعاً من المسارات لتطبيق المؤثر عليه، أو اختر نطاق المشروع.", "warning");
      return;
    }
    const id = editingId ?? makeId("effect");
    const effect: EffectInstance = {
      id,
      presetId,
      targetId: scope === "project" ? "project" : document.selectedItemId ?? "video",
      scope,
      start: activeInstance?.start ?? playhead,
      duration,
      intensity,
    };
    const effectTrack = document.tracks.find((track) => track.kind === "effect") ?? makeDefaultTracks().find((track) => track.kind === "effect")!;
    const effectItem: TimelineItem = { id, kind: "effect", label: `مؤثر · ${selectedPreset.label}`, start: effect.start, duration, inPoint: 0, outPoint: duration };
    const nextTracks = document.tracks.some((track) => track.id === effectTrack.id)
      ? replaceTrackItems(document.tracks, effectTrack.id, [...effectTrack.items.filter((item) => item.id !== id), effectItem])
      : [...document.tracks, { ...effectTrack, items: [effectItem] }];
    onChangeDocument({ ...document, effects: [...document.effects.filter((item) => item.id !== id), effect], tracks: nextTracks });
    setEditingId(id);
    onPreviewTreatment({ kind: "effect", presetId, preview: selectedPreset.preview, intensity, durationMs: 1400 });
    onToast(editingId ? "تم تحديث المؤثر في مخطط المعاينة." : "أُضيف المؤثر إلى المسار المحدد.", "success");
  };
  const removeEffect = () => {
    if (!editingId) return;
    onChangeDocument({ ...document, effects: document.effects.filter((effect) => effect.id !== editingId), tracks: removeItem(document.tracks, editingId) });
    setEditingId(null);
    onPreviewTreatment(null);
    onToast("حُذف المؤثر من مخطط التحرير.", "success");
  };
  const preview = () => {
    onPreviewTreatment({ kind: "effect", presetId, preview: selectedPreset.preview, intensity, durationMs: Math.max(1000, duration * 1000) });
    onToast("هذه معاينة طبقات واجهة؛ ليست معالجة للإطارات الأصلية.");
  };

  return (
    <View style={styles.panelStack}>
      <PanelHeading title="مكتبة المؤثرات" note="حدد مؤثراً، جرّب شدته ومدته، ثم طبّقه على مقطع أو على كامل المشروع." />
      <View style={styles.filterChips}>{["الكل", "تشويش", "ضوء", "حركة", "سينما", "جوّ", "تلاشي"].map((filter) => <TextBlock key={filter} style={styles.categoryChip}>{filter}</TextBlock>)}</View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetList}>
        {EFFECT_PRESETS.map((preset) => (
          <Pressable key={preset.id} onPress={() => { setPresetId(preset.id); setEditingId(null); setDuration(preset.defaultDuration); }} style={[styles.presetCard, presetId === preset.id && styles.presetCardActive]}>
            <PreviewIcon kind={preset.preview} />
            <TextBlock numberOfLines={1} style={styles.presetName}>{preset.label}</TextBlock>
            <TextBlock muted style={styles.presetCategory}>{effectFamilyLabel(preset.family)}</TextBlock>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}><TextBlock style={styles.sectionLabel}>المؤثر المحدد</TextBlock><TextBlock style={styles.accentValue}>{selectedPreset.label}</TextBlock></View>
        <SliderLike label="الشدة" value={`${intensity}%`} onDecrease={() => setIntensity((value) => Math.max(0, value - 10))} onIncrease={() => setIntensity((value) => Math.min(100, value + 10))} fill={intensity} />
        <SliderLike label="المدة" value={`${duration.toFixed(1)} ث`} onDecrease={() => setDuration((value) => Math.max(0.2, Math.round((value - 0.2) * 10) / 10))} onIncrease={() => setDuration((value) => Math.min(10, Math.round((value + 0.2) * 10) / 10))} fill={Math.min(100, duration * 10)} />
        <View style={styles.scopeRow}>
          <TextBlock muted style={styles.smallLabel}>نطاق التطبيق</TextBlock>
          {(["clip", "project"] as const).map((value) => <Pressable key={value} onPress={() => setScope(value)} style={[styles.scopeButton, scope === value && styles.scopeButtonActive]}><TextBlock style={[styles.scopeText, scope === value && styles.scopeTextActive]}>{value === "clip" ? "المقطع المحدد" : "المشروع"}</TextBlock></Pressable>)}
        </View>
        <View style={styles.buttonRow}>
          <StudioButton variant="secondary" onPress={preview} style={styles.flexButton}>معاينة</StudioButton>
          <StudioButton onPress={applyEffect} style={styles.flexButton}>{editingId ? "تحديث" : "تطبيق"}</StudioButton>
        </View>
        {editingId ? <StudioButton variant="quiet" icon="trash-outline" onPress={removeEffect}>حذف المؤثر المحدد</StudioButton> : null}
      </View>
      <View style={styles.sectionCard}>
        <TextBlock style={styles.sectionLabel}>المؤثرات المضافة · {document.effects.length.toLocaleString("ar")}</TextBlock>
        {document.effects.length ? document.effects.map((effect) => {
          const preset = EFFECT_PRESETS.find((item) => item.id === effect.presetId);
          return <Pressable key={effect.id} onPress={() => updateDraftFromInstance(effect)} style={[styles.listRow, editingId === effect.id && styles.listRowActive]}><Ionicons name="chevron-back" size={14} color={palette.muted} /><TextBlock style={styles.listName}>{preset?.label ?? effect.presetId}</TextBlock><TextBlock muted style={styles.listMeta}>{effect.intensity}% · {effect.duration.toFixed(1)}ث · {effect.scope === "project" ? "المشروع" : "مقطع"}</TextBlock></Pressable>;
        }) : <TextBlock muted style={styles.helperText}>لا توجد مؤثرات مطبقة بعد.</TextBlock>}
      </View>
      <TextBlock muted style={styles.caveat}>Glitch وRGB وVHS والمطر والثلج والدخان وغيرها متاحة كمعاينة بصرية تمثيلية؛ المؤثر لا يُطبّق على ملف MP4 في بيئة Expo الحالية.</TextBlock>
    </View>
  );
}

function TransitionsEditor(props: PanelProps) {
  const { document, onChangeDocument, onToast, onPreviewTreatment } = props;
  const [presetId, setPresetId] = useState(TRANSITION_PRESETS[0].id);
  const [duration, setDuration] = useState(0.5);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [fromItemId, setFromItemId] = useState("");
  const [toItemId, setToItemId] = useState("");
  const preset = TRANSITION_PRESETS.find((item) => item.id === presetId) ?? TRANSITION_PRESETS[0];
  const clips = document.tracks.filter((track) => track.kind === "video" || track.kind === "image").flatMap((track) => track.items).sort((a, b) => a.start - b.start);

  const applyTransition = () => {
    const from = clips.find((item) => item.id === fromItemId) ?? clips[0];
    const to = clips.find((item) => item.id === toItemId) ?? clips.find((item) => item.id !== from?.id);
    if (!from || !to) {
      onToast("أضف مقطعين أو انسخ المقطع الحالي أولاً لإنشاء نقطة انتقال.", "warning");
      return;
    }
    const id = selectedTransitionId ?? makeId("transition");
    const transition = { id, presetId, fromItemId: from.id, toItemId: to.id, duration };
    const marker: TimelineItem = { id, kind: "effect", label: `انتقال · ${preset.label}`, start: Math.max(from.start, to.start - duration), duration, inPoint: 0, outPoint: duration };
    const effectTrack = document.tracks.find((track) => track.kind === "effect") ?? makeDefaultTracks().find((track) => track.kind === "effect")!;
    const tracks = document.tracks.some((track) => track.id === effectTrack.id)
      ? replaceTrackItems(document.tracks, effectTrack.id, [...effectTrack.items.filter((item) => item.id !== id), marker])
      : [...document.tracks, { ...effectTrack, items: [marker] }];
    onChangeDocument({ ...document, transitions: [...document.transitions.filter((item) => item.id !== id), transition], tracks });
    setSelectedTransitionId(id);
    onPreviewTreatment({ kind: "transition", presetId, preview: preset.preview, intensity: 80, durationMs: duration * 1000 });
    onToast("سُجل الانتقال بين العنصرين المحددين وعُرضت معاينته التمثيلية.", "success");
  };
  const previewTransition = () => {
    onPreviewTreatment({ kind: "transition", presetId, preview: preset.preview, intensity: 80, durationMs: duration * 1000 });
    onToast("عرض معاينة شكل الانتقال؛ المزج الفعلي بين ملفات الوسائط يحتاج محركاً أصلياً.");
  };
  const duplicateForCut = () => {
    const source = clips.find((item) => item.id === document.selectedItemId) ?? clips[0];
    if (!source) { onToast("اختر أو أضف مقطعاً أولاً.", "warning"); return; }
    const duplicate = copyItem(source, source.start + source.duration);
    onChangeDocument({ ...document, selectedItemId: duplicate.id, tracks: document.tracks.map((track) => track.id === `track-${source.kind}` ? { ...track, items: [...track.items, duplicate].sort((a, b) => a.start - b.start) } : track) });
    setFromItemId(source.id);
    setToItemId(duplicate.id);
    onToast("أُنشئت نسخة متتابعة في مخطط التحرير؛ المصدر نفسه لم يُنسخ على القرص.", "success");
  };

  return (
    <View style={styles.panelStack}>
      <PanelHeading title="انتقالات بين المقاطع" note="اختر نوع الانتقال ومدته بين عنصرين متجاورين، ثم راجع علامته في مسار المؤثرات." />
      <View style={styles.cutNotice}><Ionicons name="information-circle-outline" size={16} color={palette.amber} /><TextBlock style={styles.cutNoticeText}>المعاينة هنا تمثيلية، ولا تنشئ ملفاً مركباً أو انتقالاً مرمّزاً.</TextBlock></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetList}>
        {TRANSITION_PRESETS.map((item) => <Pressable key={item.id} onPress={() => setPresetId(item.id)} style={[styles.presetCard, presetId === item.id && styles.presetCardActive]}><PreviewIcon kind={item.preview} /><TextBlock numberOfLines={1} style={styles.presetName}>{item.label}</TextBlock><TextBlock muted style={styles.presetCategory}>انتقال</TextBlock></Pressable>)}
      </ScrollView>
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}><TextBlock style={styles.sectionLabel}>المدة</TextBlock><TextBlock style={styles.accentValue}>{duration.toFixed(2)} ث</TextBlock></View>
        <SliderLike label="زمن الانتقال" value={`${duration.toFixed(2)}ث`} onDecrease={() => setDuration((value) => Math.max(0.1, Math.round((value - 0.1) * 100) / 100))} onIncrease={() => setDuration((value) => Math.min(2, Math.round((value + 0.1) * 100) / 100))} fill={duration * 50} />
        <TextBlock muted style={styles.smallLabel}>من: {clips.find((item) => item.id === fromItemId)?.label ?? clips[0]?.label ?? "لا يوجد مقطع"}</TextBlock>
        <TextBlock muted style={styles.smallLabel}>إلى: {clips.find((item) => item.id === toItemId)?.label ?? clips.find((item) => item.id !== clips[0]?.id)?.label ?? "أضف أو انسخ مقطعاً ثانياً"}</TextBlock>
        <View style={styles.buttonRow}><StudioButton variant="secondary" onPress={previewTransition} style={styles.flexButton}>معاينة</StudioButton><StudioButton onPress={applyTransition} style={styles.flexButton}>تطبيق على القطع</StudioButton></View>
        {clips.length < 2 ? <StudioButton variant="quiet" icon="copy-outline" onPress={duplicateForCut}>نسخ المقطع لإنشاء نقطة انتقال</StudioButton> : null}
      </View>
      {document.transitions.map((transition) => {
        const transitionPreset = TRANSITION_PRESETS.find((item) => item.id === transition.presetId);
        return <Pressable key={transition.id} onPress={() => { setSelectedTransitionId(transition.id); setPresetId(transition.presetId); setDuration(transition.duration); setFromItemId(transition.fromItemId); setToItemId(transition.toItemId); }} style={styles.listRow}><Ionicons name="chevron-back" size={14} color={palette.muted} /><TextBlock style={styles.listName}>{transitionPreset?.label ?? transition.presetId}</TextBlock><TextBlock muted style={styles.listMeta}>{transition.duration.toFixed(2)} ث</TextBlock><Pressable onPress={() => onChangeDocument({ ...document, transitions: document.transitions.filter((item) => item.id !== transition.id), tracks: removeItem(document.tracks, transition.id) })} hitSlop={6}><Ionicons name="trash-outline" size={15} color={palette.danger} /></Pressable></Pressable>;
      })}
    </View>
  );
}

function KeyframesEditor(props: PanelProps) {
  const { document, onChangeDocument, playhead, onSeek, onToast } = props;
  const [targetId, setTargetId] = useState("video");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [curve, setCurve] = useState<Easing>("ease-in-out");
  const frames = document.keyframes.filter((frame) => frame.targetId === targetId).slice().sort((a, b) => a.time - b.time);
  const selectedFrame = frames.find((frame) => frame.id === selectedId) ?? frames.find((frame) => Math.abs(frame.time - playhead) < 0.08);
  const transform = frames.length ? interpolateKeyframes(frames, playhead) : document.baseTransforms[targetId] ?? DEFAULT_TRANSFORM;

  const updateValue = (key: keyof TransformValue, delta: number) => {
    const limits: Record<keyof TransformValue, [number, number]> = { x: [-250, 250], y: [-250, 250], scale: [0.1, 4], rotation: [-360, 360], opacity: [0, 1] };
    const [minimum, maximum] = limits[key];
    const nextValue = Math.max(minimum, Math.min(maximum, transform[key] + delta));
    if (selectedFrame) {
      onChangeDocument({ ...document, keyframes: document.keyframes.map((frame) => frame.id === selectedFrame.id ? { ...frame, value: { ...frame.value, [key]: nextValue } } : frame) });
    } else {
      onChangeDocument({ ...document, baseTransforms: { ...document.baseTransforms, [targetId]: { ...transform, [key]: nextValue } } });
    }
  };
  const addFrame = () => {
    const existing = frames.find((frame) => Math.abs(frame.time - playhead) < 0.08);
    if (existing) {
      onChangeDocument({ ...document, keyframes: document.keyframes.map((frame) => frame.id === existing.id ? { ...frame, value: transform, easing: curve } : frame) });
      setSelectedId(existing.id);
      onToast("حُدّث المفتاح عند موضع التشغيل الحالي.", "success");
      return;
    }
    const frame: Keyframe = { id: makeId("keyframe"), targetId, time: Math.max(0, playhead), value: transform, easing: curve };
    onChangeDocument({ ...document, keyframes: [...document.keyframes, frame] });
    setSelectedId(frame.id);
    onToast("أُضيف إطار مفتاحي. تُستوفى القيم بين النقاط في المعاينة.", "success");
  };
  const nudgeFrame = (delta: number) => {
    if (!selectedFrame) return;
    const nextTime = Math.max(0, Math.min(props.mediaDuration || Number.POSITIVE_INFINITY, selectedFrame.time + delta));
    onChangeDocument({ ...document, keyframes: document.keyframes.map((frame) => frame.id === selectedFrame.id ? { ...frame, time: nextTime } : frame) });
    onSeek(nextTime);
  };
  const setFrameCurve = (value: Easing) => {
    setCurve(value);
    if (selectedFrame) onChangeDocument({ ...document, keyframes: document.keyframes.map((frame) => frame.id === selectedFrame.id ? { ...frame, easing: value } : frame) });
  };
  const targets = [{ id: "video", label: "فيديو/صورة" }, { id: "text", label: "نص" }, { id: "sticker", label: "ملصق" }];
  return (
    <View style={styles.panelStack}>
      <PanelHeading title="الإطارات المفتاحية" note="حدد عنصراً، غيّر موضع التشغيل، واضبط قيماً لإنشاء حركة بين النقاط." />
      <View style={styles.wrapChips}>{targets.map((target) => <Pressable key={target.id} onPress={() => { setTargetId(target.id); setSelectedId(null); }} style={[styles.scopeButton, targetId === target.id && styles.scopeButtonActive]}><TextBlock style={[styles.scopeText, targetId === target.id && styles.scopeTextActive]}>{target.label}</TextBlock></Pressable>)}</View>
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}><TextBlock style={styles.sectionLabel}>القيمة عند {playhead.toFixed(2)} ث</TextBlock><Pressable accessibilityRole="button" onPress={addFrame} style={styles.addKeyButton}><Ionicons name="add" size={14} color="#071318" /><TextBlock style={styles.addKeyText}>{selectedFrame ? "تحديث المفتاح" : "إضافة مفتاح"}</TextBlock></Pressable></View>
        <ValueAdjuster label="الموقع الأفقي" value={`${Math.round(transform.x)} px`} onDecrease={() => updateValue("x", -10)} onIncrease={() => updateValue("x", 10)} />
        <ValueAdjuster label="الموقع العمودي" value={`${Math.round(transform.y)} px`} onDecrease={() => updateValue("y", -10)} onIncrease={() => updateValue("y", 10)} />
        <ValueAdjuster label="الحجم" value={`${transform.scale.toFixed(1)}×`} onDecrease={() => updateValue("scale", -0.1)} onIncrease={() => updateValue("scale", 0.1)} />
        <ValueAdjuster label="الدوران" value={`${Math.round(transform.rotation)}°`} onDecrease={() => updateValue("rotation", -15)} onIncrease={() => updateValue("rotation", 15)} />
        <ValueAdjuster label="الشفافية" value={`${Math.round(transform.opacity * 100)}%`} onDecrease={() => updateValue("opacity", -0.1)} onIncrease={() => updateValue("opacity", 0.1)} />
      </View>
      <View style={styles.sectionCard}>
        <TextBlock style={styles.sectionLabel}>منحنى الحركة</TextBlock>
        <View style={styles.wrapChips}>{KEYFRAME_CURVES.map((item) => <Pressable key={item.id} onPress={() => setFrameCurve(item.id)} style={[styles.scopeButton, curve === item.id && styles.scopeButtonActive]}><TextBlock style={[styles.scopeText, curve === item.id && styles.scopeTextActive]}>{item.label}</TextBlock></Pressable>)}</View>
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}><TextBlock style={styles.sectionLabel}>النقاط · {frames.length.toLocaleString("ar")}</TextBlock>{selectedFrame ? <TextBlock muted style={styles.smallLabel}>المحدد {selectedFrame.time.toFixed(2)}ث</TextBlock> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetList}>
          {frames.map((frame, index) => <Pressable key={frame.id} onPress={() => { setSelectedId(frame.id); setCurve(frame.easing); onSeek(frame.time); }} style={[styles.keyframeCard, selectedFrame?.id === frame.id && styles.presetCardActive]}><Ionicons name="diamond" size={15} color={palette.amber} /><TextBlock style={styles.keyframeCardTitle}>مفتاح {index + 1}</TextBlock><TextBlock muted style={styles.presetCategory}>{frame.time.toFixed(2)} ث</TextBlock></Pressable>)}
        </ScrollView>
        {selectedFrame ? <View style={styles.buttonRow}><StudioButton variant="secondary" onPress={() => nudgeFrame(-0.25)} style={styles.flexButton}>نقل −0.25ث</StudioButton><StudioButton variant="secondary" onPress={() => nudgeFrame(0.25)} style={styles.flexButton}>نقل +0.25ث</StudioButton><StudioButton variant="quiet" icon="trash-outline" onPress={() => { onChangeDocument({ ...document, keyframes: document.keyframes.filter((frame) => frame.id !== selectedFrame.id) }); setSelectedId(null); }}>حذف</StudioButton></View> : null}
      </View>
      <TextBlock muted style={styles.caveat}>تُعرض الحركة باستيفاء موضعي في المعاينة؛ لا تُدمج مفاتيح الحركة في فيديو مُصدّر.</TextBlock>
    </View>
  );
}

function SpeedRampEditor(props: PanelProps) {
  const { document, onChangeDocument, playhead, mediaDuration, onToast } = props;
  const currentSpeed = speedAt(document.speedPoints, playhead, 1);
  const nearest = document.speedPoints.slice().sort((a, b) => Math.abs(a.time - playhead) - Math.abs(b.time - playhead))[0];
  const setSpeedPoint = (speed: number) => {
    const existing = document.speedPoints.find((point) => Math.abs(point.time - playhead) < 0.12);
    const point = { id: existing?.id ?? makeId("speed"), time: playhead, speed, easing: existing?.easing ?? "linear" as Easing };
    onChangeDocument({ ...document, speedPoints: [...document.speedPoints.filter((item) => item.id !== point.id), point].sort((a, b) => a.time - b.time) });
  };
  const addDefaultEndpoints = () => {
    const end = mediaDuration > 0 ? mediaDuration : 6;
    const startPoint = { id: makeId("speed"), time: 0, speed: 1, easing: "linear" as Easing };
    const endPoint = { id: makeId("speed"), time: end, speed: 1, easing: "linear" as Easing };
    onChangeDocument({ ...document, speedPoints: [startPoint, endPoint] });
    onToast("أُضيفت نقطتا بداية ونهاية للمنحنى.", "success");
  };
  const setEasing = (easing: Easing) => {
    if (!nearest) return;
    onChangeDocument({ ...document, speedPoints: document.speedPoints.map((point) => point.id === nearest.id ? { ...point, easing } : point) });
  };
  return (
    <View style={styles.panelStack}>
      <PanelHeading title="Speed Ramp · منحنى السرعة" note="أضف نقاطاً زمنية واختر سرعة كل نقطة؛ يتغير معدل تشغيل المعاينة بين النقاط." />
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}><TextBlock style={styles.sectionLabel}>السرعة الحالية عند المؤشر</TextBlock><TextBlock style={styles.accentValue}>{currentSpeed.toFixed(2)}×</TextBlock></View>
        <View style={styles.speedCurve}>
          {document.speedPoints.length ? document.speedPoints.map((point, index) => <Pressable key={point.id} onPress={() => { props.onSeek(point.time); }} style={[styles.speedPoint, { height: 12 + point.speed * 22, backgroundColor: Math.abs(point.time - playhead) < 0.12 ? palette.cyan : "#48616C" }]} />) : <TextBlock muted style={styles.helperText}>أضف نقطتين لرسم المنحنى</TextBlock>}
        </View>
        <TextBlock muted style={styles.smallLabel}>توقيت المؤشر: {playhead.toFixed(2)} ث</TextBlock>
        <View style={styles.speedPresets}>{[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((value) => <Pressable key={value} onPress={() => setSpeedPoint(value)} style={[styles.speedChip, Math.abs(currentSpeed - value) < 0.06 && styles.scopeButtonActive]}><TextBlock style={styles.speedChipText}>{value}×</TextBlock></Pressable>)}</View>
        <View style={styles.buttonRow}><StudioButton variant="secondary" onPress={addDefaultEndpoints} style={styles.flexButton}>{document.speedPoints.length ? "إعادة تعيين المنحنى" : "إنشاء منحنى"}</StudioButton><StudioButton variant="quiet" onPress={() => onChangeDocument({ ...document, speedPoints: [] })}>مسح النقاط</StudioButton></View>
      </View>
      <View style={styles.sectionCard}>
        <TextBlock style={styles.sectionLabel}>تنعيم الانتقال بين السرعات</TextBlock>
        <View style={styles.wrapChips}>{KEYFRAME_CURVES.map((curve) => <Pressable key={curve.id} onPress={() => setEasing(curve.id)} style={[styles.scopeButton, nearest?.easing === curve.id && styles.scopeButtonActive]}><TextBlock style={[styles.scopeText, nearest?.easing === curve.id && styles.scopeTextActive]}>{curve.label}</TextBlock></Pressable>)}</View>
        {nearest ? <View style={styles.rowBetween}><TextBlock muted style={styles.smallLabel}>النقطة {nearest.time.toFixed(2)}ث · {nearest.speed}×</TextBlock><Pressable onPress={() => onChangeDocument({ ...document, speedPoints: document.speedPoints.filter((point) => point.id !== nearest.id) })}><Ionicons name="trash-outline" size={16} color={palette.danger} /></Pressable></View> : null}
      </View>
      <View style={styles.cutNotice}><Ionicons name="information-circle-outline" size={16} color={palette.amber} /><TextBlock style={styles.cutNoticeText}>تتغير سرعة التشغيل أثناء المعاينة فقط؛ لا يوجد توليد إطارات أو Optical Flow ولا ترميز نهائي.</TextBlock></View>
    </View>
  );
}

function TypographyEditor(props: PanelProps) {
  const { document, onChangeDocument, onToast } = props;
  const textStyle = document.typography;
  const update = (partial: Partial<Typography>) => onChangeDocument({ ...document, typography: { ...textStyle, ...partial } });
  const insertTextTrack = () => {
    const track = document.tracks.find((item) => item.kind === "text") ?? makeDefaultTracks().find((item) => item.kind === "text")!;
    const existing = track.items.find((item) => item.id === document.selectedItemId);
    const id = existing?.id ?? makeId("text");
    const item: TimelineItem = { id, kind: "text", label: textStyle.text.slice(0, 24) || "عنوان جديد", start: props.playhead, duration: 3, inPoint: 0, outPoint: 3 };
    const tracks = document.tracks.some((candidate) => candidate.id === track.id)
      ? replaceTrackItems(document.tracks, track.id, [...track.items.filter((candidate) => candidate.id !== id), item])
      : [...document.tracks, { ...track, items: [item] }];
    onChangeDocument({ ...document, selectedItemId: id, tracks });
    onToast("أُضيف النص إلى مسار النصوص للمعاينة.", "success");
  };
  return (
    <View style={styles.panelStack}>
      <PanelHeading title="الكتابة والخطوط" note="حرر النص وشكله وموضعه، ثم راجعه كطبقة فوق المعاينة." />
      <View style={styles.sectionCard}>
        <TextInput value={textStyle.text} onChangeText={(text) => update({ text: text.slice(0, 120) })} placeholder="اكتب نصاً..." placeholderTextColor="#787C89" multiline textAlign="right" style={styles.typographyInput} />
        <View style={styles.rowBetween}><TextBlock style={styles.sectionLabel}>حجم النص</TextBlock><TextBlock style={styles.accentValue}>{textStyle.size}px</TextBlock></View>
        <SliderLike label="الحجم" value={`${textStyle.size}px`} onDecrease={() => update({ size: Math.max(12, textStyle.size - 2) })} onIncrease={() => update({ size: Math.min(64, textStyle.size + 2) })} fill={(textStyle.size - 12) * 1.9} />
        <View style={styles.rowBetween}><TextBlock style={styles.smallLabel}>وزن الخط</TextBlock><Pressable onPress={() => update({ bold: !textStyle.bold })} style={[styles.scopeButton, textStyle.bold && styles.scopeButtonActive]}><TextBlock style={[styles.scopeText, textStyle.bold && styles.scopeTextActive]}>{textStyle.bold ? "عريض" : "عادي"}</TextBlock></Pressable></View>
        <View style={styles.wrapChips}>{(["right", "center", "left"] as const).map((align) => <Pressable key={align} onPress={() => update({ align })} style={[styles.scopeButton, textStyle.align === align && styles.scopeButtonActive]}><TextBlock style={[styles.scopeText, textStyle.align === align && styles.scopeTextActive]}>{align === "right" ? "يمين" : align === "center" ? "وسط" : "يسار"}</TextBlock></Pressable>)}</View>
        <TextBlock muted style={styles.smallLabel}>لون النص</TextBlock>
        <View style={styles.colorRow}>{EDITOR_COLORS.map((color) => <Pressable accessibilityRole="button" accessibilityLabel={`لون ${color}`} key={color} onPress={() => update({ color })} style={[styles.colorSwatch, { backgroundColor: color }, textStyle.color === color && styles.colorSelected]} />)}</View>
        <View style={styles.wrapChips}>{[
          { label: "خلفية شفافة", value: "transparent" }, { label: "خلفية داكنة", value: "rgba(0,0,0,0.60)" }, { label: "خلفية سماوية", value: "rgba(6,182,212,0.55)" },
        ].map((item) => <Pressable key={item.value} onPress={() => update({ background: item.value })} style={[styles.scopeButton, textStyle.background === item.value && styles.scopeButtonActive]}><TextBlock style={styles.scopeText}>{item.label}</TextBlock></Pressable>)}</View>
        <View style={styles.rowBetween}><TextBlock muted style={styles.smallLabel}>حدّ خارجي توضيحي</TextBlock><Pressable onPress={() => update({ outline: !textStyle.outline })} style={[styles.toggle, textStyle.outline && styles.toggleOn]}><View style={[styles.toggleKnob, textStyle.outline && styles.toggleKnobOn]} /></Pressable></View>
        <View style={styles.buttonRow}><StudioButton variant="secondary" onPress={() => update({ text: "" })} style={styles.flexButton}>مسح النص</StudioButton><StudioButton onPress={insertTextTrack} style={styles.flexButton}>إضافة إلى المسار</StudioButton></View>
      </View>
      <TextBlock muted style={styles.caveat}>هذه مجموعة خصائص تحرير أساسية لأن بقية قائمة المتطلبات النصية لم تصل في الرسالة؛ لا يوجد دمج للنص داخل الملف النهائي.</TextBlock>
    </View>
  );
}

function TimelineEditor(props: PanelProps) {
  const { document, onChangeDocument, playhead, mediaDuration, onSeek, onPickMedia, onToast } = props;
  const { width: screenWidth } = useWindowDimensions();
  const [zoom, setZoom] = useState(document.zoom || 1);
  const [selectedItemId, setSelectedItemId] = useState(document.selectedItemId);
  const [trimDelta, setTrimDelta] = useState(0.25);
  const pixelsPerSecond = 12 * zoom;
  const maxDuration = Math.max(mediaDuration, ...document.tracks.flatMap((track) => track.items.map((item) => item.start + item.duration)), 12);
  const gridWidth = Math.max(screenWidth - 142, (maxDuration + 2) * pixelsPerSecond);
  const selectedItem = document.tracks.flatMap((track) => track.items).find((item) => item.id === (selectedItemId ?? document.selectedItemId));
  const selectedTrack = document.tracks.find((track) => track.items.some((item) => item.id === selectedItem?.id));

  const updateItems = (trackId: string, items: TimelineItem[]) => onChangeDocument({ ...document, tracks: replaceTrackItems(document.tracks, trackId, items) });
  const addPlaceholder = (track: TimelineTrack) => {
    if (track.kind === "video") { onPickMedia("video"); return; }
    if (track.kind === "image") { onPickMedia("image"); return; }
    const length = track.kind === "text" ? 3 : track.kind === "sticker" ? 3 : 2;
    const label = track.kind === "text" ? (document.typography.text || "عنوان جديد") : track.kind === "sticker" ? "ملصق ✨" : track.kind === "music" ? "مسار صوت فارغ" : track.kind === "sfx" ? "مؤثر صوتي فارغ" : "مؤثر جديد";
    const item: TimelineItem = { id: makeId(track.kind), kind: track.kind, label, start: Math.max(0, playhead), duration: length, inPoint: 0, outPoint: length };
    const currentTrack = document.tracks.find((candidate) => candidate.id === track.id);
    const tracks = currentTrack ? replaceTrackItems(document.tracks, track.id, [...currentTrack.items, item]) : [...document.tracks, { ...track, items: [item] }];
    onChangeDocument({ ...document, selectedItemId: item.id, tracks });
    setSelectedItemId(item.id);
    if (track.kind === "music" || track.kind === "sfx") onToast("أُنشئ موضع للمسار فقط؛ اختيار ملف صوت ودمجه غير مفعّل بعد.", "warning");
    else onToast(`أُضيف ${label} إلى مخطط التحرير.`, "success");
  };
  const copySelected = () => {
    if (!selectedItem || !selectedTrack) return;
    const clone = copyItem(selectedItem);
    const tracks = replaceTrackItems(document.tracks, selectedTrack.id, [...selectedTrack.items, clone]);
    setSelectedItemId(clone.id);
    onChangeDocument({ ...document, selectedItemId: clone.id, tracks });
    onToast("أُدرجت نسخة في المسار؛ الوسيط الأصلي لم يُنسخ على الجهاز.", "success");
  };
  const trimSelectedStart = (delta: number) => {
    if (!selectedItem || !selectedTrack) return;
    updateItems(selectedTrack.id, selectedTrack.items.map((item) => item.id === selectedItem.id ? trimItemStart(item, delta) : item));
  };
  const trimSelectedEnd = (delta: number) => {
    if (!selectedItem || !selectedTrack) return;
    updateItems(selectedTrack.id, selectedTrack.items.map((item) => item.id === selectedItem.id ? trimItemEnd(item, delta) : item));
  };
  const splitSelected = () => {
    if (!selectedItem || !selectedTrack) return;
    const localTime = playhead - selectedItem.start;
    const parts = splitItem(selectedItem, localTime);
    if (!parts) { onToast("حرّك المؤشر إلى داخل العنصر بعيداً عن حافتيه ثم قسّمه.", "warning"); return; }
    const items = selectedTrack.items.flatMap((item) => item.id === selectedItem.id ? parts : [item]);
    updateItems(selectedTrack.id, items);
    setSelectedItemId(parts[1].id);
    onChangeDocument({ ...document, selectedItemId: parts[1].id, tracks: replaceTrackItems(document.tracks, selectedTrack.id, items) });
    onToast("قُسم مخطط العنصر عند المؤشر. المعاينة لا تنشئ ملفين منفصلين.", "success");
  };
  const moveSelected = (targetTrackId: string) => {
    if (!selectedItem) return;
    const tracks = moveItemToTrack(document.tracks, selectedItem.id, targetTrackId);
    onChangeDocument({ ...document, tracks });
  };
  const deleteSelected = () => {
    if (!selectedItem) return;
    onChangeDocument({ ...document, selectedItemId: null, tracks: removeItem(document.tracks, selectedItem.id), effects: document.effects.filter((effect) => effect.id !== selectedItem.id), transitions: document.transitions.filter((transition) => transition.id !== selectedItem.id) });
    setSelectedItemId(null);
    onToast("حُذف العنصر من مخطط التحرير.", "success");
  };
  const moveDragged = (track: TimelineTrack, item: TimelineItem, start: number) => {
    updateItems(track.id, track.items.map((candidate) => candidate.id === item.id ? moveItem(candidate, start) : candidate));
  };
  const chooseItem = (item: TimelineItem) => {
    setSelectedItemId(item.id);
    onChangeDocument({ ...document, selectedItemId: item.id });
    onSeek(Math.max(0, Math.min(mediaDuration || item.duration, item.start + item.inPoint)));
  };

  return (
    <View style={styles.panelStack}>
      <PanelHeading title="مسارات المونتاج" note="اسحب المقاطع لتغيير موضعها، حدد عنصراً ثم قصه أو قسّمه أو انسخه." />
      <View style={styles.zoomRow}><TextBlock muted style={styles.smallLabel}>تكبير الجدول</TextBlock><Pressable onPress={() => { const next = Math.max(0.5, Math.round((zoom - 0.25) * 100) / 100); setZoom(next); onChangeDocument({ ...document, zoom: next }); }} style={styles.zoomButton}><Ionicons name="remove" size={15} color={palette.text} /></Pressable><TextBlock style={styles.zoomValue}>{Math.round(zoom * 100)}%</TextBlock><Pressable onPress={() => { const next = Math.min(3, Math.round((zoom + 0.25) * 100) / 100); setZoom(next); onChangeDocument({ ...document, zoom: next }); }} style={styles.zoomButton}><Ionicons name="add" size={15} color={palette.text} /></Pressable></View>
      <View style={styles.timelineGridFrame}>
        <View style={styles.trackLabelsColumn}>
          <View style={styles.rulerLabelCell}><TextBlock muted style={styles.rulerText}>المسارات</TextBlock></View>
          {document.tracks.map((track) => <View key={track.id} style={styles.trackLabelRow}><Ionicons name={trackIcon(track.kind)} size={12} color={trackColor(track.kind)} /><TextBlock numberOfLines={1} style={styles.trackLabelText}>{track.label}</TextBlock></View>)}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width: gridWidth }} style={styles.timelineScroll}>
          <View style={{ width: gridWidth }}>
            <View style={styles.rulerTrack}>
              {Array.from({ length: Math.max(2, Math.floor(maxDuration / 2) + 1) }, (_, index) => <View key={index} style={{ position: "absolute", left: index * 2 * pixelsPerSecond }}><View style={styles.rulerTick} /><TextBlock muted style={styles.rulerText}>{`${Math.round(index * 2)}s`}</TextBlock></View>)}
            </View>
            {document.tracks.map((track) => (
              <View key={track.id} style={styles.timelineLane}>
                <Pressable onPress={(event) => onSeek(Math.max(0, Math.min(mediaDuration, (event.nativeEvent.locationX / pixelsPerSecond))))} style={StyleSheet.absoluteFill} accessibilityRole="button" />
                {track.items.map((item) => <DraggableTimelineItem key={item.id} item={item} selected={item.id === (selectedItemId ?? document.selectedItemId)} pixelsPerSecond={pixelsPerSecond} onSelect={() => chooseItem(item)} onMove={(start) => moveDragged(track, item, start)} />)}
              </View>
            ))}
            <View pointerEvents="none" style={[styles.gridPlayhead, { left: Math.max(0, playhead * pixelsPerSecond) }]}><View style={styles.gridPlayheadHead} /></View>
          </View>
        </ScrollView>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addTrackRow}>
        {document.tracks.map((track) => <Pressable key={track.id} onPress={() => addPlaceholder(track)} style={styles.addTrackChip}><Ionicons name="add" size={13} color={trackColor(track.kind)} /><TextBlock style={styles.addTrackChipText}>{track.kind === "video" ? "فيديو" : track.kind === "image" ? "صورة" : `+ ${track.label}`}</TextBlock></Pressable>)}
      </ScrollView>
      {selectedItem ? (
        <View style={styles.sectionCard}>
          <View style={styles.rowBetween}><TextBlock style={styles.sectionLabel} numberOfLines={1}>{selectedItem.label}</TextBlock><TextBlock muted style={styles.smallLabel}>{selectedItem.duration.toFixed(1)} ث · {selectedTrack?.label}</TextBlock></View>
          <View style={styles.rowBetween}><TextBlock muted style={styles.smallLabel}>قص الحواف بخطوة</TextBlock><View style={styles.rowCompact}><Pressable onPress={() => setTrimDelta((value) => Math.max(0.1, value - 0.1))} style={styles.miniAction}><Ionicons name="remove" size={13} color={palette.text} /></Pressable><TextBlock style={styles.smallLabel}>{trimDelta.toFixed(1)}ث</TextBlock><Pressable onPress={() => setTrimDelta((value) => Math.min(2, value + 0.1))} style={styles.miniAction}><Ionicons name="add" size={13} color={palette.text} /></Pressable></View></View>
          <View style={styles.actionGrid}>
            <SmallAction label="قص من البداية" icon="crop-outline" onPress={() => trimSelectedStart(trimDelta)} />
            <SmallAction label="قص من النهاية" icon="contract-outline" onPress={() => trimSelectedEnd(-trimDelta)} />
            <SmallAction label="تقسيم" icon="cut-outline" onPress={splitSelected} />
            <SmallAction label="نسخ" icon="copy-outline" onPress={copySelected} />
            <SmallAction label="تحريك يسار" icon="arrow-back-outline" onPress={() => moveDragged(selectedTrack!, selectedItem, selectedItem.start - 0.5)} />
            <SmallAction label="تحريك يمين" icon="arrow-forward-outline" onPress={() => moveDragged(selectedTrack!, selectedItem, selectedItem.start + 0.5)} />
            <SmallAction label="حذف" icon="trash-outline" danger onPress={deleteSelected} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addTrackRow}>{document.tracks.filter((track) => track.id !== selectedTrack?.id).map((track) => <Pressable key={track.id} onPress={() => moveSelected(track.id)} style={styles.addTrackChip}><Ionicons name={trackIcon(track.kind)} size={12} color={trackColor(track.kind)} /><TextBlock style={styles.addTrackChipText}>نقل إلى {track.label}</TextBlock></Pressable>)}</ScrollView>
        </View>
      ) : <TextBlock muted style={styles.helperText}>اختر مقطعاً أو أضف وسيطاً لعرض أدوات التحرير.</TextBlock>}
      <View style={styles.cutNotice}><Ionicons name="information-circle-outline" size={16} color={palette.amber} /><TextBlock style={styles.cutNoticeText}>القص والنسخ والنقل هنا تعدّل مخطط التحرير المحلي؛ لا تعيد قص ملف المصدر أو ترميزه.</TextBlock></View>
    </View>
  );
}

function DraggableTimelineItem({ item, selected, pixelsPerSecond, onSelect, onMove }: { item: TimelineItem; selected: boolean; pixelsPerSecond: number; onSelect: () => void; onMove: (start: number) => void }) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [dragX, setDragX] = useState(0);
  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) => { startX.current = event.nativeEvent.pageX; currentX.current = event.nativeEvent.pageX; }}
      onResponderMove={(event) => { currentX.current = event.nativeEvent.pageX; const delta = currentX.current - startX.current; if (Math.abs(delta) > 6) setDragX(delta); }}
      onResponderRelease={() => { const delta = currentX.current - startX.current; if (Math.abs(delta) > 6) onMove(Math.max(0, item.start + delta / pixelsPerSecond)); else onSelect(); setDragX(0); }}
      onResponderTerminate={() => setDragX(0)}
      accessibilityRole="button"
      accessibilityLabel={`اسحب لتحريك ${item.label}`}
      style={[styles.timelineItem, { left: item.start * pixelsPerSecond, width: Math.max(34, item.duration * pixelsPerSecond), transform: [{ translateX: dragX }], backgroundColor: trackColor(item.kind), borderColor: selected ? "#FFFFFF" : `${trackColor(item.kind)}AA` }, selected && styles.timelineItemSelected]}
    >
      <TextBlock numberOfLines={1} style={styles.timelineItemText}>{item.label}</TextBlock>
    </View>
  );
}

export function PreviewTreatment({ treatment, time }: { treatment: PreviewTreatmentValue; time: number }) {
  const intensity = Math.max(0.05, Math.min(1, treatment.intensity / 100));
  const type = treatment.preview;
  const bars = type === "scanline" || type === "noise" || type === "rgb" || type === "motion";
  const particles = type === "rain" || type === "snow" || type === "smoke";
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {type === "glow" || type === "lens" ? <View style={[styles.effectGlow, { opacity: 0.12 + intensity * 0.55, borderColor: type === "lens" ? "#FDBA74" : "#67E8F9" }]} /> : null}
      {type === "flash" ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,255,255,${0.1 + intensity * 0.24})` }]} /> : null}
      {type === "grade" ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(248,150,61,${0.08 + intensity * 0.23})` }]} /> : null}
      {type === "blur" ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(178,196,215,${0.06 + intensity * 0.22})` }]} /> : null}
      {type === "fade" ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${0.12 + intensity * 0.38})` }]} /> : null}
      {type === "rgb" ? <><View style={[styles.rgbEdge, { backgroundColor: `rgba(255,45,75,${intensity * 0.55})` }]} /><View style={[styles.rgbEdge, styles.rgbEdgeRight, { backgroundColor: `rgba(28,182,255,${intensity * 0.5})` }]} /></> : null}
      {bars ? Array.from({ length: type === "scanline" ? 12 : 7 }, (_, index) => <View key={index} style={[styles.effectBar, { top: `${(index * 13 + Math.floor(time * 7)) % 97}%`, left: type === "noise" ? `${(index * 17) % 42}%` : 0, width: type === "noise" ? `${28 + (index * 9) % 65}%` : "100%", height: type === "scanline" ? 1 : 2 + (index % 2), opacity: intensity * (type === "scanline" ? 0.28 : 0.62), backgroundColor: type === "rgb" ? (index % 2 ? "#EE315F" : "#4EDCF4") : type === "motion" ? "#FFFFFF" : "#DDE5EA" }]} />) : null}
      {particles ? Array.from({ length: 11 }, (_, index) => <View key={index} style={[styles.particle, { left: `${(index * 19 + 7) % 92}%`, top: `${(index * 23 + Math.floor(time * 13)) % 90}%`, opacity: intensity * 0.72, width: type === "rain" ? 2 : 6 + (index % 3) * 2, height: type === "rain" ? 12 : 6 + (index % 3) * 2, borderRadius: type === "smoke" ? 30 : 8, backgroundColor: type === "rain" ? "#CDEEFF" : type === "snow" ? "#FFFFFF" : "#BDC7D1" }]} />) : null}
      {treatment.kind === "transition" ? <View style={[styles.transitionFrame, { borderColor: "rgba(255,255,255,0.74)", opacity: 0.2 + intensity * 0.58, transform: [{ scale: 0.88 + Math.sin(time * 16) * 0.08 }, { rotate: `${Math.sin(time * 8) * 3}deg` }] }]} /> : null}
      {treatment.presetId === "glitch" || treatment.presetId === "vhs" ? <View style={[styles.glitchTag, { opacity: intensity }]}><Text style={styles.glitchText}>SIGNAL // {Math.floor(time * 1000).toString().padStart(4, "0")}</Text></View> : null}
    </View>
  );
}

export function treatmentMotion(preview: PreviewTreatmentValue["preview"], intensity: number, time: number) {
  const amount = Math.max(0, Math.min(1, intensity / 100));
  return {
    x: preview === "shake" ? Math.sin(time * 31) * amount * 7 : 0,
    y: preview === "shake" ? Math.cos(time * 27) * amount * 5 : 0,
    scale: preview === "zoom" ? 1 + Math.sin(time * 2.4) * amount * 0.08 : 1,
    rotation: 0,
  };
}

function PanelHeading({ title, note }: { title: string; note: string }) {
  return <View style={styles.panelHeading}><TextBlock style={styles.panelTitle}>{title}</TextBlock><TextBlock muted style={styles.panelNote}>{note}</TextBlock></View>;
}
function SliderLike({ label, value, onDecrease, onIncrease, fill }: { label: string; value: string; onDecrease: () => void; onIncrease: () => void; fill: number }) {
  return <View style={styles.sliderRow}><TextBlock muted style={styles.smallLabel}>{label}</TextBlock><Pressable onPress={onDecrease} style={styles.sliderButton}><Ionicons name="remove" size={14} color={palette.text} /></Pressable><View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${Math.max(5, Math.min(100, fill))}%` }]} /></View><Pressable onPress={onIncrease} style={styles.sliderButton}><Ionicons name="add" size={14} color={palette.text} /></Pressable><TextBlock style={styles.sliderValue}>{value}</TextBlock></View>;
}
function ValueAdjuster({ label, value, onDecrease, onIncrease }: { label: string; value: string; onDecrease: () => void; onIncrease: () => void }) {
  return <View style={styles.valueRow}><TextBlock muted style={styles.smallLabel}>{label}</TextBlock><View style={styles.rowCompact}><Pressable onPress={onDecrease} style={styles.miniAction}><Ionicons name="remove" size={13} color={palette.text} /></Pressable><TextBlock style={styles.adjustValue}>{value}</TextBlock><Pressable onPress={onIncrease} style={styles.miniAction}><Ionicons name="add" size={13} color={palette.text} /></Pressable></View></View>;
}
function SmallAction({ label, icon, onPress, danger = false }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.smallAction, danger && styles.smallActionDanger]}><Ionicons name={icon} size={14} color={danger ? palette.danger : palette.cyan} /><TextBlock style={[styles.smallActionText, danger && { color: palette.danger }]}>{label}</TextBlock></Pressable>;
}
function PreviewIcon({ kind }: { kind: EffectPreset["preview"] | TransitionPreset["preview"] }) {
  const icon: keyof typeof Ionicons.glyphMap = kind === "zoom" ? "scan-outline" : kind === "rotate" || kind === "shake" ? "sync-outline" : kind === "flash" || kind === "glow" || kind === "lens" ? "flash-outline" : kind === "fade" ? "contrast-outline" : kind === "rain" || kind === "snow" || kind === "smoke" ? "cloud-outline" : kind === "swipe" ? "swap-horizontal-outline" : kind === "blur" ? "water-outline" : kind === "grade" ? "color-palette-outline" : kind === "rgb" || kind === "glitch" || kind === "noise" ? "pulse-outline" : "film-outline";
  return <View style={styles.previewIcon}><Ionicons name={icon} size={19} color={palette.cyan} /></View>;
}
function effectFamilyLabel(family: EffectPreset["family"]) {
  return family === "distortion" ? "تشويش" : family === "light" ? "ضوء" : family === "motion" ? "حركة" : family === "cinema" ? "سينما" : family === "atmosphere" ? "جوّ" : "تلاشي";
}
function trackIcon(kind: TimelineTrack["kind"]): keyof typeof Ionicons.glyphMap {
  if (kind === "video") return "videocam-outline";
  if (kind === "image") return "image-outline";
  if (kind === "text") return "text-outline";
  if (kind === "music") return "musical-notes-outline";
  if (kind === "sfx") return "volume-high-outline";
  if (kind === "sticker") return "happy-outline";
  return "color-filter-outline";
}
function trackColor(kind: TimelineTrack["kind"]) {
  return kind === "video" ? "#1A7583" : kind === "image" ? "#3F6F9D" : kind === "text" ? "#926624" : kind === "music" ? "#594A8F" : kind === "sfx" ? "#76533C" : kind === "sticker" ? "#8E4C70" : "#396C5E";
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.70)" },
  sheet: { height: "86%", backgroundColor: "#101117", borderTopLeftRadius: 25, borderTopRightRadius: 25, borderColor: "#30323E", borderWidth: 1, paddingTop: 10, paddingHorizontal: 15, paddingBottom: 12, gap: 10 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#535562", marginBottom: 1 },
  sheetHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  modePill: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: "#16252B" },
  modePillText: { fontSize: 9, fontWeight: "800", color: "#B9F2F7" },
  closeButton: { width: 33, height: 33, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "#22242D" },
  tabRow: { flexDirection: "row-reverse", gap: 6, paddingVertical: 1 },
  tabButton: { minHeight: 35, flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingHorizontal: 9, borderRadius: 10, backgroundColor: "#191A22", borderColor: "#2B2D38", borderWidth: 1 },
  tabButtonActive: { backgroundColor: "#112A31", borderColor: "#277080" },
  tabLabel: { fontSize: 9, color: "#A9ADBA" },
  tabLabelActive: { color: "#A5F3FC", fontWeight: "800" },
  panelScroll: { flex: 1 },
  panelContent: { paddingBottom: 20 },
  bottomBoundary: { fontSize: 8, textAlign: "center", paddingTop: 2 },
  panelStack: { gap: 11, paddingBottom: 10 },
  panelHeading: { alignItems: "flex-end", gap: 4, paddingVertical: 2 },
  panelTitle: { fontSize: 15, fontWeight: "900" },
  panelNote: { fontSize: 9, lineHeight: 15, textAlign: "right" },
  filterChips: { flexDirection: "row-reverse", gap: 5, flexWrap: "wrap" },
  categoryChip: { color: "#9DA6B8", fontSize: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: "#1B1D27" },
  presetList: { flexDirection: "row-reverse", gap: 8, paddingVertical: 1 },
  presetCard: { width: 77, minHeight: 79, borderRadius: 13, backgroundColor: "#191A22", borderColor: "#2B2D38", borderWidth: 1, padding: 7, alignItems: "center", justifyContent: "center", gap: 4 },
  presetCardActive: { borderColor: palette.cyan, backgroundColor: "#13252C" },
  previewIcon: { width: 34, height: 30, borderRadius: 9, backgroundColor: "#112B33", alignItems: "center", justifyContent: "center" },
  presetName: { fontSize: 8, fontWeight: "800", textAlign: "center" },
  presetCategory: { fontSize: 7 },
  sectionCard: { borderRadius: 15, padding: 11, gap: 9, backgroundColor: "#191A22", borderColor: "#2B2D38", borderWidth: 1 },
  rowBetween: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowCompact: { flexDirection: "row", alignItems: "center", gap: 5 },
  sectionLabel: { fontSize: 10, fontWeight: "800" },
  accentValue: { fontSize: 10, color: "#9AE8F0", fontWeight: "800" },
  smallLabel: { fontSize: 8 },
  sliderRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, minHeight: 30 },
  sliderButton: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: "#2A2C37" },
  sliderTrack: { flex: 1, height: 5, borderRadius: 4, backgroundColor: "#363844", overflow: "hidden" },
  sliderFill: { height: "100%", borderRadius: 4, backgroundColor: palette.cyan },
  sliderValue: { minWidth: 34, fontSize: 8, textAlign: "left" },
  scopeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, flexWrap: "wrap" },
  scopeButton: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: "#23252E", borderColor: "#343642", borderWidth: 1 },
  scopeButtonActive: { backgroundColor: "#12313A", borderColor: "#277080" },
  scopeText: { fontSize: 8, color: "#B9BECA" },
  scopeTextActive: { color: "#A5F3FC", fontWeight: "800" },
  wrapChips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  buttonRow: { flexDirection: "row-reverse", gap: 7, alignItems: "center" },
  flexButton: { flex: 1 },
  listRow: { minHeight: 34, flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#20212A" },
  listRowActive: { borderColor: palette.cyan, borderWidth: 1 },
  listName: { flex: 1, fontSize: 9, fontWeight: "700" },
  listMeta: { fontSize: 8 },
  helperText: { color: palette.muted, fontSize: 9, textAlign: "right", lineHeight: 15 },
  caveat: { fontSize: 8, lineHeight: 14, textAlign: "right", color: "#A9A392" },
  cutNotice: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 7, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 10, backgroundColor: "#282318", borderColor: "#4B3D22", borderWidth: 1 },
  cutNoticeText: { flex: 1, fontSize: 8, lineHeight: 14, color: "#D6CAA9" },
  keyframeCard: { width: 86, height: 59, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 11, borderWidth: 1, borderColor: "#343642", backgroundColor: "#22232B" },
  keyframeCardTitle: { fontSize: 8, fontWeight: "800" },
  valueRow: { minHeight: 30, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  miniAction: { width: 23, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: "#30323D" },
  adjustValue: { minWidth: 44, textAlign: "center", fontSize: 8, fontFamily: "monospace" },
  addKeyButton: { flexDirection: "row-reverse", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: palette.cyan },
  addKeyText: { color: "#061318", fontSize: 8, fontWeight: "900" },
  speedCurve: { height: 80, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingHorizontal: 6, paddingBottom: 4, borderRadius: 11, backgroundColor: "#101218", borderColor: "#2B2D38", borderWidth: 1 },
  speedPoint: { width: 17, minHeight: 16, borderRadius: 7, borderColor: "#8BE8F2", borderWidth: 1 },
  speedPresets: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5 },
  speedChip: { minWidth: 36, alignItems: "center", paddingHorizontal: 7, paddingVertical: 6, borderRadius: 8, backgroundColor: "#24262F", borderWidth: 1, borderColor: "#363844" },
  speedChipText: { fontSize: 8, fontWeight: "800" },
  typographyInput: { minHeight: 54, maxHeight: 105, borderRadius: 11, borderColor: "#383A45", borderWidth: 1, backgroundColor: "#101117", color: palette.text, padding: 10, writingDirection: "rtl", textAlignVertical: "top", fontSize: 13 },
  colorRow: { flexDirection: "row-reverse", gap: 8, alignItems: "center" },
  colorSwatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "#747784" },
  colorSelected: { borderColor: palette.cyan, borderWidth: 3 },
  toggle: { width: 38, height: 22, borderRadius: 14, backgroundColor: "#353742", padding: 3, justifyContent: "center" },
  toggleOn: { backgroundColor: "#146678" },
  toggleKnob: { width: 16, height: 16, borderRadius: 9, backgroundColor: "#D8DBE4", alignSelf: "flex-start" },
  toggleKnobOn: { alignSelf: "flex-end", backgroundColor: "#FFFFFF" },
  zoomRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  zoomButton: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#292B35", alignItems: "center", justifyContent: "center" },
  zoomValue: { width: 35, textAlign: "center", fontSize: 8, fontFamily: "monospace" },
  timelineGridFrame: { minHeight: 210, maxHeight: 316, flexDirection: "row-reverse", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#2B2D38", backgroundColor: "#14151C" },
  trackLabelsColumn: { width: 68, backgroundColor: "#191A22", borderLeftWidth: 1, borderLeftColor: "#30323B" },
  rulerLabelCell: { height: 23, justifyContent: "center", paddingHorizontal: 6 },
  trackLabelRow: { height: 37, flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 5, borderTopWidth: 1, borderTopColor: "#272933" },
  trackLabelText: { flex: 1, fontSize: 7, fontWeight: "700" },
  timelineScroll: { flex: 1 },
  rulerTrack: { height: 23, position: "relative", borderBottomWidth: 1, borderBottomColor: "#30323B" },
  rulerTick: { height: 6, width: 1, backgroundColor: "#757B88", marginBottom: 2 },
  rulerText: { fontSize: 7, color: "#9A9EAA", fontFamily: "monospace" },
  timelineLane: { height: 37, position: "relative", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#272933" },
  timelineItem: { position: "absolute", top: 5, bottom: 5, borderRadius: 6, borderWidth: 1, overflow: "hidden" },
  timelineItemSelected: { borderWidth: 2 },
  timelineItemPressable: { flex: 1, justifyContent: "center", paddingHorizontal: 4 },
  timelineItemText: { fontSize: 7, color: "#FFFFFF", fontWeight: "800" },
  gridPlayhead: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "#E7F9FF", zIndex: 5 },
  gridPlayheadHead: { position: "absolute", top: 17, left: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
  addTrackRow: { flexDirection: "row-reverse", gap: 6, paddingVertical: 2 },
  addTrackChip: { flexDirection: "row-reverse", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderColor: "#333640", borderWidth: 1, backgroundColor: "#1B1D26" },
  addTrackChipText: { fontSize: 8, color: "#C8CBD4" },
  actionGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5 },
  smallAction: { minWidth: "30%", flexGrow: 1, height: 32, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 8, backgroundColor: "#24262F", borderColor: "#353742", borderWidth: 1 },
  smallActionDanger: { backgroundColor: "#2B1B20", borderColor: "#58333F" },
  smallActionText: { fontSize: 7, color: "#CFD3DD", fontWeight: "700" },
  effectGlow: Platform.select({
    web: { position: "absolute", top: "9%", bottom: "9%", left: "8%", right: "8%", borderWidth: 3, borderRadius: 20, boxShadow: "0px 0px 16px rgba(103,232,249,0.8)" },
    default: { position: "absolute", top: "9%", bottom: "9%", left: "8%", right: "8%", borderWidth: 3, borderRadius: 20, shadowColor: "#67E8F9", shadowOpacity: 0.8, shadowRadius: 16 },
  }),
  rgbEdge: { position: "absolute", top: "15%", bottom: "12%", left: 0, width: 5 },
  rgbEdgeRight: { left: undefined, right: 0 },
  effectBar: { position: "absolute" },
  particle: { position: "absolute" },
  transitionFrame: { position: "absolute", top: "14%", bottom: "14%", left: "10%", right: "10%", borderWidth: 2, borderRadius: 10 },
  glitchTag: { position: "absolute", top: "41%", left: "20%", right: "20%", alignItems: "center", paddingVertical: 4, backgroundColor: "rgba(0,0,0,0.36)" },
  glitchText: { color: "#FFFFFF", fontSize: 8, letterSpacing: 1, fontWeight: "900" },
});
