import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";

import resumeData from "./data/resumeData.json";
import { feed, findPost } from "./lib/posts.js";
import { useVisitorCount } from "./hooks/useVisitorCount.js";

import GlassHeader from "./components/GlassHeader.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";
import HeroStage from "./components/HeroStage.jsx";
import HighlightRail from "./components/HighlightRail.jsx";
import FeatureBand from "./components/FeatureBand.jsx";
import ProLineup from "./components/ProLineup.jsx";
import TechSpecs from "./components/TechSpecs.jsx";
import ExperienceRail from "./components/ExperienceRail.jsx";
import CredentialWall from "./components/CredentialWall.jsx";
import Newsroom from "./components/Newsroom.jsx";
import ArticleReader from "./components/ArticleReader.jsx";
import ContactBand from "./components/ContactBand.jsx";
import SiteFooter from "./components/SiteFooter.jsx";

/**
 * Routing is hash based on purpose.
 *
 * A router library would add a dependency and, more importantly, real paths
 * would need CloudFront to rewrite every unknown path to index.html. That
 * rewrite is configured in the Terraform, so deep links do work, but a hash
 * route also survives an S3 bucket with no rewrite at all. For a two view
 * site, thirty lines here beats a router and its edge cases.
 */
const ARTICLE_PATTERN = /^#\/article\/([\w.-]+)$/;

function parseRoute(hash) {
  const match = hash.match(ARTICLE_PATTERN);

  if (match) {
    const post = findPost(match[1]);
    if (post) {
      return { name: "article", post };
    }
  }

  return { name: "home" };
}

export default function App() {
  const { meta, nav, hero, highlights, projects, specs, experience, credentials, contact } =
    resumeData;

  // Called exactly once for the whole page. Both telemetry badges read from
  // this single result, so a first visit increments the counter one time.
  const telemetry = useVisitorCount();

  // The flagship is promoted out of the bento and given a band of its own,
  // which is how Apple structures a product page: hero, feature story, then
  // a grid for the rest.
  const featured = projects.find((project) => project.feature) ?? null;
  const rest = projects.filter((project) => !project.feature);

  const [route, setRoute] = useState(() => parseRoute(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const scrollToSection = useCallback((id) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const navigate = useCallback(
    (id) => {
      if (route.name === "article") {
        window.history.pushState(null, "", window.location.pathname);
        setRoute({ name: "home" });
        // Wait for the home view to mount before measuring the target.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => scrollToSection(id));
        });
        return;
      }

      scrollToSection(id);
    },
    [route.name, scrollToSection],
  );

  const openArticle = useCallback((slug) => {
    window.location.hash = `#/article/${slug}`;
  }, []);

  const closeArticle = useCallback(() => {
    window.history.pushState(null, "", window.location.pathname);
    setRoute({ name: "home" });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToSection("newsroom"));
    });
  }, [scrollToSection]);

  return (
    /*
      MotionConfig with reducedMotion="user" is the only reliable way to honor
      the operating system setting here. The prefers-reduced-motion block in
      index.css stops CSS transitions and keyframes, but Motion animates by
      writing inline styles frame by frame in JavaScript, which no media query
      can reach. This one wrapper makes every animation in the tree respect
      the setting instead of each component having to remember.
    */
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-page">
        <a
          href="#overview"
          className="sr-only focus:not-sr-only focus:fixed focus:top-16 focus:left-5 focus:z-60 focus:rounded-full focus:bg-link focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>

        <GlassHeader
          nav={nav}
          meta={meta}
          telemetry={telemetry}
          onNavigate={navigate}
        />
        <ScrollProgress />

        <AnimatePresence mode="wait">
          {route.name === "article" ? (
            <ArticleReader
              key={route.post.slug}
              post={route.post}
              onBack={closeArticle}
            />
          ) : (
            <main key="home">
              <HeroStage hero={hero} meta={meta} onNavigate={navigate} />
              <HighlightRail highlights={highlights} />
              <FeatureBand project={featured} />
              <ProLineup projects={rest} />
              <TechSpecs specs={specs} />
              <ExperienceRail experience={experience} />
              <CredentialWall credentials={credentials} />
              <Newsroom posts={feed} onOpenArticle={openArticle} />
              <ContactBand contact={contact} meta={meta} />
            </main>
          )}
        </AnimatePresence>

        <SiteFooter
          meta={meta}
          nav={nav}
          telemetry={telemetry}
          onNavigate={navigate}
        />
      </div>
    </MotionConfig>
  );
}
