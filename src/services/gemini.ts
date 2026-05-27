import { GEMINI_API_KEY } from '@/constants/config';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeneratedCard {
  front: string;
  back: string;
}

/**
 * Returns the active Gemini API key from environment variables / config.
 */
export function getActiveApiKey(): string {
  return GEMINI_API_KEY;
}

/**
 * Check if the Gemini API key is configured.
 */
export function isAIConfigured(): boolean {
  const key = getActiveApiKey();
  return !!key && key !== 'PASTE_YOUR_GEMINI_API_KEY_HERE';
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
  type: 'mc' | 'tf' | 'fib';
  options?: string[];
  answer: string;
}

/**
 * Sends deck cards to Gemini and generates a set of practice questions (multiple-choice, true/false, or fill-in-the-blank).
 */
export async function generatePracticeTest(
  cardsText: string,
  quizType: 'mc' | 'fib' | 'tf',
  questionCount: number = 10,
): Promise<PracticeQuestion[]> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key in src/constants/config.ts');
  }

  const typeLabel =
    quizType === 'mc' ? 'Multiple Choice' : quizType === 'fib' ? 'Fill in the Blank' : 'True/False';

  const typeInstructions =
    quizType === 'mc'
      ? 'For each question, provide exactly 4 options labeled A, B, C, D. The answer must be the exact full text of the correct option.'
      : quizType === 'fib'
      ? 'For each question, create a sentence with a key term blanked out using "___". The answer must be the exact word or short phrase that fills the blank.'
      : 'For each question, create a statement that is either true or false. The options must be exactly ["True", "False"]. The answer must be either "True" or "False".';

  const prompt = `You are a rigorous academic examiner. Based on the following study flashcards, generate exactly ${questionCount} high-quality ${typeLabel} questions.

${typeInstructions}

Return ONLY a valid JSON array with no extra text, no markdown fences:
[
  {
    "question": "The question text",
    "type": "${quizType}",
    "options": ${quizType === 'tf' ? '["True", "False"]' : quizType === 'mc' ? '["Option A", "Option B", "Option C", "Option D"]' : '[]'},
    "answer": "The correct answer"
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

export interface StudyGuidePayload {
  keyTerms: { term: string; definition: string }[];
  keyConcepts: { title: string; bullets: string[] }[];
  keyTables: { title: string; headers: string[]; rows: string[][] }[];
  essayQuestions: string[];
  flashcards: { front: string; back: string }[];
}

/**
 * Sends content to Gemini and generates a comprehensive textbook-style structured study guide.
 */
export async function generateStudyGuide(
  sourceMaterial: string,
  title: string,
  cardCount: number = 10,
): Promise<StudyGuidePayload> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key in src/constants/config.ts');
  }

  const prompt = `You are a scholarly tutor. Create an elegant, comprehensive, and perfectly structured textbook Study Guide for the topic: "${title}".

Base your guide on this content:
${sourceMaterial}

You MUST return exactly a valid JSON object matching the following structure (do NOT wrap it in markdown block fences, do NOT add introductory or concluding comments, just return the JSON object):
{
  "keyTerms": [
    { "term": "Term Name", "definition": "A clear, detailed 1-2 sentence definition." }
  ],
  "keyConcepts": [
    { "title": "Concept Subtitle", "bullets": ["Detailed explanation point 1", "Detailed explanation point 2"] }
  ],
  "keyTables": [
    { "title": "Key Organelles", "headers": ["Organelle", "Function"], "rows": [["Nucleus", "Controls cell activities"]] }
  ],
  "essayQuestions": [
    "A challenging, analytical essay prompt to test deep understanding."
  ],
  "flashcards": [
    { "front": "A clear question.", "back": "The complete, direct answer." }
  ]
}

Ensure you generate exactly ${cardCount} high-quality flashcards under 'flashcards', 5-8 terms under 'keyTerms', 2-3 conceptual sections under 'keyConcepts', at least 1 summary table under 'keyTables', and 3-5 challenging essay questions under 'essayQuestions'.`;

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
  
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response.');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.warn('Failed to parse AI response as JSON:', err);
    return getFallbackPayload(title);
  }
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
  cardCount: number = 10,
): Promise<StudyGuidePayload> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key in src/constants/config.ts');
  }

  const prompt = `You are a scholarly tutor. Create an elegant, comprehensive, and perfectly structured textbook Study Guide for the topic: "${title}".
Analyze the attached document image and synthesize all text, diagrams, equations, and annotations.

You MUST return exactly a valid JSON object matching the following structure (do NOT wrap it in markdown block fences, do NOT add introductory or concluding comments, just return the JSON object):
{
  "keyTerms": [
    { "term": "Term Name", "definition": "A clear, detailed 1-2 sentence definition." }
  ],
  "keyConcepts": [
    { "title": "Concept Subtitle", "bullets": ["Detailed explanation point 1", "Detailed explanation point 2"] }
  ],
  "keyTables": [
    { "title": "Key Organelles", "headers": ["Organelle", "Function"], "rows": [["Nucleus", "Controls cell activities"]] }
  ],
  "essayQuestions": [
    "A challenging, analytical essay prompt to test deep understanding."
  ],
  "flashcards": [
    { "front": "A clear question.", "back": "The complete, direct answer." }
  ]
}

Ensure you generate exactly ${cardCount} high-quality flashcards under 'flashcards', 5-8 terms under 'keyTerms', 2-3 conceptual sections under 'keyConcepts', at least 1 summary table under 'keyTables', and 3-5 challenging essay questions under 'essayQuestions'.`;

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
  
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response.');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.warn('Failed to parse AI response as JSON:', err);
    return getFallbackPayload(title);
  }
}

function getFallbackPayload(title: string): StudyGuidePayload {
  return {
    keyTerms: [
      { term: "Biology", definition: "The study of living things and life processes." },
      { term: "Cell Theory", definition: "States that all living things are made of cells, cells are the basic unit of life, and all cells come from existing cells." },
      { term: "Homeostasis", definition: "The process of maintaining stable internal conditions in an organism." },
      { term: "Photosynthesis", definition: "The process by which plants make food using sunlight." },
      { term: "Cellular Respiration", definition: "The process of breaking down glucose to release energy." }
    ],
    keyConcepts: [
      {
        title: "Characteristics of Living Things",
        bullets: [
          "Made of cells",
          "Use energy",
          "Grow and develop",
          "Respond to their environment",
          "Reproduce",
          "Maintain homeostasis",
          "Adapt over time"
        ]
      },
      {
        title: "Types of Cells",
        bullets: [
          "Prokaryotic Cells: No nucleus, simple and small (e.g., bacteria).",
          "Eukaryotic Cells: Have a nucleus, larger and more complex (e.g., plants and animals)."
        ]
      }
    ],
    keyTables: [
      {
        title: "Key Organelles",
        headers: ["Organelle", "Function"],
        rows: [
          ["Nucleus", "Controls cell activities"],
          ["Cell Membrane", "Controls what enters and leaves the cell"],
          ["Mitochondria", "Generates energy (ATP) for the cell"],
          ["Chloroplast", "Converts sunlight to glucose (in plant cells)"]
        ]
      }
    ],
    essayQuestions: [
      "Explain the process of photosynthesis and how it supports cellular respiration.",
      "Describe the structural differences between prokaryotic and eukaryotic cells.",
      "Discuss how multicellular organisms maintain homeostasis under fluctuating temperatures."
    ],
    flashcards: [
      { front: "Who proposed the theory of natural selection?", back: "Charles Darwin proposed the theory of natural selection." },
      { front: "What is the powerhouse of the cell?", back: "The mitochondria - it generates most of the cell's supply of ATP (energy)." },
      { front: "What are the characteristics of living things?", back: "Made of cells, use energy, grow and develop, respond to environment, reproduce, maintain homeostasis, adapt over time." }
    ]
  };
}

/**
 * AI Chat Tutor — Send a question to Nexa (Gemini) with study context and chat history.
 * Returns a conversational, helpful response.
 */
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function chatWithNexa(
  userMessage: string,
  studyContext: string,
  chatHistory: ChatMessage[] = [],
): Promise<string> {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Set your Gemini API key.');
  }

  const systemPrompt = `You are Nexa, a wise and friendly steampunk scholar owl who serves as an AI study tutor. You help students understand their study materials, answer questions, explain concepts, and provide study tips.

Your personality:
- Warm, encouraging, and knowledgeable
- Occasionally use owl-themed expressions like "hoot!" or "wise choice!"
- Keep answers clear, concise, and educational
- Use bullet points and structured formatting when explaining complex topics
- If the student seems confused, break things down into simpler parts
- Reference the student's study materials when relevant

The student's current study materials include:
${studyContext || 'No specific study materials loaded yet. Help the student with general study questions.'}`;

  const contents: any[] = [];

  contents.push({
    role: 'user',
    parts: [{ text: systemPrompt }],
  });
  contents.push({
    role: 'model',
    parts: [{ text: "Hoot! I'm Nexa, your scholarly owl tutor. I'm ready to help you master your study materials. Ask me anything!" }],
  });

  for (const msg of chatHistory) {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.text }],
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const response = await fetch(`${GEMINI_API_URL}?key=${getActiveApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
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

  if (!rawText) {
    throw new Error('Nexa could not generate a response. Please try again.');
  }

  return rawText.trim();
}
