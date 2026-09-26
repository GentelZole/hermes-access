import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/theme/store';

/**
 * Web tab bar — mirrors the native tabs (Chat / Identity / More).
 * Themed by the active identity direction, same as the native bar.
 */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="chat" href="/" asChild>
            <TabButton>Chat</TabButton>
          </TabTrigger>
          <TabTrigger name="channels" href="/channels" asChild>
            <TabButton>Channels</TabButton>
          </TabTrigger>
          <TabTrigger name="cron" href="/cron" asChild>
            <TabButton>Cron</TabButton>
          </TabTrigger>
          <TabTrigger name="themes" href="/themes" asChild>
            <TabButton>Identity</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>More</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const t = useTheme();
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          { backgroundColor: isFocused ? t.accentSoft : 'transparent' },
        ]}>
        <Text
          style={{
            color: isFocused ? t.accent : t.tabBarInactive,
            fontFamily: t.fontMono,
            fontSize: 12,
            letterSpacing: 1,
            fontWeight: isFocused ? '700' : '500',
          }}>
          {String(children).toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const t = useTheme();
  return (
    <View
      {...props}
      style={[
        styles.tabList,
        { backgroundColor: t.tabBarBg, borderColor: t.tabBarBorder },
      ]}>
      <View style={styles.tabListContent}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  tabButtonView: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 36,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabList: {
    position: 'fixed',
    bottom: Spacing.four,
    left: '50%',
    transform: [{ translateX: '-50%' }],
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    zIndex: 1000,
  },
  tabListContent: {
    flexDirection: 'row',
    gap: 4,
    maxWidth: MaxContentWidth,
  },
});
