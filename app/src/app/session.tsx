import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { Message } from '@/gateway/client';
import { useConnectionStore } from '@/gateway/store';
import { useTheme } from '@/theme/store';

/**
 * Session detail — full message history (to today), then continue the
 * conversation IN THE SAME Hermes session via /chat/stream.
 */
export default function SessionScreen() {
  const t = useTheme();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const getClient = useConnectionStore((s) => s.getClient);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const client = await getClient();
    if (!client || !id) return;
    setLoading(true);
    setError(null);
    try {
      const msgs = await client.sessionMessages(id);
      setMessages(msgs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getClient, id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = () => {
    const text = draft.trim();
    if (!text || streaming || !id) return;
    setDraft('');
    setStreaming(true);

    const tempUser: Message = { id: -1, role: 'user', content: text };
    const tempAgent: Message = { id: -2, role: 'assistant', content: '' };
    setMessages((m) => [...m, tempUser, tempAgent]);

    getClient().then((client) => {
      if (!client) {
        setStreaming(false);
        return;
      }
      cancelRef.current = client.streamSessionChat({
        sessionId: id,
        message: text,
        callbacks: {
          onDelta: (d) =>
            setMessages((m) =>
              m.map((msg) => (msg.id === -2 ? { ...msg, content: (msg.content ?? '') + d } : msg)),
            ),
          onDone: () => {
            setStreaming(false);
            // refresh real ids after turn completes
            load();
          },
          onError: (e) => {
            setStreaming(false);
            setMessages((m) =>
              m.map((msg) =>
                msg.id === -2 ? { ...msg, content: 'خطأ: ' + e.message } : msg,
              ),
            );
          },
        },
      });
    });
  };

  const stop = () => {
    cancelRef.current?.();
    setStreaming(false);
  };

  const display = messages.filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && (m.content ?? '').trim().length > 0,
  );

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: t.border, borderBottomWidth: 1 }]}>
          <View style={styles.headerText}>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: t.text, fontFamily: t.fontArabic }]}>
              {title || 'جلسة'}
            </Text>
            <Text style={[styles.headerSub, { color: t.textMuted, fontFamily: t.fontMono }]}>
              {display.length} messages · full history
            </Text>
          </View>
          <Pressable onPress={load} style={[styles.iconBtn, { borderColor: t.border }]}>
            <Ionicons name="refresh" size={16} color={t.accent} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={t.accent} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={display}
            keyExtractor={(m) => String(m.id)}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => <Bubble message={item} />}
          />
        )}
        {error && (
          <Text style={[styles.error, { color: t.danger, fontFamily: t.fontBody }]}>{error}</Text>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.composer, { backgroundColor: t.bgInput, borderColor: t.borderStrong }]}>
            <TextInput
              style={[styles.input, { color: t.text, fontFamily: t.fontBody }]}
              placeholder="كمّل المحادثة هنا…"
              placeholderTextColor={t.textMuted}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline
            />
            {streaming ? (
              <Pressable onPress={stop} style={[styles.sendBtn, { backgroundColor: t.danger }]}>
                <Ionicons name="stop" size={18} color="#fff" />
              </Pressable>
            ) : (
              <Pressable onPress={send} style={[styles.sendBtn, { backgroundColor: t.accent }]}>
                <Ionicons name="arrow-up" size={18} color={t.accentText} />
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Bubble({ message }: { message: Message }) {
  const t = useTheme();
  const isUser = message.role === 'user';
  // strip hermes trigger-message scaffolding from history content
  let content = message.content ?? '';
  content = content.replace(/\[Triggering message id:[^\]]*\]/g, '').trim();
  content = content.replace(/^\[OUT-OF-BAND[\s\S]*?\]$/g, '').trim();
  if (!content) return null;

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
        <Text
          selectable
          style={[
            styles.bubbleText,
            { color: isUser ? t.bubbleUserText : t.text, fontFamily: t.fontArabic },
          ]}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 10 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
  iconBtn: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 10 },
  bubbleRow: { flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '86%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1 },
  bubbleText: { fontSize: 13.5, lineHeight: 19 },
  error: { marginHorizontal: 20, fontSize: 12 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 14,
    marginVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 5,
    gap: 6,
  },
  input: { flex: 1, fontSize: 14, maxHeight: 90, paddingVertical: 8 },
  sendBtn: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
