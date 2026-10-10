import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { TESTIMONIALS } from "../data";
import { revealUp } from "../motion";
import { useLang } from "../../i18n/context";

function Testimonials() {
  const { t } = useLang();
  return (
    <section id="stories" className="ll-section ll-section-how">
      <div className="ll-container ll-container-6xl">
        <div className="ll-section-head">
          <p className="ll-eyebrow">{t("In their words")}</p>
          <h2 className="ll-h2">{t("Built around real moments like these.")}</h2>
        </div>

        <div className="ll-testimonials">
          {TESTIMONIALS.map(({ quote, name, role }, i) => (
            <motion.div
              key={name}
              {...revealUp((i % 3) * 0.08, { y: 16, duration: 0.4, margin: "-60px" })}
              className="ll-card ll-testimonial-card"
            >
              <span className="ll-card-orb ll-card-orb-sm" aria-hidden="true" />
              <Quote size={20} className="ll-testimonial-quote-icon" />
              <p className="ll-testimonial-quote">&ldquo;{t(quote)}&rdquo;</p>
              <div className="ll-testimonial-author">
                <span className="ll-testimonial-name">{name}</span>
                <span className="ll-testimonial-role">{t(role)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
