import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Gemini client (uses process.env.GEMINI_API_KEY)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI();
};

// Fallback rates snapshot (Base: USD)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 86.85,
  EUR: 0.94,
  GBP: 0.81,
  AED: 3.67,
  SGD: 1.34,
  AUD: 1.54,
  CAD: 1.40,
  JPY: 153.2,
};

let cachedRates = {
  base: 'USD',
  timestamp: Date.now(),
  rates: { ...FALLBACK_RATES },
  source: 'Local Fallback Snapshot',
};

// --- Currency Routes ---
app.get('/api/currency/rates', async (req: Request, res: Response) => {
  // If cache is older than 6 hours, attempt update or return cached
  const isFresh = Date.now() - cachedRates.timestamp < 6 * 60 * 60 * 1000;
  if (!isFresh) {
    try {
      // Free public rates endpoint fallback
      const resp = await fetch('https://open.er-api.com/v6/latest/USD');
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.rates) {
          cachedRates = {
            base: 'USD',
            timestamp: Date.now(),
            rates: { ...FALLBACK_RATES, ...data.rates },
            source: 'Open Exchange Rates (Public)',
          };
        }
      }
    } catch (e) {
      console.warn('Live rates fetch failed, keeping existing cached rates', e);
    }
  }

  res.json({
    success: true,
    ...cachedRates,
    currencies: [
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    ],
  });
});

// --- Gemini Document Extraction (OCR + Structured Data) ---
app.post('/api/gemini/analyze-document', async (req: Request, res: Response) => {
  try {
    const { base64Data, mimeType, fileName } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Heuristic fallback if Gemini API key not present
      const fallbackResult = {
        title: fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Uploaded Document',
        category: 'Other',
        issuingOrg: 'Unspecified Organization',
        ownerName: '',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        refNumber: '',
        amount: null,
        currency: 'INR',
        summary: 'Document uploaded. Configure GEMINI_API_KEY for automatic AI extraction and OCR.',
        confidence: 0.5,
        suggestedAsset: null,
        suggestedExpense: null,
        suggestedReminders: [],
        extractedText: 'Manual verification suggested.',
      };
      return res.json({ success: true, data: fallbackResult, fallback: true });
    }

    const systemInstruction = `You are DocuMind, an expert document intelligence engine for MyLifeHub.
Analyze the provided document (invoice, receipt, warranty card, identity proof, insurance policy, medical bill, vehicle registration, etc.).
Extract structured JSON matching exactly this schema:
{
  "title": string (concise descriptive document title),
  "category": "Identity" | "Education" | "Insurance" | "Finance" | "Property" | "Vehicle" | "Household" | "Medical" | "Other",
  "issuingOrg": string,
  "ownerName": string,
  "issueDate": "YYYY-MM-DD" or empty string,
  "expiryDate": "YYYY-MM-DD" or empty string (for warranties, policies, certificates, IDs),
  "refNumber": string (policy number, invoice number, or account ref),
  "amount": number or null (total monetary amount if invoice, bill, receipt, or fee),
  "currency": "INR" | "USD" | "EUR" | "GBP" | "AED" | "SGD" | "AUD" | "CAD" | "JPY",
  "summary": string (2-3 concise sentences summarizing key details),
  "confidence": number between 0.1 and 1.0,
  "suggestedAsset": {
    "name": string (e.g. "Samsung French Door Refrigerator", "MacBook Pro M3"),
    "category": "Home Appliances" | "Electronics" | "Vehicles" | "Furniture" | "Equipment" | "Other",
    "brand": string,
    "model": string,
    "purchasePrice": number or null,
    "warrantyEndDate": "YYYY-MM-DD" or empty string
  } or null (only if this document is a purchase of a durable physical asset/appliance/vehicle/gadget),
  "suggestedExpense": {
    "description": string,
    "amount": number,
    "currency": string,
    "category": string (e.g. "Household Maintenance", "Shopping", "Healthcare", "Food", "Utilities", "Transportation", "Other"),
    "date": "YYYY-MM-DD"
  } or null (only if there was an actual financial charge/payment),
  "suggestedReminders": [
    {
      "title": string,
      "dueDate": "YYYY-MM-DD",
      "category": "Document Expiry" | "Warranty Expiry" | "Maintenance" | "Bill Payment",
      "priority": "low" | "medium" | "high"
    }
  ]
}
Do not invent missing data. Return valid JSON only.`;

    const contents: any[] = [];
    if (base64Data && mimeType) {
      // Strip base64 prefix if exists
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      });
    }

    contents.push({
      text: `Analyze this file titled "${fileName || 'document'}". Extract all visible fields according to instructions.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('Error in analyze-document:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to analyze document',
    });
  }
});

// --- Gemini Unified Natural Language Assistant ---
app.post('/api/gemini/assistant', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        answer: `I am currently in local offline mode (GEMINI_API_KEY is not configured). You can still view, search, and manage all your documents, transactions, assets, and groceries across MyLifeHub!`,
        confirmedData: ['Local system working properly.'],
        recommendations: ['Configure GEMINI_API_KEY in .env to unlock real-time intelligent analysis and automated cross-module insights.'],
      });
    }

    const systemInstruction = `You are MyLifeHub Intelligence, the centralized AI assistant for personal life management.
The user's authorized data context is provided below:
${JSON.stringify(context || {}, null, 2)}

Instructions:
1. Always base answers strictly on the user's data provided in context.
2. Clearly distinguish between:
   - "Confirmed Information": directly stated in the user's records.
   - "Inferred Information": calculated or deduced patterns.
   - "Recommendations": actionable advice or proactive steps.
3. If data is missing or empty, explicitly state that there are no matching records yet.
4. Format output as structured JSON:
{
  "answer": string (conversational markdown response),
  "confirmedData": [string, ...],
  "inferredData": [string, ...],
  "recommendations": [string, ...]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: query }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error('Error in assistant:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process assistant query',
    });
  }
});

// --- Gemini Recipe Suggestions from Pantry Items ---
app.post('/api/gemini/recipes', async (req: Request, res: Response) => {
  try {
    const { items, preferences } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        recipes: [
          {
            title: 'Quick Home Pantry Scramble / Stir-Fry',
            description: 'A versatile meal built using whatever fresh produce, proteins, and grains are currently stocked.',
            usedIngredients: items ? items.slice(0, 3).map((i: any) => i.name) : ['Eggs', 'Onions', 'Tomatoes'],
            missingIngredients: ['Salt', 'Pepper', 'Cooking Oil'],
            cookingTime: '15 mins',
            difficulty: 'Easy',
            instructions: [
              'Prep and chop your available ingredients.',
              'Sauté in a light dash of oil on medium-high heat.',
              'Season to taste and serve warm.',
            ],
          },
        ],
      });
    }

    const systemInstruction = `You are PantryPilot's Master Chef.
Based on the user's actual pantry ingredients:
${JSON.stringify(items || [], null, 2)}
Preferences: ${preferences || 'None'}

Recommend 3 practical, delicious recipes that maximize existing stock and prioritize items nearing expiration.
Return structured JSON:
{
  "recipes": [
    {
      "title": string,
      "description": string,
      "cookingTime": string,
      "difficulty": "Easy" | "Medium" | "Advanced",
      "usedIngredients": [string],
      "missingIngredients": [string],
      "instructions": [string]
    }
  ]
}
Do not claim expired food is safe. Only use ingredients from the list where possible.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: 'Generate 3 recipes using my available ingredients.' }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{"recipes":[]}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, ...parsed });
  } catch (err: any) {
    console.error('Error in recipes:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate recipes',
    });
  }
});

// --- Vite Dev Server Middleware or Static Server ---
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MyLifeHub full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
