import {
  UserPlus,
  Radar,
  HeartHandshake,
  Award,
  Trophy,
  ShieldCheck,
  BellRing,
  MapPin,
  Sparkles,
  User,
  Hospital,
  Shield,
  Flame,
  Pill,
  Lock,
  BadgeCheck,
  Siren,
  Droplet,
  CloudLightning,
} from "lucide-react";

export const NAV_LINKS = [
  { href: "#top", label: "Home" },
  { href: "#how", label: "How it works" },
  { href: "#impact", label: "Impact" },
  { href: "#benefits", label: "Benefits" },
  { href: "#emergency", label: "Emergency" },
];

export const STEPS = [
  {
    icon: UserPlus,
    title: "Register & verify",
    desc: "Sign up as a donor with secure OTP verification. Your data stays masked until you consent.",
  },
  {
    icon: Radar,
    title: "Smart matching",
    desc: "Our engine matches blood group, location, and availability — surfacing the 5 nearest donors instantly.",
  },
  {
    icon: HeartHandshake,
    title: "Save a life",
    desc: "Hospitals send live requests. Accept, navigate, and donate — every second tracked end-to-end.",
  },
];


export const BENEFITS = [
  {
    icon: Award,
    title: "Digital certificates",
    desc: "Verifiable QR-coded certificates after every successful donation.",
  },
  {
    icon: Trophy,
    title: "Donor levels",
    desc: "Climb from Bronze to Gold. Unlock perks with partner hospitals.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    desc: "Your identity stays masked. Consent required before any disclosure.",
  },
  {
    icon: BellRing,
    title: "Smart alerts",
    desc: "Only get pinged when you actually match — no spam, no noise.",
  },
  {
    icon: MapPin,
    title: "Live navigation",
    desc: "Real-time ETA and route guidance straight to the hospital.",
  },
  {
    icon: Sparkles,
    title: "Reward points",
    desc: "Earn points redeemable for health checkups and partner offers.",
  },
];

/** One card per role the platform actually supports — every one of these is a real, working account type, not a mockup. */
export const ROLES = [
  {
    icon: User,
    title: "Civilian",
    desc: "Press SOS in an emergency, find nearby hospitals and pharmacies, donate or request blood.",
  },
  {
    icon: Hospital,
    title: "Hospital",
    desc: "Keep bed and ambulance availability live, treat incoming patients, respond to blood requests.",
  },
  {
    icon: Shield,
    title: "Police",
    desc: "Get live SOS alerts in your coverage area with real-time location and ETA tracking.",
  },
  {
    icon: Flame,
    title: "Fire Station",
    desc: "Dispatch your fleet and respond to fire and rescue calls the moment they come in.",
  },
  {
    icon: Pill,
    title: "Pharmacy",
    desc: "Publish your stock and hours, and fulfil medicine requests from people nearby.",
  },
];

export const TRUST_BADGES = [
  { icon: BadgeCheck, label: "Organisations verified by an admin before going live" },
  { icon: Lock, label: "Your data stays private until you choose to share it" },
  { icon: Siren, label: "SOS location is only ever seen by who you alert" },
];

// Real situations LifeLink is built for, and what the app actually does in each one.
export const SITUATIONS = [
  {
    icon: Siren,
    tone: "red",
    title: "A road accident at night",
    steps: [
      "Press SOS, say \"help\" or shake the phone",
      "The nearest hospital and police get your live location",
      "Family get a tracking link and watch help arrive by road",
    ],
  },
  {
    icon: Droplet,
    tone: "green",
    title: "Blood needed urgently",
    steps: [
      "Filter hospitals that have the blood group in stock",
      "Compatible donors nearby are matched and notified",
      "Hospitals post donation camps to refill their stock",
    ],
  },
  {
    icon: CloudLightning,
    tone: "gold",
    title: "A cyclone warning",
    steps: [
      "The admin marks the affected area on a map",
      "Everyone there is asked \"Are you safe?\"",
      "\"I need help\" sends an SOS to police and fire services",
    ],
  },
];

/** The "what's happening" steps shown in the landing page's interactive SOS demo. */
export const SOS_DEMO_STEPS = [
  { label: "SOS pressed", detail: "Live location captured instantly." },
  { label: "Nearest match found", detail: "Closest hospital, police & fire station identified." },
  { label: "Alert sent", detail: "Responders notified with your location and medical ID." },
  { label: "Help is on the way", detail: "Track status and ETA in real time." },
];

export const EMERGENCY_POINTS = [
  "Top 5 nearest verified donors",
  "Real-time accept / reject tracking",
  "Live ETA and route to hospital",
  "Panic Mode for mass alerts",
];

export const DONORS = [
  { name: "Ashok varma", group: "O−", distance: "1.2 km", eta: "4 min", status: "accepted" },
  { name: "Charan", group: "O−", distance: "2.4 km", eta: "7 min", status: "pending" },
  { name: "Siraj", group: "O−", distance: "3.1 km", eta: "9 min", status: "pending" },
];

/* Hero blood drops — fixed positions/timings so the fall pattern is stable
   across renders, matching the reference exactly. */
export const HERO_DROPS = [
  { left: "8%", delay: "0s", duration: "3.4s", size: 14 },
  { left: "18%", delay: "1.2s", duration: "4.1s", size: 10 },
  { left: "32%", delay: "2.5s", duration: "3.8s", size: 16 },
  { left: "47%", delay: "0.6s", duration: "4.5s", size: 12 },
  { left: "61%", delay: "3.1s", duration: "3.6s", size: 14 },
  { left: "74%", delay: "1.8s", duration: "4.2s", size: 11 },
  { left: "88%", delay: "2.2s", duration: "3.9s", size: 15 },
];

export const PARTICLE_SYMBOLS = ["✚", "♥", "💧", "⬡", "◉", "✦"];
