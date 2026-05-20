import { GEMINI_API_KEY } from '@/constants/config';
import { useNexaStore } from '@/store/useNexaStore';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface GeneratedCard {
  front: string;
  back: string;
}

/**
 * Returns the active Gemini API key. Prioritizes the user's custom key stored in state.
 */
export function getActiveApiKey(): string {
  try {
    const custom = useNexaStore.getState().customApiKey;
    if (custom && custom.trim() !== '' && custom !== 'AIzaSyB6tB2Pn09KhPqkRPNJ7JwmSsKc9s7In0Q' && custom !== 'PASTE_YOUR_GEMINI_API_KEY_HERE') {
      return custom.trim();
    }
  } catch {}
  return GEMINI_API_KEY;
}

/**
 * Check if the Gemini API key is configured by either developer or user.
 */
export function isAIConfigured(): boolean {
  const key = getActiveApiKey();
  return !!key && key !== 'PASTE_YOUR_GEMINI_API_KEY_HERE' && key !== 'AIzaSyB6tB2Pn09KhPqkRPNJ7JwmSsKc9s7In0Q';
}

/**
 * Sends file content to Gemini API and returns generated flashcard pairs.
 * Supports PDF, PPT, DOC via base64 file upload.
 */
export async function generateFlashcardsFromFile(
  fileBase64: string,
  mimeType: string,
  deckName: string,
  cardCount: number = 10,
): Promise<GeneratedCard[]> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key in src/constants/config.ts');
  }

  const prompt = `You are an expert educator. Analyze this document and create exactly ${cardCount} high-quality flashcards for studying.

Rules:
- Each flashcard should have a clear, concise question on the front
- Each answer on the back should be informative but brief (1-3 sentences)
- Cover the most important concepts, definitions, facts, and key ideas
- Vary question types: definitions, concepts, comparisons, cause-effect
- Make questions that test understanding, not just memorization
- If the document is about "${deckName}", focus on the most relevant content

Return ONLY a valid JSON array with no extra text, no markdown fences, in this exact format:
[{"front": "question here", "back": "answer here"}]`;

  const response = await fetch(`${GEMINI_API_URL}?key=${getActiveApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: fileBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse flashcards from AI response.');
  }

  const cards: GeneratedCard[] = JSON.parse(jsonMatch[0]);
  return cards
    .filter((c) => c.front && c.back)
    .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));
}

/**
 * Sends plain text to Gemini API to generate flashcards.
 */
export async function generateFlashcardsFromText(
  text: string,
  deckName: string,
  cardCount: number = 10,
): Promise<GeneratedCard[]> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key in src/constants/config.ts');
  }

  const prompt = `You are an expert educator. Analyze the following text and create exactly ${cardCount} high-quality flashcards for studying.

Rules:
- Each flashcard should have a clear, concise question on the front
- Each answer on the back should be informative but brief (1-3 sentences)
- Cover the most important concepts, definitions, facts, and key ideas
- Vary question types: definitions, concepts, comparisons, cause-effect
- If the content is about "${deckName}", focus on the most relevant material

Return ONLY a valid JSON array with no extra text, no markdown fences:
[{"front": "question here", "back": "answer here"}]

TEXT:
${text}`;

  const response = await fetch(`${GEMINI_API_URL}?key=${getActiveApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse flashcards from AI response.');
  }

  const cards: GeneratedCard[] = JSON.parse(jsonMatch[0]);
  return cards
    .filter((c) => c.front && c.back)
    .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));
}

export interface PracticeQuestion {
  question: string;
  type: 'mc' | 'tf';
  options?: string[];
  answer: string;
}

/**
 * Sends deck cards to Gemini and generates a set of practice questions (multiple-choice or true/false).
 */
export async function generatePracticeTest(
  cardsText: string,
  questionCount: number = 10,
): Promise<PracticeQuestion[]> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key in src/constants/config.ts');
  }

  const prompt = `You are a rigorous academic examiner. Based on the following study flashcards, generate exactly ${questionCount} high-quality practice test questions.

Rules:
- Vary the questions between Multiple Choice ('mc') and True/False ('tf') types
- For Multiple Choice ('mc'), provide exactly 4 options: A, B, C, D
- For True/False ('tf'), the options must be exactly ["True", "False"]
- The answer must be the exact string matching the correct option (e.g. for mc, the full correct option text; for tf, "True" or "False")
- Cover the main terms, principles, and analytical conclusions in the flashcards

Return ONLY a valid JSON array with no extra text, no markdown fences:
[
  {
    "question": "The question content here?",
    "type": "mc",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option B"
  },
  {
    "question": "Statements of this sort are universally true?",
    "type": "tf",
    "options": ["True", "False"],
    "answer": "False"
  }
]

FLASHCARDS:
${cardsText}`;

  const response = await fetch(`${GEMINI_API_URL}?key=${getActiveApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse practice test from AI response.');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Sends content to Gemini and generates a comprehensive textbook-style markdown study guide.
 */
export async function generateStudyGuide(
  sourceMaterial: string,
  title: string,
): Promise<string> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key in src/constants/config.ts');
  }

  const prompt = `You are a scholarly tutor. Create an elegant, comprehensive, and perfectly structured textbook Study Guide for the topic: "${title}".

Base your guide on this content:
${sourceMaterial}

Rules:
- Organize it beautifully using clear Markdown headings (H2, H3), bullet points, and italic highlights
- Structure it in four distinct sections:
  1. # Executive Summary (A high-level scholarly overview of the topic)
  2. # Core Terms & Definitions (A list of the 5-8 most critical terms styled with bold and clear inline definitions)
  3. # Essential Takeaways (Deep-dive details, explanations, mechanisms, cause-effect links, or rules)
  4. # Scholar Nexa's Wisdom (A friendly paragraph of encouraging advice written in the voice of Nexa, a wise, old steampunk scholar owl who loves steam-powered clocks, coffee, and books)
- Output ONLY the clean markdown guide with no introductory or concluding chit-chat. Make it feel highly academic, premium, and detailed!`;

  const response = await fetch(`${GEMINI_API_URL}?key=${getActiveApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Failed to compile study guide.';
}

/**
 * Sends a base64 image (photo scan or gallery pick) directly to Gemini to generate flashcards.
 */
export async function generateFlashcardsFromImage(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  cardCount: number = 10,
): Promise<GeneratedCard[]> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key in src/constants/config.ts');
  }

  const prompt = `You are an expert academic tutor. Analyze the attached document image and generate exactly ${cardCount} study flashcards.

Rules:
- Read all readable text, definitions, and diagrams in the image
- Create a clear, concise question for the front of each card
- Provide an informative but brief (1-3 sentences) answer on the back
- Cover the most important concepts, keywords, and equations shown

Return ONLY a valid JSON array with no extra text, no markdown fences:
[{"front": "question here", "back": "answer here"}]`;

  const response = await fetch(`${GEMINI_API_URL}?key=${getActiveApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse flashcards from document image.');
  }

  const cards: GeneratedCard[] = JSON.parse(jsonMatch[0]);
  return cards
    .filter((c) => c.front && c.back)
    .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));
}

/**
 * Sends a base64 image (photo scan or gallery pick) directly to Gemini to generate a complete Study Guide.
 */
export async function generateStudyGuideFromImage(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  title: string = 'Visual Guide',
): Promise<string> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key in src/constants/config.ts');
  }

  const prompt = `You are a scholarly tutor. Create an elegant, comprehensive, and perfectly structured textbook Study Guide for the topic: "${title}".
Analyze the attached document image and synthesize all text, diagrams, equations, and annotations.

Rules:
- Organize it beautifully using clear Markdown headings (H2, H3), bullet points, and italic highlights
- Structure it in four distinct sections:
  1. # Executive Summary (A high-level scholarly overview of the content shown in the image)
  2. # Core Terms & Definitions (A list of the 5-8 most critical terms styled with bold and clear inline definitions)
  3. # Essential Takeaways (Deep-dive details, explanations, mechanisms, cause-effect links, or rules)
  4. # Scholar Nexa's Wisdom (A friendly paragraph of encouraging advice written in the voice of Nexa, a wise, old steampunk scholar owl who loves steam-powered clocks, coffee, and books)
- Output ONLY the clean markdown guide with no introductory or concluding chit-chat. Make it feel highly academic, premium, and detailed!`;

  const response = await fetch(`${GEMINI_API_URL}?key=${getActiveApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Failed to compile study guide.';
}

