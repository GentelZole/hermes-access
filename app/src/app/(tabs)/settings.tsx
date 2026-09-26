import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConnectionStore } from '@/gateway/store';
import { useLang, useLangStore, useT } from '@/i18n/strings';
import { useTheme, useThemeStore } from '@/theme/store';

/**
 * More / Settings — connection status, pairing entry, language, appearance,
 * HAMAL about. Fully bilingual (English primary, Arabic optional).
 */
export default function SettingsScreen() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const themeId = useThemeStore((s) => s.themeId);
  const lang = useLang();
  const setLang = useLangStore((s) => s.setLang);
  const connected = useConnectionStore((s) => s.connected);
  const checking = useConnectionStore((s) => s.checking);
  const checkHealth = useConnectionStore((s) => s.checkHealth);
  const baseUrl = useConnectionStore((s) => s.baseUrl);
  const label = useConnectionStore((s) => s.label);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.text, fontFamily: t.fontArabic }]}>
            {tr('settingsTitle')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Pair / connect */}
          <SectionLabel t={t.textSecondary} mono={t.fontMono}>{tr('connectionSection')}</SectionLabel>
          <Card bg={t.bgElevated} border={t.border}>
            <Row
              onPress={() => router.push('/setup')}
              icon="link"
              accent={t.accent}
              title={tr('pairRowTitle')}
              subtitle={tr('pairRowSub')}
              text={t.text}
              sub={t.textSecondary}
              body={t.fontBody}
            />
            <Divider c={t.border} />
            <Row
              onPress={() => router.push('/voice' as never)}
              icon="mic"
              accent={t.accent}
              title={tr('voiceRowTitle')}
              subtitle={tr('voiceRowSub')}
              text={t.text}
              sub={t.textSecondary}
              body={t.fontBody}
            />
            <Divider c={t.border} />
            <Row
              onPress={() => checkHealth()}
              icon={connected ? 'checkmark-circle' : 'cloud-offline'}
              accent={connected ? t.success : t.danger}
              title={connected ? tr('connectedLabel') + ' · ' + label : tr('notConnected')}
              subtitle={checking ? tr('checking') : baseUrl}
              text={t.text}
              sub={t.textSecondary}
              body={t.fontBody}
            />
          </Card>

          {/* Language */}
          <SectionLabel t={t.textSecondary} mono={t.fontMono}>{tr('languageSection')}</SectionLabel>
          <Card bg={t.bgElevated} border={t.border}>
            <Row
              onPress={() => setLang('en')}
              icon={lang === 'en' ? 'radio-button-on' : 'radio-button-off'}
              accent={lang === 'en' ? t.accent : t.textMuted}
              title={tr('languageEnglish')}
              subtitle="English (default)"
              text={t.text}
              sub={t.textSecondary}
              body={t.fontBody}
            />
            <Divider c={t.border} />
            <Row
              onPress={() => setLang('ar')}
              icon={lang === 'ar' ? 'radio-button-on' : 'radio-button-off'}
              accent={lang === 'ar' ? t.accent : t.textMuted}
              title={tr('languageArabic')}
              subtitle="Arabic"
              text={t.text}
              sub={t.textSecondary}
              body={t.fontBody}
            />
          </Card>

          {/* Appearance */}
          <SectionLabel t={t.textSecondary} mono={t.fontMono}>{tr('appearanceSection')}</SectionLabel>
          <Card bg={t.bgElevated} border={t.border}>
            <Row
              onPress={() => router.push('/themes')}
              icon="color-palette"
              accent={t.accent}
              title={tr('activeIdentity') + ' · ' + themeId}
              subtitle={tr('switchInIdentity')}
              text={t.text}
              sub={t.textSecondary}
              body={t.fontBody}
            />
          </Card>

          {/* About — HAMAL */}
          <SectionLabel t={t.textSecondary} mono={t.fontMono}>{tr('aboutSection')}</SectionLabel>
          <Card bg={t.bgElevated} border={t.border}>
            <View style={styles.about}>
              <Text style={[styles.aboutName, { color: t.text, fontFamily: t.fontArabic }]}>
                Hermes Access
              </Text>
              <Text style={[styles.aboutSub, { color: t.textSecondary, fontFamily: t.fontMono }]}>
                v0.3.0 · open source · PolyForm Noncommercial
              </Text>
              <Text style={[styles.aboutHamal, { color: t.accent, fontFamily: t.fontMono }]}>
                {tr('byHamal')}
              </Text>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SectionLabel({ children, t, mono }: { children: string; t: string; mono: string }) {
  return <Text style={[styles.sectionLabel, { color: t, fontFamily: mono }]}>{children}</Text>;
}

function Card({ children, bg, border }: { children: React.ReactNode; bg: string; border: string }) {
  return <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>{children}</View>;
}

function Divider({ c }: { c: string }) {
  return <View style={[styles.divider, { backgroundColor: c }]} />;
}

function Row({
  icon,
  accent,
  title,
  subtitle,
  text,
  sub,
  body,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  title: string;
  subtitle: string;
  text: string;
  sub: string;
  body: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: accent + '22' }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: text, fontFamily: body }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: sub, fontFamily: body }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={sub} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, marginVertical: 10, marginLeft: 4 },
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  divider: { height: 1, marginLeft: 56 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  about: { padding: 18, alignItems: 'center', gap: 4 },
  aboutName: { fontSize: 20, fontWeight: '700' },
  aboutSub: { fontSize: 11 },
  aboutHamal: { fontSize: 11, letterSpacing: 2, marginTop: 6, fontWeight: '700' },
});
