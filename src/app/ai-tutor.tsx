/**
 * Nexa — AI Chat Tutor Screen
 * Ask Nexa questions about your study material and get explanations using Gemini.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { chatWithNexa, isAIConfigured, type ChatMessage } from '@/services/gemini';
import { useNexaStore } from '@/store/useNexaStore';

const owlAvatar = require('../../assets/Nexa.png');

interface AppAction {
  type: 'create-deck' | 'pomodoro' | 'practice-test' | 'study-guide-compiler' | 'study-session' | 'view-guide';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  buttonText: string;
  params?: Record<string, any>;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  action?: AppAction;
}

function detectAppAction(text: string, decks: any[]): AppAction | undefined {
  const normalized = text.toLowerCase().trim();

  // 1. Study Specific Deck
  const studyRegex = /^(?:study|start|learn|session|open\s+deck)\s+(.+)$/i;
  const studyMatch = normalized.match(studyRegex);
  if (studyMatch) {
    const searchName = studyMatch[1].trim();
    const matchedDeck = decks.find(
      (d) => d.name.toLowerCase().includes(searchName) || searchName.includes(d.name.toLowerCase())
    );
    if (matchedDeck) {
      return {
        type: 'study-session',
        title: `Study Session: ${matchedDeck.name}`,
        description: `Start an interactive spaced-repetition study session for "${matchedDeck.name}" with ${matchedDeck.cards.length} cards.`,
        icon: 'play-circle',
        buttonText: 'Start Session',
        params: { deckId: matchedDeck.id },
      };
    }
  }

  // 2. View Specific Guide
  const guideRegex = /^(?:view\s+guide|show\s+guide|guide|summary|notebook|notebook\s+chronicle)\s+(.+)$/i;
  const guideMatch = normalized.match(guideRegex);
  if (guideMatch) {
    const searchName = guideMatch[1].trim();
    const matchedDeck = decks.find(
      (d) => d.name.toLowerCase().includes(searchName) || searchName.includes(d.name.toLowerCase())
    );
    if (matchedDeck) {
      return {
        type: 'view-guide',
        title: `Study Guide: ${matchedDeck.name}`,
        description: `Open the AI Notebook Chronicle, Timeline chapters, and Analytical Tables for "${matchedDeck.name}".`,
        icon: 'book',
        buttonText: 'View Guide Book',
        params: { deckId: matchedDeck.id },
      };
    }
  }

  // 3. Create Deck
  if (
    (normalized.includes('create') && (normalized.includes('deck') || normalized.includes('decks') || normalized.includes('card') || normalized.includes('set'))) ||
    normalized.includes('new deck') || normalized.includes('build deck') || normalized.includes('add deck')
  ) {
    return {
      type: 'create-deck',
      title: 'Create New Deck',
      description: 'Launch the manual classical deck builder to construct a fresh study set and add your own flashcards.',
      icon: 'create',
      buttonText: 'Build Deck',
    };
  }

  // 4. Pomodoro Focus Timer
  if (
    normalized.includes('pomodoro') ||
    normalized.includes('timer') ||
    normalized.includes('focus') ||
    normalized.includes('stopwatch') ||
    normalized.includes('productivity')
  ) {
    return {
      type: 'pomodoro',
      title: 'Pomodoro Focus Timer',
      description: 'Open the productivity focus timer to run deep study blocks and timed resting intervals.',
      icon: 'timer',
      buttonText: 'Start Pomodoro',
    };
  }

  // 5. Practice Test
  if (
    normalized.includes('practice test') ||
    normalized.includes('take test') ||
    normalized.includes('mock exam') ||
    normalized.includes('create test') ||
    normalized.includes('create quiz') ||
    normalized.includes('ai quiz') ||
    normalized.includes('quiz variations') ||
    normalized.includes('diagnostic')
  ) {
    return {
      type: 'practice-test',
      title: 'AI Practice Test Creator',
      description: 'Draft customized multiple-choice, fill-in-the-blank, or true-false exam questions using Gemini.',
      icon: 'ribbon',
      buttonText: 'Assemble Exam',
    };
  }

  // 6. AI Study Guide Compiler
  if (
    normalized.includes('study guide') ||
    normalized.includes('create guide') ||
    normalized.includes('compile guide') ||
    normalized.includes('summarize document') ||
    normalized.includes('scan notes') ||
    normalized.includes('upload pdf') ||
    normalized.includes('paste text')
  ) {
    return {
      type: 'study-guide-compiler',
      title: 'AI Study Guide Compiler',
      description: 'Paste text, upload files, or use the camera to scan textbooks and compile comprehensive summary notebooks.',
      icon: 'library',
      buttonText: 'Compile Guide',
    };
  }

  return undefined;
}

export default function AITutorScreen() {
  const insets = useSafeAreaInsets();
  const { decks } = useNexaStore();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hoot! I'm Nexa, your scholarly owl tutor. I have access to all your study decks and materials. Ask me anything — I can explain concepts, quiz you, or help you understand tricky topics!",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [showDeckPicker, setShowDeckPicker] = useState(false);

  // Build study context from selected deck or all decks
  const buildStudyContext = (): string => {
    const targetDecks = selectedDeckId
      ? decks.filter((d) => d.id === selectedDeckId)
      : decks;

    if (targetDecks.length === 0) return '';

    return targetDecks
      .map((deck) => {
        let context = `Deck: "${deck.name}" (${deck.cards.length} cards)\n`;
        context += deck.cards
          .slice(0, 30) // Limit to avoid token overflow
          .map((c, i) => `  Card ${i + 1}: Q: ${c.front} | A: ${c.back}`)
          .join('\n');
        if (deck.keyTerms && deck.keyTerms.length > 0) {
          context += '\n  Key Terms: ' + deck.keyTerms.map((t) => `${t.term}: ${t.definition}`).join('; ');
        }
        return context;
      })
      .join('\n\n');
  };

  // Convert display messages to chat history format
  const getChatHistory = (): ChatMessage[] => {
    return messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const detectedAction = detectAppAction(text, decks);

    if (!isAIConfigured()) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user',
          text,
          timestamp: new Date(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: detectedAction
            ? `Hoot! You want to: ${detectedAction.title}. I can certainly help with that! Tap the shortcut button below to launch it directly. Note that Gemini API key is not configured, so interactive chat replies are limited.`
            : 'Hoot! It seems the Gemini API key is not configured yet. Please set your EXPO_PUBLIC_GEMINI_API_KEY to chat with me!',
          timestamp: new Date(),
          action: detectedAction,
        },
      ]);
      setInputText('');
      return;
    }

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const context = buildStudyContext();
      const history = getChatHistory();
      
      let promptText = text;
      if (detectedAction) {
        promptText = `${text}\n\n(System Hint: The application detected that the user's intent is to run the app action "${detectedAction.title}". Acknowledge their request enthusiastically, offer some quick steampunk scholar advice/tips relevant to this action, and point them to the direct interactive action shortcut card that you have magically summoned below your message!)`;
      }

      const response = await chatWithNexa(promptText, context, history);

      const aiMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: new Date(),
        action: detectedAction,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Hoot! Something went wrong: ${err.message || 'Unknown error'}. Please try again!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);

  const quickPrompts = [
    'Explain this concept simply',
    'Quiz me on my cards',
    'What should I focus on?',
    'Summarize my deck',
  ];

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageBubbleRow, isUser && styles.messageBubbleRowUser]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Image source={owlAvatar} style={styles.avatarImage} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.nexaBubble,
          ]}
        >
          {!isUser && <Text style={styles.bubbleName}>Nexa</Text>}
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
            {item.text}
          </Text>

          {!isUser && item.action && (
            <View style={styles.actionCard}>
              <View style={styles.actionHeader}>
                <View style={styles.actionIconCircle}>
                  <Ionicons name={item.action.icon} size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>{item.action.title}</Text>
                  <Text style={styles.actionDesc}>{item.action.description}</Text>
                </View>
              </View>
              <Pressable
                style={styles.actionBtn}
                onPress={() => {
                  const act = item.action!;
                  if (act.type === 'create-deck') {
                    router.push('/create-deck' as any);
                  } else if (act.type === 'pomodoro') {
                    router.push('/pomodoro' as any);
                  } else if (act.type === 'practice-test') {
                    router.push({
                      pathname: '/practice-test' as any,
                      params: { mode: 'config' },
                    });
                  } else if (act.type === 'study-guide-compiler') {
                    router.push({
                      pathname: '/study-guide' as any,
                      params: { mode: 'document' },
                    });
                  } else if (act.type === 'study-session' && act.params?.deckId) {
                    router.push({
                      pathname: '/study-session' as any,
                      params: { deckId: act.params.deckId },
                    });
                  } else if (act.type === 'view-guide' && act.params?.deckId) {
                    router.push({
                      pathname: '/study-guide' as any,
                      params: { deckId: act.params.deckId },
                    });
                  }
                }}
              >
                <Ionicons name="flash" size={14} color={Colors.white} />
                <Text style={styles.actionBtnText}>{item.action.buttonText}</Text>
              </Pressable>
            </View>
          )}

          <Text style={[styles.bubbleTime, isUser && styles.userBubbleTime]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/' as any);
            }
          }}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nexa Tutor</Text>
          <Text style={styles.headerSub}>AI Study Assistant</Text>
        </View>
        <Pressable
          style={styles.backBtn}
          onPress={() => setShowDeckPicker(!showDeckPicker)}
        >
          <Ionicons name="library-outline" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Deck Context Picker */}
      {showDeckPicker && (
        <View style={styles.deckPickerContainer}>
          <Text style={styles.deckPickerLabel}>STUDY CONTEXT</Text>
          <Pressable
            style={[
              styles.deckPickerItem,
              !selectedDeckId && styles.deckPickerItemActive,
            ]}
            onPress={() => {
              setSelectedDeckId(null);
              setShowDeckPicker(false);
            }}
          >
            <Ionicons name="globe-outline" size={16} color={Colors.primary} />
            <Text style={styles.deckPickerText}>All Decks</Text>
            {!selectedDeckId && (
              <Ionicons name="checkmark" size={14} color={Colors.primary} />
            )}
          </Pressable>
          {decks.map((deck) => (
            <Pressable
              key={deck.id}
              style={[
                styles.deckPickerItem,
                selectedDeckId === deck.id && styles.deckPickerItemActive,
              ]}
              onPress={() => {
                setSelectedDeckId(deck.id);
                setShowDeckPicker(false);
              }}
            >
              <Ionicons name="layers" size={16} color={Colors.primary} />
              <Text style={styles.deckPickerText} numberOfLines={1}>
                {deck.name}
              </Text>
              <Text style={styles.deckPickerCount}>{deck.cards.length} cards</Text>
              {selectedDeckId === deck.id && (
                <Ionicons name="checkmark" size={14} color={Colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Context Banner */}
      <View style={styles.contextBanner}>
        <Ionicons name="book-outline" size={14} color={Colors.primary} />
        <Text style={styles.contextBannerText} numberOfLines={1}>
          {selectedDeck ? `Focused on: ${selectedDeck.name}` : `Using all ${decks.length} decks as context`}
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.typingRow}>
              <View style={styles.avatarContainer}>
                <Image source={owlAvatar} style={styles.avatarImage} />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>Nexa is thinking...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Quick Prompts (show only when few messages) */}
      {messages.length <= 2 && !isLoading && (
        <View style={styles.quickPromptsRow}>
          {quickPrompts.map((prompt, idx) => (
            <Pressable
              key={idx}
              style={styles.quickPromptChip}
              onPress={() => {
                setInputText(prompt);
              }}
            >
              <Text style={styles.quickPromptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask Nexa anything..."
              placeholderTextColor={Colors.mutedText}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit
            />
          </View>
          <Pressable
            style={[
              styles.sendBtn,
              (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() && !isLoading ? Colors.white : Colors.mutedText}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.headingText,
  },
  headerSub: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 1,
  },

  // Deck Picker
  deckPickerContainer: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  deckPickerLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  deckPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 2,
  },
  deckPickerItemActive: {
    backgroundColor: Colors.accentBadgeBg,
  },
  deckPickerText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.headingText,
    flex: 1,
  },
  deckPickerCount: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.mutedText,
  },

  // Context Banner
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accentBadgeBg,
    marginHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  contextBannerText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
    flex: 1,
  },

  // Messages
  messagesList: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  messageBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentBadgeBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  nexaBubble: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.primary,
    marginBottom: 4,
  },
  bubbleText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.headingText,
    lineHeight: 20,
  },
  userBubbleText: {
    color: Colors.white,
  },
  bubbleTime: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.mutedText,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userBubbleTime: {
    color: 'rgba(255,255,255,0.5)',
  },

  // Typing Indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  typingText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.mutedText,
  },

  // Quick Prompts
  quickPromptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  quickPromptChip: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  quickPromptText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    maxHeight: 120,
  },
  textInput: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.headingText,
    padding: 0,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },

  // Steampunk Action Card in Chat
  actionCard: {
    backgroundColor: Colors.accentBadgeBg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff0f5', // standard primary accent highlight
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.primary,
  },
  actionDesc: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.headingText,
    marginTop: 2,
    lineHeight: 14,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    height: 36,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
  },
});
