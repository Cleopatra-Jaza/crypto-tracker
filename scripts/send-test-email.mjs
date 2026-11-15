#!/usr/bin/env node
// One-off: send a single test email through the Brevo (Sendinblue) API.
// Usage: node --env-file=.env.local scripts/send-test-email.mjs someone@example.com

const USAGE =
  "Usage: node --env-file=.env.local scripts/send-test-email.mjs <recipient@example.com>";

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 10000;

function cleanEnvValue(value) {
  if (typeof value !== "string") return "";
  let out = value.trim();
  if (out.length >= 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      out = out.slice(1, -1).trim();
    }
  }
  return out;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const recipient = typeof process.argv[2] === "string" ? process.argv[2].trim() : "";

if (recipient.length === 0 || !recipient.includes("@")) {
  fail(USAGE);
}

const requiredEnv = [
  ["BREVO_API_KEY", cleanEnvValue(process.env.BREVO_API_KEY)],
  ["BREVO_SENDER_EMAIL", cleanEnvValue(process.env.BREVO_SENDER_EMAIL)],
  ["BREVO_SENDER_NAME", cleanEnvValue(process.env.BREVO_SENDER_NAME)],
];

const missing = requiredEnv.filter(([, value]) => value.length === 0).map(([name]) => name);
if (missing.length > 0) {
  fail(`Missing environment variable(s): ${missing.join(", ")}`);
}

const apiKey = requiredEnv[0][1];
const senderEmail = requiredEnv[1][1];
const senderName = requiredEnv[2][1];

const sentence = "Bitcoin crossed $70,000 (test)";

const payload = {
  sender: { name: senderName, email: senderEmail },
  to: [{ email: recipient }],
  subject: "Crypto Tracker test email",
  htmlContent: `<p>This is a test alert email from Crypto Tracker.</p><p>${sentence}</p>`,
  textContent: `This is a test alert email from Crypto Tracker. ${sentence}`,
};

try {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = await res.text();
  console.log(`HTTP status: ${res.status}`);
  console.log(body);
  process.exit(res.ok ? 0 : 1);
} catch (err) {
  console.log(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}