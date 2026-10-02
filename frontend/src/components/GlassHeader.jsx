import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import TelemetryBadge from "./TelemetryBadge.jsx";
import { GithubMark, LinkedinMark } from "../lib/icons.jsx";
import { APPLE_EASE } from "../lib/motion.js";

/**
 * The two bar header, which is the most recognizable furniture on apple.com.
 *
 * Apple stacks two navs and they behave differently, which is the detail
 * almost every clone misses.
 *
 * The GLOBAL NAV is 44 pixels of charcoal at 80 percent opacity with a real
 * backdrop blur, and it is the same on light and dark pages. It holds
 * destinations that leave the page, and it scrolls away with the content.
 * Two things make it work: backdrop blur needs a translucent background to
 * blur anything, and the links are 12 pixels, which is far smaller than most
 * people guess when they eyeball it.
 *
 * The PRODUCT NAV is 52 pixels, page colored, translucent, with a hairline
 * under it. It holds the product name on the left, the in page sections in
 * the middle, and the buy action on the right. This is the bar that sticks.
 *
 * The mapping here: destinations that leave (GitHub, LinkedIn, email) go in
 * the global nav. The page's own sections and the resume download go in the
 * product nav, because downloading the resume is this page's buy button.
 */
export default function GlassHeader({ nav, meta, telemetry, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  /*
    Active section indicator. The nav link for whatever you are currently
    reading goes solid while the rest stay muted, which is the small thing that
    makes a long single page feel navigable rather than endless.

    The root margin is what makes it feel right. Without it the observer fires
    on whatever is merely touching the viewport, which on a page of tall bands
    means two sections are "active" at once and the highlight flickers. Shrinking
    the observation box to a band across the upper middle of the screen means
    exactly one section qualifies at a time.
  */
  useEffect(() => {
    const sections = nav
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [nav]);

  const handleJump = (event, id) => {
    event.preventDefault();
    setMenuOpen(false);
    onNavigate(id);
  };

  return (
    <>
      {/* ---------------------------------------------------- global nav */}
      <div className="global-nav relative z-40">
        <nav
          className="mx-auto flex h-11 max-w-[980px] items-center justify-between gap-4 px-5"
          aria-label="Elsewhere"
        >
          <a
            href="#overview"
            onClick={(event) => handleJump(event, "overview")}
            className="text-[13px] font-semibold tracking-[-0.01em] text-white/90 transition-opacity hover:opacity-70"
          >
            {meta.initials}
          </a>

          <ul className="flex items-center gap-5 sm:gap-7">
            <li>
              <a
                href={meta.links.github}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[12px] text-white/80 transition-colors hover:text-white"
              >
                <GithubMark size={12} aria-hidden="true" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </li>
            <li>
              <a
                href={meta.links.linkedin}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[12px] text-white/80 transition-colors hover:text-white"
              >
                <LinkedinMark size={12} aria-hidden="true" />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>
            </li>
            <li className="hidden sm:block">
              <a
                href={`mailto:${meta.links.email}`}
                className="text-[12px] text-white/80 transition-colors hover:text-white"
              >
                Email
              </a>
            </li>
          </ul>

          <TelemetryBadge telemetry={telemetry} onDark compact />
        </nav>
      </div>

      {/*
        The promo strip. Apple runs a thin band under the global nav carrying
        whatever they most want you to know right now, small centered text with
        one blue link. Here it carries availability, which was previously buried
        in the hero footnote where nobody scrolling for work would read it.
      */}
      <div className="relative z-40 bg-band">
        <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-5 py-2.5 text-center text-[12px] text-muted sm:px-8">
          {meta.availability}. Open to cloud and DevSecOps roles, remote or Kansas City.
          <button
            type="button"
            onClick={() => onNavigate("contact")}
            className="chevron-link text-[12px]"
          >
            Get in touch
          </button>
        </p>
      </div>

      {/* --------------------------------------------------- product nav */}
      <header className="product-nav sticky top-0 z-50">
        <nav
          className="mx-auto flex h-[52px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"
          aria-label="Primary"
        >
          <a
            href="#overview"
            onClick={(event) => handleJump(event, "overview")}
            className="shrink-0 text-[21px] leading-none font-semibold tracking-[-0.02em] text-ink transition-opacity hover:opacity-70"
          >
            {meta.name}
          </a>

          <ul className="hidden items-center gap-7 lg:flex">
            {nav.map((item) => {
              const isActive = activeSection === item.id;

              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(event) => handleJump(event, item.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`text-[12px] transition-colors duration-300 hover:text-link ${
                      isActive ? "font-medium text-ink" : "text-ink/60"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 items-center gap-3">
            <a
              href={meta.resumePath}
              download
              className="pill px-4 py-[7px] text-[12px]"
            >
              Download resume
            </a>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="text-ink/70 transition-colors hover:text-ink lg:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: APPLE_EASE }}
              className="border-t border-rule-soft bg-page/95 backdrop-blur-2xl lg:hidden"
            >
              <ul className="mx-auto flex max-w-6xl flex-col px-5 py-1 sm:px-8">
                {nav.map((item) => (
                  <li
                    key={item.id}
                    className="border-b border-rule-soft last:border-0"
                  >
                    <a
                      href={`#${item.id}`}
                      onClick={(event) => handleJump(event, item.id)}
                      className="flex items-center justify-between py-3.5 text-[17px] font-medium tracking-tight text-ink"
                    >
                      {item.label}
                      <ChevronDown
                        size={15}
                        className="-rotate-90 text-faint"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
