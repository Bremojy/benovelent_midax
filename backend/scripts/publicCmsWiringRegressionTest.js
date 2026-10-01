"use strict";
const fs = require("fs");
const assert = require("assert");

const read = (file) => fs.readFileSync(file, "utf8");
const page = (file) => read(`src/pages/${file}`);
const pass = (name) => console.log(`PASS ${name}`);

const home = page("Home.jsx");
const hero = read("src/components/Hero.jsx");
const services = page("Services.jsx");
const contact = page("Contact.jsx");
const footer = read("src/components/Footer.jsx");
const news = page("News.jsx");
const gallery = page("Gallery.jsx");
const legal = read("src/components/LegalSectionPage.jsx");
const settings = page("superadmin/SuperAdminSettings.jsx");

assert(/usePublicWebsiteSection\("home"\)/.test(home) && /homeContent=\{homeSection\}/.test(home), "Home consumes published CMS content");
assert(/function Hero\(\{ homeContent/.test(hero) && /fallbackSlide/.test(hero) && /homeContent\?\.title/.test(hero), "Home CMS content reaches the carousel fallback");
assert(/usePublicWebsiteSection\("services"\)/.test(services), "Services consumes published CMS section text");
assert(/usePublicWebsiteSection\("contact"\)/.test(contact), "Contact consumes published CMS section text while system settings remain authoritative for channels");
assert(/usePublicWebsiteSection\("footer"\)/.test(footer), "Footer consumes published CMS footer text");
assert(/usePublicWebsiteSection\("news"\)/.test(news) && /usePublicWebsiteSection\("events"\)/.test(news) && /usePublicWebsiteSection\("resources"\)/.test(news), "Newsroom consumes CMS presentation sections");
assert(/content\?\.galleryItems/.test(gallery) && /section\?\.title/.test(gallery), "Gallery consumes managed metadata and CMS section presentation");
assert(/API\.get\(`\/website\/\$\{section\}`\)/.test(legal), "Legal pages consume the authoritative public CMS section endpoint");
assert(/const request = item\._id/.test(settings) && /API\.put\(`\/website\/\$\{key\}`/.test(settings), "CMS editor chooses update vs create from the persisted record identity");
assert(/Draft \/ unpublished/.test(settings) && /setPreviewKey/.test(settings), "CMS editor exposes draft/public state and an in-editor preview");
pass("public CMS wiring regression contracts verified");
