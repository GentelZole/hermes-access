import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Session } from '@/gateway/client';
import { useConnectionStore } from '@/gateway/store';
import { useT } from '@/i18n/strings';
import { useTheme } from '@/theme/store';

const SOURCE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  discord: { icon: 'logo-discord', label: 'Discord' },
  cron: { icon: 'timer-outline', label: 'Cron' },
  cli: { icon: 'terminal-outline', label: 'CLI' },
  api_server: { icon: 'flash-outline', label: 'API' },
  telegram: { icon: 'send-outline', label: 'Telegram' },
};

/**
 * Channels — every Hermes session (Discord channels, cron runs, CLI, API),
 * with titles, previews, and full history one tap away.
 */
export default function ChannelsScreen() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const getClient = useConnectionStore((s) => s.getClient);
  const connected = useConnectionStore((s) => s.connected);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'discord' | 'cron'>('all');

  const load = useCallback(async () => {
    const client = await getClient();
    if (!client) {
      setError(tr('channelsNeedPair'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await client.listSessions(50);
      // newest first
      list.sort((a, b) => (b.last_active ?? 0) - (a.last_active ?? 0));
      setSessions(list);
      setLoaded(true);
    } catch (e) {
      setError(tr('channelsLoadError') + ': ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  // load once on mount (useEffect — SSR-safe, unlike useState initializers)
  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === 'all' ? sessions : sessions.filter((s) => s.source === filter);

  const openSession = (s: Session) => {
    router.push({ pathname: '/session', params: { id: s.id, title: s.title ?? '' } });
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.text, fontFamily: t.fontArabic }]}>{tr('channelsTitle')}</Text>
          {connected && <View style={[styles.liveDot, { backgroundColor: t.success }]} />}
        </View>

        {/* source filters */}
        <View style={styles.filters}>
          {(['all', 'discord', 'cron'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f ? t.accent : 'transparent',
                  borderColor: filter === f ? 'transparent' : t.border,
                },
              ]}>
              <Text
                style={[
                  styles.filterText,
                  {
                    color: filter === f ? t.accentText : t.textSecondary,
                    fontFamily: t.fontMono,
                  },
                ]}>
                {f === 'all' ? tr('channelsAll') : f.toUpperCase()}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={load} style={[styles.refreshBtn, { borderColor: t.border }]}>
            <Ionicons name="refresh" size={16} color={t.accent} />
          </Pressable>
        </View>

        {loading && !loaded && (
          <View style={styles.center}>
            <ActivityIndicator color={t.accent} size="large" />
          </View>
        )}
        {error && (
          <View style={[styles.errorBox, { borderColor: t.danger, backgroundColor: t.danger + '12' }]}>
            <Text style={[styles.errorText, { color: t.danger, fontFamily: t.fontBody }]}>{error}</Text>
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor={t.accent}
            />
          }
          renderItem={({ item }) => (
            <SessionRow session={item} onOpen={() => openSession(item)} />
          )}
          ListEmptyComponent={
            loaded && !loading && !error ? (
              <Text style={[styles.empty, { color: t.textMuted, fontFamily: t.fontBody }]}>
                {tr('channelsEmpty')}
              </Text>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

function SessionRow({ session, onOpen }: { session: Session; onOpen: () => void }) {
  const t = useTheme();
  const meta = SOURCE_META[session.source] ?? { icon: 'chatbubble-outline' as const, label: session.source };
  const title = session.title || session.preview?.slice(0, 44) || 'جلسة ' + session.id.slice(0, 8);
  const when = session.last_active ? new Date(session.last_active * 1000).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: t.bgElevated, borderColor: t.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.rowIcon, { backgroundColor: t.accentSoft }]}>
        <Ionicons name={meta.icon} size={17} color={t.accent} />
      </View>
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: t.text, fontFamily: t.fontArabic }]}>
          {title}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.rowMetaText, { color: t.textMuted, fontFamily: t.fontMono }]}>
            {meta.label} · {session.message_count} msg
          </Text>
          {when ? (
            <Text style={[styles.rowMetaText, { color: t.textMuted, fontFamily: t.fontMono }]}>
              {when}
            </Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 10 },
  title: { fontSize: 28, fontWeight: '800' },
  liveDot: { width: 9, height: 9, borderRadius: 99 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  filterText: { fontSize: 11, letterSpacing: 1.5 },
  refreshBtn: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { margin: 20, borderWidth: 1, borderRadius: 14, padding: 14 },
  errorText: { fontSize: 13, lineHeight: 20 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14.5, fontWeight: '600' },
  rowMeta: { flexDirection: 'row', gap: 10, marginTop: 3 },
  rowMetaText: { fontSize: 10.5 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 13 },
});
