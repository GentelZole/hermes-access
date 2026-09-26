import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useT } from '@/i18n/strings';
import { useTheme } from '@/theme/store';

/**
 * Root tab bar — 5 themed native tabs with DISTINCT icons:
 * Chat (bubble) · Channels (grid) · Cron (clock) · Identity (palette) · More (gear)
 */
export default function AppTabs() {
  const t = useTheme();
  const tr = useT();

  return (
    <NativeTabs
      backgroundColor={t.tabBarBg}
      indicatorColor={t.accentSoft}
      labelStyle={{ selected: { color: t.tabBarActive } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{tr('tabChat')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/chat.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="channels">
        <NativeTabs.Trigger.Label>{tr('tabChannels')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/channels.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cron">
        <NativeTabs.Trigger.Label>{tr('tabCron')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/cron.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="themes">
        <NativeTabs.Trigger.Label>{tr('tabIdentity')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/identity.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{tr('tabMore')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/more.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
