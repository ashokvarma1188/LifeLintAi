/*
 * One place for the Gemini client, shared by the first-aid chat, the report reader and
 * the symptom checker.
 *
 * Free-tier Gemini allows only a few requests a minute per model, and a model sometimes
 * answers "high demand, try later". Each model has its own quota, so a busy, rate-limited
 * or retired model falls through to the next one in the list.
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
const MODEL = MODELS[0];

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

// The language the person picked in the app.
const LANGUAGE_NAMES = { en: "English", hi: "Hindi (Devanagari script)", te: "Telugu (Telugu script)" };
const languageName = (code) => LANGUAGE_NAMES[code] || LANGUAGE_NAMES.en;

let client = null;
const getModel = (systemInstruction, generationConfig, model = MODEL, timeoutMs) => {
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client.getGenerativeModel({ model, systemInstruction, generationConfig }, timeoutMs ? { timeout: timeoutMs } : undefined);
};

// Rate limit, overload, server error, timeout or a retired model: worth trying the next model.
const isRetryable = (err) => /\[(404|429|500|502|503|504)\b|abort|timed? ?out/i.test(String(err?.message));

/**
 * generateContent with the model fallback chain. Returns the SDK result.
 * An overloaded model can hang rather than fail, so each attempt gets `perModelMs`, and no
 * new attempt starts once `budgetMs` has passed.
 */
const generateContent = async (systemInstruction, request, generationConfig, { perModelMs = 30000, budgetMs = 60000 } = {}) => {
  const started = Date.now();
  let lastError;
  for (const model of MODELS) {
    const left = budgetMs - (Date.now() - started);
    if (left < 3000) break;
    try {
      return await getModel(systemInstruction, generationConfig, model, Math.min(perModelMs, left)).generateContent(request);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) throw err;
    }
  }
  throw lastError || new Error("[503] The AI timed out");
};

/** True when every model was busy, out of quota or too slow, i.e. "try again in a minute". */
const isBusyError = (err) => /\[(429|503)\b|abort|timed? ?out/i.test(String(err?.message));

/** Runs a prompt that must answer with JSON, and returns the parsed object (or throws). */
const generateJson = async (systemInstruction, parts, limits) => {
  const result = await generateContent(systemInstruction, { contents: [{ role: "user", parts }] }, { responseMimeType: "application/json", temperature: 0.2 }, limits);
  const text = result.response.text().trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(text);
};

module.exports = { MODEL, MODELS, isConfigured, languageName, getModel, generateContent, generateJson, isBusyError };
