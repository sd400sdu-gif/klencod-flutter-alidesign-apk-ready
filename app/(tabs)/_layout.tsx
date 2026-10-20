import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "@/constants/studio";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 8);
  const tabBarHeight = 59 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.cyan,
        tabBarInactiveTintColor: palette.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 7,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "#15161D",
          borderTopColor: palette.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: "700", marginTop: 1 },
        tabBarItemStyle: { paddingHorizontal: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="video" options={{ title: "فيديو", tabBarIcon: ({ color, size }) => <Ionicons name="videocam-outline" color={color} size={size} />, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="photo" options={{ title: "صور", tabBarIcon: ({ color, size }) => <Ionicons name="image-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="ai" options={{ title: "الذكاء", tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="files" options={{ title: "الملفات", tabBarIcon: ({ color, size }) => <Ionicons name="code-slash-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
