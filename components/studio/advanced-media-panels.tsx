import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { COLOR_PRESETS, VIDEO_TEMPLATES } from "@/features/editor/catalog";
import {
  makeId,
  type AudioRole,
  type ColorGrade,
  type EditorDocument,
  type ExportFrameRate,
  type ExportFormat,
  type ExportResolution,
  type TimelineItem,
} from "@/features/editor/model";
import { makeDefaultTracks, removeItem, replaceTrackItems } from "@/features/editor/timeline";
import { persistMediaUri } from "@/features/editor/storage";
import { palette } from "@/constants/studio";
import { StudioButton, TextBlock } from "@/components/studio/primitives";

type Props = {
  document: EditorDocument;
  onChangeDocument: (document: EditorDocument) => void;
  playhead: number;
  onToast: (message: string, tone?: "info" | "warning" | "success") => void;
};

type GradeKey = keyof ColorGrade;
const GRADE_CONTROLS: { key: GradeKey; label: string; step: number }[] = [
  { key: "brightness", label: "السطوع", step: 5 },
  { key: "contrast", label: "التباين", step: 5 },
  { key: "saturation", label: "التشبع", step: 5 },
  { key: "temperature", label: "الحرارة", step: 5 },
  { key: "tint", label: "الصبغة", step: 5 },
  { key: "sharpness", label: "الحدة", step: 5 },
  { key: "shadows", label: "الظلال", step: 5 },
  { key: "highlights", label: "الإضاءات", step: 5 },
];

export function AudioTracksEditor({ document, onChangeDocument, playhead, onToast }: Props) {
  const roles: { id: AudioRole; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: "music", label: "موسيقى", icon: "musical-notes-outline" },
    { id: "voice", label: "تعليق صوتي", icon: "mic-outline" },
    { id: "sfx", label: "مؤثر صوتي", icon: "volume-high-outline" },
  ];
  const audioItems = document.tracks.filter((track) => track.kind === "music" || track.kind === "voice" || track.kind === "sfx").flatMap((track) => track.items);

  const pickAudio = async (role: AudioRole) => {
    if (audioItems.length >= 8) {
      onToast("الحد الأقصى لمعاينة المسارات الصوتية هو 8 ملفات في المشروع.", "warning");
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", multiple: false, copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      const stored = await persistMediaUri(file.uri, file.name);
      const id = makeId(role);
      const duration = 0.25;
      const item: TimelineItem = {
        id,
        kind: role,
        audioRole: role,
        label: file.name,
        uri: stored.uri,
        persistentUri: stored.persistent,
        start: Math.max(0, playhead),
        duration,
        inPoint: 0,
        outPoint: duration,
        audioGain: 0.85,
        fadeInDuration: 0,
        fadeOutDuration: 0,
      };
      const defaults = makeDefaultTracks();
      const currentTrack = document.tracks.find((track) => track.kind === role) ?? defaults.find((track) => track.kind === role)!;
      const tracks = document.tracks.some((track) => track.id === currentTrack.id)
        ? replaceTrackItems(document.tracks, currentTrack.id, [...currentTrack.items, item])
        : [...document.tracks, { ...currentTrack, items: [item] }];
      onChangeDocument({ ...document, duration: Math.max(document.duration, item.start + duration), tracks });
      onToast(stored.persistent ? `أُضيف «${file.name}» وحُفظ في ملفات التطبيق.` : `أُضيف «${file.name}» للمعاينة الحالية؛ أعد اختياره بعد إعادة تشغيل الويب.`, stored.persistent ? "success" : "info");
    } catch {
      onToast("تعذّر فتح ملف الصوت أو حفظه. جرّب ملفاً صوتياً آخر.", "warning");
    }
  };

  const patchItem = (itemId: string, patch: Partial<TimelineItem>) => {
    const track = document.tracks.find((entry) => entry.items.some((item) => item.id === itemId));
    if (!track) return;
    const items = track.items.map((item) => item.id === itemId ? { ...item, ...patch } : item);
    onChangeDocument({ ...document, tracks: replaceTrackItems(document.tracks, track.id, items) });
  };
  const deleteItem = (itemId: string) => {
    onChangeDocument({ ...document, tracks: removeItem(document.tracks, itemId) });
    onToast("حُذف مسار الصوت من مستند التحرير.", "success");
  };

  return (
    <View style={styles.panelStack}>
      <PanelHeading title="مسارات الصوت" note="أضف حتى 8 ملفات موسيقى أو تعليقاً صوتياً أو مؤثرات صوتية. تُعاين المسارات بتزامن زمني؛ لا تُدمج في MP4." />
      <View style={styles.roleRow}>
        {roles.map((role) => (
          <Pressable key={role.id} accessibilityRole="button" onPress={() => void pickAudio(role.id)} style={styles.roleButton}>
            <Ionicons name={role.icon} size={16} color={role.id === "voice" ? "#FFC479" : palette.cyan} />
            <TextBlock style={styles.roleLabel}>إضافة {role.label}</TextBlock>
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <TextBlock style={styles.sectionLabel}>خفض الموسيقى أثناء الكلام</TextBlock>
          <ToggleChip active={document.audioSettings.duckMusicUnderVoice} label={document.audioSettings.duckMusicUnderVoice ? "مفعل" : "متوقف"} onPress={() => onChangeDocument({ ...document, audioSettings: { ...document.audioSettings, duckMusicUnderVoice: !document.audioSettings.duckMusicUnderVoice } })} />
        </View>
        <SliderLike label="مستوى الموسيقى مع التعليق" value={`${Math.round(document.audioSettings.voiceDuckingGain * 100)}%`} fill={document.audioSettings.voiceDuckingGain * 100} onDecrease={() => onChangeDocument({ ...document, audioSettings: { ...document.audioSettings, voiceDuckingGain: Math.max(0.05, document.audioSettings.voiceDuckingGain - 0.05) } })} onIncrease={() => onChangeDocument({ ...document, audioSettings: { ...document.audioSettings, voiceDuckingGain: Math.min(0.75, document.audioSettings.voiceDuckingGain + 0.05) } })} />
        <TextBlock muted style={styles.helperText}>يُخفض صوت مسار «موسيقى» عند تداخل توقيته مع مسار «تعليق صوتي» فقط؛ لا يتعرف التطبيق آلياً على الكلام من الفيديو.</TextBlock>
      </View>
      {audioItems.length ? audioItems.map((item) => (
        <AudioItemCard key={item.id} item={item} onPatch={(patch) => patchItem(item.id, patch)} onDelete={() => deleteItem(item.id)} />
      )) : <TextBlock muted style={styles.helperText}>لا توجد مسارات صوت. أضف ملفاً من جهازك لبدء المعاينة المتزامنة.</TextBlock>}
      <TextBlock muted style={styles.caveat}>تعمل معاينة الصوت عبر مشغلات Expo مستقلة. التزامن مع التشغيل والمعاينة الصوتية يحتاج اختباراً على الهاتف؛ خلاطاً نهائياً ومزجاً/تصديراً إلى MP4 غير متاحين دون محرك معالجة.</TextBlock>
    </View>
  );
}

function AudioItemCard({ item, onPatch, onDelete }: { item: TimelineItem; onPatch: (patch: Partial<TimelineItem>) => void; onDelete: () => void }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.rowBetween}>
        <Pressable accessibilityRole="button" accessibilityLabel={`حذف ${item.label}`} onPress={onDelete} style={styles.iconButton}><Ionicons name="trash-outline" size={14} color={palette.danger} /></Pressable>
        <View style={styles.audioTitleGroup}>
          <TextBlock numberOfLines={1} style={styles.audioName}>{item.label}</TextBlock>
          <TextBlock muted style={styles.smallLabel}>{item.audioRole === "voice" ? "تعليق صوتي" : item.audioRole === "sfx" ? "مؤثر صوتي" : "موسيقى"}{item.persistentUri ? " · محفوظ على الجهاز" : " · يحتاج إعادة اختيار على الويب"}</TextBlock>
        </View>
        <Ionicons name={item.audioRole === "voice" ? "mic-outline" : "musical-notes-outline"} size={15} color={item.audioRole === "voice" ? "#FFC479" : "#BCAEFF"} />
      </View>
      <SliderLike label="المستوى" value={`${Math.round((item.audioGain ?? 0.85) * 100)}%`} fill={(item.audioGain ?? 0.85) * 100} onDecrease={() => onPatch({ audioGain: Math.max(0, (item.audioGain ?? 0.85) - 0.1) })} onIncrease={() => onPatch({ audioGain: Math.min(1, (item.audioGain ?? 0.85) + 0.1) })} />
      <ValueAdjuster label="بداية المسار" value={`${item.start.toFixed(1)}ث`} onDecrease={() => onPatch({ start: Math.max(0, item.start - 0.25) })} onIncrease={() => onPatch({ start: item.start + 0.25 })} />
      <ValueAdjuster label="مدة المسار" value={`${item.duration.toFixed(1)}ث`} onDecrease={() => onPatch({ duration: Math.max(1, item.duration - 0.5), outPoint: Math.max(item.inPoint + 1, item.outPoint - 0.5) })} onIncrease={() => onPatch({ duration: item.duration + 0.5, outPoint: item.outPoint + 0.5 })} />
      <ValueAdjuster label="تلاشي البداية" value={`${(item.fadeInDuration ?? 0).toFixed(1)}ث`} onDecrease={() => onPatch({ fadeInDuration: Math.max(0, (item.fadeInDuration ?? 0) - 0.2) })} onIncrease={() => onPatch({ fadeInDuration: Math.min(item.duration / 2, (item.fadeInDuration ?? 0) + 0.2) })} />
      <ValueAdjuster label="تلاشي النهاية" value={`${(item.fadeOutDuration ?? 0).toFixed(1)}ث`} onDecrease={() => onPatch({ fadeOutDuration: Math.max(0, (item.fadeOutDuration ?? 0) - 0.2) })} onIncrease={() => onPatch({ fadeOutDuration: Math.min(item.duration / 2, (item.fadeOutDuration ?? 0) + 0.2) })} />
    </View>
  );
}

export function ColorGradeEditor({ document, onChangeDocument, compareOriginal, onCompareOriginal, onToast }: Props & { compareOriginal: boolean; onCompareOriginal: (value: boolean) => void }) {
  const [presetLabel, setPresetLabel] = useState("إعداد لوني");
  const setGrade = (key: GradeKey, delta: number) => {
    if (compareOriginal) return;
    const next = { ...document.colorGrade, [key]: Math.max(-100, Math.min(100, document.colorGrade[key] + delta)) };
    onChangeDocument({ ...document, colorGrade: next });
  };
  const applyPreset = (values: ColorGrade, label: string) => {
    onCompareOriginal(false);
    onChangeDocument({ ...document, colorGrade: { ...values } });
    onToast(`طُبّق إعداد «${label}» على معاينة المشروع.`, "success");
  };
  const saveCurrent = () => {
    if (document.favoriteColorPresets.length >= 12) {
      onToast("وصلت إلى 12 إعداد لون محفوظاً. احذف إعداداً قبل إضافة آخر.", "warning");
      return;
    }
    const saved = { id: makeId("grade"), label: presetLabel.trim() || `إعداد ${document.favoriteColorPresets.length + 1}`, values: { ...document.colorGrade } };
    onChangeDocument({ ...document, favoriteColorPresets: [...document.favoriteColorPresets, saved] });
    onToast(`حُفظ «${saved.label}» ضمن إعدادات اللون المفضلة.`, "success");
  };
  const toggleCompare = () => onCompareOriginal(!compareOriginal);

  return (
    <View style={styles.panelStack}>
      <PanelHeading title="تصحيح الألوان" note="اضبط القيم واحفظ حتى 12 إعداداً مفضلاً. المقارنة تبدّل معاينة الشاشة بين القيم الحالية والأصلية." />
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}><TextBlock style={styles.sectionLabel}>مقارنة قبل / بعد</TextBlock><ToggleChip active={compareOriginal} label={compareOriginal ? "قبل" : "بعد"} onPress={toggleCompare} /></View>
        {GRADE_CONTROLS.map((control) => (
          <SliderLike key={control.key} label={control.label} value={`${document.colorGrade[control.key] > 0 ? "+" : ""}${document.colorGrade[control.key]}`} fill={(document.colorGrade[control.key] + 100) / 2} onDecrease={() => setGrade(control.key, -control.step)} onIncrease={() => setGrade(control.key, control.step)} />
        ))}
        {compareOriginal ? <TextBlock muted style={styles.helperText}>تعرض المقارنة النسخة الأصلية فقط؛ أوقفها للعودة إلى قيم المعاينة المحفوظة.</TextBlock> : null}
      </View>
      <TextBlock style={styles.sectionLabel}>فلاتر سينمائية جاهزة</TextBlock>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
        {COLOR_PRESETS.map((preset) => <Pressable key={preset.id} onPress={() => applyPreset(preset.values, preset.label)} style={styles.colorPreset}><View style={[styles.colorSwatch, { backgroundColor: preset.values.temperature < 0 ? "#496A95" : preset.values.saturation < -50 ? "#94949B" : preset.values.temperature > 10 ? "#CC9465" : "#54A8B7" }]} /><TextBlock numberOfLines={1} style={styles.smallLabel}>{preset.label}</TextBlock></Pressable>)}
      </ScrollView>
      <View style={styles.sectionCard}>
        <TextBlock style={styles.sectionLabel}>حفظ الإعداد الحالي</TextBlock>
        <TextInput value={presetLabel} onChangeText={setPresetLabel} maxLength={28} textAlign="right" placeholder="اسم الإعداد" placeholderTextColor="#757989" style={styles.textInput} />
        <StudioButton variant="secondary" icon="bookmark-outline" onPress={saveCurrent}>حفظ ضمن المفضلة</StudioButton>
      </View>
      {document.favoriteColorPresets.length ? <View style={styles.sectionCard}>
        <TextBlock style={styles.sectionLabel}>إعداداتي المفضلة · {document.favoriteColorPresets.length}/12</TextBlock>
        {document.favoriteColorPresets.map((preset) => <View key={preset.id} style={styles.savedPresetRow}><Pressable onPress={() => applyPreset(preset.values, preset.label)} style={styles.savedPresetApply}><Ionicons name="color-palette-outline" size={14} color={palette.cyan} /><TextBlock style={styles.savedPresetText}>{preset.label}</TextBlock></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`حذف إعداد ${preset.label}`} onPress={() => onChangeDocument({ ...document, favoriteColorPresets: document.favoriteColorPresets.filter((entry) => entry.id !== preset.id) })} style={styles.iconButton}><Ionicons name="trash-outline" size={13} color={palette.danger} /></Pressable></View>)}
      </View> : null}
      <TextBlock muted style={styles.caveat}>تعالج Expo Video المرئيات في طبقة المعاينة فقط (مرشحات CSS على الويب وتلوين تقريبي على الهاتف). لا تنتقل هذه التعديلات إلى ملف فيديو مُصدّر؛ بعض القيم اللونية لا تتوافر لها معالجة بكسلية أصلية.</TextBlock>
    </View>
  );
}

export function ChromaKeyEditor({ document, onChangeDocument, onToast }: Props) {
  const colors = ["#00FF00", "#00D9FF", "#0066FF", "#FF00AA", "#FFFF00"];
  const backgrounds = ["#111827", "#164E63", "#312E81", "#7F1D1D", "#F1F5F9"];
  const chooseBackground = async () => {
    try {
      if (await ImagePicker.requestMediaLibraryPermissionsAsync().then((result) => !result.granted)) {
        onToast("اسمح بالوصول إلى الصور لاختيار خلفية معاينة.", "warning");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, allowsEditing: false });
      const selected = result.canceled ? null : result.assets[0];
      if (!selected) return;
      const stored = await persistMediaUri(selected.uri, selected.fileName ?? "background.jpg");
      onChangeDocument({ ...document, chromaKey: { ...document.chromaKey, backgroundUri: stored.uri } });
      onToast("سُجلت الخلفية البديلة كإعداد؛ عزل لون الفيديو غير متاح دون محرك تركيب.", "info");
    } catch {
      onToast("تعذّر اختيار صورة الخلفية.", "warning");
    }
  };
  const update = (patch: Partial<EditorDocument["chromaKey"]>) => onChangeDocument({ ...document, chromaKey: { ...document.chromaKey, ...patch } });

  return (
    <View style={styles.panelStack}>
      <PanelHeading title="الشاشة الخضراء · Chroma Key" note="اختر لون المفتاح والحساسية وحواف المزج واحفظ إعداد الخلفية للمشروع." />
      <View style={styles.engineUnavailable}>
        <Ionicons name="hardware-chip-outline" size={17} color={palette.amber} />
        <TextBlock style={styles.engineUnavailableText}>محرك إزالة البكسلات غير موجود في إصدار Expo الحالي</TextBlock>
      </View>
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}><TextBlock style={styles.sectionLabel}>تفعيل إعداد Chroma Key</TextBlock><ToggleChip active={document.chromaKey.enabled} label={document.chromaKey.enabled ? "الإعداد محفوظ" : "متوقف"} onPress={() => update({ enabled: !document.chromaKey.enabled })} /></View>
        <TextBlock muted style={styles.smallLabel}>لون الخلفية المراد عزله</TextBlock>
        <View style={styles.swatchRow}>{colors.map((color) => <Pressable key={color} onPress={() => update({ keyColor: color })} style={[styles.swatchButton, { backgroundColor: color }, document.chromaKey.keyColor === color && styles.swatchSelected]} />)}</View>
        <SliderLike label="الحساسية" value={`${document.chromaKey.sensitivity}%`} fill={document.chromaKey.sensitivity} onDecrease={() => update({ sensitivity: Math.max(0, document.chromaKey.sensitivity - 5) })} onIncrease={() => update({ sensitivity: Math.min(100, document.chromaKey.sensitivity + 5) })} />
        <SliderLike label="نعومة الحواف" value={`${document.chromaKey.edgeSoftness}%`} fill={document.chromaKey.edgeSoftness} onDecrease={() => update({ edgeSoftness: Math.max(0, document.chromaKey.edgeSoftness - 5) })} onIncrease={() => update({ edgeSoftness: Math.min(100, document.chromaKey.edgeSoftness + 5) })} />
      </View>
      <View style={styles.sectionCard}>
        <TextBlock style={styles.sectionLabel}>الخلفية البديلة · إعداد محفوظ</TextBlock>
        <View style={styles.swatchRow}>{backgrounds.map((color) => <Pressable key={color} accessibilityLabel={`لون خلفية ${color}`} onPress={() => update({ backgroundColor: color, backgroundUri: null })} style={[styles.swatchButton, { backgroundColor: color }, document.chromaKey.backgroundColor === color && !document.chromaKey.backgroundUri && styles.swatchSelected]} />)}</View>
        {document.chromaKey.backgroundUri ? <Image source={{ uri: document.chromaKey.backgroundUri }} style={styles.backgroundThumb} resizeMode="cover" /> : null}
        <StudioButton variant="secondary" icon="image-outline" onPress={() => void chooseBackground()}>اختيار صورة خلفية</StudioButton>
        <Pressable onPress={() => onToast("إزالة خلفية الأشخاص بالذكاء الاصطناعي غير متاحة: لا يوجد نموذج محلي مدمج أو محرك صور متصل.", "warning")} style={styles.unavailableButton}><Ionicons name="person-remove-outline" size={14} color={palette.muted} /><TextBlock muted style={styles.smallLabel}>إزالة خلفية الأشخاص · غير متاحة</TextBlock></Pressable>
      </View>
      <TextBlock muted style={styles.caveat}>إعدادات اللون والخلفية تُحفظ في المشروع فقط؛ لا يُزال اللون فعلياً من الفيديو، ولا تُركّب الخلفية على معاينة البكسلات. إزالة الأشخاص تتطلب نموذجاً/محركاً غير موجود، لذلك لا يُعرض زر تنفيذ وهمي.</TextBlock>
    </View>
  );
}

export function TemplateEditor({ document, onChangeDocument, onToast }: Props) {
  const apply = (templateId: string) => {
    const template = VIDEO_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) return;
    const defaults = makeDefaultTracks();
    const textTrack = document.tracks.find((track) => track.kind === "text") ?? defaults.find((track) => track.kind === "text")!;
    const effectTrack = document.tracks.find((track) => track.kind === "effect") ?? defaults.find((track) => track.kind === "effect")!;
    const textItem: TimelineItem = { id: "template-text", kind: "text", label: "عنوان القالب", start: 0, duration: template.duration, inPoint: 0, outPoint: template.duration };
    const tracks = document.tracks.some((track) => track.id === textTrack.id)
      ? replaceTrackItems(document.tracks, textTrack.id, [...textTrack.items.filter((item) => item.id !== textItem.id), textItem])
      : [...document.tracks, { ...textTrack, items: [textItem] }];
    const preset = { id: "template-effect", presetId: template.effectId, targetId: "project" as const, scope: "project" as const, start: 0, duration: Math.min(3, template.duration), intensity: 45 };
    const marker: TimelineItem = { id: preset.id, kind: "effect", label: `قالب · ${template.title}`, start: 0, duration: preset.duration, inPoint: 0, outPoint: preset.duration };
    const withEffect = tracks.some((track) => track.id === effectTrack.id)
      ? replaceTrackItems(tracks, effectTrack.id, [...(tracks.find((track) => track.id === effectTrack.id)?.items ?? []), marker])
      : [...tracks, { ...effectTrack, items: [marker] }];
    onChangeDocument({
      ...document,
      templateId: template.id,
      canvasRatio: template.ratio,
      duration: Math.max(document.duration, template.duration),
      typography: { ...document.typography, text: template.caption },
      effects: [...document.effects.filter((entry) => entry.id !== preset.id), preset],
      tracks: withEffect,
    });
    onToast(`تم تطبيق «${template.title}»: المقاس والنص ومؤثر المعاينة. استبدل الوسائط بمقاطعك.`, "success");
  };

  return (
    <View style={styles.panelStack}>
      <PanelHeading title="قوالب جاهزة قابلة للتعديل" note="تُجهّز القوالب المقاس والعنوان والمؤثر التمثيلي؛ لا تتضمن ملفات فيديو أو موسيقى جاهزة." />
      {VIDEO_TEMPLATES.map((template) => (
        <View key={template.id} style={[styles.templateCard, document.templateId === template.id && styles.templateCardActive]}>
          <View style={[styles.templateColor, { backgroundColor: template.accent }]}><TextBlock style={styles.templateRatio}>{template.ratio}</TextBlock></View>
          <View style={styles.templateCopy}><TextBlock style={styles.templateTitle}>{template.title}</TextBlock><TextBlock muted style={styles.smallLabel}>{template.category} · {template.duration}ث</TextBlock><TextBlock muted style={styles.templateCaption}>{template.caption}</TextBlock></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`تطبيق قالب ${template.title}`} onPress={() => apply(template.id)} style={styles.applyTemplate}><Ionicons name={document.templateId === template.id ? "checkmark" : "arrow-back"} size={15} color="#061318" /></Pressable>
        </View>
      ))}
      <TextBlock muted style={styles.caveat}>بعد اختيار القالب أضف/استبدل الصور والمقاطع والموسيقى يدوياً، ثم عدّل النص واللون والانتقالات في اللوحات الأخرى. التصدير النهائي غير متاح حالياً.</TextBlock>
    </View>
  );
}

export function ExportSettingsEditor({ document, onChangeDocument, onToast }: Props) {
  const settings = document.exportSettings;
  const setSettings = (patch: Partial<typeof settings>) => onChangeDocument({ ...document, exportSettings: { ...settings, ...patch } });
  const resolutions: ExportResolution[] = [720, 1080, 1440, 2160];
  const rates: ExportFrameRate[] = [24, 30, 60];
  const formats: ExportFormat[] = ["mp4", "mov"];
  return (
    <View style={styles.panelStack}>
      <PanelHeading title="إعدادات التصدير" note="احفظ تفضيلات الجودة لمشروعك. خيارات الدقة ليست وعداً بدعمها حتى يتوفر محرك التصدير." />
      <View style={styles.engineUnavailable}><Ionicons name="alert-circle-outline" size={17} color={palette.amber} /><TextBlock style={styles.engineUnavailableText}>لا يوجد مُصدّر وسائط فعلي في التطبيق الحالي</TextBlock></View>
      <View style={styles.sectionCard}>
        <TextBlock style={styles.sectionLabel}>الدقة · إعداد محفوظ فقط</TextBlock>
        <View style={styles.choiceRow}>{resolutions.map((value) => <ChoiceChip key={value} label={value === 2160 ? "4K" : `${value}p`} active={settings.resolution === value} onPress={() => setSettings({ resolution: value })} />)}</View>
        <TextBlock style={styles.sectionLabel}>معدل الإطارات</TextBlock>
        <View style={styles.choiceRow}>{rates.map((value) => <ChoiceChip key={value} label={`${value} fps`} active={settings.frameRate === value} onPress={() => setSettings({ frameRate: value })} />)}</View>
        <TextBlock style={styles.sectionLabel}>الصيغة</TextBlock>
        <View style={styles.choiceRow}>{formats.map((value) => <ChoiceChip key={value} label={value.toUpperCase()} active={settings.format === value} onPress={() => setSettings({ format: value })} />)}</View>
        <SliderLike label="معدل البت" value={`${settings.bitrateMbps} Mbps`} fill={(settings.bitrateMbps / 80) * 100} onDecrease={() => setSettings({ bitrateMbps: Math.max(2, settings.bitrateMbps - 2) })} onIncrease={() => setSettings({ bitrateMbps: Math.min(80, settings.bitrateMbps + 2) })} />
      </View>
      <StudioButton disabled variant="secondary" icon="lock-closed-outline" onPress={() => onToast("لا يمكن بدء التصدير قبل دمج محرك ترميز واختباره على الجهاز.", "warning")}>التصدير غير متاح</StudioButton>
      <TextBlock muted style={styles.caveat}>لا توجد عملية تصدير جارية، لذلك لن تظهر نسبة تقدم وهمية. لا يمكن التحقق من دقة 4K أو FPS أو البت أو معالجة امتلاء التخزين قبل إضافة محرّك فعلي وبنائه واختباره على جهاز.</TextBlock>
    </View>
  );
}

function PanelHeading({ title, note }: { title: string; note: string }) {
  return <View style={styles.panelHeading}><TextBlock style={styles.panelTitle}>{title}</TextBlock><TextBlock muted style={styles.panelNote}>{note}</TextBlock></View>;
}
function SliderLike({ label, value, onDecrease, onIncrease, fill }: { label: string; value: string; onDecrease: () => void; onIncrease: () => void; fill: number }) {
  return <View style={styles.sliderRow}><TextBlock muted style={styles.smallLabel}>{label}</TextBlock><Pressable accessibilityRole="button" accessibilityLabel={`خفض ${label}`} onPress={onDecrease} style={styles.sliderButton}><Ionicons name="remove" size={14} color={palette.text} /></Pressable><View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${Math.max(5, Math.min(100, fill))}%` }]} /></View><Pressable accessibilityRole="button" accessibilityLabel={`رفع ${label}`} onPress={onIncrease} style={styles.sliderButton}><Ionicons name="add" size={14} color={palette.text} /></Pressable><TextBlock style={styles.sliderValue}>{value}</TextBlock></View>;
}
function ValueAdjuster({ label, value, onDecrease, onIncrease }: { label: string; value: string; onDecrease: () => void; onIncrease: () => void }) {
  return <View style={styles.valueRow}><TextBlock muted style={styles.smallLabel}>{label}</TextBlock><View style={styles.rowCompact}><Pressable accessibilityRole="button" onPress={onDecrease} style={styles.miniAction}><Ionicons name="remove" size={13} color={palette.text} /></Pressable><TextBlock style={styles.adjustValue}>{value}</TextBlock><Pressable accessibilityRole="button" onPress={onIncrease} style={styles.miniAction}><Ionicons name="add" size={13} color={palette.text} /></Pressable></View></View>;
}
function ToggleChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: active }} onPress={onPress} style={[styles.toggleChip, active && styles.toggleChipActive]}><TextBlock style={[styles.toggleLabel, active && styles.toggleLabelActive]}>{label}</TextBlock></Pressable>;
}
function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.choiceChip, active && styles.choiceChipActive]}><TextBlock style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</TextBlock></Pressable>;
}

const styles = StyleSheet.create({
  panelStack: { gap: 11, paddingBottom: 14 },
  panelHeading: { alignItems: "flex-end", gap: 4, paddingVertical: 2 },
  panelTitle: { fontSize: 15, fontWeight: "900" },
  panelNote: { fontSize: 9, lineHeight: 15, textAlign: "right" },
  sectionCard: { borderRadius: 15, padding: 11, gap: 9, backgroundColor: "#191A22", borderColor: "#2B2D38", borderWidth: 1 },
  rowBetween: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  roleRow: { flexDirection: "row-reverse", gap: 7 },
  roleButton: { flex: 1, minHeight: 43, paddingHorizontal: 6, borderRadius: 11, backgroundColor: "#191A22", borderColor: "#2B2D38", borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 5 },
  roleLabel: { fontSize: 8, fontWeight: "700" },
  sectionLabel: { fontSize: 10, fontWeight: "800" },
  smallLabel: { fontSize: 8 },
  audioTitleGroup: { flex: 1, alignItems: "flex-end", gap: 3 },
  audioName: { fontSize: 9, fontWeight: "800", maxWidth: "100%" },
  iconButton: { width: 27, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: "#2A2027" },
  sliderRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, minHeight: 30 },
  sliderButton: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: "#2A2C37" },
  sliderTrack: { flex: 1, height: 5, borderRadius: 4, backgroundColor: "#363844", overflow: "hidden" },
  sliderFill: { height: "100%", borderRadius: 4, backgroundColor: palette.cyan },
  sliderValue: { minWidth: 43, fontSize: 8, textAlign: "left" },
  valueRow: { minHeight: 30, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  rowCompact: { flexDirection: "row", alignItems: "center", gap: 5 },
  miniAction: { width: 23, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: "#30323D" },
  adjustValue: { minWidth: 47, textAlign: "center", fontSize: 8, fontFamily: "monospace" },
  helperText: { color: palette.muted, fontSize: 8, textAlign: "right", lineHeight: 14 },
  caveat: { fontSize: 8, lineHeight: 14, textAlign: "right", color: "#A9A392" },
  toggleChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: "#252630", borderColor: "#3B3D4A", borderWidth: 1 },
  toggleChipActive: { backgroundColor: "#12313A", borderColor: "#277080" },
  toggleLabel: { color: "#B9BECA", fontSize: 8 },
  toggleLabelActive: { color: "#A5F3FC", fontWeight: "800" },
  presetRow: { flexDirection: "row-reverse", gap: 8, paddingVertical: 1 },
  colorPreset: { width: 86, minHeight: 71, borderRadius: 12, backgroundColor: "#191A22", borderColor: "#2B2D38", borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 7, padding: 6 },
  colorSwatch: { width: 39, height: 26, borderRadius: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  textInput: { minHeight: 38, backgroundColor: "#101117", borderColor: palette.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, color: palette.text, writingDirection: "rtl", fontSize: 10 },
  savedPresetRow: { minHeight: 34, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 7 },
  savedPresetApply: { flex: 1, minHeight: 32, flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#22232C" },
  savedPresetText: { flex: 1, fontSize: 9, fontWeight: "700" },
  engineUnavailable: { minHeight: 38, flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#292318", borderWidth: 1, borderColor: "#4B3D22" },
  engineUnavailableText: { flex: 1, fontSize: 8, color: "#E7CF9A", textAlign: "right" },
  swatchRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9, paddingVertical: 5 },
  swatchButton: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, borderColor: "rgba(255,255,255,0.12)" },
  swatchSelected: { borderColor: "#FFFFFF", transform: [{ scale: 1.1 }] },
  backgroundThumb: { width: "100%", height: 74, borderRadius: 10, backgroundColor: "#111318" },
  unavailableButton: { minHeight: 34, flexDirection: "row-reverse", alignItems: "center", gap: 7, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#22232A", opacity: 0.75 },
  choiceRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  choiceChip: { minHeight: 30, paddingHorizontal: 10, justifyContent: "center", borderRadius: 9, backgroundColor: "#23252E", borderWidth: 1, borderColor: "#343642" },
  choiceChipActive: { backgroundColor: "#12313A", borderColor: "#277080" },
  choiceText: { color: "#B9BECA", fontSize: 8 },
  choiceTextActive: { color: "#A5F3FC", fontWeight: "800" },
  templateCard: { minHeight: 86, flexDirection: "row-reverse", alignItems: "center", gap: 9, padding: 8, borderRadius: 13, backgroundColor: "#191A22", borderWidth: 1, borderColor: "#2B2D38" },
  templateCardActive: { borderColor: palette.cyan },
  templateColor: { width: 58, height: 68, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  templateRatio: { paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, overflow: "hidden", color: "#FFFFFF", backgroundColor: "rgba(0,0,0,0.4)", fontSize: 8, fontWeight: "800" },
  templateCopy: { flex: 1, alignItems: "flex-end", gap: 4 },
  templateTitle: { fontSize: 10, fontWeight: "900" },
  templateCaption: { fontSize: 8, textAlign: "right" },
  applyTemplate: { width: 31, height: 31, borderRadius: 9, backgroundColor: palette.cyan, alignItems: "center", justifyContent: "center" },
});
