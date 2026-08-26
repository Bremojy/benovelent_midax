let activeDialog = null;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

const ensureStyles = () => {
  if (document.getElementById("benevolent-modern-dialog-style")) return;
  const style = document.createElement("style");
  style.id = "benevolent-modern-dialog-style";
  style.textContent = `
    .benevolent-dialog-root{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.52);backdrop-filter:blur(8px);animation:bmDialogIn .18s ease-out}
    .benevolent-dialog-card{width:min(520px,100%);border:1px solid rgba(255,255,255,.7);border-radius:22px;background:linear-gradient(180deg,#fff,#f8fafc);box-shadow:0 30px 90px rgba(15,23,42,.24);padding:24px;color:#172033}
    .benevolent-dialog-card h3{margin:0 0 8px;font-size:1.1rem}.benevolent-dialog-card p{margin:0;color:#5b667a;line-height:1.6;white-space:pre-line}
    .benevolent-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;flex-wrap:wrap}
    .benevolent-dialog-actions button{border:0;border-radius:12px;padding:11px 16px;font-weight:800;cursor:pointer}.benevolent-dialog-cancel{background:#e9eef5;color:#253047}.benevolent-dialog-confirm{background:#ff7a00;color:#fff}.benevolent-dialog-danger{background:#dc2626;color:#fff}
    @keyframes bmDialogIn{from{opacity:0}.to{opacity:1}}
    @media (max-width:560px){.benevolent-dialog-root{padding:12px}.benevolent-dialog-card{padding:20px;border-radius:18px}.benevolent-dialog-actions{display:grid;grid-template-columns:1fr 1fr}.benevolent-dialog-actions button{width:100%}}
  `;
  document.head.appendChild(style);
};

const closeDialog = (value) => {
  const current = activeDialog;
  activeDialog = null;
  if (!current) return;
  current.cleanup();
  current.resolve(value);
};

export const confirmAction = (message, options = {}) => new Promise((resolve) => {
  if (typeof document === "undefined") return resolve(false);
  ensureStyles();
  if (activeDialog) closeDialog(false);

  const root = document.createElement("div");
  root.className = "benevolent-dialog-root";
  root.setAttribute("role", "presentation");
  root.innerHTML = `
    <div class="benevolent-dialog-card" role="dialog" aria-modal="true" aria-label="Confirmation">
      <h3>${escapeHtml(options.title || "Please confirm")}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="benevolent-dialog-actions">
        ${options.messageOnly ? "" : `<button type="button" class="benevolent-dialog-cancel">${escapeHtml(options.cancelText || "Cancel")}</button>`}
        <button type="button" class="${options.danger ? "benevolent-dialog-danger" : "benevolent-dialog-confirm"}">${escapeHtml(options.confirmText || "Confirm")}</button>
      </div>
    </div>`;

  const buttons = root.querySelectorAll("button");
  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    root.remove();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") closeDialog(false);
  };

  root.addEventListener("click", (event) => {
    if (event.target === root) closeDialog(false);
  });
  const cancelButton = root.querySelector(".benevolent-dialog-cancel");
  const confirmButton = root.querySelector(".benevolent-dialog-actions button:last-child");
  cancelButton?.addEventListener("click", () => closeDialog(false));
  confirmButton?.addEventListener("click", () => closeDialog(true));
  document.addEventListener("keydown", onKeyDown);
  document.body.appendChild(root);
  activeDialog = { resolve, cleanup };
  confirmButton?.focus();
});

export const messageDialog = (message, options = {}) => confirmAction(message, {
  title: options.title || "Benevolent MIDAX",
  confirmText: options.confirmText || "Done",
  messageOnly: true,
}).then(() => undefined);
