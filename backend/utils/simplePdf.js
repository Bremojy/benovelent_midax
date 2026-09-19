const escapePdf = (value) => String(value ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)")
  .replace(/[^\x20-\x7E]/g, " ");

const wrap = (value, max = 70) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [""];
  const words = text.split(" ");
  const out = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > max && line) {
      out.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) out.push(line);
  return out;
};

function makePage({ title, subtitle, lines, pageNumber }) {
  const width = 595;
  const height = 842;
  let y = 800;
  const commands = ["BT", "/F1 18 Tf", "48 800 Td", `(${escapePdf(title)}) Tj`, "0 -24 Td", "/F1 9 Tf", `(${escapePdf(subtitle)}) Tj`, "0 -18 Td", "/F1 8 Tf"];
  for (const raw of lines) {
    const pieces = wrap(raw, 115);
    for (const piece of pieces) {
      if (y < 48) break;
      commands.push(`(${escapePdf(piece)}) Tj`, "0 -12 Td");
      y -= 12;
    }
    if (y < 48) break;
  }
  commands.push("ET", "BT", "/F1 7 Tf", `270 24 Td`, `(${pageNumber}) Tj`, "ET");
  return commands.join("\n");
}

function buildPdf({ title, subtitle = "", lines = [] } = {}) {
  const pageCapacity = 55;
  const pages = [];
  for (let i = 0; i < lines.length || i === 0; i += pageCapacity) {
    pages.push(lines.slice(i, i + pageCapacity));
  }
  const objects = [];
  const add = (content) => { objects.push(content); return objects.length; };
  const catalog = add("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesObj = add("<< /Type /Pages /Kids [] /Count 0 >>");
  const fontObj = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageRefs = [];
  const contentRefs = [];
  for (let i = 0; i < pages.length; i += 1) {
    const content = makePage({ title, subtitle, lines: pages[i], pageNumber: i + 1 });
    const contentRef = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    contentRefs.push(contentRef);
    const pageRef = add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentRef} 0 R >>`);
    pageRefs.push(pageRef);
  }
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [0];
  let offset = chunks[0].length;
  objects.forEach((obj, index) => {
    offsets[index + 1] = offset;
    const chunk = Buffer.from(`${index + 1} 0 obj\n${obj}\nendobj\n`, "latin1");
    chunks.push(chunk);
    offset += chunk.length;
  });
  const xrefOffset = offset;
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((x) => String(x).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, "latin1"));
  return Buffer.concat(chunks);
}

module.exports = { buildPdf };
