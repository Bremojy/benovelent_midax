const fs = require("fs");
const path = require("path");

const LETTERHEAD_PATH = path.join(__dirname, "..", "assets", "print-letterhead.jpg");
let cachedLetterhead = null;

const escapePdf = (value) => String(value ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)")
  .replace(/[^\x20-\x7E]/g, " ");

const wrap = (value, max = 88) => {
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

function loadLetterhead() {
  if (cachedLetterhead !== null) return cachedLetterhead;
  try {
    if (!fs.existsSync(LETTERHEAD_PATH)) {
      cachedLetterhead = null;
      return null;
    }
    cachedLetterhead = fs.readFileSync(LETTERHEAD_PATH);
    return cachedLetterhead;
  } catch (_) {
    cachedLetterhead = null;
    return null;
  }
}

function makePage({ title, subtitle, lines, pageNumber, imageRef }) {
  const commands = [];
  const imageWidth = 210;
  const imageHeight = Math.round(imageWidth * (437 / 1055) * 100) / 100;

  if (imageRef) {
    commands.push(
      "q",
      `${imageWidth} 0 0 ${imageHeight} 48 744 cm`,
      `/Im1 Do`,
      "Q",
    );
  }

  let y = imageRef ? 705 : 800;
  commands.push(
    "BT",
    "/F1 9 Tf",
    `48 ${y} Td`,
    "(Benevolent Fund Scheme | Midax Petroleum Marketing) Tj",
    "0 -13 Td",
    `/F1 17 Tf`,
    `(${escapePdf(title)}) Tj`,
    "0 -20 Td",
    "/F1 9 Tf",
    `(${escapePdf(subtitle)}) Tj`,
    "0 -18 Td",
    "/F1 8 Tf",
  );

  y -= imageRef ? 56 : 0;
  for (const raw of lines) {
    const pieces = wrap(raw, 108);
    for (const piece of pieces) {
      if (y < 54) break;
      commands.push(`(${escapePdf(piece)}) Tj`, "0 -12 Td");
      y -= 12;
    }
    if (y < 54) break;
  }
  commands.push(
    "ET",
    "BT",
    "/F1 7 Tf",
    "270 24 Td",
    `(${pageNumber}) Tj`,
    "ET",
  );
  return commands.join("\n");
}

function buildPdf({ title, subtitle = "", lines = [] } = {}) {
  const pageCapacity = 49;
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
  const letterhead = loadLetterhead();
  const imageRef = letterhead
    ? add(`<< /Type /XObject /Subtype /Image /Width 1055 /Height 437 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${letterhead.length} >>\nstream\n${letterhead.toString("binary")}\nendstream`)
    : null;

  for (let i = 0; i < pages.length; i += 1) {
    const content = makePage({ title, subtitle, lines: pages[i], pageNumber: i + 1, imageRef });
    const contentRef = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    const resources = `/Font << /F1 ${fontObj} 0 R >>${imageRef ? ` /XObject << /Im1 ${imageRef} 0 R >>` : ""}`;
    const pageRef = add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << ${resources} >> /Contents ${contentRef} 0 R >>`);
    pageRefs.push(pageRef);
  }

  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")} ] /Count ${pageRefs.length} >>`;
  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [0];
  let offset = chunks[0].length;
  objects.forEach((obj, index) => {
    offsets[index + 1] = offset;
    const prefix = Buffer.from(`${index + 1} 0 obj\n`, "latin1");
    const suffix = Buffer.from("\nendobj\n", "latin1");
    let body;
    if (imageRef && index + 1 === imageRef) {
      const head = Buffer.from(`${index + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1055 /Height 437 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${letterhead.length} >>\nstream\n`, "latin1");
      body = Buffer.concat([head, letterhead, Buffer.from("\nendstream", "latin1"), suffix]);
    } else {
      body = Buffer.concat([prefix, Buffer.from(String(obj), "latin1"), suffix]);
    }
    chunks.push(body);
    offset += body.length;
  });

  const xrefOffset = offset;
  chunks.push(Buffer.from(
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((x) => String(x).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    "latin1",
  ));
  return Buffer.concat(chunks);
}

module.exports = { buildPdf };
