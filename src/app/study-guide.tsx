/**
 * Nexa — AI Study Guide Screen
 * Compiles comprehensive summarized notes & textbook resources from Decks, Documents, Scans, and Paste
 */

import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import {
  generateStudyGuide,
  generateStudyGuideFromImage,
  isAIConfigured
} from '@/services/gemini';
import { useNexaStore } from '@/store/useNexaStore';

const owlImage = require('../../assets/Nexa.png');

type Mode = 'deck' | 'document' | 'image' | 'text';

export default function StudyGuideScreen() {
  const insets = useSafeAreaInsets();
  const { decks } = useNexaStore();
  const params = useLocalSearchParams();

  const [mode, setMode] = useState<Mode>('deck');

  // Handle incoming deep link parameters from FAB option clicks
  useEffect(() => {
    if (params.mode) {
      const m = params.mode as Mode;
      if (['deck', 'document', 'image', 'text'].includes(m)) {
        setMode(m);
      }
    }
  }, [params.mode]);

  // States
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '');
  const [fileName, setFileName] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [guideTitle, setGuideTitle] = useState('');

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guideContent, setGuideContent] = useState('');
  const [error, setError] = useState('');

  // ─── Document Selector ─────────────────────────────
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];

      setFileName(file.name);
      setFileUri(file.uri);
      setMode('document');
      if (!guideTitle) {
        setGuideTitle(file.name.replace(/\.[^/.]+$/, '') + ' Guide');
      }

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64' as any,
      });
      setFileBase64(base64);
    } catch {
      Alert.alert('Error', 'Could not pick file.');
    }
  };

  // ─── Camera Document Scan ─────────────────────────
  const handleScanDocument = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to scan document.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setFileName('Scan ' + new Date().toLocaleTimeString());
      setFileUri(asset.uri);
      setMode('image');
      if (asset.base64) {
        setFileBase64(asset.base64);
      }
      if (!guideTitle) setGuideTitle('Scanned Study Guide');
    } catch {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  // ─── Gallery Image Selection ──────────────────────
  const handleSelectImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Photo library access is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setFileName('Photo Notes ' + new Date().toLocaleDateString());
      setFileUri(asset.uri);
      setMode('image');
      if (asset.base64) {
        setFileBase64(asset.base64);
      }
      if (!guideTitle) setGuideTitle('Photo Study Guide');
    } catch {
      Alert.alert('Error', 'Could not open gallery.');
    }
  };

  // ─── Pasted Text Submit ───────────────────────────
  const handleSubmitPastedText = () => {
    if (!pastedText.trim()) {
      Alert.alert('Error', 'Please enter study materials.');
      return;
    }
    setIsPasteModalOpen(false);
    setFileName('Pasted Notes Block');
    setMode('text');
    if (!guideTitle) setGuideTitle('Pasted Study Notes');
  };

  // ─── AI Compile Action ─────────────────────────────
  const handleCompile = async () => {
    if (!isAIConfigured()) {
      setError('AI is not configured. Contact the developer.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      let compiledMarkdown = '';
      const title = guideTitle.trim() || 'Study Guide';

      if (mode === 'deck') {
        const deck = decks.find(d => d.id === selectedDeckId);
        if (!deck) {
          setError('Please select a valid deck.');
          setLoading(false);
          return;
        }
        if (deck.cards.length === 0) {
          setError('The selected deck is empty. Add cards first.');
          setLoading(false);
          return;
        }
        const sourceMaterial = deck.cards
          .map((c, i) => `Flashcard ${i + 1}:\nQuestion: ${c.front}\nAnswer: ${c.back}`)
          .join('\n\n');
        compiledMarkdown = await generateStudyGuide(sourceMaterial, deck.name + ' Study Guide');
      } else if (mode === 'image') {
        if (!fileBase64) {
          setError('Please capture or select an image first.');
          setLoading(false);
          return;
        }
        compiledMarkdown = await generateStudyGuideFromImage(fileBase64, 'image/jpeg', title);
      } else if (mode === 'text') {
        if (!pastedText.trim()) {
          setError('Please paste study notes first.');
          setLoading(false);
          return;
        }
        compiledMarkdown = await generateStudyGuide(pastedText, title);
      } else {
        if (!fileBase64) {
          setError('Please select a document first.');
          setLoading(false);
          return;
        }
        const sourceMaterial = fileBase64.substring(0, 100000);
        compiledMarkdown = await generateStudyGuide(sourceMaterial, title);
      }

      setGuideContent(compiledMarkdown);
    } catch (e: any) {
      setError(e.message || 'Failed to compile study guide.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading Screen ────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Image source={owlImage} style={styles.loadingOwl} contentFit="contain" />
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          <Text style={styles.loadingTitle}>Compiling Study Guide...</Text>
          <Text style={styles.loadingSub}>
            Scholar Nexa is indexing your materials and organizing custom study guides for you.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Result Screen ─────────────────────────────────
  if (guideContent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => setGuideContent('')}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Study Notes</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.guideCard}>
            <Text style={styles.guideText}>{guideContent}</Text>
          </View>
          
          {/* Wisdom Quote from Nexa */}
          <View style={styles.wisdomCard}>
            <Image source={owlImage} style={styles.wisdomOwl} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.wisdomTitle}>Nexa's Study Tip</Text>
              <Text style={styles.wisdomText}>
                Keep these concepts organized, Scholar. Regular review builds long-term retrieval strength!
              </Text>
            </View>
          </View>

          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>Return to Home</Text>
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── Configuration Screen ─────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Study Guides</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introCard}>
          <Image source={owlImage} style={styles.introOwl} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Instant Study Notes</Text>
            <Text style={styles.introSub}>
              Compile comprehensive textbook summaries and key definitions directly from study material.
            </Text>
          </View>
        </View>

        {/* Tab Selection (Deck vs Creative Import) */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabBtn, mode === 'deck' && styles.tabBtnActive]}
            onPress={() => setMode('deck')}
          >
            <Text style={[styles.tabBtnText, mode === 'deck' && styles.tabBtnTextActive]}>
              From Deck
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, mode !== 'deck' && styles.tabBtnActive]}
            onPress={() => setMode('document')}
          >
            <Text style={[styles.tabBtnText, mode !== 'deck' && styles.tabBtnTextActive]}>
              From Documents / Scans
            </Text>
          </Pressable>
        </View>

        {mode === 'deck' ? (
          <>
            <Text style={styles.fieldLabel}>SELECT SOURCE DECK</Text>
            {decks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTxt}>You do not have any decks to summarize.</Text>
              </View>
            ) : (
              <View style={styles.deckList}>
                {decks.map(deck => (
                  <Pressable
                    key={deck.id}
                    style={[
                      styles.deckItem,
                      selectedDeckId === deck.id && styles.deckItemActive,
                    ]}
                    onPress={() => setSelectedDeckId(deck.id)}
                  >
                    <Text style={styles.deckItemEmoji}>{deck.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deckItemName}>{deck.name}</Text>
                      <Text style={styles.deckItemCards}>{deck.cards.length} cards</Text>
                    </View>
                    {selectedDeckId === deck.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Stunning 4-Card Input Method Grid! */}
            <Text style={styles.fieldLabel}>CHOOSE INPUT METHOD</Text>
            <View style={styles.gridContainer}>
              {/* Scan Document */}
              <Pressable style={[styles.gridCard, mode === 'image' && styles.gridCardActive]} onPress={handleScanDocument}>
                <View style={[styles.gridIconBox, { backgroundColor: '#f0eaff' }]}>
                  <Ionicons name="scan-outline" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.gridTitle}>Scan document</Text>
                <Text style={styles.gridSub}>Use camera to scan textbook</Text>
              </Pressable>

              {/* Select Images */}
              <Pressable style={[styles.gridCard, mode === 'image' && styles.gridCardActive]} onPress={handleSelectImages}>
                <View style={[styles.gridIconBox, { backgroundColor: '#fff0f5' }]}>
                  <Ionicons name="images-outline" size={22} color="#f0a0c0" />
                </View>
                <Text style={styles.gridTitle}>Select images</Text>
                <Text style={styles.gridSub}>Photos of definitions/notes</Text>
              </Pressable>

              {/* Paste Text */}
              <Pressable style={[styles.gridCard, mode === 'text' && styles.gridCardActive]} onPress={() => setIsPasteModalOpen(true)}>
                <View style={[styles.gridIconBox, { backgroundColor: '#fff8ee' }]}>
                  <Ionicons name="document-text-outline" size={22} color="#f0c070" />
                </View>
                <Text style={styles.gridTitle}>Paste text</Text>
                <Text style={styles.gridSub}>Copy-paste definition block</Text>
              </Pressable>

              {/* Select File */}
              <Pressable style={[styles.gridCard, mode === 'document' && styles.gridCardActive]} onPress={handlePickFile}>
                <View style={[styles.gridIconBox, { backgroundColor: '#eef8ff' }]}>
                  <Ionicons name="cloud-upload-outline" size={22} color="#3598db" />
                </View>
                <Text style={styles.gridTitle}>Select file</Text>
                <Text style={styles.gridSub}>.pdf, .txt file</Text>
              </Pressable>
            </View>

            {fileName !== '' && (
              <View style={styles.fileChip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.easyText} />
                <Text style={styles.fileChipTxt} numberOfLines={1}>{fileName}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>GUIDE TITLE</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Biology Study Guide"
                placeholderTextColor={Colors.mutedText}
                value={guideTitle}
                onChangeText={setGuideTitle}
              />
            </View>
          </>
        )}

        {error !== '' && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.againText} />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        <Pressable
          style={[
            styles.compileBtn,
            mode === 'deck' && decks.length === 0 && styles.disabled,
            mode !== 'deck' && !fileName && styles.disabled,
          ]}
          onPress={handleCompile}
          disabled={(mode === 'deck' && decks.length === 0) || (mode !== 'deck' && !fileName)}
        >
          <Ionicons name="book" size={18} color={Colors.white} />
          <Text style={styles.compileBtnText}>Compile Study Guide</Text>
        </Pressable>

        {/* Modal for pasting text */}
        <Modal visible={isPasteModalOpen} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Paste Study Text</Text>
                <Pressable onPress={() => setIsPasteModalOpen(false)}>
                  <Ionicons name="close" size={20} color={Colors.mutedText} />
                </Pressable>
              </View>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Paste notes, textbook pages, key terms..."
                placeholderTextColor={Colors.mutedText}
                multiline
                value={pastedText}
                onChangeText={setPastedText}
              />
              <Pressable style={styles.modalSubmitBtn} onPress={handleSubmitPastedText}>
                <Text style={styles.modalSubmitBtnText}>Submit Text</Text>
              </Pressable>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.headingText },

  introCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  introOwl: { width: 48, height: 48 },
  introTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.white },
  introSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.subtitleText, marginTop: 2, lineHeight: 16 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.accentBadgeBg,
    borderRadius: BorderRadius.pill,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.pill,
  },
  tabBtnActive: {
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.mutedText },
  tabBtnTextActive: { color: Colors.primary, fontFamily: Fonts.bodyBold },

  fieldLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  
  // Grid styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  gridCard: {
    width: '47.5%',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    minHeight: 130,
    justifyContent: 'center',
  },
  gridCardActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.accentBadgeBg,
  },
  gridIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  gridTitle: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.headingText, textAlign: 'center', marginBottom: 2 },
  gridSub: { fontFamily: Fonts.body, fontSize: 8, color: Colors.mutedText, textAlign: 'center', lineHeight: 11 },

  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.easyBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  fileChipTxt: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.easyText, flex: 1 },

  // Deck Selection List
  deckList: { gap: Spacing.md },
  deckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  deckItemActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.accentBadgeBg,
  },
  deckItemEmoji: { fontSize: 22 },
  deckItemName: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.headingText },
  deckItemCards: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, marginTop: 1 },

  inputCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  textInput: { fontFamily: Fonts.body, fontSize: 14, color: Colors.headingText, padding: 0 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.againBg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  errorTxt: { fontFamily: Fonts.body, fontSize: 12, color: Colors.againText, flex: 1 },

  compileBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xxxl,
  },
  compileBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },
  disabled: { opacity: 0.5 },

  // Guide display
  guideCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  guideText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.headingText, lineHeight: 22 },

  wisdomCard: {
    backgroundColor: Colors.accentBadgeBg,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  wisdomOwl: { width: 44, height: 44 },
  wisdomTitle: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.primary },
  wisdomText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.headingText, marginTop: 2, lineHeight: 16 },

  closeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },

  emptyState: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyTxt: { fontFamily: Fonts.body, fontSize: 12, color: Colors.mutedText },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.huge },
  loadingOwl: { width: 80, height: 80 },
  loadingTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.headingText, marginTop: Spacing.xl },
  loadingSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.mutedText, textAlign: 'center', marginTop: Spacing.md, lineHeight: 20 },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(61, 43, 138, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
    padding: Spacing.xxl,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.headingText },
  modalTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.headingText,
    textAlignVertical: 'top',
    marginBottom: Spacing.xl,
    minHeight: 180,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },
});
