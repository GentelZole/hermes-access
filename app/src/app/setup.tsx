import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConnectionStore } from '@/gateway/store';
import { useT } from '@/i18n/strings';
import { useTheme } from '@/theme/store';

/**
 * Pairing screen — connect ANY device to ANY Hermes agent.
 *
 * Two paths:
 *  1. One-time code (recommended): ask your agent for a code → paste → done.
 *     The code is redeemed against the pairing bridge; bridge URL is
 *     configurable so the app is not tied to one deployment.
 *  2. Manual (advanced): enter the gateway base URL + token directly.
 */

// Default bridge discovery — users of other deployments change this via
// the field below or their agent's pairing skill.
const DEFAULT_BRIDGE = (process.env.EXPO_PUBLIC_DEFAULT_BRIDGE ?? '').trim();

export default function SetupScreen() {
  const t = useTheme();
  const tr = useT();
  const configure = useConnectionStore((s) => s.configure);
  const checkHealth = useConnectionStore((s) => s.checkHealth);
  const connected = useConnectionStore((s) => s.connected);

  const [code, setCode] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState(DEFAULT_BRIDGE);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualToken, setManualToken] = useState('');

  const redeem = async () => {
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setOk(false);
    setMessage(null);
    try {
      const bridge = bridgeUrl.trim().replace(/\/$/, '') || DEFAULT_BRIDGE;
      const res = await fetch(bridge + '/api/pair/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(
          res.status === 429
            ? tr('setupErrTooMany')
            : res.status === 410
              ? tr('setupErrUsed')
              : tr('setupErrBad'),
        );
        return;
      }
      await configure({ baseUrl: data.baseUrl, token: data.token, label: data.label, bridgeUrl: bridge });
      const healthy = await checkHealth();
      setOk(true);
      setMessage(healthy ? tr('setupOk') : tr('setupWarn'));
    } catch (e) {
      setMessage(tr('setupErrBridge') + ' (' + (e as Error).message + ')');
    } finally {
      setBusy(false);
    }
  };

  const connectManual = async () => {
    const url = manualUrl.trim().replace(/\/$/, '');
    const token = manualToken.trim();
    if (!url || !token || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await configure({ baseUrl: url, token, label: url.replace(/^https?:\/\//, '') });
      const healthy = await checkHealth();
      setOk(healthy);
      setMessage(healthy ? tr('setupOk') : tr('setupErrManual'));
    } catch (e) {
      setOk(false);
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.kicker, { color: t.accent, fontFamily: t.fontMono }]}>
              {tr('setupKicker')}
            </Text>
            <Text style={[styles.title, { color: t.text, fontFamily: t.fontArabic }]}>
              {tr('setupTitle')}
            </Text>
            <Text style={[styles.desc, { color: t.textSecondary, fontFamily: t.fontBody }]}>
              {tr('setupDesc')}
            </Text>

            <View style={[styles.inputWrap, { backgroundColor: t.bgInput, borderColor: t.borderStrong }]}>
              <TextInput
                style={[styles.input, { color: t.text, fontFamily: t.fontMono }]}
                placeholder={tr('setupPlaceholder')}
                placeholderTextColor={t.textMuted}
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
            </View>

            <Pressable
              onPress={redeem}
              disabled={busy || !code.trim()}
              style={[
                styles.cta,
                {
                  backgroundColor: code.trim() ? t.accent : t.bgElevated,
                  borderColor: t.border,
                  opacity: busy ? 0.7 : 1,
                },
              ]}>
              {busy ? (
                <ActivityIndicator color={code.trim() ? t.accentText : t.textMuted} />
              ) : (
                <>
                  <Ionicons name="link" size={17} color={code.trim() ? t.accentText : t.textMuted} />
                  <Text
                    style={[
                      styles.ctaText,
                      { color: code.trim() ? t.accentText : t.textMuted, fontFamily: t.fontArabic },
                    ]}>
                    {tr('setupPairBtn')}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Manual connection (advanced) */}
            <Pressable onPress={() => setManualOpen((v) => !v)} style={styles.manualToggle}>
              <Text style={[styles.manualToggleText, { color: t.textMuted, fontFamily: t.fontBody }]}>
                {tr('setupManual')}
              </Text>
              <Ionicons name={manualOpen ? 'chevron-up' : 'chevron-down'} size={14} color={t.textMuted} />
            </Pressable>

            {manualOpen && (
              <View style={[styles.manualBox, { borderColor: t.border }]}>
                <TextInput
                  style={[styles.manualInput, { color: t.text, fontFamily: t.fontMono, backgroundColor: t.bgInput, borderColor: t.border }]}
                  placeholder={tr('setupBridgePlaceholder')}
                  placeholderTextColor={t.textMuted}
                  value={bridgeUrl}
                  onChangeText={setBridgeUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={[styles.manualInput, { color: t.text, fontFamily: t.fontMono, backgroundColor: t.bgInput, borderColor: t.border }]}
                  placeholder={tr('setupManualPlaceholder')}
                  placeholderTextColor={t.textMuted}
                  value={manualUrl}
                  onChangeText={setManualUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={[styles.manualInput, { color: t.text, fontFamily: t.fontMono, backgroundColor: t.bgInput, borderColor: t.border }]}
                  placeholder={tr('setupTokenPlaceholder')}
                  placeholderTextColor={t.textMuted}
                  value={manualToken}
                  onChangeText={setManualToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <Pressable
                  onPress={connectManual}
                  disabled={busy || !manualUrl.trim() || !manualToken.trim()}
                  style={[styles.manualBtn, { backgroundColor: t.accentSoft, borderColor: t.accent }]}>
                  <Text style={[styles.manualBtnText, { color: t.accent, fontFamily: t.fontMono }]}>
                    {tr('setupConnectBtn')}
                  </Text>
                </Pressable>
              </View>
            )}

            {message && (
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: ok ? t.success + '18' : t.danger + '14',
                    borderColor: ok ? t.success : t.danger,
                  },
                ]}>
                <Text style={[styles.resultText, { color: ok ? t.success : t.danger, fontFamily: t.fontBody }]}>
                  {message}
                </Text>
              </View>
            )}

            {connected && (
              <View style={[styles.connectedRow, { borderColor: t.border }]}>
                <View style={[styles.dot, { backgroundColor: t.success }]} />
                <Text style={[styles.connectedText, { color: t.textSecondary, fontFamily: t.fontMono }]}>
                  CONNECTED · HEALTHY
                </Text>
              </View>
            )}

            <View style={styles.footSpacer} />
            <Text style={[styles.byHamal, { color: t.textMuted, fontFamily: t.fontMono }]}>
              {tr('byHamal')}
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  kicker: { fontSize: 11, letterSpacing: 2.5, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 10 },
  desc: { fontSize: 14, lineHeight: 24, marginBottom: 24 },
  inputWrap: { borderWidth: 1, borderRadius: 16, padding: 4, marginBottom: 14 },
  input: { fontSize: 13, minHeight: 72, textAlignVertical: 'top', padding: 12 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
  },
  ctaText: { fontSize: 16, fontWeight: '700' },
  manualToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, paddingVertical: 8 },
  manualToggleText: { fontSize: 12.5 },
  manualBox: { marginTop: 8, borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  manualInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 12.5 },
  manualBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  manualBtnText: { fontSize: 12, letterSpacing: 1.5, fontWeight: '700' },
  resultBox: { marginTop: 16, borderWidth: 1, borderRadius: 14, padding: 14 },
  resultText: { fontSize: 13.5, lineHeight: 20 },
  connectedRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 99 },
  connectedText: { fontSize: 11, letterSpacing: 1.5 },
  footSpacer: { height: 28 },
  byHamal: { textAlign: 'center', fontSize: 9, letterSpacing: 2 },
});
