import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/constants/studio";
import { StudioButton, TextBlock } from "@/components/studio/primitives";

export type EditorToolKey = "clips" | "audio" | "text" | "typography" | "filters" | "speed" | "ratio" | "split" | "transitions" | "keyframes" | "timeline" | "color" | "chroma" | "templates" | "export";

export function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const remainder = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function TimelinePanel({
  fileName,
  duration,
  currentTime,
  caption,
  hasVideo,
  onSeek,
  onChooseVideo,
  onAudio,
}: {
  fileName: string;
  duration: number;
  currentTime: number;
  caption: string;
  hasVideo: boolean;
  onSeek: (fraction: number) => void;
  onChooseVideo: () => void;
  onAudio: () => void;
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const rulerDuration = duration > 0 ? duration : 20;
  return (
    <View style={styles.timelinePanel}>
      <View style={styles.timelineHeading}>
        <TextBlock style={styles.timelineTitle}>الخط الزمني</TextBlock>
        <View style={styles.clockGroup}>
          <TextBlock style={styles.clock}>{formatTime(currentTime)}</TextBlock>
          <TextBlock muted style={styles.clockDivider}>/</TextBlock>
          <TextBlock style={styles.clock}>{formatTime(duration)}</TextBlock>
        </View>
      </View>
      <View style={styles.ruler}>
        {[0, 1, 2, 3, 4].map((mark) => (
          <TextBlock key={mark} muted style={styles.rulerLabel}>{formatTime((rulerDuration * mark) / 4)}</TextBlock>
        ))}
      </View>
      <View style={styles.trackGroup}>
        <View style={styles.trackNameCell}>
          <Ionicons name="videocam-outline" size={14} color={palette.cyan} />
          <TextBlock style={styles.trackName}>الفيديو</TextBlock>
        </View>
        {hasVideo ? (
          <View style={styles.timelineTrackWrap} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
            <Pressable
              onPress={(event) => onSeek(Math.max(0, Math.min(1, event.nativeEvent.locationX / trackWidth)))}
              accessibilityRole="button"
              accessibilityLabel="موضع التشغيل في المقطع"
              style={styles.videoTrack}
            >
              {Array.from({ length: 7 }, (_, index) => (
                <View key={index} style={[styles.clipFrame, index % 2 === 0 ? styles.clipFrameAlt : null]}>
                  <Ionicons name="film-outline" size={11} color="#87A6AE" />
                </View>
              ))}
              <View pointerEvents="none" style={[styles.playhead, { left: `${progress * 100}%` }]}>
                <View style={styles.playheadCap} />
              </View>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={onChooseVideo} style={styles.emptyTrack}>
            <Ionicons name="add" size={14} color={palette.cyan} />
            <TextBlock style={styles.emptyTrackText}>استيراد مقطع</TextBlock>
          </Pressable>
        )}
      </View>
      {hasVideo ? <TextBlock numberOfLines={1} style={styles.fileName}>{fileName || "مقطع الفيديو"}</TextBlock> : null}
      <View style={styles.trackGroup}>
        <View style={styles.trackNameCell}>
          <Ionicons name="musical-notes-outline" size={14} color="#A78BFA" />
          <TextBlock style={styles.trackName}>الصوت</TextBlock>
        </View>
        <Pressable accessibilityRole="button" onPress={onAudio} style={styles.addTrackButton}>
          <Ionicons name="add" size={13} color="#BCAEFF" />
          <TextBlock style={styles.addTrackText}>إضافة مسار صوت</TextBlock>
        </Pressable>
      </View>
      {caption ? (
        <View style={styles.trackGroup}>
          <View style={styles.trackNameCell}>
            <Ionicons name="text-outline" size={14} color={palette.amber} />
            <TextBlock style={styles.trackName}>النص</TextBlock>
          </View>
          <View style={styles.captionTrack}>
            <TextBlock numberOfLines={1} style={styles.captionTrackText}>{caption}</TextBlock>
          </View>
        </View>
      ) : null}
      <TextBlock muted style={styles.scrubHint}>المس المسار لتغيير موضع المعاينة · السحب والقص في مخطط التحرير فقط</TextBlock>
    </View>
  );
}

const TOOL_ITEMS: { key: EditorToolKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "clips", label: "المقاطع", icon: "film-outline" },
  { key: "audio", label: "الصوت", icon: "musical-notes-outline" },
  { key: "text", label: "نص", icon: "text-outline" },
  { key: "typography", label: "خطوط", icon: "create-outline" },
  { key: "filters", label: "المرشحات", icon: "color-filter-outline" },
  { key: "speed", label: "السرعة", icon: "speedometer-outline" },
  { key: "ratio", label: "النسبة", icon: "crop-outline" },
  { key: "split", label: "تقسيم", icon: "cut-outline" },
  { key: "transitions", label: "انتقالات", icon: "swap-horizontal-outline" },
  { key: "keyframes", label: "إطارات", icon: "key-outline" },
  { key: "timeline", label: "المسارات", icon: "reorder-three-outline" },
  { key: "color", label: "اللون", icon: "color-palette-outline" },
  { key: "chroma", label: "خلفية", icon: "contrast-outline" },
  { key: "templates", label: "القوالب", icon: "albums-outline" },
  { key: "export", label: "الجودة", icon: "settings-outline" },
];

export function ToolDock({
  activeTool,
  onSelect,
}: {
  activeTool: EditorToolKey | null;
  onSelect: (tool: EditorToolKey) => void;
}) {
  return (
    <View style={styles.toolDock}>
      <TextBlock style={styles.toolHeading}>أدوات التحرير</TextBlock>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolList}>
        {TOOL_ITEMS.map((item) => {
          const active = activeTool === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [styles.toolButton, active && styles.toolButtonActive, pressed && { opacity: 0.72 }]}
            >
              <Ionicons name={item.icon} size={19} color={active ? palette.cyan : "#D0D3DD"} />
              <TextBlock style={[styles.toolLabel, active && styles.toolLabelActive]}>{item.label}</TextBlock>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function CaptionModal({
  visible,
  value,
  onChange,
  onCancel,
  onSave,
}: {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalTitleRow}>
            <Pressable onPress={onCancel} hitSlop={8} style={styles.closeButton}><Ionicons name="close" size={19} color={palette.text} /></Pressable>
            <View style={styles.modalCopy}>
              <TextBlock style={styles.modalTitle}>نص على المعاينة</TextBlock>
              <TextBlock muted style={styles.modalSub}>يظهر فوق الفيديو كعنصر توضيحي</TextBlock>
            </View>
          </View>
          <TextInput
            value={value}
            onChangeText={(text) => onChange(text.slice(0, 80))}
            placeholder="اكتب عنواناً قصيراً..."
            placeholderTextColor="#707585"
            textAlign="right"
            style={styles.captionInput}
            accessibilityLabel="نص المعاينة"
            returnKeyType="done"
          />
          <TextBlock muted style={styles.modalFootnote}>النص للمعاينة فقط؛ لا يُدمج في الفيديو أو ملف التصدير.</TextBlock>
          <View style={styles.modalButtons}>
            <StudioButton variant="secondary" onPress={onCancel} style={styles.modalButton}>إلغاء</StudioButton>
            <StudioButton icon="checkmark" onPress={onSave} style={styles.modalButton}>إضافة للنص</StudioButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  timelinePanel: { backgroundColor: "#14151C", borderColor: "#292B37", borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingTop: 10, paddingBottom: 8, gap: 7 },
  timelineHeading: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  timelineTitle: { fontSize: 11, fontWeight: "800" },
  clockGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  clock: { color: "#B5BAC8", fontFamily: "monospace", fontSize: 9, writingDirection: "ltr" },
  clockDivider: { fontSize: 9 },
  ruler: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 3 },
  rulerLabel: { fontSize: 8, fontFamily: "monospace", writingDirection: "ltr", textAlign: "left" },
  trackGroup: { minHeight: 33, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  trackNameCell: { width: 48, flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  trackName: { fontSize: 9, color: "#D1D4DE", fontWeight: "700" },
  timelineTrackWrap: { flex: 1, height: 31, position: "relative" },
  videoTrack: { flex: 1, height: 31, flexDirection: "row", gap: 2, padding: 2, overflow: "hidden", borderRadius: 7, backgroundColor: "#252833", borderColor: "#35404B", borderWidth: 1 },
  clipFrame: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#273740", borderRadius: 3 },
  clipFrameAlt: { backgroundColor: "#32424B" },
  playhead: { position: "absolute", top: -2, bottom: -2, width: 2, backgroundColor: "#F2F5F8" },
  playheadCap: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF", position: "absolute", top: -1, left: -3 },
  emptyTrack: { flex: 1, height: 29, borderStyle: "dashed", borderWidth: 1, borderColor: "#3B5360", borderRadius: 7, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, backgroundColor: "#101A20" },
  emptyTrackText: { fontSize: 9, fontWeight: "700", color: "#96EAF1" },
  fileName: { fontFamily: "monospace", fontSize: 8, textAlign: "left", writingDirection: "ltr", color: "#8D94A6", marginTop: -4, paddingLeft: 58 },
  addTrackButton: { flex: 1, height: 27, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 8, gap: 3, borderRadius: 7, backgroundColor: "#211E32", borderColor: "#39314F", borderWidth: 1 },
  addTrackText: { fontSize: 9, color: "#C7BDF8" },
  captionTrack: { flex: 1, height: 25, justifyContent: "center", paddingHorizontal: 8, borderRadius: 6, backgroundColor: "#332918", borderColor: "#655128", borderWidth: 1 },
  captionTrackText: { color: "#F6D89A", fontSize: 9 },
  scrubHint: { fontSize: 8, textAlign: "center", marginTop: 1 },
  toolDock: { gap: 7, paddingTop: 2 },
  toolHeading: { fontSize: 10, fontWeight: "800" },
  toolList: { flexDirection: "row-reverse", gap: 8, paddingBottom: 2 },
  toolButton: { width: 63, height: 59, alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 13, backgroundColor: "#1A1B23", borderColor: "#2D2F3B", borderWidth: 1 },
  toolButtonActive: { backgroundColor: "#14262D", borderColor: "#1D6170" },
  toolLabel: { fontSize: 9, color: "#B7BBC7" },
  toolLabelActive: { color: "#A5F3FC", fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" },
  modalSheet: { backgroundColor: "#191A22", borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 27, gap: 14, borderTopWidth: 1, borderColor: palette.border },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 3, backgroundColor: "#505260", marginBottom: 2 },
  modalTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  closeButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: palette.raised, alignItems: "center", justifyContent: "center" },
  modalCopy: { alignItems: "flex-end", gap: 4 },
  modalTitle: { fontSize: 17, fontWeight: "900" },
  modalSub: { fontSize: 10 },
  captionInput: { minHeight: 54, backgroundColor: "#101117", borderColor: palette.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, color: palette.text, writingDirection: "rtl" },
  modalFootnote: { fontSize: 9, textAlign: "right" },
  modalButtons: { flexDirection: "row-reverse", gap: 9 },
  modalButton: { flex: 1 },
});
