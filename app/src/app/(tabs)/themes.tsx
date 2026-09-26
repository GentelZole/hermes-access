import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { THEMES, THEME_IDS, ThemeId, ThemeTokens } from '@/theme/tokens';
import { useTheme, useThemeStore } from '@/theme/store';

/**
 * Theme switcher — the owner-mandated "ship all three directions" screen.
 * Each card is a miniature live preview of that direction, rendered with the
 * direction's own tokens, so the choice is made with the eyes, not a label.
 */
export default function ThemesScreen() {
  const t = useTheme();
  const themeId = useThemeStore((s) => s.themeId);
  const setThemeId = useThemeStore((s) => s.setThemeId);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: t.accent, fontFamily: t.fontMono }]}>
            APPEARANCE
          </Text>
          <Text style={[styles.title, { color: t.text, fontFamily: t.fontArabic }]}>
            اختر هويتك
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecondary, fontFamily: t.fontBody }]}>
            Three identities, one app. Switch anytime — it applies instantly.
          </Text>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {THEME_IDS.map((id) => (
            <ThemeCard
              key={id}
              tokens={THEMES[id]}
              active={id === themeId}
              onSelect={() => setThemeId(id as ThemeId)}
            />
          ))}
          <View style={[styles.byHamal]}>
            <Text style={[styles.byHamalText, { color: t.textMuted, fontFamily: t.fontMono }]}>
              HERMES ACCESS · BY HAMAL KSA
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ThemeCard({
  tokens,
  active,
  onSelect,
}: {
  tokens: ThemeTokens;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tokens.bg,
          borderColor: active ? tokens.accent : tokens.border,
          borderWidth: active ? 2 : 1,
          opacity: pressed ? 0.92 : 1,
        },
      ]}>
      {/* Mini live preview strip */}
      <View style={[styles.preview, { backgroundColor: tokens.bg }]}>
        <PreviewBubble tokens={tokens} kind="agent" text="فحصت السوق — كل شيء تمام." />
        <PreviewBubble tokens={tokens} kind="user" text="ممتاز، جهّز الملخص" />
        <PreviewInput tokens={tokens} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <View>
            <Text style={[styles.cardName, { color: tokens.text, fontFamily: tokens.fontArabic }]}>
              {tokens.labelAr}
            </Text>
            <Text style={[styles.cardLabel, { color: tokens.textSecondary, fontFamily: tokens.fontMono }]}>
              {tokens.label.toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              {
                borderColor: active ? tokens.accent : tokens.borderStrong,
                backgroundColor: active ? tokens.accent : 'transparent',
              },
            ]}>
            {active && <Ionicons name="checkmark" size={14} color={tokens.accentText} />}
          </View>
        </View>
        <Text style={[styles.cardTagline, { color: tokens.textSecondary, fontFamily: tokens.fontBody }]}>
          {tokens.tagline}
        </Text>
      </View>
    </Pressable>
  );
}

function PreviewBubble({
  tokens,
  kind,
  text,
}: {
  tokens: ThemeTokens;
  kind: 'agent' | 'user';
  text: string;
}) {
  const isUser = kind === 'user';
  return (
    <View
      style={[
        styles.miniBubble,
        isUser ? styles.miniBubbleRight : styles.miniBubbleLeft,
        {
          backgroundColor: isUser ? tokens.bubbleUser : tokens.bubbleAgent,
          borderColor: isUser ? 'transparent' : tokens.bubbleAgentBorder,
          borderWidth: 1,
        },
      ]}>
      <Text
        style={[
          styles.miniBubbleText,
          { color: isUser ? tokens.bubbleUserText : tokens.text, fontFamily: tokens.fontArabic },
        ]}>
        {text}
      </Text>
    </View>
  );
}

function PreviewInput({ tokens }: { tokens: ThemeTokens }) {
  return (
    <View style={[styles.miniInput, { backgroundColor: tokens.bgInput, borderColor: tokens.border }]}>
      <Text style={[styles.miniInputText, { color: tokens.textMuted, fontFamily: tokens.fontBody }]}>
        اسأل…
      </Text>
      <View style={[styles.miniSend, { backgroundColor: tokens.accent }]}>
        <Ionicons name="arrow-up" size={10} color={tokens.accentText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  kicker: { fontSize: 11, letterSpacing: 2.5, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  byHamal: { alignItems: 'center', marginTop: 18 },
  byHamalText: { fontSize: 10, letterSpacing: 2 },

  card: { borderRadius: 20, overflow: 'hidden' },
  preview: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 8 },
  miniBubble: { maxWidth: '72%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  miniBubbleLeft: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  miniBubbleRight: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  miniBubbleText: { fontSize: 12, lineHeight: 17 },
  miniInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 6,
  },
  miniInputText: { flex: 1, fontSize: 12 },
  miniSend: { width: 24, height: 24, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },

  cardBody: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 20, fontWeight: '700' },
  cardLabel: { fontSize: 10, letterSpacing: 2, marginTop: 3 },
  cardTagline: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  radio: { width: 26, height: 26, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
