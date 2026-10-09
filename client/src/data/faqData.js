/**
 * Fixed question/answer pairs for the tap-to-answer Help bot — no free text,
 * no AI call, just instant canned answers. Keep answers short (this renders
 * in a small chat bubble) and grounded in features that actually exist.
 */
const FAQ_CATEGORIES = [
  {
    category: "Using LifeLink",
    questions: [
      {
        q: "How do I send an SOS alert?",
        a: "On your Dashboard, choose who to alert (Hospital / Police / Fire Station), pick what's happening, then press the big SOS button. Your live location is sent instantly to whoever you chose.",
        path: "/dashboard",
        pathLabel: "Go to Dashboard",
      },
      {
        q: "How do I find a nearby hospital?",
        a: "Open \"Find Hospitals\" from your Dashboard. It shows real bed, ICU and ambulance availability, nearest first, based on your current location.",
        path: "/find-hospitals",
        pathLabel: "Go to Find Hospitals",
      },
      {
        q: "How do I donate or request blood?",
        a: "Open \"Blood Donation\". You can mark yourself as an available donor, post a request for blood (matched to compatible donors nearby), or respond to someone else's request.",
        path: "/blood-donation",
        pathLabel: "Go to Blood Donation",
      },
      {
        q: "How do I find a pharmacy or request medicine?",
        a: "Open \"Find Pharmacies\". Search by medicine name or browse nearby pharmacies, then tap \"Request\" to ask them directly.",
        path: "/find-pharmacies",
        pathLabel: "Go to Find Pharmacies",
      },
      {
        q: "How do I view my medical records?",
        a: "Open \"Health Records\" to see and add your own reports, or \"Medical ID\" for a quick emergency-ready summary (blood group, allergies, conditions).",
        path: "/health-records",
        pathLabel: "Go to Health Records",
      },
      {
        q: "How do I raise a support ticket?",
        a: "Open \"Support\" from your Dashboard, tap \"New ticket\", describe the issue, and submit. The admin team will reply in the same thread.",
        path: "/support",
        pathLabel: "Go to Support",
      },
      {
        q: "Where do I find emergency phone numbers?",
        a: "Open \"Emergency Numbers\" on your Dashboard for a quick-dial list — Police, Ambulance, Fire and more — each one calls directly when tapped.",
        path: "/emergency-numbers",
        pathLabel: "Go to Emergency Numbers",
      },
    ],
  },
  {
    category: "Account & roles",
    questions: [
      {
        q: "How do I register as a hospital, police, fire station or pharmacy?",
        a: "Go to \"Role & Account\" on your Dashboard, request the organisation role you need, and upload your verification document. An admin reviews and approves it.",
        path: "/settings/role",
        pathLabel: "Go to Role & Account",
      },
      {
        q: "Why is my organisation account still pending?",
        a: "Organisation accounts (Hospital/Police/Fire Station/Pharmacy) need admin approval before they can be used. You'll get full access as soon as it's approved — check \"Role & Account\" for the latest status.",
        path: "/settings/role",
        pathLabel: "Go to Role & Account",
      },
      {
        q: "How do I reset my password?",
        a: "On the login page, tap \"Forgot password?\" and follow the emailed link to set a new one.",
        path: "/forgot-password",
        pathLabel: "Go to Forgot Password",
      },
      {
        q: "How do I verify my email?",
        a: "If you see a \"Please verify your email\" banner on your Dashboard, tap \"Resend verification email\" and follow the link sent to your inbox.",
        path: "/dashboard",
        pathLabel: "Go to Dashboard",
      },
      {
        q: "Can I switch between roles?",
        a: "Yes — \"Role & Account\" lets you request a different role at any time. Organisation roles still need admin approval before they become active.",
        path: "/settings/role",
        pathLabel: "Go to Role & Account",
      },
    ],
  },
  {
    category: "Basic first aid",
    questions: [
      {
        q: "What do I do for a burn?",
        a: "Cool the burn under cool running water for 20 minutes. Don't apply ice, butter or ointments. Cover loosely with a clean, non-stick cloth. Seek medical help for large, deep, or blistering burns.",
        path: "/first-aid",
        pathLabel: "Open First-Aid Guide",
      },
      {
        q: "What do I do for choking?",
        a: "Encourage them to cough. If they can't breathe, talk, or cough, give 5 back blows between the shoulder blades, then 5 abdominal thrusts (Heimlich). Repeat until it clears or help arrives — call for emergency help right away.",
        path: "/first-aid",
        pathLabel: "Open First-Aid Guide",
      },
      {
        q: "What are the steps for CPR?",
        a: "Check responsiveness and breathing. Call for emergency help. Push hard and fast in the center of the chest (about 100–120 compressions/minute), 2 inches deep, letting the chest fully recoil. Continue until help arrives or they respond.",
        path: "/first-aid",
        pathLabel: "Open First-Aid Guide",
      },
      {
        q: "What do I do for heavy bleeding?",
        a: "Apply firm, direct pressure with a clean cloth and don't remove it even if it soaks through — add more layers on top. Raise the injured area above heart level if possible. Get emergency help immediately for severe bleeding.",
        path: "/first-aid",
        pathLabel: "Open First-Aid Guide",
      },
      {
        q: "What do I do for a snake bite?",
        a: "Keep the person calm and still, keep the bitten limb below heart level, remove tight clothing/jewellery near the bite, and get to a hospital immediately. Do not cut the wound, apply ice, or try to suck out venom.",
        path: "/first-aid",
        pathLabel: "Open First-Aid Guide",
      },
    ],
  },
];

export default FAQ_CATEGORIES;
