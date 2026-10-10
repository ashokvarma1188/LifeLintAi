/*
 * The first-aid course's final quiz. The answers stay on the server so marking can't be
 * changed in the browser. The text matches the website's First-Aid Guide, and the
 * website translates it (English is the key).
 */
const QUESTIONS = [
  {
    lesson: "cpr",
    question: "Someone collapses and isn't breathing normally. What should you do first?",
    options: ["Give them some water", "Call 112 / 108 and start chest compressions", "Wait a few minutes to see if they wake up", "Lift their legs and leave them to rest"],
    answer: 1,
    explanation: "Call for help straight away and start pushing on the chest — every minute without CPR lowers the chance of survival.",
  },
  {
    lesson: "cpr",
    question: "How fast should you push on the chest during CPR?",
    options: ["30–40 times a minute", "60–80 times a minute", "100–120 times a minute", "As fast as possible, over 200 a minute"],
    answer: 2,
    explanation: "Push hard and fast: about 5–6 cm deep, 100–120 times a minute, letting the chest rise fully each time.",
  },
  {
    lesson: "choking",
    question: "An adult is choking and can't speak or cough. What do you do first?",
    options: ["Give them water to drink", "Give up to 5 firm back blows between the shoulder blades", "Sweep inside their mouth with your fingers", "Make them lie down flat"],
    answer: 1,
    explanation: "Lean them forward and give up to 5 back blows, then up to 5 abdominal thrusts if it hasn't cleared.",
  },
  {
    lesson: "bleeding",
    question: "A wound is bleeding heavily. What is the best first step?",
    options: ["Wash it under the tap and leave it open", "Press firmly on it with a clean cloth for at least 10 minutes", "Pull out anything stuck in it", "Keep lifting the cloth to check it"],
    answer: 1,
    explanation: "Firm, steady pressure for at least 10 minutes is what stops bleeding.",
  },
  {
    lesson: "bleeding",
    question: "Blood soaks through the cloth you are pressing with. What now?",
    options: ["Remove it and start again with a fresh cloth", "Put more cloth on top and keep pressing", "Stop pressing and let it drain", "Pour antiseptic on the wound"],
    answer: 1,
    explanation: "Don't lift the first layer — add more cloth on top and keep pressing.",
  },
  {
    lesson: "burns",
    question: "How should you cool a burn?",
    options: ["Hold ice on it for 5 minutes", "Put butter or toothpaste on it", "Cool it under running water for 20 minutes", "Leave it alone — cooling makes it worse"],
    answer: 2,
    explanation: "Cool running water for 20 minutes. Never use ice, butter, toothpaste or oil.",
  },
  {
    lesson: "stroke",
    question: "In \"FAST\" for spotting a stroke, what does the T stand for?",
    options: ["Temperature — check for a fever", "Time — call 112 / 108 now", "Tablets — give them aspirin", "Talk — keep them talking for an hour"],
    answer: 1,
    explanation: "Face, Arms, Speech, Time: if you see any sign, call 112 / 108 straight away and note when it started.",
  },
  {
    lesson: "heart-attack",
    question: "Which of these is a common sign of a heart attack?",
    options: ["Itchy skin", "Chest pain spreading to the arm or jaw, with sweating", "Sneezing", "A sore throat"],
    answer: 1,
    explanation: "Chest pain or pressure that spreads to the arm, jaw, neck or back, with sweating or breathlessness — call 112 / 108.",
  },
  {
    lesson: "seizure",
    question: "Someone is having a seizure. What should you NOT do?",
    options: ["Cushion their head", "Note the time it started", "Put something in their mouth", "Move sharp objects away"],
    answer: 2,
    explanation: "Never put anything in their mouth or hold them down. Protect their head and time the seizure.",
  },
  {
    lesson: "snake-bite",
    question: "Someone has been bitten by a snake. What should you do?",
    options: ["Cut the wound and suck out the venom", "Tie a tight band above the bite", "Keep them still and get them to a hospital with anti-snake venom", "Try a herbal remedy first"],
    answer: 2,
    explanation: "Keep the person and the limb still and get to hospital fast — anti-snake venom only works there.",
  },
];

const PASS_MARK = 8;

module.exports = { QUESTIONS, PASS_MARK };
