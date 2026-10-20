import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/constants/studio";

export function Page({ children, contentStyle }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function TextBlock({
  children,
  style,
  muted = false,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  numberOfLines?: number;
}) {
  return (
    <Text numberOfLines={numberOfLines} style={[styles.text, muted && styles.muted, style]}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.inlineAction}>
          <Text style={styles.inlineActionText}>{action}</Text>
          <Ionicons name="arrow-back" size={14} color={palette.cyan} />
        </Pressable>
      ) : <View />}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function StudioButton({
  children,
  onPress,
  icon,
  variant = "primary",
  style,
  disabled,
  ...props
}: PressableProps & {
  children: ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "quiet";
  style?: StyleProp<ViewStyle>;
}) {
  const buttonStyle = variant === "primary" ? styles.buttonPrimary : variant === "secondary" ? styles.buttonSecondary : styles.buttonQuiet;
  const labelStyle = variant === "primary" ? styles.buttonTextPrimary : styles.buttonTextSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, buttonStyle, style, pressed && styles.pressed, disabled && styles.disabled]}
      {...props}
    >
      {icon ? <Ionicons name={icon} size={18} color={variant === "primary" ? "#071318" : palette.text} /> : null}
      <Text style={labelStyle}>{children}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <View style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{body}</Pressable> : body;
}

export function StatusPill({
  label,
  tone = "cyan",
}: {
  label: string;
  tone?: "cyan" | "green" | "amber" | "muted";
}) {
  const colors = {
    cyan: { bg: palette.cyanSoft, fg: "#67E8F9" },
    green: { bg: "#102D26", fg: palette.green },
    amber: { bg: "#342B18", fg: palette.amber },
    muted: { bg: "#272833", fg: "#B2B6C2" },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: colors.fg }]} />
      <Text style={[styles.pillText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

export function Header({
  eyebrow,
  title,
  description,
  trailing,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTitleBlock}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
        {description ? <Text style={styles.headerDescription}>{description}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

export function IconTile({
  icon,
  label,
  tint = palette.cyan,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.iconTile, pressed && styles.pressed]}>
      <View style={[styles.iconBubble, { backgroundColor: tint === palette.indigo ? palette.indigoSoft : palette.cyanSoft }]}>
        <Ionicons name={icon} size={21} color={tint} />
      </View>
      <Text numberOfLines={1} style={styles.iconTileLabel}>{label}</Text>
    </Pressable>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "success";
}) {
  const toneStyle = tone === "warning" ? styles.noticeWarning : tone === "success" ? styles.noticeSuccess : styles.noticeInfo;
  const icon = tone === "warning" ? "alert-circle-outline" : tone === "success" ? "checkmark-circle-outline" : "information-circle-outline";
  return (
    <View style={[styles.notice, toneStyle]}>
      <Ionicons name={icon} size={18} color={tone === "warning" ? palette.amber : tone === "success" ? palette.green : palette.cyan} />
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34, gap: 22 },
  text: { color: palette.text, textAlign: "right", writingDirection: "rtl" },
  muted: { color: palette.muted },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: -8 },
  sectionTitle: { color: palette.text, textAlign: "right", writingDirection: "rtl", fontSize: 17, fontWeight: "700" },
  inlineAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  inlineActionText: { color: palette.cyan, fontSize: 12, fontWeight: "700", writingDirection: "rtl" },
  button: { minHeight: 48, paddingHorizontal: 16, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonPrimary: { backgroundColor: palette.cyan },
  buttonSecondary: { backgroundColor: palette.raised, borderColor: palette.border, borderWidth: 1 },
  buttonQuiet: { backgroundColor: "transparent" },
  buttonTextPrimary: { color: "#071318", fontWeight: "800", fontSize: 14 },
  buttonTextSecondary: { color: palette.text, fontWeight: "700", fontSize: 14 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  chip: { borderColor: palette.border, borderWidth: 1, backgroundColor: palette.surface, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 99 },
  chipActive: { backgroundColor: palette.cyanSoft, borderColor: palette.cyan },
  chipText: { color: palette.muted, fontSize: 12, fontWeight: "600", writingDirection: "rtl" },
  chipTextActive: { color: "#A5F3FC" },
  pill: { alignSelf: "flex-start", flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 99 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: "700", writingDirection: "rtl" },
  header: { minHeight: 68, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 14 },
  headerTitleBlock: { flex: 1, gap: 4, alignItems: "flex-end" },
  eyebrow: { color: palette.cyan, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textAlign: "right", writingDirection: "rtl" },
  headerTitle: { color: palette.text, fontSize: 25, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  headerDescription: { color: palette.muted, fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" },
  iconTile: { flex: 1, minHeight: 88, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 17, alignItems: "center", justifyContent: "center", gap: 9, padding: 9 },
  iconBubble: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconTileLabel: { color: palette.text, fontSize: 11, fontWeight: "700", writingDirection: "rtl" },
  notice: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 14, borderWidth: 1 },
  noticeInfo: { backgroundColor: "#11232B", borderColor: "#1C4A58" },
  noticeWarning: { backgroundColor: "#2E2719", borderColor: "#51401E" },
  noticeSuccess: { backgroundColor: "#102720", borderColor: "#1B4B3B" },
  noticeText: { color: "#BCC8D2", flex: 1, fontSize: 11, lineHeight: 18, textAlign: "right", writingDirection: "rtl" },
});
