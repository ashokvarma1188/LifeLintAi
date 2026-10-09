import {
  HeartPulse, Wind, Droplets, Flame, HeartCrack, Brain, Activity, Worm, Bone, ThermometerSun, PersonStanding, Zap,
  FlaskConical, RotateCcw,
} from "lucide-react";

/*
 * Offline First-Aid Guide content. Bundled with the app (no API call), so it keeps
 * working when the service worker serves the app with no connection.
 * General guidance in line with standard first-aid courses (Red Cross / St John /
 * Indian emergency practice) — not a substitute for training or professional care.
 */
const FIRST_AID_GUIDES = [
  {
    id: "cpr",
    icon: HeartPulse,
    title: "CPR — not breathing",
    summary: "Unresponsive and not breathing normally (or only gasping).",
    keywords: "cardiac arrest unconscious collapse compressions chest heart stopped aed",
    steps: [
      "Make sure the area is safe. Tap their shoulders and shout to see if they respond.",
      "If there is no response and they are not breathing normally, call 112 / 108 — put the phone on speaker. Ask someone to bring an AED (defibrillator) if there is one.",
      "Kneel beside them. Put the heel of one hand in the centre of the chest, the other hand on top, arms straight.",
      "Push hard and fast: about 5–6 cm deep, 100–120 times a minute. Let the chest rise fully after each push.",
      "If you are trained and willing, give 2 rescue breaths after every 30 pushes. If not, keep doing chest pushes only — that still saves lives.",
      "Switch on the AED as soon as it arrives and follow its voice instructions. Keep going until help takes over or the person starts breathing normally.",
    ],
    dont: [
      "Don't stop pushing for more than a few seconds.",
      "Don't be afraid of hurting them — doing nothing is far worse.",
    ],
    callWhen: "Always — call 112 / 108 straight away.",
  },
  {
    id: "choking",
    icon: Wind,
    title: "Choking",
    summary: "Can't breathe, speak or cough — something is stuck in the throat.",
    keywords: "food stuck throat airway heimlich back blows",
    steps: [
      "If they can cough or speak, encourage them to keep coughing.",
      "If they can't breathe, speak or cough: stand behind them, lean them forward and give up to 5 firm back blows between the shoulder blades with the heel of your hand.",
      "If that doesn't work, give up to 5 abdominal thrusts: wrap your arms around their waist, put a fist just above the belly button, hold it with your other hand and pull sharply inwards and upwards.",
      "Keep repeating 5 back blows and 5 abdominal thrusts. Call 112 / 108 if it hasn't cleared.",
      "If they become unresponsive, lower them to the ground, call for help and start CPR.",
    ],
    dont: [
      "Don't sweep blindly inside the mouth with your fingers.",
      "Don't give abdominal thrusts to babies under 1 year or pregnant women — use back blows and chest thrusts instead.",
    ],
    callWhen: "If the blockage doesn't clear quickly, or after abdominal thrusts (they should be checked by a doctor).",
  },
  {
    id: "bleeding",
    icon: Droplets,
    title: "Severe bleeding",
    summary: "Heavy bleeding from a wound.",
    keywords: "blood cut wound injury haemorrhage hemorrhage",
    steps: [
      "Protect your hands if you can (gloves or a plastic bag).",
      "Press firmly on the wound with a clean cloth or pad and keep pressing for at least 10 minutes.",
      "If blood soaks through, put more cloth on top — don't lift off the first layer.",
      "Help them lie down and, if possible, raise the injured part.",
      "Once the bleeding slows, bandage firmly over the pad.",
      "Watch for shock — pale, cold, clammy skin and fast breathing. Keep them lying down and warm.",
    ],
    dont: [
      "Don't pull out anything stuck in the wound — press around it instead.",
      "Don't keep lifting the cloth to check.",
    ],
    callWhen: "Call 112 / 108 for heavy bleeding, or if it doesn't slow after 10 minutes of pressure.",
  },
  {
    id: "burns",
    icon: Flame,
    title: "Burns",
    summary: "Heat, hot liquid, fire or chemical burns.",
    keywords: "scald fire hot water chemical",
    steps: [
      "Cool the burn under cool running water for 20 minutes, as soon as possible.",
      "Remove rings, watches or tight clothing near the burn — unless they are stuck to the skin.",
      "Cover loosely with cling film or a clean, non-fluffy cloth.",
      "For chemical burns, brush off any powder and rinse with plenty of running water.",
      "Keep the person warm — cool the burn, not the whole person.",
    ],
    dont: [
      "Don't use ice, butter, toothpaste, oil or creams.",
      "Don't burst blisters.",
    ],
    callWhen: "Get medical help for burns bigger than their palm, on the face, hands, feet or private parts, deep burns, electrical or chemical burns, and burns on children or elderly people.",
  },
  {
    id: "heart-attack",
    icon: HeartCrack,
    title: "Heart attack",
    summary: "Chest pain or pressure, sweating, breathlessness.",
    keywords: "chest pain cardiac angina aspirin",
    steps: [
      "Signs: chest pain or pressure that may spread to the arm, jaw, neck or back; breathlessness; sweating; feeling sick or light-headed.",
      "Call 112 / 108 immediately.",
      "Help them sit down and rest in a comfortable, half-sitting position.",
      "If they are not allergic, give one regular aspirin (300 mg) to chew slowly. If they have their own heart medicine (like a GTN spray), help them use it.",
      "Stay with them. If they become unresponsive and stop breathing normally, start CPR.",
    ],
    dont: [
      "Don't let them walk around or drive themselves to hospital.",
      "Don't give aspirin to children or to anyone allergic to it.",
    ],
    callWhen: "Always — every minute counts.",
  },
  {
    id: "stroke",
    icon: Brain,
    title: "Stroke",
    summary: "Face drooping, arm weakness, slurred speech.",
    keywords: "fast paralysis face arm speech brain",
    steps: [
      "Use FAST: Face — is one side drooping? Arms — can they lift both arms? Speech — is it slurred or strange? Time — call 112 / 108 now.",
      "Note the time the symptoms started — doctors will need it.",
      "Keep them comfortable and still. If they are unresponsive but breathing, put them in the recovery position.",
    ],
    dont: [
      "Don't give food, drink or medicine — they may not be able to swallow safely.",
      "Don't wait to see if it gets better.",
    ],
    callWhen: "Always — straight away.",
  },
  {
    id: "seizure",
    icon: Activity,
    title: "Seizure (fits)",
    summary: "Sudden shaking, stiffening or loss of awareness.",
    keywords: "fit epilepsy convulsion shaking",
    steps: [
      "Stay calm and note the time it started.",
      "Move hard or sharp objects away and cushion their head.",
      "Loosen anything tight around the neck.",
      "When the shaking stops, turn them onto their side (recovery position) and stay until they are fully awake.",
    ],
    dont: [
      "Don't hold them down.",
      "Don't put anything in their mouth — not a spoon, keys or fingers.",
      "Don't give water until they are fully alert.",
    ],
    callWhen: "Call 112 / 108 if it lasts over 5 minutes, another one follows, it's their first seizure, they are injured or pregnant, or they don't wake up.",
  },
  {
    id: "snake-bite",
    icon: Worm,
    title: "Snake bite",
    summary: "Bitten by a snake — treat every bite as venomous.",
    keywords: "snakebite venom poison bite cobra krait viper",
    steps: [
      "Move away from the snake. Keep the person calm and as still as possible — movement spreads venom.",
      "Keep the bitten limb still and at or below heart level. Support it like a fracture if you can.",
      "Remove rings, watches, anklets and tight clothing near the bite before swelling starts.",
      "Get to a hospital that has anti-snake venom as fast as possible — call 108. Note the time of the bite.",
    ],
    dont: [
      "Don't cut the wound, suck out venom, apply ice or tie a tight tourniquet.",
      "Don't use herbal or traditional remedies, and don't try to catch or kill the snake.",
    ],
    callWhen: "Always — anti-snake venom only works in hospital.",
  },
  {
    id: "fracture",
    icon: Bone,
    title: "Broken bone or sprain",
    summary: "Pain, swelling or an odd shape after a fall or hit.",
    keywords: "fracture sprain broken bone fall twist",
    steps: [
      "Keep the injured part still and supported in the position you found it, using padding or a sling.",
      "If bone is showing, cover it with a clean dressing and press around — not on — the wound.",
      "Hold a cold pack wrapped in cloth on it for up to 20 minutes to ease swelling.",
      "Get medical help. For a possible neck or back injury, keep them still and call 108.",
    ],
    dont: [
      "Don't try to straighten the bone.",
      "Don't move someone with a possible neck or back injury unless they are in danger.",
    ],
    callWhen: "Call 108 for a suspected neck, back, hip or thigh injury, or if bone is showing.",
  },
  {
    id: "heatstroke",
    icon: ThermometerSun,
    title: "Heatstroke",
    summary: "Very hot body, confusion, may stop sweating.",
    keywords: "heat stroke sun hot summer dehydration exhaustion",
    steps: [
      "Signs: very high body temperature, hot red skin, headache, confusion, fast pulse, fainting.",
      "Call 112 / 108. Move them to a cool, shaded place.",
      "Cool them fast: remove extra clothing, sponge or spray with cool water and fan them. Put cold packs in the armpits, neck and groin.",
      "If they are fully awake and can swallow, give sips of cool water or ORS.",
    ],
    dont: [
      "Don't give drinks to someone who is confused or drowsy.",
    ],
    callWhen: "Always — heatstroke can be life-threatening.",
  },
  {
    id: "fainting",
    icon: PersonStanding,
    title: "Fainting",
    summary: "Brief loss of consciousness.",
    keywords: "faint collapse dizzy unconscious passed out",
    steps: [
      "Lay them on their back and raise their legs about 30 cm (on a chair or bag).",
      "Loosen tight clothing and make sure there is fresh air.",
      "They should come round within a minute or two. Help them sit up slowly.",
      "If they don't wake within a minute, check breathing: if breathing, recovery position and call 108; if not breathing normally, start CPR.",
    ],
    dont: [
      "Don't make them stand up quickly.",
    ],
    callWhen: "If they don't wake up quickly, faint again, are injured, pregnant, or have chest pain.",
  },
  {
    id: "electric-shock",
    icon: Zap,
    title: "Electric shock",
    summary: "Touched a live wire or appliance.",
    keywords: "current electrocution wire power shock",
    steps: [
      "Don't touch them until the power is off. Switch off at the mains or unplug it.",
      "If you can't, stand on something dry (wood, rubber mat, newspaper) and push the source away with a dry wooden or plastic object.",
      "Call 112 / 108. If they are not breathing normally, start CPR.",
      "Cool any burns with running water and cover them loosely.",
    ],
    dont: [
      "Don't go near high-voltage lines — stay at least 20 metres away and call 112.",
    ],
    callWhen: "Always — even if they seem fine, electricity can affect the heart.",
  },
  {
    id: "poisoning",
    icon: FlaskConical,
    title: "Poisoning",
    summary: "Swallowed, breathed in or splashed with something harmful.",
    keywords: "poison chemical tablets overdose pesticide kerosene",
    steps: [
      "Find out what they took, how much and when. Keep the container to show the doctor.",
      "Call 108, or the AIIMS Poison Control line 1800-11-6117.",
      "For chemicals on skin or in the eyes, rinse with plenty of running water for 15–20 minutes.",
      "If they are unresponsive but breathing, recovery position. If not breathing normally, start CPR.",
    ],
    dont: [
      "Don't make them vomit.",
      "Don't give milk, salt water or home remedies.",
    ],
    callWhen: "Always — get medical advice even if they seem fine.",
  },
  {
    id: "recovery-position",
    icon: RotateCcw,
    title: "Recovery position",
    summary: "For someone unresponsive but breathing normally.",
    keywords: "unconscious breathing side position airway",
    steps: [
      "Kneel beside them. Place the arm nearest you at a right angle to their body.",
      "Bring the far arm across their chest and hold the back of that hand against their near cheek.",
      "Bend their far knee up, then pull on that knee to roll them towards you onto their side.",
      "Tilt the head back gently to keep the airway open. Check their breathing until help arrives.",
    ],
    dont: [
      "Don't leave them alone — if breathing stops, start CPR.",
    ],
    callWhen: "Call 112 / 108 for anyone who is unresponsive.",
  },
];

export const EMERGENCY_LINES = [
  { label: "All emergencies", number: "112" },
  { label: "Ambulance", number: "108" },
  { label: "Fire", number: "101" },
  { label: "Poison control", number: "1800-11-6117" },
];

export default FIRST_AID_GUIDES;
