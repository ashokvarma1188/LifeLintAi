import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, X, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import FAQ_CATEGORIES from "../data/faqData";
import "./FaqAssistantWidget.css";

/**
 * Tap-to-answer help bot — no free text, no AI call. Pick a category, tap a
 * question, get the same canned answer every time. Separate from
 * AiAssistantWidget (the free-text first-aid assistant) on purpose — this
 * one is for "how do I use this app" / account / quick first-aid reference.
 */
function FaqAssistantWidget({ open, onToggle }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [question, setQuestion] = useState(null);

  const toggle = () => {
    onToggle();
    setCategory(null);
    setQuestion(null);
  };

  const goToPage = () => {
    navigate(question.path);
    toggle();
  };

  return (
    <>
      {open && (
        <div className="faq-widget-panel">
          <div className="faq-widget-header">
            <div>
              <h4>Help &amp; Quick Answers</h4>
              <p>Tap a question — no typing needed</p>
            </div>
            <button className="faq-widget-close" onClick={toggle} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="faq-widget-body">
            {!category && (
              <div className="faq-widget-list">
                {FAQ_CATEGORIES.map((c) => (
                  <button key={c.category} className="faq-widget-option" onClick={() => setCategory(c)}>
                    {c.category}
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            )}

            {category && !question && (
              <>
                <button className="faq-widget-back" onClick={() => setCategory(null)}>
                  <ChevronLeft size={14} /> All topics
                </button>
                <div className="faq-widget-list">
                  {category.questions.map((item) => (
                    <button key={item.q} className="faq-widget-option" onClick={() => setQuestion(item)}>
                      {item.q}
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {question && (
              <>
                <button className="faq-widget-back" onClick={() => setQuestion(null)}>
                  <ChevronLeft size={14} /> {category.category}
                </button>
                <div className="faq-widget-answer">
                  <div className="faq-widget-q">{question.q}</div>
                  <div className="faq-widget-a">{question.a}</div>
                  {question.path && (
                    <button className="faq-widget-goto" onClick={goToPage}>
                      {question.pathLabel || "Go there"} <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="faq-widget-disclaimer">
            First-aid answers are general guidance, not a medical diagnosis — for emergencies, use the SOS button.
          </div>
        </div>
      )}

      <button className="faq-widget-btn" onClick={toggle} aria-label="Open help">
        {open ? <X size={22} /> : <HelpCircle size={24} />}
      </button>
    </>
  );
}

export default FaqAssistantWidget;
