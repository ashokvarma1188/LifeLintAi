import { useState } from "react";
import { ChevronDown } from "lucide-react";
import PublicLayout from "../PublicLayout";

const FAQS = [
  {
    q: "What is LifeLink AI?",
    a: "LifeLink AI is an emergency-response platform that connects civilians to nearby hospitals, police, fire stations, and pharmacies. Press SOS and the nearest available hospital is alerted with your live location.",
  },
  {
    q: "Is LifeLink AI a replacement for calling emergency services?",
    a: "No. Always call your local emergency number first in a life-threatening situation. LifeLink AI coordinates a faster, informed response alongside that call — it doesn't replace it.",
  },
  {
    q: "How does the SOS button work?",
    a: "When you press SOS, your live location is sent to the nearest registered hospital along with your alert type. Hospital staff can then Accept and later Resolve the request from their dashboard.",
  },
  {
    q: "How do I become a blood donor?",
    a: "Set your blood group in My Profile, then go to Blood Donation and toggle \"I'm available to donate.\" Other users can then find and contact you by blood group.",
  },
  {
    q: "How do hospitals, police, fire stations, and pharmacies get verified?",
    a: "When an organisation signs up, its account stays in a pending state until a LifeLink admin reviews and approves it. Only approved accounts can access their dashboard's features.",
  },
  {
    q: "Who can see my health records?",
    a: "You can always see your own records. A hospital account can look up your file by your registered phone number — this is intended for real treatment situations, not general browsing.",
  },
  {
    q: "What does the AI First-Aid Assistant do?",
    a: "It's a chat assistant (available from the bottom-right corner once you're signed in) that gives brief first-aid and general over-the-counter medication guidance. It always tells you to call emergency services first for anything serious, and it's not a substitute for a doctor.",
  },
  {
    q: "Is my data sold to advertisers?",
    a: "No. We don't run ads, sell data, or use tracking cookies. See our Privacy Policy for the full details.",
  },
  {
    q: "I run a hospital / pharmacy / police station / fire station — how do I join?",
    a: "Sign up and choose your organisation type on the signup form, then wait for admin approval. See our For Organizations page for more detail.",
  },
];

function FaqItem({ item, open, onToggle }) {
  return (
    <div className={`pp-faq-item${open ? " is-open" : ""}`}>
      <button type="button" className="pp-faq-question" onClick={onToggle} aria-expanded={open}>
        {item.q}
        <ChevronDown size={16} />
      </button>
      {open && <div className="pp-faq-answer">{item.a}</div>}
    </div>
  );
}

function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <PublicLayout>
      <div className="pp-container">
        <p className="pp-eyebrow">Support</p>
        <h1 className="pp-title">Frequently asked questions</h1>
        <p className="pp-subtitle">Everything you need to know about using LifeLink AI.</p>

        <div>
          {FAQS.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export default Faq;
