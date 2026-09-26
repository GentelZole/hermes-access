import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConnectionStore } from '@/gateway/store';
import { useT } from '@/i18n/strings';
import { useTheme } from '@/theme/store';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  /** ops-style status line under an agent turn (courier-flavored) */
  status?: string;
}

/**
 * Chat — the primary surface. Rendered entirely from the active theme tokens
 * so switching identity restyles bubbles, input, chrome, and status rows.
 */
export default function ChatScreen() {
  const t = useTheme();
  const tr = useT();
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const getClient = useConnectionStore((s) => s.getClient);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'agent',
      text: tr('chatWelcome'),
      status: '● hermes-access',
    },
  ]);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  /** One thread per app session — replies continue the SAME Hermes session. */
  const threadIdRef = useRef<string>('hermes-access-' + Date.now());

  const send = () => {
    const text = draft.trim();
    if (!text || streaming) return;
    const userMsg: ChatMessage = { id: String(Date.now()), role: 'user', text };
    const agentId = String(Date.now() + 1);
    setMessages((m) => [
      ...m,
      userMsg,
      { id: agentId, role: 'agent', text: '', status: 'streaming…' },
    ]);
    setDraft('');
    setStreaming(true);

    const appendDelta = (delta: string) => {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentId ? { ...msg, text: msg.text + delta } : msg,
        ),
      );
    };

    getClient().then((client) => {
      if (!client) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === agentId
              ? {
                  ...msg,
                  text: 'ما في اتصال محفوظ لسه — الربط بلينك بيجهز في الخطوة الجاية (Phase 3).',
                  status: 'not paired yet',
                }
              : msg,
          ),
        );
        setStreaming(false);
        return;
      }
      cancelRef.current = client.streamNewChat({
        message: text,
        threadId: threadIdRef.current,
        callbacks: {
          onDelta: appendDelta,
          onDone: (full: string) => {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === agentId
                  ? { ...msg, text: full || msg.text || '(رد فاضي)', status: 'done' }
                  : msg,
              ),
            );
            setStreaming(false);
          },
          onError: (err: Error) => {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === agentId
                  ? { ...msg, text: 'خطأ في الاتصال: ' + err.message, status: 'error' }
                  : msg,
              ),
            );
            setStreaming(false);
          },
        },
      });
    });
  };

  const stop = () => {
    cancelRef.current?.();
    setStreaming(false);
  };

  const connected = useConnectionStore((s) => s.connected);
  const agentLabel = useConnectionStore((s) => s.label);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* Header — shows the paired agent's label once connected */}
        <View style={[styles.header, { borderBottomColor: t.border, borderBottomWidth: 1 }]}>
          <View style={[styles.mark, { backgroundColor: t.accentSoft, borderColor: t.accent }]}>
            <Ionicons name="flash" size={18} color={t.accent} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerName, { color: t.text, fontFamily: t.fontArabic }]}>
              {connected && agentLabel ? agentLabel : tr('chatHeaderAgent')}
            </Text>
            <Text style={[styles.headerSub, { color: t.textSecondary, fontFamily: t.fontMono }]}>
              {connected
                ? '● ' + (agentLabel ?? 'online')
                : '● ' + tr('chatHeaderOffline')}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={tr('voiceMode')}
            onPress={() => router.push('/voice' as Href)}
            style={[styles.headerBtn, { borderColor: t.border }]}>
            <Ionicons name="mic" size={18} color={t.accent} />
          </Pressable>
          <Pressable style={[styles.headerBtn, { borderColor: t.border }]}>
            <Ionicons name="ellipsis-horizontal" size={18} color={t.textSecondary} />
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <Bubble message={item} />}
        />

        {/* Composer */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={[
              styles.composer,
              { backgroundColor: t.bgInput, borderColor: t.borderStrong },
            ]}>
            <TextInput
              style={[styles.input, { color: t.text, fontFamily: t.fontBody }]}
              placeholder={tr('chatPlaceholder')}
              placeholderTextColor={t.textMuted}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline
            />
            <Pressable
              accessibilityLabel={tr('voiceMode')}
              onPress={() => router.push('/voice' as Href)}
              style={[styles.micBtn, { borderColor: t.border }]}>
              <Ionicons name="mic" size={18} color={t.accent} />
            </Pressable>
            {streaming ? (
              <Pressable onPress={stop} style={[styles.sendBtn, { backgroundColor: t.danger }]}>
                <Ionicons name="stop" size={18} color="#ffffff" />
              </Pressable>
            ) : (
              <Pressable
                onPress={send}
                style={[styles.sendBtn, { backgroundColor: t.accent }]}>
                <Ionicons name="arrow-up" size={18} color={t.accentText} />
              </Pressable>
            )}
          </View>
          <Text style={[styles.byHamal, { color: t.textMuted, fontFamily: t.fontMono }]}>
            HERMES ACCESS · BY HAMAL KSA
          </Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const t = useTheme();
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? t.bubbleUser : t.bubbleAgent,
            borderColor: isUser ? 'transparent' : t.bubbleAgentBorder,
            borderBottomLeftRadius: isUser ? t.radiusM : 4,
            borderBottomRightRadius: isUser ? 4 : t.radiusM,
          },
        ]}>
        {!isUser && (
          <Text style={[styles.bubbleWho, { color: t.accent, fontFamily: t.fontMono }]}>
            LOLO
          </Text>
        )}
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? t.bubbleUserText : t.text, fontFamily: t.fontArabic },
          ]}>
          {message.text}
        </Text>
        {!isUser && message.status && (
          <Text style={[styles.bubbleStatus, { color: t.textMuted, fontFamily: t.fontMono }]}>
            {message.status}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  mark: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerText: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
  headerBtn: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topics: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 12 },
  topicChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  topicText: { fontSize: 12 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8, gap: 10 },
  bubbleRow: { flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  bubbleWho: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleStatus: { fontSize: 9, letterSpacing: 0.5, marginTop: 6 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 16,
    borderRadius: 26,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  input: { flex: 1, fontSize: 14, maxHeight: 100, paddingVertical: 8 },
  micBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  byHamal: { textAlign: 'center', fontSize: 8, letterSpacing: 2, paddingVertical: 8 },
});
