/**
 * Nexa — Import Deck Screen
 * Generates custom flashcard sets using Multimodal AI (PDFs, PPTs, Scans, Photos, and Pasted Text)
 */

import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
import { WebView } from 'react-native-webview';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import {
  generateFlashcardsFromFile,
  generateFlashcardsFromText,
  generateFlashcardsFromImage,
  isAIConfigured,
  type GeneratedCard
} from '@/services/gemini';
import { useNexaStore, type ColorTag } from '@/store/useNexaStore';

const owlImage = require('../../assets/Nexa.png');

const EMOJI_OPTIONS = ['📚', '🔬', '📖', '🧮', '🌍', '🎨', '💡', '🏛️', '🦉', '⚡'];
const COLOR_OPTIONS: { tag: ColorTag; color: string; label: string }[] = [
  { tag: 'purple', color: Colors.purpleDeckBg, label: 'Purple' },
  { tag: 'pink', color: Colors.pinkDeckBg, label: 'Pink' },
  { tag: 'blue', color: Colors.blueDeckBg, label: 'Blue' },
];

type Step = 'upload' | 'preview' | 'generating' | 'review';
type SourceType = 'file' | 'image' | 'text';

export default function ImportDeckScreen() {
  const insets = useSafeAreaInsets();
  const { addDeck } = useNexaStore();

  const [step, setStep] = useState<Step>('upload');
  const [sourceType, setSourceType] = useState<SourceType>('file');

  // Input data states
  const [fileName, setFileName] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [fileMime, setFileMime] = useState('application/pdf');
  const [fileBase64, setFileBase64] = useState('');
  const [pastedText, setPastedText] = useState('');

  // Config states
  const [deckName, setDeckName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📚');
  const [selectedColor, setSelectedColor] = useState<ColorTag>('purple');
  const [cardCount, setCardCount] = useState('10');

  // UI state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Document Picker ──────────────────────────────
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];

      setFileName(file.name);
      setFileUri(file.uri);
      setSourceType('file');
      
      const ext = file.name.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ppt: 'application/vnd.ms-powerpoint',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        txt: 'text/plain',
      };
      setFileMime(mimeMap[ext || ''] || 'application/octet-stream');
      if (!deckName) setDeckName(file.name.replace(/\.[^/.]+$/, ''));

      const b64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64' as any,
      });
      setFileBase64(b64);
      setStep('preview');
    } catch {
      Alert.alert('Error', 'Could not load document.');
    }
  };

  // ─── Camera Scan ──────────────────────────────────
  const handleScanDocument = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to scan notes.');
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

      setFileName('Camera Scan ' + new Date().toLocaleTimeString());
      setFileUri(asset.uri);
      setSourceType('image');
      if (asset.base64) {
        setFileBase64(asset.base64);
      }
      if (!deckName) setDeckName('Scanned Notes');
      setStep('preview');
    } catch {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  // ─── Image Gallery Selection ──────────────────────
  const handleSelectImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Photo library access is required to choose notes.');
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

      setFileName('Photo Pick ' + new Date().toLocaleDateString());
      setFileUri(asset.uri);
      setSourceType('image');
      if (asset.base64) {
        setFileBase64(asset.base64);
      }
      if (!deckName) setDeckName('Photo Notes');
      setStep('preview');
    } catch {
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  // ─── Paste Text Submit ────────────────────────────
  const handleSubmitPastedText = () => {
    if (!pastedText.trim()) {
      Alert.alert('Error', 'Please enter some study material.');
      return;
    }
    setIsPasteModalOpen(false);
    setFileName('Pasted Notes Text');
    setSourceType('text');
    if (!deckName) setDeckName('Pasted Notes');
    setStep('preview');
  };

  // ─── AI Flashcards Generation ─────────────────────
  const handleGenerate = async () => {
    if (!isAIConfigured()) {
      setError('AI is not configured. Contact the developer.');
      return;
    }
    setError('');
    setStep('generating');

    try {
      let cards: GeneratedCard[] = [];
      const count = parseInt(cardCount) || 10;

      if (sourceType === 'file') {
        cards = await generateFlashcardsFromFile(fileBase64, fileMime, deckName, count);
      } else if (sourceType === 'image') {
        cards = await generateFlashcardsFromImage(fileBase64, 'image/jpeg', count);
      } else {
        cards = await generateFlashcardsFromText(pastedText, deckName, count);
      }

      if (cards.length === 0) {
        throw new Error('Failed to generate study cards.');
      }
      setGeneratedCards(cards);
      setStep('review');
    } catch (e: any) {
      setError(e.message || 'Generation failed. Try again.');
      setStep('preview');
    }
  };

  // ─── Save Deck ─────────────────────────────────────
  const handleSaveDeck = () => {
    if (!deckName.trim()) {
      Alert.alert('Error', 'Please enter a valid deck name.');
      return;
    }
    addDeck({
      name: deckName.trim(),
      icon: selectedIcon,
      colorTag: selectedColor,
      cards: generatedCards.map(c => ({
        id: Math.random().toString(36).substring(7),
        front: c.front,
        back: c.back,
        interval: 1,
        easeFactor: 2.5,
        nextReview: new Date().toISOString().split('T')[0],
      })),
    });
    router.back();
  };

  const handleEditCard = (idx: number, field: 'front' | 'back', val: string) => {
    const next = [...generatedCards];
    next[idx] = { ...next[idx], [field]: val };
    setGeneratedCards(next);
  };

  // ─── 1. UPLOAD DASHBOARD (Stunning 4-Card Grid!) ───
  if (step === 'upload') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Generate Flashcards</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Owl Banner */}
          <View style={styles.introCard}>
            <Image source={owlImage} style={styles.introOwl} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.introTitle}>AI Study Generator</Text>
              <Text style={styles.introSub}>
                Upload files, scan book pages, or paste text to instantly assemble custom deck sets.
              </Text>
            </View>
          </View>

          {/* Stunning 4-Option Grid */}
          <Text style={styles.fieldLabel}>CHOOSE INPUT METHOD</Text>
          <View style={styles.gridContainer}>
            {/* 1. Scan Document */}
            <Pressable style={styles.gridCard} onPress={handleScanDocument}>
              <View style={[styles.gridIconBox, { backgroundColor: '#f0eaff' }]}>
                <Ionicons name="scan-outline" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.gridTitle}>Scan document</Text>
              <Text style={styles.gridSub}>Use camera to scan textbook</Text>
            </Pressable>

            {/* 2. Select Images */}
            <Pressable style={styles.gridCard} onPress={handleSelectImages}>
              <View style={[styles.gridIconBox, { backgroundColor: '#fff0f5' }]}>
                <Ionicons name="images-outline" size={24} color="#f0a0c0" />
              </View>
              <Text style={styles.gridTitle}>Select images</Text>
              <Text style={styles.gridSub}>Photos of definitions/notes</Text>
            </Pressable>

            {/* 3. Paste Text */}
            <Pressable style={styles.gridCard} onPress={() => setIsPasteModalOpen(true)}>
              <View style={[styles.gridIconBox, { backgroundColor: '#fff8ee' }]}>
                <Ionicons name="document-text-outline" size={24} color="#f0c070" />
              </View>
              <Text style={styles.gridTitle}>Paste text</Text>
              <Text style={styles.gridSub}>Copy-paste definition block</Text>
            </Pressable>

            {/* 4. Select File */}
            <Pressable style={styles.gridCard} onPress={handlePickFile}>
              <View style={[styles.gridIconBox, { backgroundColor: '#eef8ff' }]}>
                <Ionicons name="cloud-upload-outline" size={24} color="#3598db" />
              </View>
              <Text style={styles.gridTitle}>Select file</Text>
              <Text style={styles.gridSub}>.pdf, .docx, .pptx, .txt</Text>
            </Pressable>
          </View>

          {/* Paste Text Modal */}
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
                  placeholder="Paste your study materials, articles, notes, or list of keywords here..."
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

  // ─── 2. PREVIEW STEP (Review scanned material & set details) ───
  if (step === 'preview') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => setStep('upload')}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Configure Generation</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Loaded preview item */}
          <View style={styles.previewAttachmentCard}>
            <Ionicons
              name={
                sourceType === 'file'
                  ? 'document-attach'
                  : sourceType === 'image'
                  ? 'image'
                  : 'text'
              }
              size={32}
              color={Colors.primary}
            />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.attachmentName} numberOfLines={1}>{fileName}</Text>
              <Text style={styles.attachmentType}>
                {sourceType === 'file' ? 'Document Document File' : sourceType === 'image' ? 'Visual Scan Image' : 'Pasted Study Text'}
              </Text>
            </View>
          </View>

          {/* Config Cards */}
          <Text style={styles.fieldLabel}>DECK NAME</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Mechanical Engineering"
              placeholderTextColor={Colors.mutedText}
              value={deckName}
              onChangeText={setDeckName}
            />
          </View>

          <Text style={styles.fieldLabel}>CARD COUNT</Text>
          <View style={styles.countRow}>
            {['5', '10', '15', '20'].map(n => (
              <Pressable
                key={n}
                style={[styles.countBtn, cardCount === n && styles.countActive]}
                onPress={() => setCardCount(n)}
              >
                <Text style={[styles.countTxt, cardCount === n && styles.countTxtActive]}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>ICON</Text>
          <View style={styles.emojiRow}>
            {EMOJI_OPTIONS.map(e => (
              <Pressable
                key={e}
                style={[styles.emojiBtn, selectedIcon === e && styles.emojiBtnActive]}
                onPress={() => setSelectedIcon(e)}
              >
                <Text style={styles.emojiTxt}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>COLOR</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map(o => (
              <Pressable
                key={o.tag}
                style={[
                  styles.colorBtn,
                  { backgroundColor: o.color },
                  selectedColor === o.tag && styles.colorActive
                ]}
                onPress={() => setSelectedColor(o.tag)}
              >
                <Text style={styles.colorLbl}>{o.label}</Text>
                {selectedColor === o.tag && (
                  <Ionicons name="checkmark" size={14} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </View>

          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.againText} />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          <Pressable style={styles.generateActionButton} onPress={handleGenerate}>
            <Ionicons name="sparkles" size={18} color={Colors.white} />
            <Text style={styles.generateActionButtonText}>Generate Flashcards</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── 3. GENERATING STEP ────────────────────────────
  if (step === 'generating') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingC}>
          <Image source={owlImage} style={styles.loadingOwl} contentFit="contain" />
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          <Text style={styles.loadingTitle}>Transcribing Materials...</Text>
          <Text style={styles.loadingSub}>
            Nexa is analyzing terms and forging high-retention flashcards from your resource.
          </Text>
        </View>
      </View>
    );
  }

  // ─── 4. REVIEW & EDIT STEP ─────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: Spacing.xxl }]}>
        <Text style={styles.headerTitle}>Review Cards</Text>
        <Text style={styles.headerSub}>{generatedCards.length} cards generated</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.reviewBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.easyText} />
          <Text style={styles.reviewBannerTxt}>
            Tap any question or answer field below to customize notes before saving.
          </Text>
        </View>

        <Text style={styles.reviewHint}>CARDS FORGED BY NEXA</Text>

        {generatedCards.map((card, i) => (
          <View key={i} style={styles.reviewCard}>
            <View style={styles.rcHeader}>
              <Text style={styles.rcNum}>CARD #{i + 1}</Text>
            </View>

            <Text style={styles.rcLabel}>Question (Front)</Text>
            <TextInput
              style={styles.rcInput}
              value={card.front}
              onChangeText={val => handleEditCard(i, 'front', val)}
              multiline
            />

            <Text style={styles.rcLabel}>Answer (Back)</Text>
            <TextInput
              style={styles.rcInput}
              value={card.back}
              onChangeText={val => handleEditCard(i, 'back', val)}
              multiline
            />
          </View>
        ))}

        <Pressable style={styles.saveBtn} onPress={handleSaveDeck}>
          <Text style={styles.saveBtnTxt}>Save Forged Deck</Text>
        </Pressable>
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
  headerSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.mutedText },

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

  fieldLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  // Interactive 4-Option Grid Styles
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
    textAlign: 'center',
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    minHeight: 140,
    justifyContent: 'center',
  },
  gridIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  gridTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
    textAlign: 'center',
    marginBottom: 4,
  },
  gridSub: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.mutedText,
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 4,
  },

  // Paste Text Modal
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

  // Config Step styles
  previewAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  attachmentName: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.headingText },
  attachmentType: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, marginTop: 2 },

  inputCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  textInput: { fontFamily: Fonts.body, fontSize: 14, color: Colors.headingText, padding: 0 },

  countRow: { flexDirection: 'row', gap: Spacing.md },
  countBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  countActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  countTxt: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.headingText },
  countTxtActive: { color: Colors.white },

  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtnActive: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.accentBadgeBg },
  emojiTxt: { fontSize: 20 },

  colorRow: { flexDirection: 'row', gap: 12 },
  colorBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  colorActive: { borderWidth: 2, borderColor: Colors.primary },
  colorLbl: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.headingText },

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

  generateActionButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xxxl,
  },
  generateActionButtonText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },
  disabled: { opacity: 0.5 },

  loadingC: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.huge },
  loadingOwl: { width: 80, height: 80 },
  loadingTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.headingText, marginTop: Spacing.xl },
  loadingSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.mutedText, textAlign: 'center', marginTop: Spacing.md, lineHeight: 20 },

  reviewBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.easyBg, borderRadius: BorderRadius.xl, padding: Spacing.lg },
  reviewBannerTxt: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.easyText, flex: 1 },
  reviewHint: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, marginTop: Spacing.md, marginBottom: Spacing.xl },

  reviewCard: { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.card, padding: Spacing.xl, marginBottom: Spacing.lg },
  rcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  rcNum: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  rcLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.mutedText, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  rcInput: { fontFamily: Fonts.body, fontSize: 13, color: Colors.headingText, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.lg, minHeight: 40 },

  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xxl, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  saveBtnTxt: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },
});
