import { StyleSheet } from "react-native";

export const palette = {
  background: "#0F0F12",
  surface: "#171820",
  card: "#1E1E28",
  raised: "#242433",
  border: "#2D2D3D",
  text: "#E2E8F0",
  muted: "#9298A8",
  cyan: "#F6AE83",
  cyanSoft: "#3B2A28",
  indigo: "#FFD779",
  indigoSoft: "#40351F",
  green: "#34D399",
  amber: "#FFD779",
  danger: "#FB7185",
};

export const rtlText = StyleSheet.create({
  base: { color: palette.text, textAlign: "right", writingDirection: "rtl" },
  muted: { color: palette.muted, textAlign: "right", writingDirection: "rtl" },
});
