import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** Focus the current page without changing the HashRouter URL. */
export function focusMainContent() {
  const main = document.getElementById("main-content");
  if (!main) return;
  main.focus({ preventScroll: true });
  const headerHeight = document.querySelector(".app-header")?.getBoundingClientRect().height ?? 64;
  window.scrollTo({ top: Math.max(0, main.getBoundingClientRect().top + window.scrollY - headerHeight), behavior: "instant" });
}

/** Page navigation owns document scroll; query tabs and the MSA viewport own theirs. */
export function RouteNavigation() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef({ key: location.key, pathname: location.pathname });
  const lastPosition = useRef(0);
  const positions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const remember = () => { lastPosition.current = window.scrollY; };
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, []);

  useLayoutEffect(() => {
    const from = previous.current;
    if (from.key === location.key) return;
    positions.current.set(from.key, lastPosition.current);
    // A bounded memory-only map never stores input data or credentials.
    if (positions.current.size > 100) positions.current.delete(positions.current.keys().next().value!);
    previous.current = { key: location.key, pathname: location.pathname };
    if (from.pathname === location.pathname) return;

    const top = navigationType === "POP" ? positions.current.get(location.key) ?? 0 : 0;
    const main = document.getElementById("main-content");
    const params = new URLSearchParams(location.search);
    if (location.pathname === "/docs" && (params.has("section") || params.has("article"))) {
      main?.focus({ preventScroll: true });
      return;
    }
    const apply = () => {
      window.scrollTo({ top, behavior: "instant" });
      lastPosition.current = window.scrollY;
      main?.focus({ preventScroll: true });
    };
    apply();
    if (!main) return;

    // Lazy routes may first render a short loading state. Restore once their
    // own heading exists, without interfering with in-page article navigation.
    const ready = () => Array.from(main.querySelectorAll("h1"))
      .some(heading => !heading.closest("[data-route-loading]"));
    if (ready()) return;
    const observer = new MutationObserver(() => {
      if (!ready()) return;
      apply();
      observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });
    const stopWaiting = () => observer.disconnect();
    window.addEventListener("wheel", stopWaiting, { passive: true, once: true });
    window.addEventListener("touchstart", stopWaiting, { passive: true, once: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("wheel", stopWaiting);
      window.removeEventListener("touchstart", stopWaiting);
    };
  }, [location.key, location.pathname, location.search, navigationType]);

  return null;
}
