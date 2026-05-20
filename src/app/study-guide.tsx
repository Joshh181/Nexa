/**
 * Nexa — AI Study Guide Screen
 * Compiles comprehensive summarized notes, definitions, tables, and flashcards from study materials.
 * Displays study guides in a stunning, highly detailed dark mode glassmorphic UI.
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
  isAIConfigured,
  type StudyGuidePayload
} from '@/services/gemini';
import { useNexaStore, type Deck, type KeyTerm, type KeyConcept, type KeyTable } from '@/store/useNexaStore';

const owlImage = require('../../assets/Nexa.png');

type Mode = 'deck' | 'document' | 'image' | 'text';
type Tab = 'chronicle' | 'arena';

export default function StudyGuideScreen() {
  const insets = useSafeAreaInsets();
  const { decks, addDeck, updateDeck } = useNexaStore();
  const params = useLocalSearchParams();

  const [mode, setMode] = useState<Mode>('deck');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('chronicle');

  // Handle incoming parameters from Home screen
  useEffect(() => {
    if (params.deckId) {
      setActiveDeckId(params.deckId as string);
    }
    if (params.mode) {
      const m = params.mode as Mode;
      if (['deck', 'document', 'image', 'text'].includes(m)) {
        setMode(m);
      }
    }
  }, [params.deckId, params.mode]);

  // States for compiler
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '');
  const [fileName, setFileName] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [guideTitle, setGuideTitle] = useState('');

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // States for flashcard preview in Outline tab
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Find active deck for viewer
  const currentDeck = decks.find(d => d.id === activeDeckId);

  // Reset card state when deck changes
  useEffect(() => {
    setActiveCardIndex(0);
    setIsCardFlipped(false);
  }, [activeDeckId]);

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
      setError('Gemini API key is not configured. Please set up the EXPO_PUBLIC_GEMINI_API_KEY environment variable to enable study guide generation!');
      return;
    }
    setError('');
    setLoading(true);

    try {
      let payload: StudyGuidePayload;
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
        payload = await generateStudyGuide(sourceMaterial, deck.name + ' Study Guide');
      } else if (mode === 'image') {
        if (!fileBase64) {
          setError('Please capture or select an image first.');
          setLoading(false);
          return;
        }
        payload = await generateStudyGuideFromImage(fileBase64, 'image/jpeg', title);
      } else if (mode === 'text') {
        if (!pastedText.trim()) {
          setError('Please paste study notes first.');
          setLoading(false);
          return;
        }
        payload = await generateStudyGuide(pastedText, title);
      } else {
        if (!fileBase64) {
          setError('Please select a document first.');
          setLoading(false);
          return;
        }
        const sourceMaterial = fileBase64.substring(0, 100000);
        payload = await generateStudyGuide(sourceMaterial, title);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const createdStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

      if (mode === 'deck') {
        // Save study guide variables into existing Deck!
        updateDeck(selectedDeckId, {
          keyTerms: payload.keyTerms,
          keyConcepts: payload.keyConcepts,
          keyTables: payload.keyTables,
          essayQuestions: payload.essayQuestions,
          createdDate: createdStr,
          lastStudiedDate: todayStr,
        });
        setActiveDeckId(selectedDeckId);
      } else {
        // Create a completely new Deck!
        const newDeckId = 'deck-' + Date.now();
        addDeck({
          name: title,
          icon: mode === 'image' ? '📷' : mode === 'document' ? '📄' : '✍️',
          colorTag: 'purple',
          cards: payload.flashcards.map((c, idx) => ({
            id: `card-${newDeckId}-${idx}`,
            front: c.front,
            back: c.back,
            interval: 1,
            nextReview: todayStr,
            easeFactor: 2.5
          })),
          keyTerms: payload.keyTerms,
          keyConcepts: payload.keyConcepts,
          keyTables: payload.keyTables,
          essayQuestions: payload.essayQuestions,
          createdDate: createdStr,
          lastStudiedDate: todayStr,
        });
        
        // Wait a tiny bit for Zustand write, then navigate viewer
        setTimeout(() => {
          setActiveDeckId(newDeckId);
        }, 100);
      }
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
            Scholar Nexa is indexing your materials, formulating high-quality key terms, custom summary tables, and flashcards.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Result / Viewer Screen (Stunning Dark Mode) ───
  if (currentDeck && currentDeck.keyTerms && currentDeck.keyTerms.length > 0) {
    const cards = currentDeck.cards;
    const currentCard = cards[activeCardIndex] || { front: 'No cards', back: 'No details' };

    return (
      <View style={[styles.viewerContainer, { paddingTop: insets.top }]}>
        {/* Viewer Header */}
        <View style={styles.viewerHeader}>
          <Pressable
            style={styles.viewerBackBtn}
            onPress={() => {
              if (params.deckId) {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/' as any);
                }
              } else {
                setActiveDeckId(null);
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </Pressable>
          <View style={styles.viewerHeaderActions}>
            <Pressable style={styles.viewerHeaderActionBtn}>
              <Ionicons name="bookmark-outline" size={20} color={Colors.primary} />
            </Pressable>
            <Pressable style={styles.viewerHeaderActionBtn}>
              <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
            </Pressable>
            <Pressable style={styles.viewerHeaderActionBtn}>
              <Ionicons name="ellipsis-vertical" size={20} color={Colors.primary} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.viewerScrollContent} showsVerticalScrollIndicator={false}>
          {/* User Profile and Creation Info */}
          <View style={styles.viewerMetaContainer}>
            <View style={styles.viewerProfileRow}>
              <View style={styles.viewerAvatarBox}>
                <Image source={owlImage} style={styles.viewerAvatar} />
              </View>
              <Text style={styles.viewerUsername}>J_Stellar6</Text>
            </View>
            <View style={styles.viewerDateRow}>
              <Ionicons name="time-outline" size={14} color={Colors.mutedText} />
              <Text style={styles.viewerDateText}>Created {currentDeck.createdDate || '19/05/2026'}</Text>
            </View>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.viewerTabContainer}>
            <Pressable
              style={[styles.viewerTabBtn, activeTab === 'chronicle' && styles.viewerTabBtnActive]}
              onPress={() => setActiveTab('chronicle')}
            >
              <Text style={[styles.viewerTabTxt, activeTab === 'chronicle' && styles.viewerTabTxtActive]}>📖 Notebook Chronicle</Text>
            </Pressable>
            <Pressable
              style={[styles.viewerTabBtn, activeTab === 'arena' && styles.viewerTabBtnActive]}
              onPress={() => setActiveTab('arena')}
            >
              <Text style={[styles.viewerTabTxt, activeTab === 'arena' && styles.viewerTabTxtActive]}>⚡ Flashcard Arena</Text>
            </Pressable>
          </View>

          {activeTab === 'chronicle' ? (
            /* ──────── CHRONICLE MODE (Notebook Chronicle) ──────── */
            <View style={styles.tabContentBlock}>
              {/* Mascot Welcome Card */}
              <View style={styles.mascotBanner}>
                <View style={styles.mascotBannerLeft}>
                  <Image source={owlImage} style={styles.mascotBannerOwl} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mascotBannerTitle}>Scholar Nexa's Codex</Text>
                    <Text style={styles.mascotBannerSub}>
                      "Wisdom begins with wonder. Review these compiled modules to master your subject!"
                    </Text>
                  </View>
                </View>
              </View>

              {/* Scholar's Lexicon (Key Terms) */}
              {currentDeck.keyTerms && currentDeck.keyTerms.length > 0 && (
                <View style={styles.quickSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.viewerSectionTitle}>📜 The Scholar's Lexicon</Text>
                    <View style={styles.badgeLabelContainer}>
                      <Text style={styles.badgeLabelText}>{currentDeck.keyTerms.length} Terms</Text>
                    </View>
                  </View>
                  <View style={styles.lexiconGrid}>
                    {currentDeck.keyTerms.map((item, idx) => (
                      <View key={idx} style={styles.lexiconCard}>
                        <View style={styles.lexiconHeaderRow}>
                          <Ionicons name="bookmark" size={14} color={Colors.primary} />
                          <Text style={styles.lexiconTermTxt} numberOfLines={1} ellipsizeMode="tail">
                            {item.term}
                          </Text>
                        </View>
                        <Text style={styles.lexiconDefTxt}>{item.definition}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Deep-Dive Concepts Chronicle (Key Concepts) */}
              {currentDeck.keyConcepts && currentDeck.keyConcepts.length > 0 && (
                <View style={styles.quickSection}>
                  <Text style={styles.viewerSectionTitle}>📖 Chronicles Timeline</Text>
                  {currentDeck.keyConcepts.map((section, sIdx) => {
                    const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
                    const chapterLabel = `Chapter ${romanNumerals[sIdx] || (sIdx + 1)}`;
                    return (
                      <View key={sIdx} style={styles.conceptChapterCard}>
                        <View style={styles.chapterHeader}>
                          <Text style={styles.chapterLabelText}>{chapterLabel}</Text>
                          <Text style={styles.chapterTitleText}>{section.title}</Text>
                        </View>
                        <View style={styles.chapterBulletsContainer}>
                          {section.bullets.map((bullet, bIdx) => (
                            <View key={bIdx} style={styles.chapterBulletRow}>
                              <View style={styles.chapterBulletDot} />
                              <Text style={styles.chapterBulletTxt}>{bullet}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Scientific Registers (Key Tables) */}
              {currentDeck.keyTables && currentDeck.keyTables.length > 0 && (
                <View style={styles.quickSection}>
                  <Text style={styles.viewerSectionTitle}>📊 Analytical Registers</Text>
                  {currentDeck.keyTables.map((table, tIdx) => (
                    <View key={tIdx} style={styles.tableContainer}>
                      <Text style={styles.tableTitleLabel}>{table.title}</Text>
                      <View style={styles.tableBorder}>
                        {/* Table Headers */}
                        <View style={styles.tableHeaderRow}>
                          {table.headers.map((header, hIdx) => (
                            <View
                              key={hIdx}
                              style={[
                                styles.tableCell,
                                {
                                  flex: 1,
                                  borderRightWidth: hIdx < table.headers.length - 1 ? 1 : 0,
                                  borderRightColor: Colors.cardBorder
                                }
                              ]}
                            >
                              <Text style={styles.tableHeaderTxt}>{header}</Text>
                            </View>
                          ))}
                        </View>
                        {/* Table Rows */}
                        {table.rows.map((row, rIdx) => (
                          <View
                            key={rIdx}
                            style={[
                              styles.tableRow,
                              {
                                borderTopWidth: 1,
                                borderTopColor: Colors.cardBorder,
                                backgroundColor: rIdx % 2 === 0 ? Colors.accentBadgeBg : 'transparent'
                              }
                            ]}
                          >
                            {row.map((cell, cIdx) => (
                              <View
                                key={cIdx}
                                style={[
                                  styles.tableCell,
                                  {
                                    flex: 1,
                                    borderRightWidth: cIdx < row.length - 1 ? 1 : 0,
                                    borderRightColor: Colors.cardBorder
                                  }
                                ]}
                              >
                                <Text style={styles.tableCellTxt}>{cell}</Text>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Scholar's Inquiries (Essay Questions) */}
              {currentDeck.essayQuestions && currentDeck.essayQuestions.length > 0 && (
                <View style={styles.essayBlock}>
                  <Text style={styles.viewerSectionTitle}>🧭 Scholar's Inquiries</Text>
                  <View style={styles.parchmentScroll}>
                    {currentDeck.essayQuestions.map((q, idx) => (
                      <View key={idx} style={styles.parchmentQuestionItem}>
                        <View style={styles.parchmentNumberBadge}>
                          <Text style={styles.parchmentNumberText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.parchmentText}>{q}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* ──────── ARENA MODE (Flashcard Arena) ──────── */
            <View style={styles.tabContentBlock}>
              
              {/* Flashcards Swipe Preview Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.viewerSectionTitle}>⚡ Active Training Deck</Text>
                <Pressable onPress={() => router.push({ pathname: '/study' as any, params: { deckId: currentDeck.id } })}>
                  <Text style={styles.viewerEditSetLink}>Go to Study Session</Text>
                </Pressable>
              </View>

              {cards.length > 0 ? (
                <View style={styles.cardPreviewBox}>
                  <Pressable
                    style={styles.inlineFcCard}
                    onPress={() => setIsCardFlipped(!isCardFlipped)}
                  >
                    <View style={[styles.inlineFcHeader, { backgroundColor: isCardFlipped ? Colors.easyBg : Colors.accentBadgeBg }]}>
                      <Text style={[styles.inlineFcHeaderTxt, { color: isCardFlipped ? Colors.easyText : Colors.primary }]}>
                        {isCardFlipped ? 'Answer' : 'Question'}
                      </Text>
                    </View>
                    <ScrollView contentContainerStyle={styles.inlineFcScroll}>
                      <Text style={styles.inlineFcQuestionText}>
                        {isCardFlipped ? currentCard.back : currentCard.front}
                      </Text>
                    </ScrollView>
                    
                    <View style={styles.inlineFcFooter}>
                      <Pressable
                        disabled={activeCardIndex === 0}
                        onPress={(e) => {
                          e.stopPropagation();
                          setIsCardFlipped(false);
                          setActiveCardIndex(prev => Math.max(0, prev - 1));
                        }}
                        style={[styles.inlineFcArrowBtn, activeCardIndex === 0 && { opacity: 0.3 }]}
                      >
                        <Ionicons name="chevron-back" size={16} color={Colors.primary} />
                      </Pressable>
                      
                      <Text style={styles.inlineFcPagingText}>
                        {activeCardIndex + 1} / {cards.length}
                      </Text>
                      
                      <Pressable
                        disabled={activeCardIndex === cards.length - 1}
                        onPress={(e) => {
                          e.stopPropagation();
                          setIsCardFlipped(false);
                          setActiveCardIndex(prev => Math.min(cards.length - 1, prev + 1));
                        }}
                        style={[styles.inlineFcArrowBtn, activeCardIndex === cards.length - 1 && { opacity: 0.3 }]}
                      >
                        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                      </Pressable>
                      
                      <Pressable 
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push({ pathname: '/study' as any, params: { deckId: currentDeck.id } });
                        }}
                        style={styles.inlineFcExpandBtn}
                      >
                        <Ionicons name="expand" size={14} color={Colors.primary} />
                      </Pressable>
                    </View>
                  </Pressable>

                  {/* Dot Pagings */}
                  <View style={styles.dotContainer}>
                    {cards.slice(0, Math.min(5, cards.length)).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.pagingDot,
                          i === (activeCardIndex % 5) && styles.pagingDotActive
                        ]}
                      />
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTxt}>No cards in this deck.</Text>
                </View>
              )}

              {/* Study Mode List */}
              <Text style={styles.viewerSectionLabel}>Other ways to study these flashcards</Text>
              <View style={styles.studyWaysContainer}>
                
                {/* Learn */}
                <Pressable
                  style={styles.studyWayBtn}
                  onPress={() => router.push({ pathname: '/study' as any, params: { deckId: currentDeck.id } })}
                >
                  <View style={[styles.studyWayIconBox, { borderColor: '#5ab87a' }]}>
                    <Ionicons name="sync-outline" size={18} color="#5ab87a" />
                  </View>
                  <Text style={styles.studyWayTitle}>Learn</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.mutedText} style={{ marginLeft: 'auto' }} />
                </Pressable>

                {/* Test */}
                <Pressable
                  style={styles.studyWayBtn}
                  onPress={() => router.push({ pathname: '/practice-test' as any, params: { deckId: currentDeck.id } })}
                >
                  <View style={[styles.studyWayIconBox, { borderColor: '#3598db' }]}>
                    <Ionicons name="document-text-outline" size={18} color="#3598db" />
                  </View>
                  <Text style={styles.studyWayTitle}>Test</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.mutedText} style={{ marginLeft: 'auto' }} />
                </Pressable>

                {/* Match */}
                <Pressable
                  style={styles.studyWayBtn}
                  onPress={() => Alert.alert('Steampunk Match Game', 'Get ready Scholar! Matching cards allows you to pair terms and definitions against the clock. Standard mobile version launching soon!')}
                >
                  <View style={[styles.studyWayIconBox, { borderColor: '#e67e22' }]}>
                    <Ionicons name="albums-outline" size={18} color="#e67e22" />
                  </View>
                  <Text style={styles.studyWayTitle}>Match</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.mutedText} style={{ marginLeft: 'auto' }} />
                </Pressable>
              </View>

            </View>
          )}

          <Pressable
            style={styles.viewerCloseBtn}
            onPress={() => {
              if (params.deckId) {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/' as any);
                }
              } else {
                setActiveDeckId(null);
              }
            }}
          >
            <Text style={styles.viewerCloseBtnText}>Return to Decks</Text>
          </Pressable>
          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── Configuration Screen ─────────────────────────
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
        <Text style={styles.headerTitle}>AI Study Guides</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro Banner */}
        <View style={styles.introCard}>
          <Image source={owlImage} style={styles.introOwl} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Instant Study Notes</Text>
            <Text style={styles.introSub}>
              Compile comprehensive textbook summaries, bold definitions, key tables, and flashcards directly from study material.
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

  emptyState: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyTxt: { fontFamily: Fonts.body, fontSize: 12, color: Colors.mutedText },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.huge },
  loadingOwl: { width: 80, height: 80 },
  loadingTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.headingText, marginTop: Spacing.xl },
  loadingSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.mutedText, textAlign: 'center', marginTop: Spacing.md, lineHeight: 20 },

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

  /* ───────────────────────────────────────────────────
   * STUNNING LIGHT LAVENDER VIEWER STYLE (Nexa Theme)
   * ─────────────────────────────────────────────────── */
  viewerContainer: {
    flex: 1,
    backgroundColor: Colors.background, // Premium soft light lavender background
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  viewerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  viewerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  viewerHeaderActionBtn: {
    padding: Spacing.sm,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  viewerScrollContent: {
    paddingHorizontal: Spacing.xxl,
  },
  viewerMetaContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  viewerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  viewerAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentBadgeBg,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  viewerAvatar: {
    width: '100%',
    height: '100%',
  },
  viewerUsername: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.headingText,
  },
  viewerDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  viewerDateText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.mutedText, // Soft lavender subtitle color
  },

  // Viewer Tab System
  viewerTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.cardBorder,
    marginBottom: Spacing.xxl,
  },
  viewerTabBtn: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    marginRight: Spacing.xl,
  },
  viewerTabBtnActive: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary, // Active tab bar accent indicator
    marginBottom: -1.5,
  },
  viewerTabTxt: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.mutedText, // Unselected tab gray-purple text
  },
  viewerTabTxtActive: {
    color: Colors.primary, // Selected tab white text
  },

  // Viewer Sections
  tabContentBlock: {
    gap: Spacing.huge,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerSectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.headingText,
    marginBottom: Spacing.md,
  },
  viewerEditSetLink: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.primary,
  },
  viewerSectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.mutedText,
    marginBottom: Spacing.md,
  },

  // Interactive Card Box
  cardPreviewBox: {
    marginBottom: Spacing.xl,
  },
  inlineFcCard: {
    backgroundColor: Colors.cardSurface, // Premium white light mode card
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.round,
    minHeight: 210,
    padding: Spacing.xxl,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  inlineFcHeader: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  inlineFcHeaderTxt: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inlineFcScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inlineFcQuestionText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.headingText,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  inlineFcFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xxl,
    position: 'relative',
    width: '100%',
  },
  inlineFcArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineFcPagingText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.headingText,
  },
  inlineFcExpandBtn: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Paging Dots
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  pagingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cardBorder,
  },
  pagingDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  // Study ways
  studyWaysContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  studyWayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  studyWayIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studyWayTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.headingText,
  },

  // Essay block
  essayBlock: {
    marginTop: Spacing.sm,
  },
  essayQuestionItem: {
    flexDirection: 'row',
    gap: Spacing.lg,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  essayNumber: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.primary,
  },
  essayText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.headingText,
    flex: 1,
    lineHeight: 18,
  },

  // Bullet Lists
  quickSection: {
    marginBottom: Spacing.sm,
  },
  bulletList: {
    gap: Spacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    paddingLeft: Spacing.sm,
  },
  bulletSymbol: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: -2,
  },
  bulletContent: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
    color: Colors.headingText,
    flex: 1,
    lineHeight: 19,
  },
  bulletBold: {
    fontFamily: Fonts.bodyBold,
    color: Colors.primary,
  },

  // Custom Light Mode Table
  tableContainer: {
    marginBottom: Spacing.sm,
  },
  tableBorder: {
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.cardSurface,
    marginTop: Spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.accentBadgeBg,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  tableHeaderTxt: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCellTxt: {
    fontFamily: Fonts.body,
    fontSize: 11.5,
    color: Colors.headingText,
    textAlign: 'center',
    lineHeight: 16,
  },

  viewerCloseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xxxl,
  },
  viewerCloseBtnText: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.white,
  },

  // Modular Scholar Steampunk Dashboard additions
  mascotBanner: {
    backgroundColor: Colors.accentBadgeBg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.xl,
  },
  mascotBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    flex: 1,
  },
  mascotBannerOwl: {
    width: 48,
    height: 48,
  },
  mascotBannerTitle: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.headingText,
    marginBottom: 2,
  },
  mascotBannerSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.mutedText,
    lineHeight: 15,
    paddingRight: Spacing.xl,
  },
  badgeLabelContainer: {
    backgroundColor: Colors.accentBadgeBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  badgeLabelText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.primary,
  },
  lexiconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  lexiconCard: {
    width: '47%',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    minHeight: 100,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  lexiconHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  lexiconTermTxt: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.primary,
    flex: 1,
  },
  lexiconDefTxt: {
    fontFamily: Fonts.body,
    fontSize: 11.5,
    color: Colors.headingText,
    lineHeight: 16,
  },
  conceptChapterCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  chapterHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingBottom: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  chapterLabelText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.mutedText,
    marginBottom: 4,
  },
  chapterTitleText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.headingText,
  },
  chapterBulletsContainer: {
    gap: Spacing.lg,
  },
  chapterBulletRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    alignItems: 'flex-start',
  },
  chapterBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  chapterBulletTxt: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
    color: Colors.headingText,
    lineHeight: 19,
    flex: 1,
  },
  tableTitleLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
    marginBottom: Spacing.sm,
  },
  parchmentScroll: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    gap: Spacing.xl,
  },
  parchmentQuestionItem: {
    flexDirection: 'row',
    gap: Spacing.xl,
    alignItems: 'flex-start',
  },
  parchmentNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accentBadgeBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parchmentNumberText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.primary,
  },
  parchmentText: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
    color: Colors.headingText,
    lineHeight: 18,
    flex: 1,
  },
});
