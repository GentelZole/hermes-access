import { Ionicons } from '@expo/vector-icons';
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

import { Job } from '@/gateway/client';
import { useConnectionStore } from '@/gateway/store';
import { useT } from '@/i18n/strings';
import { useTheme } from '@/theme/store';

/**
 * Cron — live view of the agent's scheduled jobs with pause/resume/run-now.
 */
export default function CronScreen() {
  const t = useTheme();
  const tr = useT();
  const getClient = useConnectionStore((s) => s.getClient);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = await getClient();
    if (!client) {
      setError(tr('channelsNeedPair'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await client.listJobs();
      setJobs(list);
      setLoaded(true);
    } catch (e) {
      setError(tr('cronLoadError') + ': ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (job: Job) => {
    const client = await getClient();
    if (!client) return;
    setBusyId(job.id);
    try {
      if (job.enabled) await client.pauseJob(job.id);
      else await client.resumeJob(job.id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const runNow = async (job: Job) => {
    const client = await getClient();
    if (!client) return;
    setBusyId(job.id);
    try {
      await client.runJobNow(job.id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.text, fontFamily: t.fontArabic }]}>{tr('cronTitle')}</Text>
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
          data={jobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={t.accent} />}
          renderItem={({ item }) => (
            <JobRow job={item} busy={busyId === item.id} onToggle={() => toggle(item)} onRun={() => runNow(item)} />
          )}
          ListEmptyComponent={
            loaded && !loading && !error ? (
              <Text style={[styles.empty, { color: t.textMuted, fontFamily: t.fontBody }]}>
                {tr('cronEmpty')}
              </Text>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

function JobRow({
  job,
  busy,
  onToggle,
  onRun,
}: {
  job: Job;
  busy: boolean;
  onToggle: () => void;
  onRun: () => void;
}) {
  const t = useTheme();
  const name = job.name || job.id.slice(0, 10);
  const runs = job.repeat?.completed ?? 0;

  return (
    <View style={[styles.row, { backgroundColor: t.bgElevated, borderColor: t.border, opacity: job.enabled ? 1 : 0.55 }]}>
      <View style={styles.rowTop}>
        <View style={[styles.stateDot, { backgroundColor: job.enabled ? t.success : t.textMuted }]} />
        <Text numberOfLines={1} style={[styles.rowName, { color: t.text, fontFamily: t.fontArabic }]}>
          {name}
        </Text>
        {busy && <ActivityIndicator size="small" color={t.accent} />}
      </View>

      <View style={styles.rowMeta}>
        <Text style={[styles.metaText, { color: t.textMuted, fontFamily: t.fontMono }]}>
          {job.schedule_display}
        </Text>
        <Text style={[styles.metaText, { color: t.textMuted, fontFamily: t.fontMono }]}>
          {job.state} · {runs} runs
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onToggle}
          disabled={busy}
          style={[styles.actionBtn, { backgroundColor: job.enabled ? t.danger + '18' : t.success + '18', borderColor: job.enabled ? t.danger : t.success }]}>
          <Ionicons name={job.enabled ? 'pause' : 'play'} size={14} color={job.enabled ? t.danger : t.success} />
          <Text style={[styles.actionText, { color: job.enabled ? t.danger : t.success, fontFamily: t.fontMono }]}>
            {job.enabled ? 'PAUSE' : 'RESUME'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onRun}
          disabled={busy}
          style={[styles.actionBtn, { backgroundColor: t.accentSoft, borderColor: t.accent }]}>
          <Ionicons name="flash" size={14} color={t.accent} />
          <Text style={[styles.actionText, { color: t.accent, fontFamily: t.fontMono }]}>RUN</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 14 },
  title: { fontSize: 26, fontWeight: '800' },
  refreshBtn: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { margin: 20, borderWidth: 1, borderRadius: 14, padding: 14 },
  errorText: { fontSize: 13, lineHeight: 20 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  row: { borderRadius: 16, borderWidth: 1, padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stateDot: { width: 8, height: 8, borderRadius: 99 },
  rowName: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  rowMeta: { flexDirection: 'row', gap: 14, marginTop: 8 },
  metaText: { fontSize: 10.5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  actionText: { fontSize: 10.5, letterSpacing: 1 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 13 },
});
