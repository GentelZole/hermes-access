/**
 * Lightweight i18n — English is the PRIMARY language; Arabic optional.
 * Language choice persists alongside the theme.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type Lang = 'en' | 'ar';
const LANG_KEY = 'hermes_access_lang';

const STRINGS = {
  en: {
    // tabs
    tabChat: 'Chat',
    tabChannels: 'Channels',
    tabCron: 'Cron',
    tabIdentity: 'Identity',
    tabMore: 'More',
    // chat
    chatTitle: 'Chat',
    chatPlaceholder: 'Message your agent…',
    chatEmpty: 'Start a conversation with your agent',
    chatStop: 'Stop',
    chatHeaderAgent: 'Your Agent',
    chatHeaderOffline: 'Not connected',
    chatWelcome: 'Welcome 👋 Pair this app with your agent (More → Pair Device), and your channels, history and preferences will appear here.',
    // channels
    channelsTitle: 'Channels',
    channelsAll: 'ALL',
    channelsEmpty: 'No channels yet',
    channelsLoadError: 'Failed to load channels',
    channelsNeedPair: 'Not connected — pair your device first (More → Pair Device).',
    messages: 'msgs',
    // session
    sessionHistory: 'full history',
    sessionContinue: 'Continue the conversation…',
    // cron
    cronTitle: 'Scheduled Jobs',
    cronEmpty: 'No scheduled jobs',
    cronLoadError: 'Failed to load jobs',
    cronPause: 'PAUSE',
    cronResume: 'RESUME',
    cronRun: 'RUN',
    cronRuns: 'runs',
    // identity
    identityTitle: 'Identity',
    identityKicker: 'APPEARANCE',
    identitySub: 'Three handcrafted directions. Tap to switch — the whole app follows.',
    // settings
    settingsTitle: 'Settings',
    connectionSection: 'CONNECTION',
    pairRowTitle: 'Pair Device',
    pairRowSub: 'Paste a pairing code from your agent to connect',
    voiceRowTitle: 'Audio Conversation',
    voiceRowSub: 'Talk hands-free — tap, speak, interrupt',
    connectedLabel: 'Connected',
    notConnected: 'Not connected',
    checking: 'Checking…',
    languageSection: 'LANGUAGE',
    languageEnglish: 'English',
    languageArabic: 'العربية',
    appearanceSection: 'APPEARANCE',
    activeIdentity: 'Active identity',
    switchInIdentity: 'Switch in the Identity tab',
    aboutSection: 'ABOUT',
    // setup
    setupKicker: 'SECURE PAIRING',
    setupTitle: 'Pair your device',
    setupDesc: 'Ask your agent (Discord/TUI/CLI) for a pairing code, paste it here.\nThe code is single-use and expires in 10 minutes.',
    setupPlaceholder: 'Paste the pairing code…',
    setupPairBtn: 'Pair now',
    setupManual: 'Or enter your agent URL manually (advanced)',
    setupBridgePlaceholder: 'Pairing bridge URL (default is pre-filled)',
    setupManualPlaceholder: 'http://your-agent:8642',
    setupTokenPlaceholder: 'API token (from your agent)',
    setupConnectBtn: 'Connect',
    setupErrTooMany: 'Too many attempts — wait a minute.',
    setupErrUsed: 'Code used or expired — ask your agent for a new one.',
    setupErrBad: 'Invalid code.',
    setupOk: '✅ Paired! The app is now connected to your agent.',
    setupWarn: '⚠️ Paired, but the agent didn\'t respond — check it\'s running.',
    setupErrBridge: 'Couldn\'t reach the pairing bridge.',
    setupErrManual: 'Connection failed',
    // voice
    voiceTitle: 'Voice',
    voiceIdle: 'Tap to talk',
    voiceListening: 'Listening… tap to stop',
    voiceThinking: 'Thinking…',
    voiceSpeaking: 'Speaking…',
    voiceInterrupt: 'tap to interrupt',
    voiceErrMic: 'Microphone permission denied',
    voiceErrNet: 'Connection failed — check your agent',
    voiceErrAuth: 'Session expired — re-pair your device',
    voiceErrEmpty: "Didn't catch that — try again",
    voiceMode: 'Voice mode',
    // themes
    byHamal: 'MADE BY HAMAL KSA',
  },
  ar: {
    tabChat: 'الشات',
    tabChannels: 'القنوات',
    tabCron: 'المهام',
    tabIdentity: 'الهوية',
    tabMore: 'المزيد',
    chatTitle: 'الشات',
    chatPlaceholder: 'اكتب رسالتك للوكيل…',
    chatEmpty: 'ابدأ محادثة مع وكيلك',
    chatStop: 'إيقاف',
    chatHeaderAgent: 'وكيلك',
    chatHeaderOffline: 'غير متصل',
    chatWelcome: 'أهلاً 👋 اربط التطبيق بوكيلك (المزيد → ربط الجهاز)، وحتظهر قنواتك وتاريخك وتفضيلاتك هنا.',
    channelsTitle: 'القنوات',
    channelsAll: 'الكل',
    channelsEmpty: 'ما في قنوات لسه',
    channelsLoadError: 'فشل تحميل القنوات',
    channelsNeedPair: 'غير متصل — اربط جهازك الأول (المزيد → ربط الجهاز).',
    messages: 'رسالة',
    sessionHistory: 'التاريخ الكامل',
    sessionContinue: 'كمّل المحادثة…',
    cronTitle: 'المهام المجدولة',
    cronEmpty: 'ما في مهام مجدولة',
    cronLoadError: 'فشل تحميل المهام',
    cronPause: 'إيقاف',
    cronResume: 'تشغيل',
    cronRun: 'نفّذ',
    cronRuns: 'تشغيلات',
    identityTitle: 'الهوية',
    identityKicker: 'المظهر',
    identitySub: 'ثلاث هويات فنية. دوس لتبديل — التطبيق كله بيتغير.',
    settingsTitle: 'الإعدادات',
    connectionSection: 'الاتصال',
    pairRowTitle: 'ربط الجهاز',
    pairRowSub: 'الصق كود الربط من وكيلك للاتصال',
    voiceRowTitle: 'المحادثة الصوتية',
    voiceRowSub: 'اتكلم بالإيد الفري — دوس، اتكلم، قاطعني',
    connectedLabel: 'متصل',
    notConnected: 'غير متصل',
    checking: 'جاري الفحص…',
    languageSection: 'اللغة',
    languageEnglish: 'English',
    languageArabic: 'العربية',
    appearanceSection: 'المظهر',
    activeIdentity: 'الهوية النشطة',
    switchInIdentity: 'غيّر من تبويب الهوية',
    aboutSection: 'حول',
    setupKicker: 'ربط آمن',
    setupTitle: 'اربط جهازك',
    setupDesc: 'اطلب كود ربط من وكيلك (Discord/TUI/CLI) والصقه هنا.\nالكود استخدام واحد وبينتهي في 10 دقايق.',
    setupPlaceholder: 'الصق كود الربط…',
    setupPairBtn: 'اربط الآن',
    setupManual: 'أو أدخل رابط الوكيل يدوياً (متقدم)',
    setupBridgePlaceholder: 'رابط جسر الربط (الافتراضي مكتوب)',
    setupManualPlaceholder: 'http://your-agent:8642',
    setupTokenPlaceholder: 'توكن الـ API (من وكيلك)',
    setupConnectBtn: 'اتصل',
    setupErrTooMany: 'محاولات كتير — استنى دقيقة.',
    setupErrUsed: 'الكود اتستخدم أو انتهى — اطلب كود جديد.',
    setupErrBad: 'الكود غير صحيح.',
    setupOk: '✅ تم الربط! التطبيق دلوقتي متصل بوكيلك.',
    setupWarn: '⚠️ اتربط، بس الوكيل ما رد — تأكد إنه شغال.',
    setupErrBridge: 'ما قدرت أوصل لجسر الربط.',
    setupErrManual: 'فشل الاتصال',
    voiceTitle: 'الصوت',
    voiceIdle: 'دوس للتكلم',
    voiceListening: 'أسمعك… دوس للإيقاف',
    voiceThinking: 'جاري التفكير…',
    voiceSpeaking: 'يتكلم…',
    voiceInterrupt: 'دوس للمقاطعة',
    voiceErrMic: 'ما في إذن للمايكروفون',
    voiceErrNet: 'فشل الاتصال — تأكد من الوكيل',
    voiceErrAuth: 'الجلسة انتهت — أعد ربط الجهاز',
    voiceErrEmpty: 'ما سمعت شي — جرّب مرة تانية',
    voiceMode: 'الوضع الصوتي',
    byHamal: 'صنع بواسطة HAMAL KSA',
  },
} as const;

type Key = keyof typeof STRINGS.en;

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: 'en',
  setLang: (lang) => {
    AsyncStorage.setItem(LANG_KEY, lang).catch(() => {});
    set({ lang });
  },
}));

/** Restore persisted language at app start. */
export async function initLang(): Promise<void> {
  try {
    const v = await AsyncStorage.getItem(LANG_KEY);
    if (v === 'ar' || v === 'en') useLangStore.setState({ lang: v });
  } catch {
    // ignore
  }
}

export function useT(): (k: Key) => string {
  const lang = useLangStore((s) => s.lang);
  return (k: Key) => STRINGS[lang][k] ?? STRINGS.en[k] ?? k;
}

export function useLang(): Lang {
  return useLangStore((s) => s.lang);
}
