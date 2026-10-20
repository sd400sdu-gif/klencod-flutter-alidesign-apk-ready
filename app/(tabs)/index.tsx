import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card, Chip, IconTile, Notice, Page, SectionHeading, StatusPill, StudioButton, TextBlock } from "@/components/studio/primitives";
import { palette } from "@/constants/studio";

type ProjectKind = "فيديو" | "صورة" | "فكرة";
type Project = { id: string; name: string; kind: ProjectKind; updated: string };
const STORAGE_KEY = "alidesign.local-projects.v1";
const initialProjects: Project[] = [
  { id: "sample-video", name: "لقطة الغروب", kind: "فيديو", updated: "مسودة · محلياً" },
  { id: "sample-photo", name: "ضوء المدينة", kind: "صورة", updated: "مسودة · محلياً" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [storageReady, setStorageReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ProjectKind>("فيديو");

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const parsed = JSON.parse(stored) as Project[];
          if (Array.isArray(parsed)) setProjects(parsed);
        }
      })
      .catch(() => undefined)
      .finally(() => { if (active) setStorageReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (storageReady) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects)).catch(() => undefined);
  }, [projects, storageReady]);

  const openKind = (target: ProjectKind) => {
    if (target === "فيديو") router.navigate("/(tabs)/video");
    else if (target === "صورة") router.navigate("/(tabs)/photo");
    else router.navigate("/(tabs)/ai");
  };

  const openProject = (project: Project) => {
    if (project.kind === "فيديو") router.navigate({ pathname: "/(tabs)/video", params: { projectId: project.id, projectName: project.name } });
    else if (project.kind === "صورة") router.navigate({ pathname: "/(tabs)/photo", params: { projectId: project.id, projectName: project.name } });
    else router.navigate("/(tabs)/ai");
  };

  const saveProject = () => {
    const title = name.trim();
    if (!title) return;
    const project: Project = { id: `${Date.now()}`, name: title, kind, updated: "أُنشئ للتو · محلياً" };
    setProjects((current) => [project, ...current]);
    setName("");
    setModalOpen(false);
    if (kind === "فكرة") openKind(kind);
    else openProject(project);
  };

  const logoSource = require("../../assets/images/icon.png");

  return (
    <Page contentStyle={{ gap: 20 }}>
      <View style={screenStyles.topBar}>
        <View style={screenStyles.topActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="معلومات التطبيق" style={screenStyles.topIcon} onPress={() => router.navigate("/(tabs)/files")}>
            <Ionicons name="code-slash-outline" size={18} color={palette.text} />
          </Pressable>
          <StatusPill label="على جهازك" tone="green" />
        </View>
        <View style={screenStyles.brand}>
          <View style={screenStyles.brandCopy}>
            <TextBlock style={screenStyles.brandName}>لَمْعَة</TextBlock>
            <TextBlock muted style={screenStyles.brandTagline}>استوديو تحرير الفيديو والصور</TextBlock>
          </View>
          <View style={screenStyles.logoFrame}>
            <ExpoImage source={logoSource} contentFit="cover" style={screenStyles.logo} accessibilityLabel="شعار لَمْعَة" />
          </View>
        </View>
      </View>

      <View style={screenStyles.hero}>
        <View style={screenStyles.heroGlow} />
        <View style={screenStyles.heroTopLine}>
          <StatusPill label="إبداع بلا تعقيد" />
          <Ionicons name="sparkles" size={18} color={palette.amber} />
        </View>
        <TextBlock style={screenStyles.heroTitle}>اصنع عالماً{`\n`}يُشبه خيالك</TextBlock>
        <TextBlock muted style={screenStyles.heroDescription}>ابدأ بصورة أو لقطة أو فكرة. مساحتك الإبداعية جاهزة للخطوة التالية.</TextBlock>
        <View style={screenStyles.heroActions}>
          <StudioButton icon="add" onPress={() => setModalOpen(true)} style={screenStyles.heroButton}>مشروع جديد</StudioButton>
          <View style={screenStyles.projectCount}>
            <TextBlock style={screenStyles.projectCountValue}>{projects.length.toLocaleString("ar")}</TextBlock>
            <TextBlock muted style={screenStyles.projectCountLabel}>مشاريع</TextBlock>
          </View>
        </View>
        <View style={screenStyles.heroMark}><Ionicons name="cube-outline" size={70} color="rgba(103,232,249,0.14)" /></View>
        <View style={screenStyles.heroOrbit} />
      </View>

      <View style={screenStyles.offlineRow}>
        <Ionicons name="phone-portrait-outline" size={16} color={palette.cyan} />
        <TextBlock style={screenStyles.offlineText}>المشاريع التجريبية تُحفظ محلياً على جهازك.</TextBlock>
      </View>

      <View style={screenStyles.section}>
        <SectionHeading title="ابدأ من مساحة" />
        <View style={screenStyles.quickActions}>
          <IconTile icon="sparkles-outline" label="فكرة ذكية" tint={palette.indigo} onPress={() => openKind("فكرة")} />
          <IconTile icon="image-outline" label="تحرير صورة" onPress={() => openKind("صورة")} />
          <IconTile icon="videocam-outline" label="تحرير فيديو" onPress={() => openKind("فيديو")} />
        </View>
      </View>

      <View style={screenStyles.section}>
        <SectionHeading title="مشاريعك" action="كل الملفات" onAction={() => router.navigate("/(tabs)/files")} />
        <View style={screenStyles.projectList}>
          {projects.slice(0, 4).map((project) => <ProjectRow key={project.id} project={project} onPress={() => openProject(project)} />)}
        </View>
        {!projects.length ? <Notice>لا توجد مشاريع بعد. أنشئ مشروعك الأول ليظهر هنا.</Notice> : null}
      </View>

      <Card style={screenStyles.boundaryCard}>
        <View style={screenStyles.boundaryIcon}><Ionicons name="information-circle-outline" size={19} color={palette.amber} /></View>
        <View style={screenStyles.boundaryCopy}>
          <TextBlock style={screenStyles.boundaryTitle}>عن النموذج</TextBlock>
          <TextBlock muted style={screenStyles.boundaryDescription}>هذه واجهة Expo عاملة. بناء APK وتصدير Media3 الأصلي غير مفعّلين هنا.</TextBlock>
        </View>
      </Card>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={screenStyles.modalBackdrop}>
          <View style={screenStyles.modalSheet}>
            <View style={screenStyles.modalHandle} />
            <View style={screenStyles.modalHeading}>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={10} style={screenStyles.closeButton}><Ionicons name="close" size={19} color={palette.text} /></Pressable>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <TextBlock style={screenStyles.modalTitle}>مشروع جديد</TextBlock>
                <TextBlock muted style={screenStyles.modalSub}>يُحفظ محلياً على هذا الجهاز</TextBlock>
              </View>
            </View>
            <TextBlock style={screenStyles.inputLabel}>اسم المشروع</TextBlock>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="مثال: مشهد من المستقبل"
              placeholderTextColor="#6F7482"
              textAlign="right"
              style={screenStyles.nameInput}
              returnKeyType="done"
              onSubmitEditing={saveProject}
              accessibilityLabel="اسم المشروع"
            />
            <TextBlock style={screenStyles.inputLabel}>نوع المساحة</TextBlock>
            <View style={screenStyles.modalChips}>
              {(["فيديو", "صورة", "فكرة"] as ProjectKind[]).map((value) => <Chip key={value} label={value} active={kind === value} onPress={() => setKind(value)} />)}
            </View>
            <StudioButton icon="arrow-back" onPress={saveProject} disabled={!name.trim()}>إنشاء وفتح المساحة</StudioButton>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function ProjectRow({ project, onPress }: { project: Project; onPress: () => void }) {
  const icon = project.kind === "فيديو" ? "videocam-outline" : project.kind === "صورة" ? "image-outline" : "sparkles-outline";
  const tint = project.kind === "فكرة" ? palette.indigo : palette.cyan;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [screenStyles.projectRow, pressed && { opacity: 0.76 }]}>
      <Ionicons name="chevron-back" size={16} color={palette.muted} />
      <View style={screenStyles.projectCopy}>
        <TextBlock style={screenStyles.projectName}>{project.name}</TextBlock>
        <TextBlock muted style={screenStyles.projectMeta}>{project.kind} · {project.updated}</TextBlock>
      </View>
      <View style={[screenStyles.projectIcon, { backgroundColor: tint === palette.indigo ? palette.indigoSoft : palette.cyanSoft }]}><Ionicons name={icon} size={19} color={tint} /></View>
    </Pressable>
  );
}

const screenStyles = StyleSheet.create({
  topBar: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", minHeight: 51 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  topIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  brand: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  brandCopy: { alignItems: "flex-end", gap: 3 },
  brandName: { fontSize: 14, fontWeight: "900" },
  brandTagline: { fontSize: 9 },
  logoFrame: { width: 42, height: 42, borderRadius: 14, overflow: "hidden", borderColor: "#3A4655", borderWidth: 1 },
  logo: { width: "100%", height: "100%" },
  hero: { minHeight: 242, overflow: "hidden", position: "relative", borderRadius: 25, padding: 19, backgroundColor: "#171A27", borderColor: "#30364C", borderWidth: 1, justifyContent: "flex-start", gap: 12 },
  heroGlow: { position: "absolute", width: 185, height: 185, borderRadius: 99, backgroundColor: "#152F48", top: -82, left: -42, opacity: 0.85 },
  heroTopLine: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", width: "100%" },
  heroTitle: { fontSize: 30, lineHeight: 38, fontWeight: "900", maxWidth: "79%" },
  heroDescription: { fontSize: 12, lineHeight: 19, maxWidth: "76%" },
  heroActions: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", gap: 14, marginTop: 1 },
  heroButton: { minWidth: 145 },
  projectCount: { alignItems: "center", minWidth: 43, gap: 1 },
  projectCountValue: { fontSize: 17, fontWeight: "900", color: "#B6F6FC" },
  projectCountLabel: { fontSize: 9 },
  heroMark: { position: "absolute", left: 16, bottom: 46, transform: [{ rotate: "-12deg" }] },
  heroOrbit: { position: "absolute", width: 117, height: 49, left: -10, bottom: 26, borderColor: "rgba(6,182,212,0.35)", borderWidth: 1, borderRadius: 80, transform: [{ rotate: "-38deg" }] },
  offlineRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingHorizontal: 2 },
  offlineText: { color: "#A8C9CC", fontSize: 11 },
  section: { gap: 15 },
  quickActions: { flexDirection: "row", gap: 9 },
  projectList: { gap: 9 },
  projectRow: { minHeight: 72, flexDirection: "row-reverse", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 17, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 },
  projectCopy: { flex: 1, alignItems: "flex-end", gap: 5 },
  projectName: { fontSize: 13, fontWeight: "800" },
  projectMeta: { fontSize: 10 },
  projectIcon: { width: 41, height: 41, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  boundaryCard: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 13 },
  boundaryIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#342B18", alignItems: "center", justifyContent: "center" },
  boundaryCopy: { flex: 1, gap: 4, alignItems: "flex-end" },
  boundaryTitle: { fontSize: 11, fontWeight: "800" },
  boundaryDescription: { fontSize: 10, lineHeight: 16 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  modalSheet: { backgroundColor: "#191A22", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 13, paddingBottom: 28, gap: 14, borderTopWidth: 1, borderColor: palette.border },
  modalHandle: { alignSelf: "center", height: 4, width: 39, backgroundColor: "#505260", borderRadius: 4, marginBottom: 2 },
  modalHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: palette.raised, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 19, fontWeight: "900" },
  modalSub: { fontSize: 11 },
  inputLabel: { fontSize: 12, fontWeight: "700" },
  nameInput: { height: 50, backgroundColor: "#101117", borderColor: palette.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, color: palette.text, writingDirection: "rtl" },
  modalChips: { flexDirection: "row-reverse", gap: 8, marginBottom: 4 },
});
