import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Chip, Header, Notice, Page, SectionHeading, StatusPill, StudioButton, TextBlock } from "@/components/studio/primitives";
import { palette } from "@/constants/studio";

const tasks = ["فكرة لصورة", "سيناريو فيديو", "اتجاه بصري"] as const;
type Task = (typeof tasks)[number];

export default function AIStudioScreen() {
  const [task, setTask] = useState<Task>(tasks[0]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => {
      setResult(makeLocalSample(task));
      setBusy(false);
      setNotice("عُرض قالب توضيحي محلي؛ لم يُرسل طلب إلى نموذج ذكاء اصطناعي.");
    }, 520);
    return () => clearTimeout(timer);
  }, [busy, task]);

  const showExample = () => {
    if (!prompt.trim()) {
      setNotice("اكتب فكرة قصيرة أولاً لعرض مثال توضيحي مناسب.");
      return;
    }
    setNotice("");
    setResult("");
    setBusy(true);
  };

  return (
    <Page>
      <Header
        eyebrow="مختبر الإلهام · تجريبي"
        title="استوديو الأفكار"
        description="رتّب فكرتك في مساحة هادئة قبل تحويلها إلى مشروع."
        trailing={<StatusPill label="بدون اتصال AI" tone="amber" />}
      />

      <View style={screenStyles.banner}>
        <View style={screenStyles.bannerIcon}><Ionicons name="sparkles" size={25} color="#D3CCFF" /></View>
        <View style={screenStyles.bannerCopy}>
          <TextBlock style={screenStyles.bannerTitle}>مساحة الفكرة</TextBlock>
          <TextBlock muted style={screenStyles.bannerDescription}>اختر نوع المساعدة، ثم صِف ما تريد استكشافه.</TextBlock>
        </View>
        <View style={screenStyles.bannerOrb} />
      </View>

      <Notice tone="warning">هذه واجهة استوديو تجريبية. لا يوجد اتصال بخدمة ذكاء اصطناعي؛ زر التجربة يعرض قالباً محلياً ثابتاً فقط.</Notice>

      <View style={screenStyles.section}>
        <SectionHeading title="نوع المهمة" />
        <View style={screenStyles.taskChips}>
          {tasks.map((value) => <Chip key={value} label={value} active={task === value} onPress={() => setTask(value)} />)}
        </View>
      </View>

      <Card style={screenStyles.promptCard}>
        <View style={screenStyles.promptHeading}>
          <TextBlock muted style={screenStyles.characterCount}>{prompt.length.toLocaleString("ar")}/٤٠٠</TextBlock>
          <TextBlock style={screenStyles.promptLabel}>ما الذي يدور في بالك؟</TextBlock>
        </View>
        <TextInput
          value={prompt}
          onChangeText={(value) => setPrompt(value.slice(0, 400))}
          placeholder="اكتب مشهداً، مزاجاً، أو فكرة تريد تطويرها..."
          placeholderTextColor="#707585"
          multiline
          textAlign="right"
          textAlignVertical="top"
          style={screenStyles.promptInput}
          accessibilityLabel="وصف الفكرة"
        />
        <View style={screenStyles.promptFooter}>
          <TextBlock muted style={screenStyles.privacyNote}>يظل النص ضمن هذه الجلسة التجريبية.</TextBlock>
          <Ionicons name="lock-closed-outline" size={14} color={palette.muted} />
        </View>
      </Card>

      <StudioButton icon="sparkles" onPress={showExample} disabled={busy}>
        {busy ? "يُحضّر المثال..." : "عرض مثال توضيحي"}
      </StudioButton>

      {busy ? (
        <Card style={screenStyles.loadingCard}>
          <ActivityIndicator color={palette.cyan} />
          <TextBlock muted style={screenStyles.loadingText}>تجهيز قالب محلي قصير…</TextBlock>
        </Card>
      ) : null}

      {notice ? <Notice tone={result ? "success" : "info"}>{notice}</Notice> : null}

      {result ? (
        <Card style={screenStyles.resultCard}>
          <View style={screenStyles.resultHeading}>
            <StatusPill label="قالب ثابت" tone="muted" />
            <View style={screenStyles.resultTitleRow}><Ionicons name="document-text-outline" size={17} color={palette.cyan} /><TextBlock style={screenStyles.resultTitle}>مخطط استكشافي</TextBlock></View>
          </View>
          <TextBlock muted style={screenStyles.resultPrompt}>مدخل تجريبي: «{prompt.trim()}»</TextBlock>
          <TextBlock style={screenStyles.resultBody}>{result}</TextBlock>
          <Pressable onPress={() => { setResult(""); setPrompt(""); setNotice(""); }} accessibilityRole="button" style={screenStyles.resetLink}>
            <Ionicons name="refresh-outline" size={14} color={palette.cyan} /><TextBlock style={screenStyles.resetText}>بدء فكرة أخرى</TextBlock>
          </Pressable>
        </Card>
      ) : (
        <Card style={screenStyles.emptyCard}>
          <View style={screenStyles.emptyMark}><Ionicons name="bulb-outline" size={23} color={palette.indigo} /></View>
          <TextBlock style={screenStyles.emptyTitle}>مساحة فارغة، واحتمالات كثيرة</TextBlock>
          <TextBlock muted style={screenStyles.emptyCopy}>اختر مهمة واكتب فكرة لتظهر بطاقة مثال محليّة.</TextBlock>
        </Card>
      )}

      <View style={screenStyles.tipRow}>
        <Ionicons name="compass-outline" size={17} color={palette.indigo} />
        <TextBlock muted style={screenStyles.tipText}>اقتراحات النماذج المستقبلية تحتاج ربط خدمة فعلية ومراجعة ما يُرسل خارج الجهاز.</TextBlock>
      </View>
    </Page>
  );
}

function makeLocalSample(task: Task) {
  if (task === "سيناريو فيديو") {
    return "١. افتح المشهد بلقطة واسعة هادئة.\n٢. اقترب من العنصر الأهم مع حركة بطيئة.\n٣. اختم بتفصيل يترك مساحة للتأمل.\n\nهذا قالب عرض عام، وليس نصاً مُولّداً من نموذج.";
  }
  if (task === "اتجاه بصري") {
    return "ابدأ بدرجات داكنة هادئة، ثم خصّص لوناً واحداً ليقود العين إلى نقطة التركيز. جرّب تباين الضوء والحركة قبل إضافة التفاصيل.\n\nهذا قالب توضيحي ثابت.";
  }
  return "حدّد العنصر الذي يجب أن يلفت النظر، ثم جرّب خلفية أبسط وإضاءة جانبية ناعمة. احتفظ بتفصيل واحد يربط الصورة بفكرتك.\n\nهذا قالب توضيحي ثابت.";
}

const screenStyles = StyleSheet.create({
  banner: { minHeight: 105, position: "relative", flexDirection: "row-reverse", alignItems: "center", gap: 13, padding: 16, borderRadius: 21, backgroundColor: "#1B1A2A", borderWidth: 1, borderColor: "#353255", overflow: "hidden" },
  bannerIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#302C51" },
  bannerCopy: { flex: 1, alignItems: "flex-end", gap: 6, zIndex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: "900" },
  bannerDescription: { fontSize: 11, lineHeight: 17 },
  bannerOrb: { position: "absolute", width: 127, height: 127, borderRadius: 70, left: -37, bottom: -66, backgroundColor: "#302D53", opacity: 0.7 },
  section: { gap: 14 },
  taskChips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  promptCard: { gap: 12, padding: 15 },
  promptHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  promptLabel: { fontSize: 13, fontWeight: "800" },
  characterCount: { fontSize: 10 },
  promptInput: { minHeight: 118, borderRadius: 14, backgroundColor: "#101117", borderWidth: 1, borderColor: palette.border, padding: 13, color: palette.text, writingDirection: "rtl", fontSize: 13, lineHeight: 21 },
  promptFooter: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  privacyNote: { fontSize: 9 },
  loadingCard: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 13 },
  loadingText: { fontSize: 11 },
  resultCard: { gap: 14, borderColor: "#3D3B64" },
  resultHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  resultTitle: { fontSize: 14, fontWeight: "800" },
  resultPrompt: { fontSize: 10, lineHeight: 17, backgroundColor: palette.surface, padding: 10, borderRadius: 11 },
  resultBody: { fontSize: 12, lineHeight: 22 },
  resetLink: { alignSelf: "flex-end", flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingVertical: 4 },
  resetText: { fontSize: 11, fontWeight: "700", color: palette.cyan },
  emptyCard: { minHeight: 153, alignItems: "center", justifyContent: "center", gap: 9, padding: 18 },
  emptyMark: { width: 43, height: 43, borderRadius: 15, backgroundColor: palette.indigoSoft, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 13, fontWeight: "800" },
  emptyCopy: { fontSize: 11, textAlign: "center", lineHeight: 18 },
  tipRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, paddingHorizontal: 3 },
  tipText: { fontSize: 10, lineHeight: 17, flex: 1 },
});
