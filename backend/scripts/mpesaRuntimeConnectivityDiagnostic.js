#!/usr/bin/env node
const dns = require("dns").promises;
const https = require("https");

const host = "api.safaricom.co.ke";
const startedAt = Date.now();

async function lookup() {
  try {
    const answers = await dns.lookup(host, { all: true });
    console.log(JSON.stringify({ stage: "dns", success: true, addresses: answers.map(({ address, family }) => ({ address, family })), elapsedMs: Date.now() - startedAt }));
    return answers;
  } catch (error) {
    console.log(JSON.stringify({ stage: "dns", success: false, code: error?.code || null, message: error?.message || "DNS lookup failed", elapsedMs: Date.now() - startedAt }));
    return [];
  }
}

function tlsProbe(address) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = https.request({ hostname: address, servername: host, port: 443, method: "HEAD", path: "/", family: address.includes(":") ? 6 : 4, timeout: 10000, rejectUnauthorized: true }, (res) => {
      res.resume();
      resolve({ success: true, status: res.statusCode || null, elapsedMs: Date.now() - started });
    });
    req.on("timeout", () => { req.destroy(Object.assign(new Error("TLS probe timeout"), { code: "ETIMEDOUT" })); });
    req.on("error", (error) => resolve({ success: false, code: error?.code || null, message: error?.message || "TLS probe failed", elapsedMs: Date.now() - started }));
    req.end();
  });
}

(async () => {
  const addresses = await lookup();
  if (!addresses.length) process.exitCode = 2;
  for (const { address, family } of addresses) {
    console.log(JSON.stringify({ stage: "tls", address, family, ...(await tlsProbe(address)) }));
  }
})();
