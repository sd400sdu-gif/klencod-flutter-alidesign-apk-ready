import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { sourceFiles } from "@/data/sourceFiles";
import type { SourceFile } from "@/data/sourceFiles";
import { Card, Chip, Header, Notice, Page, SectionHeading, StatusPill, TextBlock } from "@/components/studio/primitives";
import { palette } from "@/constants/studio";

type Filter = "الكل" | "Android" | "GitHub";
const filters: Filter[] = ["الكل", "Android", "GitHub"];

export default function FilesScreen() {
  const [filter, setFilter] = useState<Filter>("الكل");
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState(sourceFiles[0]?.path ?? "");
  const [copied, setCopied] = useState(false);

  const filteredFiles = useMemo(() => sourceFiles.filter((file) => {
    const matchesFilter = filter === "الكل" || (filter === "Android" ? file.path.startsWith("app/") : file.path.startsWith(".github/"));
    const needle = query.trim().toLocaleLowerCase();
    const matchesQuery = !needle || `${file.title} ${file.path}`.toLocaleLowerCase().includes(needle);
    return matchesFilter && matchesQuery;
  }), [filter, query]);

  const selected: SourceFile | undefined = sourceFiles.find((file) => file.path === selectedPath) ?? filteredFiles[0];

  const copySelected = async () => {
    if (!selected?.available || !selected.code) return;
    try {
      await Clipboard.setStringAsync(selected.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Page contentStyle={{ gap: 18 }}>
      <Header
        eyebrow="مكتبة المصدر · Android"
        title="ملفات المشروع"
        description="مسارات Android المقترحة والمقاطع الموجودة فعلياً في المرفق."
        trailing={<StatusPill label="٥ كتل أصلية" tone="cyan" />}
      />

      <Notice tone="warning">التطبيق الحالي مبني بـ Expo/React Native. الشيفرة الأصلية أدناه مرجع Kotlin/Compose؛ APK وMedia3 وH.264/AAC غير منفذة داخل نموذج Expo.</Notice>

      <Card style={screenStyles.packageCard}>
        <View style={screenStyles.packageMark}><Ionicons name="cube-outline" size={19} color={palette.cyan} /></View>
        <View style={screenStyles.packageCopy}>
          <TextBlock style={screenStyles.packageTitle}>حزمة Android المقترحة</TextBlock>
          <TextBlock style={screenStyles.packageId}>com.alidesign.studio</TextBlock>
        </View>
        <StatusPill label="Kotlin" tone="muted" />
      </Card>

      <View style={screenStyles.filterRow}>
        {filters.map((value) => <Chip key={value} label={value} active={filter === value} onPress={() => setFilter(value)} />)}
      </View>

      <View style={screenStyles.searchBox}>
        <Ionicons name="search-outline" size={17} color={palette.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث في المسارات..."
          placeholderTextColor="#747989"
          textAlign="right"
          style={screenStyles.searchInput}
          accessibilityLabel="بحث في ملفات المشروع"
        />
      </View>

      <View style={screenStyles.filesLayout}>
        <View style={screenStyles.listColumn}>
          <SectionHeading title="الشجرة" />
          <ScrollView style={screenStyles.fileList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {filteredFiles.map((file, index) => {
              const active = selected?.path === file.path;
              return (
                <Pressable
                  key={file.path}
                  onPress={() => { setSelectedPath(file.path); setCopied(false); }}
                  accessibilityRole="button"
                  style={({ pressed }) => [screenStyles.fileRow, active && screenStyles.fileRowActive, pressed && { opacity: 0.72 }]}
                >
                  <View style={screenStyles.fileRowTop}>
                    <View style={screenStyles.fileIndex}><TextBlock style={screenStyles.fileIndexText}>{(index + 1).toLocaleString("ar")}</TextBlock></View>
                    <View style={[screenStyles.fileStatusDot, { backgroundColor: file.available ? palette.green : palette.amber }]} />
                  </View>
                  <TextBlock numberOfLines={1} style={[screenStyles.fileTitle, active && screenStyles.fileTitleActive]}>{file.title}</TextBlock>
                  <TextBlock numberOfLines={2} style={screenStyles.filePath}>{file.path}</TextBlock>
                </Pressable>
              );
            })}
            {!filteredFiles.length ? <TextBlock muted style={screenStyles.noMatches}>لا توجد ملفات مطابقة.</TextBlock> : null}
          </ScrollView>
          <View style={screenStyles.legend}>
            <View style={screenStyles.legendItem}><View style={[screenStyles.fileStatusDot, { backgroundColor: palette.green }]} /><TextBlock muted style={screenStyles.legendText}>شفرة مرفقة</TextBlock></View>
            <View style={screenStyles.legendItem}><View style={[screenStyles.fileStatusDot, { backgroundColor: palette.amber }]} /><TextBlock muted style={screenStyles.legendText}>مسار فقط</TextBlock></View>
          </View>
        </View>

        <View style={screenStyles.viewerColumn}>
          {selected ? (
            <Card style={screenStyles.codeCard}>
              <View style={screenStyles.codeHeader}>
                <Pressable
                  onPress={copySelected}
                  disabled={!selected.available}
                  accessibilityRole="button"
                  accessibilityLabel="نسخ الشيفرة"
                  style={[screenStyles.copyButton, !selected.available && { opacity: 0.45 }]}
                >
                  <TextBlock style={screenStyles.copyText}>{copied ? "نُسخت" : "نسخ"}</TextBlock>
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={14} color={copied ? palette.green : palette.cyan} />
                </Pressable>
                <View style={screenStyles.codeHeading}>
                  <StatusPill label={selected.available ? "من المرفق" : "مسار فقط"} tone={selected.available ? "green" : "amber"} />
                  <TextBlock style={screenStyles.codeTitle}>{selected.title}</TextBlock>
                </View>
              </View>
              <TextBlock style={screenStyles.codePath}>{selected.path}</TextBlock>
              {selected.path.endsWith("VideoExportManager.kt") ? <Notice tone="warning">هذا مقتطف كما ورد في HTML المرفق؛ لم يُبنَ مشروع Android هنا. لا يصدّر التطبيق الحالي ملف MP4.</Notice> : null}
              {selected.path.endsWith("build.yml") ? <Notice tone="warning">الملف المقترح وحده لا يكفي لبناء APK؛ المرفق لا يتضمن Gradle Wrapper أو بقية ملفات إعداد Android.</Notice> : null}
              {selected.available ? (
                <ScrollView style={screenStyles.codeScroll} nestedScrollEnabled horizontal showsHorizontalScrollIndicator>
                  <TextBlock style={screenStyles.codeText}>
                    {selected.code.trimEnd()}
                  </TextBlock>
                </ScrollView>
              ) : (
                <View style={screenStyles.missingCode}>
                  <View style={screenStyles.missingIcon}><Ionicons name="document-outline" size={20} color={palette.amber} /></View>
                  <TextBlock style={screenStyles.missingTitle}>المسار مذكور، لكن محتوى الملف غير موجود في المرفق</TextBlock>
                  <TextBlock muted style={screenStyles.missingCopy}>المصدر الأصلي أدرج هذا المسار ضمن شجرة المشروع فقط. لم تُرفق شيفرته، لذلك لا يعرض التطبيق كوداً مُختلقاً.</TextBlock>
                </View>
              )}
            </Card>
          ) : (
            <Card style={screenStyles.emptyViewer}><TextBlock muted>اختر مساراً من الشجرة لعرضه.</TextBlock></Card>
          )}
        </View>
      </View>

      <View style={screenStyles.sourceNote}>
        <Ionicons name="information-circle-outline" size={16} color={palette.cyan} />
        <TextBlock muted style={screenStyles.sourceNoteText}>يشمل المرفق ٤ مقاطع Android: Gradle وManifest وMainActivity وVideoExportManager، وملف GitHub Actions اختياري. بقية المسارات لا تحتوي نصاً برمجياً في الملف المرسل.</TextBlock>
      </View>
    </Page>
  );
}

const screenStyles = StyleSheet.create({
  packageCard: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 13 },
  packageMark: { width: 39, height: 39, borderRadius: 13, backgroundColor: palette.cyanSoft, alignItems: "center", justifyContent: "center" },
  packageCopy: { flex: 1, alignItems: "flex-end", gap: 4 },
  packageTitle: { fontSize: 12, fontWeight: "800" },
  packageId: { color: "#9CA9B9", writingDirection: "ltr", textAlign: "right", fontFamily: "monospace", fontSize: 10 },
  filterRow: { flexDirection: "row-reverse", gap: 7 },
  searchBox: { minHeight: 45, flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 13, backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
  searchInput: { flex: 1, color: palette.text, writingDirection: "rtl", fontSize: 12, paddingVertical: 9 },
  filesLayout: { gap: 16 },
  listColumn: { gap: 11 },
  fileList: { maxHeight: 244, borderRadius: 17, backgroundColor: "#15161D", borderColor: palette.border, borderWidth: 1, padding: 7 },
  fileRow: { minHeight: 61, marginBottom: 5, paddingVertical: 8, paddingHorizontal: 9, borderRadius: 12, backgroundColor: "#1A1B23", borderColor: "transparent", borderWidth: 1, gap: 4 },
  fileRowActive: { borderColor: palette.cyan, backgroundColor: "#13282F" },
  fileRowTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  fileIndex: { minWidth: 21, height: 19, borderRadius: 7, backgroundColor: "#2D2E3A", alignItems: "center", justifyContent: "center" },
  fileIndexText: { color: "#C1C6D2", fontSize: 9, fontWeight: "700" },
  fileStatusDot: { width: 6, height: 6, borderRadius: 3 },
  fileTitle: { fontSize: 11, fontWeight: "700" },
  fileTitleActive: { color: "#B6F6FC" },
  filePath: { color: "#8A8E9E", fontSize: 8, textAlign: "left", writingDirection: "ltr", fontFamily: "monospace" },
  noMatches: { textAlign: "center", padding: 20, fontSize: 11 },
  legend: { flexDirection: "row-reverse", gap: 15, paddingHorizontal: 3 },
  legendItem: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  legendText: { fontSize: 9 },
  viewerColumn: { minHeight: 330 },
  codeCard: { flex: 1, minHeight: 330, gap: 10, padding: 12 },
  codeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 7 },
  codeHeading: { flex: 1, alignItems: "flex-end", gap: 7 },
  codeTitle: { fontSize: 12, fontWeight: "800" },
  copyButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: "#102A31" },
  copyText: { color: "#A5F3FC", fontSize: 10, fontWeight: "700" },
  codePath: { color: "#82CFE0", textAlign: "left", writingDirection: "ltr", fontFamily: "monospace", fontSize: 9 },
  codeScroll: { flex: 1, minHeight: 248, borderRadius: 13, borderWidth: 1, borderColor: "#2B2D38", backgroundColor: "#0B0C10", padding: 12 },
  codeText: { color: "#C5D0DC", fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), textAlign: "left", writingDirection: "ltr", fontSize: 9, lineHeight: 15, userSelect: "text" },
  missingCode: { minHeight: 235, alignItems: "center", justifyContent: "center", gap: 10, padding: 18, backgroundColor: "#14151C", borderRadius: 13, borderWidth: 1, borderColor: palette.border },
  missingIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#342B18", alignItems: "center", justifyContent: "center" },
  missingTitle: { fontSize: 12, lineHeight: 19, fontWeight: "800", textAlign: "center" },
  missingCopy: { fontSize: 10, lineHeight: 17, textAlign: "center" },
  emptyViewer: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  sourceNote: { flexDirection: "row-reverse", gap: 8, paddingHorizontal: 3 },
  sourceNoteText: { flex: 1, fontSize: 9, lineHeight: 16 },
});
