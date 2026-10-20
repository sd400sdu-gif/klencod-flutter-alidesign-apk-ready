import { useEffect, useMemo, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Sharing from "expo-sharing";
import { Card, Chip, Header, Notice, Page, SectionHeading, StatusPill, StudioButton, TextBlock } from "@/components/studio/primitives";
import { palette } from "@/constants/studio";
import { COLOR_PRESETS, EDITOR_COLORS } from "@/features/editor/catalog";
import { DEFAULT_COLOR_GRADE, type PhotoCropRatio, type PhotoEditState, type PhotoGradient } from "@/features/editor/model";
import { centeredCrop, createDefaultPhotoEditState } from "@/features/editor/photo";
import { loadPhotoProject, persistMediaUri, savePhotoProject } from "@/features/editor/storage";

const cropRatios: PhotoCropRatio[] = ["original", "1:1", "4:5", "9:16", "16:9"];
const gradients: { id: PhotoGradient; label: string; color: string }[] = [
  { id: "none", label: "بدون", color: "transparent" },
  { id: "sunset", label: "غروب", color: "rgba(255,92,72,0.24)" },
  { id: "ocean", label: "بحر", color: "rgba(4,166,198,0.24)" },
  { id: "violet", label: "بنفسجي", color: "rgba(134,76,220,0.24)" },
];
const stickers = ["", "✨", "☀️", "💫", "🌿", "🎞️"];
const outputSizes = [720, 1080, 1440, 2160] as const;
const photoStorageFile = "لمعة-صورة";

type PickedImage = { uri: string; fileName?: string | null; width: number; height: number };
type SaveState = "saving" | "saved" | "error";

export default function PhotoEditorScreen() {
  const params = useLocalSearchParams<{ projectId?: string; projectName?: string }>();
  const projectId = typeof params.projectId === "string" ? params.projectId : "quick-photo";
  const projectName = typeof params.projectName === "string" ? params.projectName : "مشروع لمعة";
  const { width: windowWidth } = useWindowDimensions();
  const [photo, setPhoto] = useState<PhotoEditState>(() => createDefaultPhotoEditState());
  const [asset, setAsset] = useState<PickedImage | null>(null);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [projectLoadError, setProjectLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [compareOriginal, setCompareOriginal] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPhotoProject(projectId).then((stored) => {
      if (!active) return;
      const restored = stored ?? { ...createDefaultPhotoEditState() };
      setPhoto(restored);
      setAsset(restored.sourceUri ? { uri: restored.sourceUri, width: restored.sourceWidth, height: restored.sourceHeight } : null);
      setError("");
      if (restored.sourceUri) {
        setNotice(restored.sourcePersistent ? "استُعيدت الصورة من ملفات المشروع المحفوظة." : "استُعيدت إعدادات المشروع؛ قد تحتاج صورة المتصفح المؤقتة إلى إعادة اختيار.");
      } else {
        setNotice("");
      }
      setProjectLoadError(false);
      setLoadedProjectId(projectId);
    }).catch(() => {
      if (!active) return;
      setAsset(null);
      setLoadedProjectId(null);
      setProjectLoadError(true);
      setError("");
    });
    return () => { active = false; };
  }, [projectId, loadAttempt]);

  useEffect(() => {
    if (loadedProjectId !== projectId || projectLoadError) return;
    const timer = setTimeout(() => {
      setSaveState("saving");
      void savePhotoProject(projectId, photo).then(() => setSaveState("saved")).catch(() => setSaveState("error"));
    }, 350);
    return () => clearTimeout(timer);
  }, [loadedProjectId, photo, projectId, projectLoadError]);

  const update = (changes: Partial<PhotoEditState>) => setPhoto((current) => ({ ...current, ...changes }));
  const cropAspect = useMemo(() => {
    if (photo.cropRatio === "original") return asset?.width && asset.height ? asset.width / asset.height : 1;
    const [w, h] = photo.cropRatio.split(":").map(Number);
    return w / h;
  }, [asset?.height, asset?.width, photo.cropRatio]);
  const previewWidthLimit = Math.max(180, Math.min(windowWidth - 44, 480));
  const previewHeightLimit = 296;
  const previewViewport = cropAspect > previewWidthLimit / previewHeightLimit
    ? { width: previewWidthLimit, height: previewWidthLimit / cropAspect }
    : { width: previewHeightLimit * cropAspect, height: previewHeightLimit };
  const grade = compareOriginal ? DEFAULT_COLOR_GRADE : photo.colorGrade;
  const webFilter = `brightness(${Math.max(0.1, 1 + grade.brightness / 100)}) contrast(${Math.max(0.1, 1 + grade.contrast / 100)}) saturate(${Math.max(0, 1 + grade.saturation / 100)}) hue-rotate(${grade.tint}deg) sepia(${Math.max(0, grade.temperature) / 180})`;
  const gradient = gradients.find((item) => item.id === photo.gradient) ?? gradients[0];
  const nativeBrightness = grade.brightness === 0 ? "transparent" : grade.brightness > 0 ? `rgba(255,255,255,${Math.min(0.26, grade.brightness / 230)})` : `rgba(0,0,0,${Math.min(0.3, Math.abs(grade.brightness) / 200)})`;
  const nativeDesaturation = grade.saturation < 0 ? `rgba(128,128,128,${Math.min(0.28, Math.abs(grade.saturation) / 350)})` : "transparent";

  const chooseImage = async () => {
    setError("");
    setNotice("");
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError("لم يُمنح إذن الصور. فعّل الوصول إلى مكتبة الصور في إعدادات الجهاز ثم حاول مجدداً.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
      if (result.canceled) return;
      const selected = result.assets[0];
      if (!selected) return;
      const label = selected.fileName || selected.uri.split("/").pop() || "photo.jpg";
      const stored = await persistMediaUri(selected.uri, label);
      const next = {
        ...createDefaultPhotoEditState(),
        sourceUri: stored.uri,
        sourcePersistent: stored.persistent,
        sourceWidth: selected.width,
        sourceHeight: selected.height,
      };
      setAsset({ uri: stored.uri, fileName: selected.fileName, width: selected.width, height: selected.height });
      setPhoto(next);
      setNotice(stored.persistent ? "نُسخت الصورة إلى ملفات المشروع؛ التعديلات محفوظة محلياً." : "أُضيفت الصورة إلى المعاينة. في المتصفح قد تحتاج إعادة اختيارها بعد إغلاقه.");
    } catch {
      setError("تعذّر فتح مكتبة الصور. تحقّق من الأذونات أو اختر ملف صورة آخر.");
    }
  };

  const rotate = () => update({ rotation: (photo.rotation + 90) % 360, processedUri: null });
  const adjust = (key: "brightness" | "contrast" | "saturation" | "temperature", delta: number) => {
    const bounds = key === "saturation" ? [-100, 100] : [-60, 60];
    update({ colorGrade: { ...photo.colorGrade, [key]: Math.max(bounds[0], Math.min(bounds[1], photo.colorGrade[key] + delta)) }, colorPresetId: "custom", processedUri: null });
  };
  const applyColorPreset = (presetId: string) => {
    if (presetId === "original") update({ colorGrade: { ...DEFAULT_COLOR_GRADE }, colorPresetId: "original", processedUri: null });
    else {
      const preset = COLOR_PRESETS.find((item) => item.id === presetId);
      if (preset) update({ colorGrade: { ...preset.values }, colorPresetId: preset.id, processedUri: null });
    }
  };

  const exportPhoto = async () => {
    if (loadedProjectId !== projectId || projectLoadError) {
      setError("انتظر تحميل المشروع قبل حفظ الصورة؛ لم يُغيّر التطبيق أي ملف.");
      return;
    }
    if (!asset) {
      setError("اختر صورة قبل حفظ النسخة.");
      return;
    }
    setError("");
    setIsBusy(true);
    try {
      const manipulator = ImageManipulator.manipulate(asset.uri);
      let width = photo.sourceWidth || asset.width;
      let height = photo.sourceHeight || asset.height;
      if (photo.rotation) {
        manipulator.rotate(photo.rotation);
        if (photo.rotation % 180 !== 0) [width, height] = [height, width];
      }
      const crop = centeredCrop(width, height, photo.cropRatio);
      if (crop) {
        manipulator.crop(crop);
        width = crop.width;
        height = crop.height;
      }
      const longEdge = photo.resizeLongEdge;
      if (width >= height) manipulator.resize({ width: longEdge });
      else manipulator.resize({ height: longEdge });
      const rendered = await manipulator.renderAsync();
      const result = await rendered.saveAsync({ format: photo.format === "png" ? SaveFormat.PNG : SaveFormat.JPEG, compress: photo.format === "png" ? 1 : 0.94 });
      const extension = photo.format === "png" ? "png" : "jpg";
      const stable = await persistMediaUri(result.uri, `${photoStorageFile}.${extension}`);
      update({ processedUri: stable.persistent ? stable.uri : null });
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const anchor = window.document.createElement("a");
        anchor.href = result.uri;
        anchor.download = `${photoStorageFile}.${extension}`;
        anchor.click();
        setNotice(`تم تنزيل نسخة ${photo.format.toUpperCase()} (${result.width}×${result.height}) إلى الجهاز. لم تُحفظ النسخة المؤقتة داخل المشروع؛ النص والملصق والإطار والتدرج تبقى معاينة فقط.`);
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(stable.persistent ? stable.uri : result.uri, { mimeType: photo.format === "png" ? "image/png" : "image/jpeg", dialogTitle: "حفظ صورة لمعة" });
        setNotice(stable.persistent
          ? `حُفظت نسخة ${photo.format.toUpperCase()} (${result.width}×${result.height}) داخل ملفات المشروع وفتحت قائمة المشاركة. الطبقات التزيينية تبقى معاينة فقط.`
          : `أُنشئت نسخة ${photo.format.toUpperCase()} مؤقتة وفتحت قائمة المشاركة، لكنها لم تُحفظ داخل ملفات المشروع؛ احفظها من قائمة المشاركة قبل إغلاق التطبيق. الطبقات التزيينية تبقى معاينة فقط.`);
      } else {
        if (stable.persistent) {
          setNotice(`حُفظت نسخة ${photo.format.toUpperCase()} في ملفات المشروع (${result.width}×${result.height})، لكن المشاركة غير متاحة في هذه البيئة.`);
        } else {
          setError("أُنشئت نسخة مؤقتة، لكن التخزين الدائم والمشاركة غير متاحين هنا؛ لم تُحفظ النسخة. جرّب جهازاً يدعم المشاركة أو مساحة تخزين دائمة.");
        }
      }
    } catch {
      setError("تعذّر إنشاء الصورة. جرّب حجماً أصغر أو صورة من الجهاز بصيغة مدعومة.");
    } finally {
      setIsBusy(false);
    }
  };

  if (projectLoadError) {
    return (
      <Page contentStyle={{ gap: 16 }}>
        <Header eyebrow={`لمعة · ${projectName}`} title="تعذّر فتح المشروع" description="لم يُنشأ مشروع افتراضي ولم يُحفظ شيء فوق بياناتك." />
        <Notice tone="warning">تعذّرت قراءة بيانات المشروع. تحقق من مساحة التخزين ثم أعد المحاولة؛ سيبقى الحفظ التلقائي موقوفاً حتى نجاح القراءة.</Notice>
        <StudioButton icon="refresh-outline" onPress={() => setLoadAttempt((attempt) => attempt + 1)}>إعادة المحاولة</StudioButton>
      </Page>
    );
  }
  if (loadedProjectId !== projectId) {
    return <Page><Header eyebrow={`لمعة · ${projectName}`} title="محرر الصور" description="جار استعادة المشروع من التخزين المحلي…" /></Page>;
  }

  return (
    <Page contentStyle={{ gap: 16 }}>
      <Header
        eyebrow={`لمعة · ${projectName}`}
        title="محرر الصور"
        description="قصّ ودوّر وغيّر المقاس واللون، ثم احفظ نسخة PNG أو JPEG. تبقى الصورة الأصلية محفوظة بلا استبدال."
        trailing={<StatusPill label={saveState === "saving" ? "جار الحفظ" : saveState === "error" ? "تعذّر الحفظ" : "حُفظ محلياً"} tone={saveState === "error" ? "amber" : "green"} />}
      />

      <View style={screenStyles.previewFrame}>
        {asset ? (
          <View style={[screenStyles.photoViewport, previewViewport, photo.frame === "thin" ? screenStyles.frameThin : photo.frame === "glow" ? screenStyles.frameGlow : photo.frame === "shadow" ? screenStyles.frameShadow : null]}>
            <Image source={{ uri: compareOriginal ? asset.uri : photo.processedUri || asset.uri }} style={[screenStyles.photo, !compareOriginal && !photo.processedUri && Platform.OS === "web" ? ({ filter: webFilter } as never) : null, { transform: [{ rotate: `${compareOriginal || photo.processedUri ? 0 : photo.rotation}deg` }] }]} resizeMode="cover" accessibilityLabel="معاينة الصورة المختارة" />
            {Platform.OS !== "web" && !compareOriginal ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: grade.temperature >= 0 ? `rgba(255,142,62,${Math.min(0.23, Math.abs(grade.temperature) / 420)})` : `rgba(56,128,255,${Math.min(0.2, Math.abs(grade.temperature) / 480)})` }]} /> : null}
            {Platform.OS !== "web" && !compareOriginal && nativeBrightness !== "transparent" ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: nativeBrightness }]} /> : null}
            {Platform.OS !== "web" && !compareOriginal && nativeDesaturation !== "transparent" ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: nativeDesaturation }]} /> : null}
            {!compareOriginal ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: gradient.color }]} /> : null}
            {photo.sticker && !compareOriginal ? <TextBlock style={screenStyles.sticker}>{photo.sticker}</TextBlock> : null}
            {photo.caption && !compareOriginal ? <TextBlock style={[screenStyles.caption, { color: photo.captionColor }]}>{photo.caption}</TextBlock> : null}
            <View style={screenStyles.previewPill}><Ionicons name="eye-outline" size={13} color="#D9FBFF" /><TextBlock style={screenStyles.previewPillText}>{photo.processedUri ? "نسخة محفوظة" : compareOriginal ? "الأصل" : "المعاينة"} · {photo.cropRatio}</TextBlock></View>
          </View>
        ) : (
          <View style={screenStyles.emptyPreview}>
            <View style={screenStyles.emptyIcon}><Ionicons name="image-outline" size={28} color={palette.cyan} /></View>
            <TextBlock style={screenStyles.emptyTitle}>صورتك تبدأ من هنا</TextBlock>
            <TextBlock muted style={screenStyles.emptyHint}>اختر صورة من جهازك لتجربة أدوات المعاينة والحفظ</TextBlock>
            <StudioButton icon="images-outline" onPress={() => void chooseImage()} style={{ marginTop: 8 }}>اختيار صورة</StudioButton>
          </View>
        )}
      </View>

      {error ? <Notice tone="warning">{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      <Card style={screenStyles.controlCard}>
        <View style={screenStyles.controlHeading}><TextBlock muted style={screenStyles.controlValue}>{photo.rotation}°</TextBlock><TextBlock style={screenStyles.controlTitle}>القصّ والتكوين</TextBlock></View>
        <View style={screenStyles.chipRow}>{cropRatios.map((ratio) => <Chip key={ratio} label={ratio === "original" ? "الأصل" : ratio} active={photo.cropRatio === ratio} onPress={() => update({ cropRatio: ratio, processedUri: null })} />)}</View>
        <View style={screenStyles.controlRow}>
          <ControlButton icon="reload-outline" label="تدوير 90°" onPress={rotate} />
          <ControlButton icon="crop-outline" label="مقاس الإخراج" onPress={() => update({ resizeLongEdge: outputSizes[(outputSizes.indexOf(photo.resizeLongEdge) + 1) % outputSizes.length], processedUri: null })} />
        </View>
        <TextBlock muted style={screenStyles.smallNote}>الحافة الطويلة: {photo.resizeLongEdge}px · القصّ والدوران والتحجيم يطبّقون على النسخة المحفوظة.</TextBlock>
      </Card>

      <Card style={screenStyles.controlCard}>
        <SectionHeading title="غلاف أو صورة مصغّرة" />
        <View style={screenStyles.chipRow}><Chip label="غلاف عمودي 9:16" active={photo.cropRatio === "9:16"} onPress={() => update({ cropRatio: "9:16", processedUri: null })} /><Chip label="مصغّرة 16:9" active={photo.cropRatio === "16:9"} onPress={() => update({ cropRatio: "16:9", processedUri: null })} /></View>
        <TextBlock muted style={screenStyles.smallNote}>أضف عنواناً أو ملصقاً للمعاينة؛ هذه الطبقات التزيينية لا تُركب في النسخة المُصدّرة حالياً.</TextBlock>
      </Card>

      <View style={screenStyles.section}>
        <SectionHeading title="تصحيح اللون" action={compareOriginal ? "إنهاء المقارنة" : "مقارنة بالأصل"} onAction={() => setCompareOriginal((value) => !value)} />
        <View style={screenStyles.chipRow}><Chip label="أصلية" active={photo.colorPresetId === "original"} onPress={() => applyColorPreset("original")} />{COLOR_PRESETS.map((item) => <Chip key={item.id} label={item.label} active={photo.colorPresetId === item.id} onPress={() => applyColorPreset(item.id)} />)}</View>
        <Card style={screenStyles.controlCard}>
          <Adjuster label="السطوع" value={photo.colorGrade.brightness} onChange={(delta) => adjust("brightness", delta)} />
          <Adjuster label="التباين" value={photo.colorGrade.contrast} onChange={(delta) => adjust("contrast", delta)} />
          <Adjuster label="التشبّع" value={photo.colorGrade.saturation} onChange={(delta) => adjust("saturation", delta)} />
          <Adjuster label="حرارة اللون" value={photo.colorGrade.temperature} onChange={(delta) => adjust("temperature", delta)} />
        </Card>
      </View>

      <Card style={screenStyles.controlCard}>
        <SectionHeading title="الكتابة والملصقات" />
        <TextInput value={photo.caption} onChangeText={(caption) => update({ caption, processedUri: null })} placeholder="أضف عنواناً على الصورة" placeholderTextColor="#727786" textAlign="right" style={screenStyles.input} maxLength={120} />
        <View style={screenStyles.chipRow}>{EDITOR_COLORS.map((color) => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`لون النص ${color}`} onPress={() => update({ captionColor: color, processedUri: null })} style={[screenStyles.colorDot, { backgroundColor: color }, photo.captionColor === color && screenStyles.colorDotActive]} />)}</View>
        <View style={screenStyles.chipRow}>{stickers.map((sticker, index) => <Chip key={`${sticker}-${index}`} label={sticker || "بلا ملصق"} active={photo.sticker === sticker} onPress={() => update({ sticker, processedUri: null })} />)}</View>
        <View style={screenStyles.controlRow}>
          <Chip label="بلا إطار" active={photo.frame === "none"} onPress={() => update({ frame: "none" })} />
          <Chip label="إطار رفيع" active={photo.frame === "thin"} onPress={() => update({ frame: "thin" })} />
          <Chip label="إطار مضيء" active={photo.frame === "glow"} onPress={() => update({ frame: "glow" })} />
          <Chip label="ظل" active={photo.frame === "shadow"} onPress={() => update({ frame: "shadow" })} />
        </View>
        <TextBlock muted style={screenStyles.smallNote}>النص والملصق والإطار يعرضون فوق المعاينة؛ لا يُدمجون في ملف الإخراج الحالي.</TextBlock>
      </Card>

      <Card style={screenStyles.controlCard}>
        <SectionHeading title="طبقة التدرج" />
        <View style={screenStyles.chipRow}>{gradients.map((item) => <Chip key={item.id} label={item.label} active={photo.gradient === item.id} onPress={() => update({ gradient: item.id })} />)}</View>
        <TextBlock muted style={screenStyles.smallNote}>تظهر كطبقة معاينة فقط ولا تُدمج في ملف PNG/JPEG.</TextBlock>
      </Card>

      <Card style={screenStyles.controlCard}>
        <View style={screenStyles.controlHeading}><TextBlock style={screenStyles.controlTitle}>صيغة الحفظ</TextBlock><TextBlock muted style={screenStyles.controlValue}>{photo.format.toUpperCase()}</TextBlock></View>
        <View style={screenStyles.controlRow}><Chip label="JPEG" active={photo.format === "jpeg"} onPress={() => update({ format: "jpeg", processedUri: null })} /><Chip label="PNG" active={photo.format === "png"} onPress={() => update({ format: "png", processedUri: null })} /></View>
        <StudioButton icon={isBusy ? "hourglass-outline" : "download-outline"} disabled={!asset || isBusy} onPress={() => void exportPhoto()}>{isBusy ? "جارٍ تجهيز النسخة…" : `حفظ نسخة ${photo.format.toUpperCase()}`}</StudioButton>
      </Card>

      <Notice tone="warning">المتاح فعلياً في ملف الإخراج: القصّ المركزي بنسبة الإطار المختارة، التدوير، التحجيم، والتحويل بين PNG/JPEG. مرشحات اللون والنص والملصقات والإطارات والتدرجات لا تُركّب بعد داخل الملف؛ وتظل الصورة الأصلية دون تعديل.</Notice>
      <StudioButton icon="images-outline" variant="secondary" onPress={() => void chooseImage()}>{asset ? "تغيير الصورة" : "اختيار صورة"}</StudioButton>
    </Page>
  );
}

function ControlButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [screenStyles.controlButton, pressed && { opacity: 0.7 }]}><Ionicons name={icon} size={17} color={palette.cyan} /><TextBlock style={screenStyles.controlButtonText}>{label}</TextBlock></Pressable>;
}

function Adjuster({ label, value, onChange }: { label: string; value: number; onChange: (delta: number) => void }) {
  return (
    <View style={screenStyles.adjuster}>
      <Pressable accessibilityRole="button" accessibilityLabel={`زيادة ${label}`} onPress={() => onChange(5)} style={screenStyles.adjustButton}><Ionicons name="add" size={18} color={palette.text} /></Pressable>
      <View style={screenStyles.adjusterCopy}><TextBlock style={screenStyles.controlTitle}>{label}</TextBlock><TextBlock muted style={screenStyles.controlValue}>{value.toLocaleString("ar")}</TextBlock></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`خفض ${label}`} onPress={() => onChange(-5)} style={screenStyles.adjustButton}><Ionicons name="remove" size={18} color={palette.text} /></Pressable>
    </View>
  );
}

const screenStyles = StyleSheet.create({
  previewFrame: { height: 310, overflow: "visible", borderRadius: 20, backgroundColor: "#090A0E", borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  photoViewport: { position: "relative", overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#101218", borderColor: "#272A33", borderWidth: 1 },
  photo: { width: "100%", height: "100%" },
  frameThin: { borderColor: "#F3F4F6", borderWidth: 3 },
  frameGlow: { borderColor: palette.cyan, borderWidth: 3 },
  frameShadow: Platform.select({
    web: { boxShadow: "0px 12px 14px rgba(0,0,0,0.4)" },
    default: { shadowColor: "#000000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },
  }),
  sticker: { position: "absolute", right: "14%", top: "20%", fontSize: 30 },
  caption: { position: "absolute", bottom: 20, left: 12, right: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, color: "#FFFFFF", textAlign: "center", fontSize: 15, fontWeight: "800", backgroundColor: "rgba(0,0,0,0.52)" },
  previewPill: { position: "absolute", right: 8, top: 8, flexDirection: "row-reverse", alignItems: "center", gap: 4, borderRadius: 99, backgroundColor: "rgba(15,15,18,0.88)", paddingHorizontal: 8, paddingVertical: 6 },
  previewPillText: { color: "#D9FBFF", fontSize: 9, fontWeight: "700" },
  emptyPreview: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 18 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: palette.cyanSoft, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyHint: { fontSize: 10, textAlign: "center" },
  section: { gap: 10 },
  controlCard: { gap: 12, padding: 14 },
  controlHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  controlTitle: { fontSize: 12, fontWeight: "800" },
  controlValue: { fontSize: 10, fontVariant: ["tabular-nums"] },
  chipRow: { flexDirection: "row-reverse", gap: 7, flexWrap: "wrap", alignItems: "center" },
  controlRow: { flexDirection: "row-reverse", gap: 8, alignItems: "center", flexWrap: "wrap" },
  controlButton: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 42, borderRadius: 12, backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, paddingHorizontal: 8 },
  controlButtonText: { fontSize: 10, fontWeight: "700" },
  smallNote: { fontSize: 9, lineHeight: 15 },
  input: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, color: palette.text, paddingHorizontal: 12, fontSize: 12 },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#30313D" },
  colorDotActive: { borderColor: palette.cyan, transform: [{ scale: 1.16 }] },
  adjuster: { minHeight: 42, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  adjusterCopy: { flex: 1, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  adjustButton: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: palette.raised, borderColor: palette.border, borderWidth: 1 },
});
