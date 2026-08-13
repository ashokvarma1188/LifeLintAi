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

export const STATS = [
  { value: 124583, suffix: "", label: "Lives saved" },
  { value: 89421, suffix: "", label: "Active donors" },
  { value: 2147, suffix: "", label: "Partner hospitals" },
  { value: 98, suffix: "%", label: "Match success" },
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

export const EMERGENCY_POINTS = [
  "Top 5 nearest verified donors",
  "Real-time accept / reject tracking",
  "Live ETA and route to hospital",
  "Panic Mode for mass alerts",
];

export const DONORS = [
  { name: "Ashok varma", group: "O−", distance: "1.2 km", eta: "4 min", status: "accepted" },
  { name: "R. Mehta", group: "O−", distance: "2.4 km", eta: "7 min", status: "pending" },
  { name: "K. Iyer", group: "O−", distance: "3.1 km", eta: "9 min", status: "pending" },
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
