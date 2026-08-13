import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BloodDrop from "./BloodDrop";
import { NAV_LINKS } from "../data";
import useActiveSection from "../hooks/useActiveSection";

const SECTION_IDS = NAV_LINKS.map((l) => l.href.slice(1));

/**
 * Fixed pill navbar. Two behaviours are lifted from the reference:
 *  - the bar swaps background/border/shadow once the page has scrolled past 8px
 *  - a capsule slides between nav items, following hover and falling back to
 *    whichever section is currently in view
 */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [capsule, setCapsule] = useState(null);

  const itemRefs = useRef([]);
  const activeIndex = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Measure the target pill so the capsule can animate left/width toward it.
  const measure = useCallback(() => {
    const index = hovered !== null ? hovered : activeIndex;
    const el = index >= 0 ? itemRefs.current[index] : null;
    if (!el) {
      setCapsule(null);
      return;
    }
    const parent = el.parentElement.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setCapsule({ left: rect.left - parent.left, width: rect.width });
  }, [hovered, activeIndex]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const handleNavClick = (event, href) => {
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    setMobileOpen(false);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <header className="ll-nav-wrap">
      <div className="ll-nav-inner">
        <nav
          className="ll-nav"
          style={{
            background: scrolled ? "var(--ll-nav-bg-scrolled)" : "var(--ll-nav-bg-default)",
            border: `1px solid ${scrolled ? "var(--ll-nav-border-scrolled)" : "var(--ll-nav-border-default)"}`,
            boxShadow: scrolled ? "var(--ll-nav-shadow-scrolled)" : "none",
          }}
        >
          <a href="#top" className="ll-logo" onClick={(e) => handleNavClick(e, "#top")}>
            <span className="ll-logo-mark">
              <BloodDrop size={20} />
              <span className="ll-logo-glow" />
            </span>
            <span className="ll-logo-text">
              Life<span className="ll-text-gradient-success">Link</span>
            </span>
          </a>

          <div className="ll-nav-links" onMouseLeave={() => setHovered(null)}>
            {capsule && (
              <span
                aria-hidden="true"
                className="ll-nav-capsule"
                style={{ left: capsule.left, width: capsule.width }}
              />
            )}
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onMouseEnter={() => setHovered(i)}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`ll-nav-link${i === activeIndex ? " is-active" : ""}`}
                aria-current={i === activeIndex ? "true" : undefined}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="ll-nav-actions">
            <Link to="/login" className="ll-nav-signin">
              Sign in
            </Link>
            <Link to="/signup" className="ll-nav-cta">
              Get started
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="ll-nav-burger"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="ll-nav-mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="ll-nav-mobile-link"
              >
                {link.label}
              </a>
            ))}
            <Link to="/signup" onClick={() => setMobileOpen(false)} className="ll-nav-mobile-cta">
              Sign in / Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
