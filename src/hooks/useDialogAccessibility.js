import { useEffect } from "react";

const focusableSelector = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable=\"true\"]",
  "[tabindex]:not([tabindex=\"-1\"])"
].join(",");

export default function useDialogAccessibility() {
  useEffect(() => {
    let restoreTarget = null;
    let hadDialog = false;
    const getDialogs = () => Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]'));
    const focusInitial = (dialog) => {
      const target = dialog.querySelector("[data-dialog-autofocus], button[aria-label], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])");
      if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
    };
    const onKeyDown = (event) => {
      const dialogs = getDialogs();
      const dialog = dialogs[dialogs.length - 1];
      if (!dialog || event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll(focusableSelector)).filter((node) => node.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus?.({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const sync = () => {
      const dialogs = getDialogs();
      const hasDialog = dialogs.length > 0;
      if (hasDialog && !hadDialog) {
        restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        requestAnimationFrame(() => focusInitial(dialogs[dialogs.length - 1]));
      } else if (!hasDialog && hadDialog && restoreTarget?.isConnected) {
        requestAnimationFrame(() => restoreTarget.focus({ preventScroll: true }));
        restoreTarget = null;
      }
      hadDialog = hasDialog;
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", onKeyDown, true);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);
}
