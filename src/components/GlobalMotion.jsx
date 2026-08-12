import { useEffect } from "react";

const SELECTORS = [
  ".modern-section", ".section", ".modern-card", ".news-card", ".leader-card", ".gallery-card",
  ".portal-card", ".portal-panel", ".portal-module", ".profile-panel", ".profile-card",
  ".support-form-card", ".support-history-card", ".claim-card", ".contribution-card",
  ".notification-card", ".admin-stat-card", ".admin-overview-card", ".admin-quick-action",
  ".superadmin-stat-card", ".superadmin-panel", ".superadmin-system-card", ".poll-card",
  ".public-poll-card", ".constitution-card", ".quick-card", ".quick-link-card", ".settings-panel",
  ".settings-card", ".contact-card", ".contact-form-card", ".login-card-shell", ".chat-section-block",
  ".feed-card", ".member-card",
];
const SELECTOR = SELECTORS.join(",");

function animateValue(element) {
  if (element.dataset.counterReady === "true") return;
  const text = element.textContent?.trim() || "";
  if (!/\d/.test(text) || text.length > 30) return;
  const match = text.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!match) return;
  const target = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(target) || target <= 0 || target > 100000000) return;
  const prefix = text.slice(0, match.index);
  const suffix = text.slice((match.index || 0) + match[1].length);
  element.dataset.counterReady = "true";
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / 720);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target % 1
      ? (target * eased).toFixed(1)
      : Math.round(target * eased).toLocaleString("en-US");
    element.textContent = `${prefix}${value}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export default function GlobalMotion() {
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced || !("IntersectionObserver" in window)) return undefined;

    const seen = new WeakSet();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (!seen.has(el)) {
          seen.add(el);
          el.classList.add("motion-revealed");
          if (el.matches(".admin-stat-card, .superadmin-stat-card, .member-stat-card")) {
            el.querySelectorAll(".stat-value, strong").forEach(animateValue);
          }
        }
        observer.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (!el.classList.contains("motion-revealed")) observer.observe(el);
      });
      document.querySelectorAll(".stat-value, .member-stat-card strong, .superadmin-stat-card strong")
        .forEach((el) => { if (el.closest(".motion-revealed")) animateValue(el); });
    };

    scan();
    const mutation = new MutationObserver(scan);
    mutation.observe(document.body, { childList: true, subtree: true });

    const supportsPointer = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
    const onPointerMove = (event) => {
      if (!supportsPointer) return;
      const card = event.target?.closest?.(
        ".modern-card, .news-card, .leader-card, .gallery-card, .portal-card, .admin-stat-card, .superadmin-stat-card"
      );
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
    };
    document.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
      document.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return null;
}
