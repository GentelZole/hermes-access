import AppTabs from '@/components/app-tabs';

/** Tab group layout — the 5 native tabs. Stack screens (setup, session)
 *  live OUTSIDE this group so they push over the tabs. */
export default function TabsLayout() {
  return <AppTabs />;
}
