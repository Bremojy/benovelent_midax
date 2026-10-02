const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

const footer = read('src/components/Footer.jsx');
const app = read('src/App.jsx');
const boundary = read('src/components/AppErrorBoundary.jsx');

const whatsapp = 'https://wa.me/254729353487';
const instagram = 'https://instagram.com/midaxpetroleum';

if (!footer.includes(whatsapp)) throw new Error('Official WhatsApp URL missing from Footer.jsx');
if (!footer.includes(instagram)) throw new Error('Official Instagram URL missing from Footer.jsx');
if (/import\s*\{[^}]*\bInstagram\b[^}]*\}\s*from\s*["\']lucide-react["\']/.test(footer)) throw new Error('Footer must not import Instagram from lucide-react');
if (footer.includes('<Instagram')) throw new Error('Footer still renders an Instagram Lucide component');
if (!footer.includes('aria-label="Instagram midaxpetroleum"')) throw new Error('Instagram action must have an accessible label');
if (!footer.includes('aria-label="WhatsApp MIDAX Chairman"')) throw new Error('WhatsApp action must have an accessible label');
if ((app.match(/<Footer\b/g) || []).length !== 1) throw new Error('Application must mount exactly one Footer component');
if (boundary.includes('window.location.reload')) throw new Error('Application error recovery must not use window.location.reload');

console.log('PASS footer build contract: official social URLs, inline Instagram mark, single footer mount, and reload-free recovery verified');
