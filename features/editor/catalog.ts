import type { ColorGrade, CanvasRatio } from "./model";

export type EffectFamily = "distortion" | "light" | "motion" | "cinema" | "atmosphere" | "fade";
export type EffectPreset = { id: string; label: string; family: EffectFamily; defaultDuration: number; preview: "rgb" | "scanline" | "glow" | "flash" | "shake" | "zoom" | "lens" | "rain" | "snow" | "smoke" | "grade" | "noise" | "blur" | "motion" | "fade" };

export const EFFECT_PRESETS: EffectPreset[] = [
  { id: "glitch", label: "تشويش رقمي", family: "distortion", defaultDuration: 0.8, preview: "noise" },
  { id: "rgb", label: "RGB", family: "distortion", defaultDuration: 1, preview: "rgb" },
  { id: "vhs", label: "VHS", family: "distortion", defaultDuration: 2, preview: "scanline" },
  { id: "neon", label: "نيون", family: "light", defaultDuration: 1.5, preview: "glow" },
  { id: "glow", label: "توهج", family: "light", defaultDuration: 1.5, preview: "glow" },
  { id: "flicker", label: "وميض", family: "light", defaultDuration: 0.6, preview: "flash" },
  { id: "shake", label: "اهتزاز سينمائي", family: "motion", defaultDuration: 0.7, preview: "shake" },
  { id: "zoom-fast", label: "زوم سريع", family: "motion", defaultDuration: 0.55, preview: "zoom" },
  { id: "zoom-slow", label: "زوم بطيء", family: "motion", defaultDuration: 2.5, preview: "zoom" },
  { id: "lens", label: "ضوء العدسة", family: "light", defaultDuration: 1.4, preview: "lens" },
  { id: "rain", label: "مطر", family: "atmosphere", defaultDuration: 3, preview: "rain" },
  { id: "snow", label: "ثلج", family: "atmosphere", defaultDuration: 3, preview: "snow" },
  { id: "smoke", label: "دخان", family: "atmosphere", defaultDuration: 2, preview: "smoke" },
  { id: "cinema", label: "ألوان سينمائية", family: "cinema", defaultDuration: 3, preview: "grade" },
  { id: "blur", label: "تمويه", family: "cinema", defaultDuration: 1, preview: "blur" },
  { id: "motion-blur", label: "تمويه حركة", family: "motion", defaultDuration: 0.8, preview: "motion" },
  { id: "fade-in", label: "ظهور تدريجي", family: "fade", defaultDuration: 1, preview: "fade" },
  { id: "fade-out", label: "اختفاء تدريجي", family: "fade", defaultDuration: 1, preview: "fade" },
];

export type TransitionPreset = { id: string; label: string; preview: "zoom" | "rotate" | "fade" | "flash" | "swipe" | "blur" | "shake" | "glitch" };
export const TRANSITION_PRESETS: TransitionPreset[] = [
  { id: "zoom-in", label: "تكبير", preview: "zoom" },
  { id: "zoom-out", label: "تصغير", preview: "zoom" },
  { id: "rotate", label: "دوران", preview: "rotate" },
  { id: "fade", label: "تلاشي", preview: "fade" },
  { id: "flash", label: "وميض", preview: "flash" },
  { id: "swipe", label: "سحب", preview: "swipe" },
  { id: "blur", label: "تمويه", preview: "blur" },
  { id: "shake", label: "اهتزاز", preview: "shake" },
  { id: "glitch", label: "تشويش رقمي", preview: "glitch" },
];

export const KEYFRAME_CURVES = [
  { id: "linear", label: "خطي" },
  { id: "ease-in", label: "تسارع" },
  { id: "ease-out", label: "تباطؤ" },
  { id: "ease-in-out", label: "ناعم" },
] as const;
export const EDITOR_COLORS = ["#FFFFFF", "#F5B942", "#06B6D4", "#FB7185", "#A78BFA", "#111827"];

export type ColorPreset = { id: string; label: string; values: ColorGrade };
export const COLOR_PRESETS: ColorPreset[] = [
  { id: "cinema-warm", label: "سينمائي دافئ", values: { brightness: 3, contrast: 12, saturation: -7, temperature: 16, tint: 0, sharpness: 6, shadows: -8, highlights: 8 } },
  { id: "cool-night", label: "ليل بارد", values: { brightness: -4, contrast: 9, saturation: -9, temperature: -18, tint: 3, sharpness: 8, shadows: 7, highlights: -12 } },
  { id: "vivid", label: "ألوان حيوية", values: { brightness: 4, contrast: 8, saturation: 22, temperature: 0, tint: 0, sharpness: 12, shadows: 0, highlights: 3 } },
  { id: "soft-matte", label: "ناعم مطفي", values: { brightness: 5, contrast: -9, saturation: -5, temperature: 4, tint: 2, sharpness: -5, shadows: 11, highlights: -8 } },
  { id: "monochrome", label: "أحادي", values: { brightness: 0, contrast: 13, saturation: -100, temperature: 0, tint: 0, sharpness: 4, shadows: 0, highlights: 0 } },
];

export type VideoTemplate = { id: string; title: string; category: "عمودي" | "قصة" | "قصير" | "إعلان" | "سينمائي"; ratio: CanvasRatio; duration: number; caption: string; effectId: string; accent: string };
export const VIDEO_TEMPLATES: VideoTemplate[] = [
  { id: "vertical-story", title: "قصة يومية", category: "قصة", ratio: "9:16", duration: 15, caption: "لحظة تستحق أن تُروى", effectId: "cinema", accent: "#13B8C8" },
  { id: "short-punch", title: "مقطع سريع", category: "قصير", ratio: "9:16", duration: 20, caption: "جاهز للحظة التالية", effectId: "zoom-fast", accent: "#9B6CFF" },
  { id: "brand-ad", title: "إعلان أنيق", category: "إعلان", ratio: "9:16", duration: 30, caption: "فكرتك، بصورة أوضح", effectId: "glow", accent: "#F4B942" },
  { id: "landscape-cinema", title: "مشهد سينمائي", category: "سينمائي", ratio: "16:9", duration: 45, caption: "مشهد من عالم آخر", effectId: "lens", accent: "#5577D8" },
  { id: "square-promo", title: "غلاف مربع", category: "عمودي", ratio: "1:1", duration: 12, caption: "عنوان مشروعك", effectId: "fade-in", accent: "#E373A9" },
];
