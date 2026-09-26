/**
 * Voice — push-to-talk conversation with the agent (hands-free feel).
 * Loop: tap orb -> record -> POST /voice/transcribe -> stream the reply into ONE
 * persistent agent thread -> POST /voice/speak -> play it -> tap to interrupt -> idle.
 * Wire: transcribe = multipart field "audio" -> {text}; speak = JSON {text <=1200}
 * -> {audio: base64 mp3}; both bearer-auth against protocol://host[:port] of baseUrl.
 * Transcripts go to the agent verbatim and replies come back in Arabic — nothing is
 * translated client-side.
 */
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  type AudioPlayer,
  type AudioRecorder,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getToken, useConnectionStore } from '@/gateway/store';
import { useT } from '@/i18n/strings';
import { useTheme } from '@/theme/store';

type VoiceState = 'idle' | 'recording' | 'uploading' | 'thinking' | 'speaking';
type ErrKey = 'voiceErrMic' | 'voiceErrNet' | 'voiceErrAuth' | 'voiceErrEmpty';

/** The server caps /voice/speak input at 1200 chars. */
const TTS_MAX = 1200;
/** ...and we never send more than this much of an over-long reply. */
const TTS_KEEP = 1100;

/** Typed failure so the UI can pick the right localized message. */
class VoiceRequestError extends Error {
  constructor(readonly kind: 'auth' | 'net') {
    super(kind);
  }
}

/** protocol + host + port of the client baseUrl ('…/agent' path stripped). */
function originOf(baseUrl: string): string {
  return (baseUrl || '').replace(/(\/\/[^/]+).*$/, '$1').replace(/\/+$/, '');
}

/** Keep the TTS payload inside the server's 1200-char limit. */
function clipForTts(raw: string): string {
  const text = (raw || '').trim();
  if (text.length <= TTS_MAX) return text;
  return text.slice(0, TTS_KEEP).trimEnd() + '...';
}

/** POST /voice/transcribe — multipart, field name "audio", bearer auth. */
async function transcribe(uri: string): Promise<string> {
  const token = await getToken();
  if (!token) throw new VoiceRequestError('auth');
  const ext = /\.\w{2,4}$/.exec(uri)?.[0] ?? '.m4a';
  const form = new FormData();
  // RN FormData takes a {uri,name,type} file object; TS only types Blob.
  form.append('audio', {
    uri,
    name: 'voice' + ext,
    type: ext === '.wav' ? 'audio/wav' : 'audio/m4a',
  } as unknown as Blob);
  // NOTE: never set Content-Type here — fetch adds the multipart boundary.
  const res = await fetch(originOf(useConnectionStore.getState().baseUrl) + '/voice/transcribe', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: form,
  });
  if (res.status === 401) throw new VoiceRequestError('auth');
  if (!res.ok) throw new VoiceRequestError('net');
  const json = (await res.json()) as { text?: string };
  return typeof json.text === 'string' ? json.text : '';
}

/** POST /voice/speak — JSON {text} -> base64 mp3. */
async function requestSpeech(text: string): Promise<string> {
  const token = await getToken();
  if (!token) throw new VoiceRequestError('auth');
  const res = await fetch(originOf(useConnectionStore.getState().baseUrl) + '/voice/speak', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (res.status === 401) throw new VoiceRequestError('auth');
  if (!res.ok) throw new VoiceRequestError('net');
  const json = (await res.json()) as { audio?: string; format?: string };
  if (!json || typeof json.audio !== 'string' || !json.audio) {
    throw new VoiceRequestError('net');
  }
  return json.audio;
}

export default function VoiceScreen() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const getClient = useConnectionStore((s) => s.getClient);

  const [state, setState] = useState<VoiceState>('idle');
  const [errKey, setErrKey] = useState<ErrKey | null>(null);
  const [userLine, setUserLine] = useState('');
  const [agentLine, setAgentLine] = useState('');

  const pulse = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer();
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  recorderRef.current = recorder;
  playerRef.current = player;
  const cancelRef = useRef<(() => void) | null>(null);
  const errTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  /** The whole voice session is ONE agent conversation. */
  const threadRef = useRef('hermes-access-voice-' + Date.now());
  /** Turn token — invalidates async continuations after interrupt/unmount. */
  const turnRef = useRef(0);
  const stateRef = useRef<VoiceState>('idle');

  /** setState + keep a readable copy for async continuations. */
  const go = useCallback((next: VoiceState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const stopPulse = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    pulse.setValue(0);
  }, [pulse]);

  const startPulse = useCallback(() => {
    stopPulse();
    loopRef.current = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loopRef.current.start();
  }, [pulse, stopPulse]);

  const stopPlayback = useCallback(() => {
    const pl = playerRef.current;
    if (!pl) return;
    try {
      pl.pause();
      pl.remove();
    } catch {
      // already released
    }
  }, []);

  /** Red error strip, localized, auto-clears after 2.5s. */
  const fail = useCallback(
    (key: ErrKey) => {
      stopPulse();
      setErrKey(key);
      if (errTimerRef.current) clearTimeout(errTimerRef.current);
      errTimerRef.current = setTimeout(() => {
        errTimerRef.current = null;
        if (mountedRef.current) setErrKey(null);
      }, 2500);
      go('idle');
    },
    [go, stopPulse],
  );

  /** Hard reset back to idle (used by interrupts + errors). */
  const toIdle = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    stopPulse();
    stopPlayback();
    setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    go('idle');
  }, [go, stopPlayback, stopPulse]);

  /** TTS the agent reply, then flip to 'speaking' and wait for playback end. */
  const speak = useCallback(
    async (raw: string, turn: number) => {
      const text = clipForTts(raw);
      if (!text) {
        go('idle');
        return;
      }
      try {
        const audio64 = await requestSpeech(text);
        if (turnRef.current !== turn || !mountedRef.current) return;
        const file = new File(Paths.cache, 'hermes-voice-' + Date.now() + '.mp3');
        file.create({ overwrite: true });
        // Native base64 write — RN's Hermes runtime has no atob.
        file.write(audio64, { encoding: 'base64' });
        // Recording is over: route playback to the speaker.
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          interruptionModeAndroid: 'duckOthers',
        });
        const pl = playerRef.current;
        if (!pl) throw new VoiceRequestError('net');
        try {
          pl.remove();
        } catch {
          // no active source
        }
        pl.replace({ uri: file.uri });
        if (turnRef.current !== turn || !mountedRef.current) return;
        turnRef.current = turn;
        speakTurnRef.current = turn;
        go('speaking');
        pl.play();
      } catch (e) {
        if (turnRef.current !== turn) return;
        fail(e instanceof VoiceRequestError && e.kind === 'auth' ? 'voiceErrAuth' : 'voiceErrNet');
      }
    },
    [fail, go],
  );

  /** The turn whose mp3 is currently playing (for the finish-poll effect). */
  const speakTurnRef = useRef(0);

  const startRecording = useCallback(async () => {
    const turn = ++turnRef.current;
    setErrKey(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        fail('voiceErrMic');
        return;
      }
      if (turnRef.current !== turn || !mountedRef.current) return;
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionModeAndroid: 'duckOthers',
      });
      const rec = recorderRef.current;
      const pl = playerRef.current;
      if (!rec || !pl) {
        fail('voiceErrMic');
        return;
      }
      try {
        pl.remove(); // free audio focus held by the last reply
      } catch {
        // no active source
      }
      await rec.prepareToRecordAsync();
      if (turnRef.current !== turn || !mountedRef.current) return;
      rec.record();
      go('recording');
      startPulse();
    } catch {
      fail('voiceErrMic');
    }
  }, [fail, go, startPulse]);

  /** Stop the recording, transcribe it, then take the agent's reply. */
  const finishTurn = useCallback(async () => {
    const turn = turnRef.current;
    stopPulse();
    go('uploading');

    const rec = recorderRef.current;
    let uri: string | null = null;
    if (rec) {
      try {
        await rec.stop();
      } catch {
        // stop() throws if never started; fall through to uri read
      }
      // The native recorder finalizes the file a beat after stop() resolves.
      for (let i = 0; i < 8 && !uri; i++) {
        await new Promise((r) => setTimeout(r, 150));
        uri = rec.uri;
      }
    }
    if (!uri) {
      fail('voiceErrMic');
      return;
    }

    let text = '';
    try {
      text = (await transcribe(uri)).trim();
    } catch (e) {
      if (turnRef.current !== turn) return;
      fail(e instanceof VoiceRequestError && e.kind === 'auth' ? 'voiceErrAuth' : 'voiceErrNet');
      return;
    }
    if (turnRef.current !== turn) return;
    if (!text) {
      fail('voiceErrEmpty');
      return;
    }
    setUserLine(text);
    go('thinking');

    const client = await getClient();
    if (turnRef.current !== turn) return;
    if (!client) {
      fail('voiceErrAuth');
      return;
    }
    let full = '';
    cancelRef.current = client.streamNewChat({
      message: text,
      threadId: threadRef.current,
      callbacks: {
        onDelta: (delta) => {
          full += delta;
          if (turnRef.current === turn && mountedRef.current) setAgentLine(full);
        },
        onDone: (done) => {
          cancelRef.current = null;
          if (turnRef.current !== turn) return;
          const reply = (done || full).trim();
          if (mountedRef.current) setAgentLine(reply);
          void speak(reply, turn);
        },
        onError: () => {
          cancelRef.current = null;
          if (turnRef.current !== turn) return;
          fail('voiceErrNet');
        },
      },
    });
  }, [fail, getClient, go, speak, stopPulse]);

  /** One tap on the orb walks the state machine forward. */
  const onOrbPress = useCallback(() => {
    const current = stateRef.current;
    if (current === 'idle') {
      void startRecording();
      return;
    }
    if (current === 'recording') {
      void finishTurn();
      return;
    }
    if (current === 'speaking') {
      turnRef.current += 1; // cancel any pending TTS continuation
      toIdle();
      return;
    }
    // uploading / thinking are not interruptible — ignore the tap.
  }, [finishTurn, startRecording, toIdle]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      turnRef.current += 1;
      loopRef.current?.stop();
      loopRef.current = null;
      if (errTimerRef.current) clearTimeout(errTimerRef.current);
      errTimerRef.current = null;
      cancelRef.current?.();
      cancelRef.current = null;
      try {
        recorderRef.current?.stop().catch(() => {});
      } catch {
        // recorder already torn down
      }
      try {
        playerRef.current?.remove();
      } catch {
        // player already torn down
      }
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
  }, []);

  /** Poll the player while speaking -> return to idle when the clip ends. */
  useEffect(() => {
    if (state !== 'speaking') return;
    const iv = setInterval(() => {
      const pl = playerRef.current;
      if (!pl) return;
      const st = pl.currentStatus;
      const finished =
        st.didJustFinish === true ||
        (!st.playing && st.duration > 0 && st.currentTime >= st.duration - 0.35);
      if (finished) {
        stopPulse();
        if (turnRef.current === speakTurnRef.current) go('idle');
      }
    }, 250);
    return () => clearInterval(iv);
  }, [state, go, stopPulse]);

  const busy = state === 'uploading' || state === 'thinking';
  const statusText =
    state === 'idle'
      ? tr('voiceIdle')
      : state === 'recording'
        ? tr('voiceListening')
        : state === 'speaking'
          ? tr('voiceSpeaking') + ' · ' + tr('voiceInterrupt')
          : tr('voiceThinking');
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.22, 0] });

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: t.border, borderBottomWidth: 1 }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconBtn, { borderColor: t.border }]}>
            <Ionicons name="chevron-back" size={18} color={t.textSecondary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: t.text, fontFamily: t.fontArabic }]}>
              {tr('voiceTitle')}
            </Text>
            <Text style={[styles.headerSub, { color: t.textMuted, fontFamily: t.fontMono }]}>
              {'● ' + state}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.body}>
          <View style={styles.orbWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  borderColor: t.accent,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            <Pressable
              onPress={onOrbPress}
              style={[
                styles.orb,
                { backgroundColor: t.accentSoft, borderColor: t.accent },
              ]}>
              {busy ? (
                <ActivityIndicator size="large" color={t.accent} />
              ) : (
                <Ionicons
                  name={state === 'recording' ? 'stop' : state === 'speaking' ? 'volume-high' : 'mic'}
                  size={54}
                  color={t.accent}
                />
              )}
            </Pressable>
          </View>

          <Text style={[styles.status, { color: t.textSecondary, fontFamily: t.fontArabic }]}>
            {statusText}
          </Text>

          {errKey ? (
            <View style={[styles.errStrip, { borderColor: t.danger, backgroundColor: t.accentSoft }]}>
              <Text style={[styles.errText, { color: t.danger, fontFamily: t.fontArabic }]}>
                {tr(errKey)}
              </Text>
            </View>
          ) : null}

          <View style={styles.captions}>
            {userLine ? (
              <Caption who="YOU" text={userLine} lines={2} whoColor={t.textMuted} textColor={t.textSecondary} />
            ) : null}
            {agentLine ? (
              <Caption who="AGENT" text={agentLine} lines={3} whoColor={t.accent} textColor={t.text} />
            ) : null}
            {!userLine && !agentLine ? (
              <Text style={[styles.hint, { color: t.textMuted, fontFamily: t.fontBody }]}>
                {tr('chatEmpty')}
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** One muted transcript line (last user turn / last agent turn). */
function Caption({
  who,
  text,
  lines,
  whoColor,
  textColor,
}: {
  who: string;
  text: string;
  lines: number;
  whoColor: string;
  textColor: string;
}) {
  const t = useTheme();
  return (
    <View style={[styles.capRow, { borderColor: t.border }]}>
      <Text style={[styles.capWho, { color: whoColor, fontFamily: t.fontMono }]}>{who}</Text>
      <Text
        numberOfLines={lines}
        style={[styles.capText, { color: textColor, fontFamily: t.fontArabic }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
  headerSpacer: { width: 34 },
  iconBtn: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 22 },
  orbWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 168, height: 168, borderRadius: 999, borderWidth: 2 },
  orb: { width: 168, height: 168, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  status: { fontSize: 15, textAlign: 'center' },
  errStrip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  errText: { fontSize: 12.5, textAlign: 'center' },
  captions: { alignSelf: 'stretch', gap: 8, marginTop: 10 },
  capRow: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 4 },
  capWho: { fontSize: 9, letterSpacing: 2 },
  capText: { fontSize: 13, lineHeight: 19 },
  hint: { fontSize: 12, textAlign: 'center' },
});