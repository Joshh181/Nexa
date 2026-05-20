/**
 * Nexa — Create Deck Screen
 * Full-screen form with emoji picker, color tag, and card input
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { useNexaStore, type ColorTag } from '@/store/useNexaStore';

const EMOJI_OPTIONS = ['📚', '🔬', '📖', '🧮', '🌍', '🎨', '💡', '🏛️', '🦉', '⚡'];

const COLOR_OPTIONS: { tag: ColorTag; color: string; label: string }[] = [
  { tag: 'purple', color: Colors.purpleDeckBg, label: 'Purple' },
  { tag: 'pink', color: Colors.pinkDeckBg, label: 'Pink' },
  { tag: 'blue', color: Colors.blueDeckBg, label: 'Blue' },
];

interface TempCard {
  front: string;
  back: string;
}

export default function CreateDeckScreen() {
  const insets = useSafeAreaInsets();
  const { addDeck, addCardToDeck } = useNexaStore();

  const [deckName, setDeckName] = useState('');
  const selectedIcon = '';
  const [selectedColor, setSelectedColor] = useState<ColorTag>('purple');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [tempCards, setTempCards] = useState<TempCard[]>([]);

  const handleAddCard = () => {
    if (!cardFront.trim() || !cardBack.trim()) return;
    setTempCards((prev) => [...prev, { front: cardFront.trim(), back: cardBack.trim() }]);
    setCardFront('');
    setCardBack('');
  };

  const handleRemoveCard = (index: number) => {
    setTempCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!deckName.trim()) return;
    // Create deck first
    const store = useNexaStore.getState();
    store.addDeck({
      name: deckName.trim(),
      icon: selectedIcon,
      colorTag: selectedColor,
      cards: [],
    });
    // Find the newly created deck (last one)
    const newDecks = useNexaStore.getState().decks;
    const newDeck = newDecks[newDecks.length - 1];
    // Add cards
    for (const card of tempCards) {
      store.addCardToDeck(newDeck.id, card.front, card.back);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/' as any);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.closeBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/' as any);
              }
            }}
          >
            <Ionicons name="close" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>New Deck</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Deck Name */}
        <Text style={styles.fieldLabel}>DECK NAME</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. World History"
            placeholderTextColor={Colors.mutedText}
            value={deckName}
            onChangeText={setDeckName}
          />
        </View>



        {/* Color Picker */}
        <Text style={styles.fieldLabel}>COLOR TAG</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map((opt) => (
            <Pressable
              key={opt.tag}
              style={[
                styles.colorBtn,
                { backgroundColor: opt.color },
                selectedColor === opt.tag && styles.colorBtnActive,
              ]}
              onPress={() => setSelectedColor(opt.tag)}
            >
              <Text style={styles.colorLabel}>{opt.label}</Text>
              {selectedColor === opt.tag && (
                <Ionicons name="checkmark" size={14} color={Colors.primary} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Add Card Section */}
        <Text style={styles.fieldLabel}>ADD CARDS</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.textInput}
            placeholder="Question (front)"
            placeholderTextColor={Colors.mutedText}
            value={cardFront}
            onChangeText={setCardFront}
            multiline
          />
        </View>
        <View style={[styles.inputCard, { marginTop: Spacing.md }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Answer (back)"
            placeholderTextColor={Colors.mutedText}
            value={cardBack}
            onChangeText={setCardBack}
            multiline
          />
        </View>
        <Pressable
          style={[styles.addCardBtn, (!cardFront.trim() || !cardBack.trim()) && styles.btnDisabled]}
          onPress={handleAddCard}
        >
          <Ionicons name="add" size={16} color={Colors.white} />
          <Text style={styles.addCardBtnTxt}>Add Card</Text>
        </Pressable>

        {/* Card Chips */}
        {tempCards.length > 0 && (
          <View style={styles.chipWrap}>
            {tempCards.map((card, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipTxt} numberOfLines={1}>{card.front}</Text>
                <Pressable onPress={() => handleRemoveCard(i)}>
                  <Ionicons name="close-circle" size={14} color={Colors.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.cardCountTxt}>
          {tempCards.length} card{tempCards.length !== 1 ? 's' : ''} added
        </Text>

        {/* Save Deck Button */}
        <Pressable
          style={[styles.saveBtn, !deckName.trim() && styles.btnDisabled]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnTxt}>Save Deck</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xxl },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: Spacing.xxxl },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.headingText },

  fieldLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Spacing.xl, marginBottom: Spacing.md },

  inputCard: { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  textInput: { fontFamily: Fonts.body, fontSize: 14, color: Colors.headingText, padding: 0, minHeight: 20 },

  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  emojiBtn: { width: 44, height: 44, borderRadius: BorderRadius.lg, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, justifyContent: 'center', alignItems: 'center' },
  emojiBtnActive: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.accentBadgeBg },
  emojiText: { fontSize: 20 },

  colorRow: { flexDirection: 'row', gap: Spacing.md },
  colorBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'transparent', gap: 4 },
  colorBtnActive: { borderColor: Colors.primary, borderWidth: 2 },
  colorLabel: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.headingText },

  addCardBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, gap: 4, marginTop: Spacing.lg },
  addCardBtnTxt: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.white },
  btnDisabled: { opacity: 0.5 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.xl },
  chip: { backgroundColor: Colors.accentBadgeBg, borderRadius: BorderRadius.pill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 6, gap: 6, maxWidth: '48%' },
  chipTxt: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.primary, flex: 1 },
  cardCountTxt: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, marginTop: Spacing.md },

  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xxl, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xxxl },
  saveBtnTxt: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },
});
