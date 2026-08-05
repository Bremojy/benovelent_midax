function escapeHtml(input) {
  return String(input || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}


export function buildPrintHeadHtml({
  title = "Benevolent Midax Report",
  subtitle = "",
  bodyClass = "",
} = {}) {
  return `
    <div class="print-shell ${bodyClass}">
      <header class="print-header">
        <div class="print-header-left">
          <div class="print-logo">BM</div>
          <div>
            <p class="print-eyebrow">Benevolent Fund Scheme</p>
            <h1>Benevolent Midax</h1>
            <p class="print-subtitle">${escapeHtml(subtitle || "Standing together in trust, accountability and support.")}</p>
          </div>
        </div>
        <div class="print-header-right">
          <p><strong>Midax Petroleum Marketing</strong></p>
          <p>P.O. Box 7432 - 00300 Nairobi</p>
          <p>Website: www.midax.co.ke</p>
          <p>Email: marketing@midax.co.ke / info@midax.co.ke</p>
          <p>Services: Fuels • Lubricants • LPG Gas • Service • Carwash</p>
        </div>
      </header>
      <section class="print-title-block">
        <h2>${escapeHtml(title)}</h2>
      </section>
    </div>
  `;
}

export function printHeadStyles() {
  return `
    <style>
      @page { size: A4; margin: 16mm; }
      body { font-family: Arial, sans-serif; color: #1f2328; }
      .print-shell { width: 100%; }
      .print-header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 3px solid #ff7a00; padding-bottom: 18px; margin-bottom: 18px; }
      .print-header-left { display: flex; gap: 14px; align-items: flex-start; }
      .print-logo { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #ff7a00, #ffb45c); color: white; display: grid; place-items: center; font-weight: 800; font-size: 1.1rem; flex: none; }
      .print-eyebrow { margin: 0 0 4px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #7a5a2f; }
      .print-header h1 { margin: 0; font-size: 24px; }
      .print-subtitle { margin: 6px 0 0; max-width: 420px; color: #555; line-height: 1.5; }
      .print-header-right { text-align: right; font-size: 12px; line-height: 1.5; color: #444; }
      .print-header-right p { margin: 0; }
      .print-title-block h2 { margin: 0 0 12px; font-size: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px; border-bottom: 1px solid #e4e7eb; text-align: left; vertical-align: top; }
      th { text-transform: uppercase; font-size: 11px; letter-spacing: .06em; color: #667085; }
      .print-note { margin: 0 0 14px; color: #5b6572; }
      .bar { height: 10px; border-radius: 999px; background: #ff7a0018; overflow: hidden; }
      .bar > div { height: 100%; background: #ff7a00; }
    </style>
  `;
}
