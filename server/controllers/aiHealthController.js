/*
 * Two AI health tools:
 *  - Report reader: explains an uploaded lab report (photo or PDF) in plain words.
 *  - Symptom checker: sorts typed symptoms into "call 112 now" / "see a doctor today" /
 *    "home care".
 * Nothing the user sends is stored. Red-flag symptoms are always caught by fixed rules
 * before the AI sees them, so an emergency can never be rated lower by the model, and
 * the checker still works when the AI is down or not configured.
 */
const gemini = require("../utils/gemini");

const TEST_STATUSES = ["low", "normal", "high", "abnormal", "unknown"];
const LEVELS = ["emergency", "doctor", "home"];
const AGE_GROUPS = ["child", "adult", "senior", "pregnant"];

const str = (value, max = 600) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const strList = (value, maxItems = 6, maxLen = 300) =>
  (Array.isArray(value) ? value : []).map((item) => str(item, maxLen)).filter(Boolean).slice(0, maxItems);

/* ------------------------------------------------------------------ report reader */

const REPORT_PROMPT = `You explain medical lab reports to ordinary people in an Indian emergency-health app.
Read the attached report (photo or PDF) and answer ONLY with JSON in this exact shape:
{
  "isMedicalReport": boolean,            // false if this is not a medical test report
  "reportType": string,                  // e.g. "Complete blood count", "Lipid profile"
  "summary": string,                     // 2-4 short sentences, plain words, no jargon
  "tests": [{
    "name": string,                      // test name as printed on the report
    "value": string,                     // result as printed
    "unit": string,
    "range": string,                     // reference range as printed, "" if none
    "status": "low" | "normal" | "high" | "abnormal" | "unknown",
    "meaning": string                    // one plain sentence: what this result means
  }],
  "advice": [string],                    // 2-5 practical next steps (diet, follow-up, which doctor)
  "urgent": boolean,                     // true only for values that need same-day medical care
  "urgentReason": string                 // why, or ""
}
Rules:
- Judge low/normal/high from the report's own reference range when it is printed.
- Never diagnose a disease with certainty; say what a value "can suggest" and advise seeing a doctor.
- Do not invent tests or values that are not on the report. If a value is unreadable, use status "unknown".
- Write summary, meaning, advice and urgentReason in LANGUAGE. Keep test names and units as printed.`;

const explainReport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please attach a photo or PDF of the report." });
    if (!gemini.isConfigured()) {
      return res.status(503).json({ message: "The AI report reader is not configured yet.", configured: false });
    }

    const language = gemini.languageName(req.body?.language);
    const raw = await gemini.generateJson(REPORT_PROMPT.replace("LANGUAGE", language), [
      { inlineData: { mimeType: req.file.mimetype, data: req.file.buffer.toString("base64") } },
      { text: `Explain this report. Answer in ${language}.` },
    ], { perModelMs: 40000, budgetMs: 75000 });

    const tests = (Array.isArray(raw.tests) ? raw.tests : []).slice(0, 40).map((test) => ({
      name: str(test?.name, 120),
      value: str(String(test?.value ?? ""), 60),
      unit: str(test?.unit, 40),
      range: str(test?.range, 80),
      status: TEST_STATUSES.includes(test?.status) ? test.status : "unknown",
      meaning: str(test?.meaning, 300),
    })).filter((test) => test.name);

    res.json({
      isMedicalReport: raw.isMedicalReport !== false,
      reportType: str(raw.reportType, 120),
      summary: str(raw.summary, 1200),
      tests,
      advice: strList(raw.advice, 6),
      urgent: Boolean(raw.urgent),
      urgentReason: str(raw.urgentReason, 400),
    });
  } catch (err) {
    if (gemini.isBusyError(err)) {
      return res.status(429).json({ message: "The AI is busy right now. Please try again in a minute.", busy: true });
    }
    res.status(502).json({ message: "The report could not be read right now. Please try again.", error: err.message });
  }
};

/* --------------------------------------------------------------- symptom checker */

// Phrases that always mean "call 112 now", in English, Hindi and Telugu.
const RED_FLAGS = [
  /chest (pain|tight|pressure)|heart attack/i,
  /can'?t breathe|cannot breathe|not breathing|difficulty breathing|trouble breathing|short(ness)? of breath|breathless|choking/i,
  /unconscious|unresponsive|passed out|not waking|fainted and/i,
  /(severe|heavy|lot of|won'?t stop|uncontrolled) bleeding|bleeding (heavily|a lot)|vomiting blood|coughing (up )?blood/i,
  /face droop|slurred speech|can'?t speak|one side.*(weak|numb)|(weak|numb).*one side|stroke/i,
  /seizure|fits|convulsion/i,
  /suicid|kill myself|end my life|overdose|poison|swallowed (acid|bleach|pesticide)/i,
  /snake ?bite|severe burn|electric shock|head injury.*(vomit|confus|sleepy)/i,
  /stiff neck.*fever|fever.*stiff neck/i,
  /pregnan.*(bleeding|severe pain)|baby not breathing/i,
  /सीने में (दर्द|जकड़न)|सांस (नहीं|लेने में (तकलीफ|दिक्कत))|बेहोश|ज़्यादा खून|दौरा|लकवा|ज़हर|सांप/,
  /ఛాతీ (నొప్పి|బిగుతు)|శ్వాస (ఆడటం లేదు|తీసుకోవడం కష్టం)|ఊపిరి ఆడ|స్పృహ (లేదు|తప్పి)|రక్తస్రావం|మూర్ఛ|పక్షవాతం|విషం|పాము/,
];

const findRedFlag = (text) => {
  for (const pattern of RED_FLAGS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
};

// Fixed English text used when the AI isn't available; the website translates it.
const FALLBACK = {
  emergency: {
    level: "emergency",
    headline: "This could be an emergency. Call 112 now.",
    reason: "One or more of these symptoms can be life-threatening and need help straight away.",
    doNow: [
      "Call 112 (or 108 for an ambulance) right now, or press SOS in LifeLink.",
      "Stay with the person and keep them still and comfortable.",
      "Don't give food, drink or medicine unless a doctor tells you to.",
    ],
    warningSigns: [],
    careType: "Emergency department",
  },
  doctor: {
    level: "doctor",
    headline: "Please see a doctor today.",
    reason: "These symptoms should be checked by a doctor. The AI checker is not available right now, so we're being careful.",
    doNow: [
      "Book a visit with a doctor or go to a clinic today.",
      "Rest, drink water, and note when the symptoms started.",
      "Take your usual medicines, but don't start new ones without advice.",
    ],
    warningSigns: [
      "Chest pain, trouble breathing, fainting or confusion",
      "Symptoms getting quickly worse",
    ],
    careType: "General physician",
  },
};

const TRIAGE_PROMPT = `You are a careful triage assistant in an Indian emergency-health app. You are not a doctor.
Sort the person's symptoms into exactly one level:
- "emergency": possibly life-threatening, call 112 / 108 now
- "doctor": should see a doctor today or within 24 hours
- "home": safe to manage at home with simple care, see a doctor if it gets worse
When unsure between two levels, choose the more urgent one.
Answer ONLY with JSON:
{
  "level": "emergency" | "doctor" | "home",
  "headline": string,          // one short sentence telling them what to do
  "reason": string,            // 1-2 sentences explaining why, plain words
  "doNow": [string],           // 2-4 things to do right now
  "warningSigns": [string],    // 2-4 signs that mean they must go to hospital immediately
  "careType": string           // the kind of care, e.g. "Emergency department", "General physician", "Dermatologist"
}
Write every string in LANGUAGE. Never name prescription drugs or doses.`;

const checkSymptoms = async (req, res) => {
  try {
    const symptoms = str(req.body?.symptoms, 1000);
    if (symptoms.length < 3) return res.status(400).json({ message: "Please describe the symptoms." });
    const ageGroup = AGE_GROUPS.includes(req.body?.ageGroup) ? req.body.ageGroup : "adult";
    const redFlag = findRedFlag(symptoms);

    let result = null;
    if (gemini.isConfigured()) {
      try {
        const language = gemini.languageName(req.body?.language);
        const raw = await gemini.generateJson(TRIAGE_PROMPT.replace("LANGUAGE", language), [
          { text: `Patient: ${ageGroup}.\nSymptoms: ${symptoms}\nAnswer in ${language}.` },
        ], { perModelMs: 20000, budgetMs: 40000 });
        if (LEVELS.includes(raw.level) && str(raw.headline)) {
          result = {
            level: raw.level,
            headline: str(raw.headline, 200),
            reason: str(raw.reason, 500),
            doNow: strList(raw.doNow, 4),
            warningSigns: strList(raw.warningSigns, 4),
            careType: str(raw.careType, 80),
            aiUsed: true,
          };
        }
      } catch (err) {
        console.error("Symptom checker AI failed, using fixed rules:", err.message);
        result = null;
      }
    }

    // A red flag always wins, whatever the AI said.
    if (redFlag && result?.level !== "emergency") result = { ...FALLBACK.emergency, aiUsed: false };
    if (!result) result = { ...(redFlag ? FALLBACK.emergency : FALLBACK.doctor), aiUsed: false };

    res.json({ ...result, redFlag });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { explainReport, checkSymptoms, findRedFlag };
