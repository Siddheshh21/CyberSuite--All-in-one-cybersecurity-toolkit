// routes/password.js
const express = require("express");
const router = express.Router();
const zxcvbn = require("zxcvbn");
const crypto = require("crypto");
const axios = require("axios");

/* Simple in-memory HIBP prefix cache */
const HIBP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const hibpCache = new Map();

function generateMutations(password, count = 3) {
  const subs = { a: "@", s: "$", i: "1", o: "0", e: "3", t: "7", l: "1" };
  const results = new Set();
  for (let i = 0; i < 10 && results.size < count; i++) {
    let mutated = "";
    for (const ch of password) {
      const low = ch.toLowerCase();
      if (Math.random() < 0.25 && subs[low]) mutated += subs[low];
      else mutated += Math.random() < 0.06 ? (Math.random() < 0.5 ? ch.toUpperCase() : ch.toLowerCase()) : ch;
    }
    if (Math.random() < 0.5) mutated += (Math.random() < 0.5 ? "!" : "#") + Math.floor(Math.random() * 100);
    if (mutated.length > 120) mutated = mutated.slice(0, 120);
    results.add(mutated);
  }
  return Array.from(results);
}

async function checkPwned(password) {
  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const cached = hibpCache.get(prefix);
    let bodyText;
    if (cached && Date.now() - cached.ts < HIBP_CACHE_TTL_MS) {
      bodyText = cached.data;
    } else {
      const resp = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { "User-Agent": "CyberSuite/PasswordAnalyzer (+https://your-domain.example)" },
        timeout: 7000,
      });
      bodyText = resp.data;
      hibpCache.set(prefix, { data: bodyText, ts: Date.now() });
    }

    const lines = String(bodyText).split("\n");
    for (const line of lines) {
      const [hashSuffixRaw, countRaw] = line.trim().split(":");
      if (!hashSuffixRaw) continue;
      if (hashSuffixRaw.toUpperCase() === suffix) {
        const count = parseInt((countRaw || "0").trim(), 10) || 0;
        return { breached: true, count, error: null };
      }
    }

    return { breached: false, count: 0, error: null };
  } catch (err) {
    console.error("HIBP check failed:", (err && err.message) || err);
    return { breached: false, count: null, error: "hibp_unreachable" };
  }
}

/* Build a compact safe object for each zxcvbn sequence item */
function sanitizeSequenceItem(item) {
  if (!item || typeof item !== "object") return null;
  const obj = {
    pattern: item.pattern || null,
    token: typeof item.token === "string" ? item.token : null,
    i: typeof item.i === "number" ? item.i : null,
    j: typeof item.j === "number" ? item.j : null,
    guesses: typeof item.guesses === "number" ? item.guesses : null,
    guesses_log10: typeof item.guesses_log10 === "number" ? item.guesses_log10 : null,
    dictionary_name: item.dictionary_name || null,
    rank: typeof item.rank === "number" ? item.rank : null,
  };

  // user-friendly one-line display string for safe rendering in UI
  const tokenDisplay = obj.token ? `token="${obj.token}"` : "";
  const guessDisplay = typeof obj.guesses === "number" ? `${obj.guesses.toLocaleString()} guesses` : "";
  obj.display = [obj.pattern, tokenDisplay, guessDisplay].filter(Boolean).join(" • ");
  return obj;
}

router.post("/analyze", async (req, res) => {
  try {
    const { password = "", username = "" } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "password required" });
    }

    const z = zxcvbn(password, username ? [username] : []);

    // robust entropy calculation
    let entropyBits = null;
    if (z.guesses && Number.isFinite(z.guesses) && z.guesses > 1) {
      entropyBits = Math.log2(z.guesses);
      entropyBits = Math.round(entropyBits * 100) / 100;
    } else if (typeof z.guesses_log10 === "number" && Number.isFinite(z.guesses_log10)) {
      entropyBits = Math.round(z.guesses_log10 * Math.log2(10) * 100) / 100;
    }

    const pwn = await checkPwned(password);
    const mutations = Array.isArray(generateMutations(password, 4)) ? generateMutations(password, 4) : [];
    const rawSequence = Array.isArray(z.sequence) ? z.sequence.map(sanitizeSequenceItem).filter(Boolean) : [];

    const response = {
      score: typeof z.score === "number" ? z.score : 0,
      crack_times_display: z.crack_times_display || {},
      feedback: z.feedback || { warning: "", suggestions: [] },
      entropy_bits: typeof entropyBits === "number" ? entropyBits : null,
      breached: !!pwn.breached,
      breached_count: typeof pwn.count === "number" ? pwn.count : null,
      hibp_error: pwn.error || null,
      mutations,
      raw: { length: password.length, sequence: rawSequence },
      // a safe, front-end friendly rendering of sequence items (strings)
      sequence_display: rawSequence.map(s => (s.display || s.pattern || "").toString()).filter(Boolean),
    };

    return res.json(response);
  } catch (err) {
    console.error("Password analyze error:", (err && err.stack) || err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
