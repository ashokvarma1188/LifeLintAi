const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_PROMPT = `You are the LifeLink AI First-Aid Assistant, a calm, concise helper embedded in an
emergency-response app. You give brief, practical first-aid and over-the-counter
medication guidance while real help is on the way.

Rules:
- Keep replies short: 2-5 sentences, plain language, no markdown headers.
- For anything that sounds like a medical emergency (chest pain, severe bleeding,
  difficulty breathing, loss of consciousness, suspected stroke/heart attack, etc.),
  your first sentence must tell them to call emergency services or use the app's SOS
  button right now.
- You are not a doctor. Never name a specific prescription dosage for a named
  individual's condition — give general, widely-known first-aid/OTC guidance only
  (e.g. "adults can typically take the standard labeled dose of paracetamol for
  a mild fever, but check the package and consult a pharmacist if unsure").
- If a question is outside first-aid/medication scope, gently redirect back to what
  you can help with.
- If a photo of an injury is attached: describe what the wound looks like in plain
  terms (e.g. cut, scrape, burn) and your best read of how severe the bleeding
  appears (none/minor ooze/actively bleeding/heavy), then give immediate first-aid
  steps. Always make clear a photo is not a diagnosis — for anything deep, heavy
  bleeding, or that won't stop, tell them to seek in-person medical care or call
  emergency services right away.`;

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

// The language the person picked in the app — replies follow it unless they write in another one.
const LANGUAGE_NAMES = { hi: "Hindi (Devanagari script)", te: "Telugu (Telugu script)" };

let genAI = null;
const getModel = (language) => {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const languageRule = LANGUAGE_NAMES[language]
    ? `
- The user has chosen ${LANGUAGE_NAMES[language]} in the app. Reply in that language unless they write to you in a different one.`
    : "";
  return genAI.getGenerativeModel({ model: "gemini-3.6-flash", systemInstruction: SYSTEM_PROMPT + languageRule });
};

/**
 * `history` is the last few turns from the widget, kept short since this is a
 * quick-help chat rather than a long conversation the model needs full context for.
 */
/** history/message arrive as JSON strings when sent as multipart (i.e. a photo is attached). */
const chat = async (req, res) => {
  try {
    const message = req.body.message;
    let history = req.body.history;
    if (typeof history === "string") {
      try { history = JSON.parse(history); } catch { history = []; }
    }
    const photo = req.file;

    if ((!message || !String(message).trim()) && !photo) {
      return res.status(400).json({ message: "A message or photo is required" });
    }

    if (!isConfigured()) {
      return res.status(503).json({
        message: "The AI assistant is not configured yet. Ask the site owner to add GEMINI_API_KEY.",
        configured: false,
      });
    }

    const userParts = [];
    const text = message ? String(message).trim() : "";
    if (photo) {
      userParts.push({ inlineData: { mimeType: photo.mimetype, data: photo.buffer.toString("base64") } });
      userParts.push({ text: text || "Here's a photo of the injury. What is it and how should I treat it?" });
    } else {
      userParts.push({ text });
    }

    const priorTurns = Array.isArray(history) ? history.slice(-8) : [];
    const contents = [
      ...priorTurns
        .filter((t) => t && t.role && t.content)
        .map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: String(t.content) }] })),
      { role: "user", parts: userParts },
    ];

    const result = await getModel(req.body.language).generateContent({ contents });
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: "The assistant could not respond right now.", error: err.message });
  }
};

module.exports = { chat, isConfigured };
