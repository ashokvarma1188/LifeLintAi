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
  you can help with.`;

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

let genAI = null;
const getModel = () => {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-3.6-flash", systemInstruction: SYSTEM_PROMPT });
};

/**
 * `history` is the last few turns from the widget, kept short since this is a
 * quick-help chat rather than a long conversation the model needs full context for.
 */
const chat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "A message is required" });
    }

    if (!isConfigured()) {
      return res.status(503).json({
        message: "The AI assistant is not configured yet. Ask the site owner to add GEMINI_API_KEY.",
        configured: false,
      });
    }

    const priorTurns = Array.isArray(history) ? history.slice(-8) : [];
    const contents = [
      ...priorTurns
        .filter((t) => t && t.role && t.content)
        .map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: String(t.content) }] })),
      { role: "user", parts: [{ text: String(message).trim() }] },
    ];

    const result = await getModel().generateContent({ contents });
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: "The assistant could not respond right now.", error: err.message });
  }
};

module.exports = { chat, isConfigured };
