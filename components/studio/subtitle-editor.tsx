import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { palette } from "@/constants/studio";
import { formatSrt, parseSrt, type SubtitleCue as SrtCue } from "@/features/editor/subtitles";
import { makeDefaultTracks, replaceTrackItems } from "@/features/editor/timeline";
import { makeId, type EditorDocument, type SubtitleCue, type TimelineItem } from "@/features/editor/model";
import { StudioButton, TextBlock } from "@/components/studio/primitives";

type Props = {
  document: EditorDocument;
  onChangeDocument: (document: EditorDocument) => void;
  playhead: number;
  onSeek: (time: number) => void;
  onToast: (message: string, tone?: "info" | "warning" | "success") => void;
};

const MAX_SUBTITLE_FILE_BYTES = 5 * 1024 * 1024;

function subtitleTimelineItem(cue: SubtitleCue): TimelineItem {
  const duration = Math.max(0.1, cue.end - cue.start);
  return {
    id: cue.id,
    kind: "text",
    label: cue.text.replace(/\s+/g, " ").slice(0, 32) || "ترجمة",
    start: cue.start,
    duration,
    inPoint: 0,
    outPoint: duration,
  };
}

function withSubtitles(document: EditorDocument, subtitles: SubtitleCue[]): EditorDocument {
  const oldIds = new Set(document.subtitles.map((cue) => cue.id));
  const defaultTrack = makeDefaultTracks().find((track) => track.kind === "text");
  const textTrack = document.tracks.find((track) => track.kind === "text") ?? defaultTrack;
  if (!textTrack) return { ...document, subtitles };

  const retained = textTrack.items.filter((item) => !oldIds.has(item.id));
  const items = [...retained, ...subtitles.map(subtitleTimelineItem)].sort((a, b) => a.start - b.start);
  const tracks = document.tracks.some((track) => track.id === textTrack.id)
    ? replaceTrackItems(document.tracks, textTrack.id, items)
    : [...document.tracks, { ...textTrack, items }];
  return { ...document, subtitles, tracks };
}

function formatClock(seconds: number): string {
  const total = Math.max(0, seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(2).padStart(5, "0")}`;
}

export function SubtitleEditor({ document, onChangeDocument, playhead, onSeek, onToast }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(document.subtitles[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const selected = document.subtitles.find((cue) => cue.id === selectedId) ?? null;
  const sorted = useMemo(() => [...document.subtitles].sort((a, b) => a.start - b.start), [document.subtitles]);

  const importSrt = async () => {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/x-subrip", "text/plain", "application/octet-stream"],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.size !== undefined && asset.size > MAX_SUBTITLE_FILE_BYTES) {
        onToast("ملف SRT أكبر من 5 ميغابايت؛ اختر ملف ترجمة أصغر.", "warning");
        return;
      }
      const contents = Platform.OS === "web" && asset.file
        ? await asset.file.text()
        : await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      if (contents.length > MAX_SUBTITLE_FILE_BYTES) {
        onToast("ملف SRT أكبر من 5 ميغابايت؛ اختر ملف ترجمة أصغر.", "warning");
        return;
      }
      const parsed = parseSrt(contents);
      const imported: SubtitleCue[] = parsed.map((cue: SrtCue) => ({
        id: makeId("subtitle"),
        start: cue.start / 1000,
        end: cue.end / 1000,
        text: cue.text,
      }));
      onChangeDocument(withSubtitles(document, imported));
      setSelectedId(imported[0]?.id ?? null);
      if (imported[0]) onSeek(imported[0].start);
      onToast(`تم استيراد ${imported.length} جملة من ملف SRT إلى مسار الترجمة.`, "success");
    } catch (error) {
      onToast(error instanceof Error ? `تعذّر استيراد SRT: ${error.message}` : "تعذّر قراءة ملف SRT. تحقق من تنسيقه وترميزه.", "warning");
    } finally {
      setBusy(false);
    }
  };

  const exportSrt = async () => {
    if (!sorted.length) {
      onToast("أضف ترجمة أو استورد ملف SRT قبل التصدير.", "warning");
      return;
    }
    setBusy(true);
    try {
      const srt = formatSrt(sorted.map((cue, index) => ({
        id: String(index + 1),
        start: Math.round(cue.start * 1000),
        end: Math.round(cue.end * 1000),
        text: cue.text,
      })));
      const fileName = `${(document.name || "lumah-subtitles").replace(/[^\p{L}\p{N}_-]+/gu, "-")}.srt`;
      if (Platform.OS === "web") {
        if (typeof window === "undefined" || typeof window.URL.createObjectURL !== "function") {
          throw new Error("تنزيل ملفات SRT غير متاح في هذا المتصفح.");
        }
        const blob = new Blob([srt], { type: "application/x-subrip;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        if (!FileSystem.cacheDirectory) throw new Error("مساحة الملفات المؤقتة غير متاحة.");
        const uri = `${FileSystem.cacheDirectory}${Date.now().toString(36)}-lumah-subtitles.srt`;
        await FileSystem.writeAsStringAsync(uri, srt, { encoding: FileSystem.EncodingType.UTF8 });
        if (!(await Sharing.isAvailableAsync())) throw new Error("قائمة مشاركة الملفات غير متاحة على هذا الجهاز.");
        await Sharing.shareAsync(uri, { mimeType: "application/x-subrip", dialogTitle: "حفظ ترجمة لَمْعَة" });
      }
      onToast("تم تجهيز ملف SRT للمشاركة أو التنزيل.", "success");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تعذّر إنشاء ملف الترجمة.", "warning");
    } finally {
      setBusy(false);
    }
  };

  const patchCue = (cueId: string, patch: Partial<SubtitleCue>) => {
    const next = document.subtitles.map((cue) => {
      if (cue.id !== cueId) return cue;
      const start = Math.max(0, patch.start ?? cue.start);
      const end = Math.max(start + 0.1, patch.end ?? cue.end);
      return { ...cue, ...patch, start, end };
    });
    onChangeDocument(withSubtitles(document, next));
  };

  const addCue = () => {
    const start = Math.max(0, playhead);
    const cue: SubtitleCue = { id: makeId("subtitle"), start, end: start + 2, text: "ترجمة جديدة" };
    onChangeDocument(withSubtitles(document, [...document.subtitles, cue]));
    setSelectedId(cue.id);
    onSeek(start);
  };

  const removeCue = (cueId: string) => {
    const next = document.subtitles.filter((cue) => cue.id !== cueId);
    onChangeDocument(withSubtitles(document, next));
    setSelectedId(next[0]?.id ?? null);
    onToast("حُذفت جملة الترجمة من المسار.", "success");
  };

  const nudgeCue = (edge: "start" | "end", delta: number) => {
    if (!selected) return;
    const patch = edge === "start"
      ? { start: Math.max(0, selected.start + delta) }
      : { end: Math.max(selected.start + 0.1, selected.end + delta) };
    patchCue(selected.id, patch);
    if (edge === "start") onSeek(Math.max(0, selected.start + delta));
  };

  return (
    <View style={styles.stack}>
      <View style={styles.heading}>
        <View style={styles.headingText}>
          <TextBlock style={styles.title}>الترجمة وملفات SRT</TextBlock>
          <TextBlock muted style={styles.note}>استيراد أو تحرير التوقيت والجمل وتصدير ملف ترجمة منفصل.</TextBlock>
        </View>
        <Ionicons name="chatbox-ellipses-outline" size={20} color={palette.cyan} />
      </View>

      <View style={styles.actions}>
        <StudioButton variant="secondary" icon="document-attach-outline" onPress={() => void importSrt()} disabled={busy} style={styles.actionButton}>استيراد SRT</StudioButton>
        <StudioButton icon="download-outline" onPress={() => void exportSrt()} disabled={busy || !sorted.length} style={styles.actionButton}>تصدير SRT</StudioButton>
      </View>
      <StudioButton variant="quiet" icon="add" onPress={addCue}>إضافة جملة عند {formatClock(playhead)}</StudioButton>

      {sorted.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cueList}>
          {sorted.map((cue, index) => (
            <Pressable key={cue.id} onPress={() => { setSelectedId(cue.id); onSeek(cue.start); }} style={[styles.cueCard, selectedId === cue.id && styles.cueCardActive]}>
              <TextBlock numberOfLines={2} style={styles.cueText}>{cue.text}</TextBlock>
              <TextBlock muted style={styles.cueTime}>{formatClock(cue.start)} – {formatClock(cue.end)}</TextBlock>
              <TextBlock muted style={styles.cueIndex}>جملة {index + 1}</TextBlock>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="text-outline" size={18} color={palette.muted} />
          <TextBlock muted style={styles.emptyText}>لا توجد جمل ترجمة بعد. استورد SRT أو أضف جملة يدوياً.</TextBlock>
        </View>
      )}

      {selected ? (
        <View style={styles.editCard}>
          <View style={styles.rowBetween}>
            <Pressable accessibilityRole="button" accessibilityLabel="حذف جملة الترجمة" onPress={() => removeCue(selected.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={15} color={palette.danger} />
            </Pressable>
            <TextBlock style={styles.editTitle}>تعديل الجملة المحددة</TextBlock>
          </View>
          <TextInput
            value={selected.text}
            onChangeText={(text) => patchCue(selected.id, { text: text.slice(0, 4000) })}
            placeholder="اكتب نص الترجمة"
            placeholderTextColor="#757989"
            textAlign="right"
            multiline
            style={styles.textInput}
            accessibilityLabel="نص جملة الترجمة"
          />
          <View style={styles.timeRows}>
            <TimeAdjuster label="البداية" value={formatClock(selected.start)} onDecrease={() => nudgeCue("start", -0.25)} onIncrease={() => nudgeCue("start", 0.25)} />
            <TimeAdjuster label="النهاية" value={formatClock(selected.end)} onDecrease={() => nudgeCue("end", -0.25)} onIncrease={() => nudgeCue("end", 0.25)} />
          </View>
          <StudioButton variant="secondary" icon="play-outline" onPress={() => onSeek(selected.start)}>معاينة هذه الجملة</StudioButton>
        </View>
      ) : null}

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={15} color={palette.amber} />
        <TextBlock muted style={styles.infoText}>تُعرض الجملة النشطة كاملةً في المعاينة. تمييز كل كلمة بتوقيتها يحتاج بيانات توقيت كلمات من خدمة التعرف. ملف SRT منفصل؛ دمج الترجمة في MP4 يحتاج محرك تصدير أصلياً.</TextBlock>
      </View>
    </View>
  );
}

function TimeAdjuster({ label, value, onDecrease, onIncrease }: { label: string; value: string; onDecrease: () => void; onIncrease: () => void }) {
  return (
    <View style={styles.timeCard}>
      <TextBlock muted style={styles.timeLabel}>{label}</TextBlock>
      <TextBlock style={styles.timeValue}>{value}</TextBlock>
      <View style={styles.timeButtons}>
        <Pressable accessibilityRole="button" accessibilityLabel={`تقديم ${label} ربع ثانية`} onPress={onIncrease} style={styles.timeButton}><Ionicons name="add" size={14} color={palette.cyan} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`تأخير ${label} ربع ثانية`} onPress={onDecrease} style={styles.timeButton}><Ionicons name="remove" size={14} color={palette.cyan} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  heading: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 3 },
  headingText: { flex: 1, gap: 4, alignItems: "flex-end" },
  title: { fontSize: 15, fontWeight: "900" },
  note: { fontSize: 10, lineHeight: 16 },
  actions: { flexDirection: "row-reverse", gap: 8 },
  actionButton: { flex: 1, minHeight: 43, paddingHorizontal: 8 },
  cueList: { flexDirection: "row-reverse", gap: 8, paddingVertical: 3 },
  cueCard: { width: 150, minHeight: 91, padding: 10, justifyContent: "space-between", gap: 8, backgroundColor: palette.card, borderRadius: 13, borderWidth: 1, borderColor: palette.border },
  cueCardActive: { borderColor: palette.cyan, backgroundColor: palette.cyanSoft },
  cueText: { fontSize: 11, fontWeight: "700", lineHeight: 17 },
  cueTime: { fontSize: 9, writingDirection: "ltr", textAlign: "right" },
  cueIndex: { fontSize: 8 },
  emptyCard: { minHeight: 68, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, backgroundColor: palette.surface, borderRadius: 13, borderWidth: 1, borderColor: palette.border },
  emptyText: { fontSize: 10 },
  editCard: { gap: 10, padding: 12, backgroundColor: palette.surface, borderRadius: 15, borderWidth: 1, borderColor: palette.border },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editTitle: { fontSize: 12, fontWeight: "800" },
  deleteButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#302025" },
  textInput: { minHeight: 82, maxHeight: 160, padding: 11, color: palette.text, backgroundColor: "#101117", borderWidth: 1, borderColor: palette.border, borderRadius: 12, writingDirection: "rtl", textAlignVertical: "top" },
  timeRows: { flexDirection: "row-reverse", gap: 8 },
  timeCard: { flex: 1, padding: 9, borderRadius: 11, backgroundColor: palette.card, alignItems: "flex-end", gap: 6 },
  timeLabel: { fontSize: 9 },
  timeValue: { fontSize: 11, fontFamily: "monospace", writingDirection: "ltr" },
  timeButtons: { flexDirection: "row", gap: 6 },
  timeButton: { width: 28, height: 26, alignItems: "center", justifyContent: "center", backgroundColor: palette.cyanSoft, borderRadius: 8 },
  infoCard: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 12, backgroundColor: "#2F291B", borderWidth: 1, borderColor: "#57492B" },
  infoText: { flex: 1, fontSize: 9, lineHeight: 15 },
});
