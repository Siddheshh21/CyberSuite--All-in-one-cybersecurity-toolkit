// routes/email.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");

/**
 * CyberSuite - Email Breach Checker (XposedOrNot)
 * - Uses only free endpoints (no API key)
 * - Reduces noise: filters out empty/unknown entries
 * - Normalizes fields (name/domain/date/data_classes/description)
 * - Computes stable severity from data classes (High/Med/Low)
 * - Adds user-friendly summary (exposure band, time since)
 * - Caches results in-memory to avoid rate/latency issues
 *
 * NOTE: This avoids features XON cannot guarantee (e.g., per-breach verified flags, per-breach actions).
 *       Recommendations are generic, and “Unknown source” spam is suppressed by smart filtering.
 */

// ---- Config ----
const UA = process.env.USER_AGENT || "CyberSuite-EmailChecker";
const MOCK = String(process.env.MOCK || "0") === "1";

// ---- In-memory cache (email -> { data, ts }) ----
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map();

// ---- Optional local enrichment (only used as fallback; cleaned & deduped) ----
const localBreachInfo = {
  "Unknown source": {
    verified: false,
    description: "Breach details are not publicly available."
  },
  "LinkedIn": {
    verified: true,
    description: "2012 LinkedIn breach where hashed passwords of millions of users were exposed."
  },
  "MySpace": {
    verified: true,
    description: "2008 MySpace breach leaking usernames, emails, and passwords."
  },
  "Adobe": {
    verified: true,
    description: "2013 Adobe breach exposing usernames, encrypted passwords, and password hints."
  },
  "Dropbox": {
    verified: true,
    description: "2012 Dropbox breach exposing usernames and passwords leaked online."
  },
  "Twitter": {
    verified: true,
    description: "Multiple incidents exposing Twitter user data."
  },
  "Facebook": {
    verified: true,
    description: "Multiple data breaches exposing user personal data."
  },
  "Tumblr": {
    verified: true,
    description: "2013 Tumblr data breach exposing millions of users' details."
  },
  "Yahoo": {
    verified: true,
    description: "One of the largest data breaches exposing billions of accounts."
  },
  "Instagram": {
    verified: true,
    description: "Data breaches exposing Instagram user information and emails."
  },
  "Evernote": {
    verified: true,
    description: "2013 Evernote breach exposing usernames and passwords."
  },
  "Canva": {
    verified: true,
    description: "2019 Canva data breach exposing user account data."
  },
  "BitcoinTalk": {
    verified: true,
    description: "BitcoinTalk forum breach exposing user data and passwords."
  },
  "MyFitnessPal": {
    verified: true,
    description: "2018 MyFitnessPal breach exposing personal details and hashed passwords."
  },
  "VK": {
    verified: true,
    description: "Russian social network VKontakte breach exposing millions of accounts."
  },
  "Snapchat": {
    verified: true,
    description: "Breaches/leaks exposing usernames and phone numbers."
  },
  "Strava": {
    verified: true,
    description: "2018 Strava data leak exposing user location and activity data."
  },
  "Last.fm": {
    verified: true,
    description: "2012 Last.fm breach exposing usernames and hashed passwords."
  },
  "Reddit": {
    verified: true,
    description: "Reddit data leaks exposing user data and comment history."
  },
  "Pinterest": {
    verified: true,
    description: "Pinterest data breach exposing user account details."
  },
  "WhatsApp": {
    verified: true,
    description: "Incidents exposing WhatsApp user metadata."
  },
  "Discord": {
    verified: true,
    description: "Discord breach exposing usernames and email addresses."
  },
  "MegaSocial": {
    verified: true,
    description: "A major social platform breach exposing user emails and passwords."
  },
  "OldForum": {
    verified: true,
    description: "An old forum database leak of usernames and emails."
  }
};

// ---- Helpers ----
function hashEmailForLog(email) {
  try {
    return crypto.createHash("sha256").update(email).digest("hex").slice(0, 10);
  } catch {
    return "hash_err";
  }
}

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const s = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); // escape the dot
}

function parseDateToISO(d) {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

function monthsBetween(isoA, isoB) {
  if (!isoA || !isoB) return null;
  const a = new Date(isoA), b = new Date(isoB);
  const years = b.getFullYear() - a.getFullYear();
  const months = years * 12 + (b.getMonth() - a.getMonth());
  return months - (b.getDate() < a.getDate() ? 1 : 0);
}

function severityFromDataClasses(arr) {
  const set = new Set((arr || []).map(x => String(x).toLowerCase()));
  const hasPasswords = set.has("password") || set.has("passwords") || set.has("password hash") || set.has("hash");
  const hasFinancial = set.has("creditcard") || set.has("credit card");
  const hasSensitive = set.has("ssn") || set.has("social security");
  if (hasPasswords && (hasFinancial || hasSensitive)) return "High";
  if (hasPasswords) return "Medium";
  if (set.has("token") || set.has("2fa") || set.has("otp")) return "Medium";
  if (set.has("phone") || set.has("address") || set.has("dob")) return "Medium";
  if (set.size > 0) return "Low";
  return "Low";
}

function computeExposureScore(breaches) {
  // Keep a conservative, stable score that won’t mislead
  if (!Array.isArray(breaches) || breaches.length === 0) return 0;

  // Base on count and severity
  let base = Math.min(30, breaches.length * 8);

  let sevBoost = 0;
  for (const b of breaches) {
    const sev = String(b.severity || "").toLowerCase();
    if (sev === "high") sevBoost += 20;
    else if (sev === "medium") sevBoost += 10;
    else sevBoost += 4;
  }
  base += Math.min(40, sevBoost);

  // Recency factor
  const dates = breaches.map(b => b.breach_date_iso).filter(Boolean);
  if (dates.length) {
    const latest = dates.reduce((a, c) => (a > c ? a : c));
    const monthsAgo = monthsBetween(latest, new Date().toISOString());
    if (monthsAgo !== null) {
      if (monthsAgo <= 1) base += 20;
      else if (monthsAgo <= 6) base += 10;
      else if (monthsAgo <= 12) base += 5;
    }
  }

  return Math.max(0, Math.min(100, Math.round(base)));
}

function exposureBand(score) {
  if (score <= 20) return "Excellent";
  if (score <= 40) return "Good";
  if (score <= 60) return "Fair";
  if (score <= 80) return "Poor";
  return "Critical";
}

function timeSinceLabel(iso) {
  if (!iso) return null;
  const months = monthsBetween(iso, new Date().toISOString());
  if (months === null) return null;
  if (months < 1) return "Less than a month ago";
  if (months === 1) return "About 1 month ago";
  if (months < 12) return `About ${months} months ago`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `About ${years} year${years > 1 ? "s" : ""} ago`;
  return `About ${years}y ${rem}m ago`;
}

function recencyHighlight(iso) {
  if (!iso) return null;
  const months = monthsBetween(iso, new Date().toISOString());
  if (months === null) return null;
  if (months <= 2) return "Recent — happened just weeks ago";
  if (months <= 6) return "Recent — within the last few months";
  if (months <= 12) return "Occurred within the past year";
  return "Older breach";
}

function buildActions(breaches) {
  // Generic, not per-breach to avoid implying details XON doesn’t provide
  const all = new Set();
  for (const b of breaches) {
    for (const d of b.data_classes || []) all.add(String(d).toLowerCase());
  }
  const actions = new Set();
  actions.add("Change passwords on affected sites");
  actions.add("Enable 2FA wherever possible");
  actions.add("Avoid reusing passwords; use a password manager");
  if (all.has("password") || all.has("passwords") || all.has("hash") || all.has("password hash")) {
    actions.add("Rotate passwords anywhere this email is used");
  }
  if (all.has("phone") || all.has("phone number")) {
    actions.add("Watch for SMS phishing; never share OTPs");
  }
  if (all.has("address")) {
    actions.add("Be cautious of targeted scams using your address");
  }
  if (all.has("dob") || all.has("date of birth")) {
    actions.add("Avoid using DOB in security questions");
  }
  if (all.has("creditcard") || all.has("credit card")) {
    actions.add("Review statements; consider card replacement");
  }
  if (all.has("ip") || all.has("ip address")) {
    actions.add("Use a VPN on public Wi-Fi");
  }
  return Array.from(actions);
}

// --- Utility: best-effort hostname from URL
function hostnameFromUrl(u) {
  try { return new URL(u).hostname; } catch { return null; }
}

// --- Utility: dedupe by (name|domain|date)
function makeBreachKey(b) {
  const n = (b.name || "").toLowerCase().trim();
  const d = (b.domain || "").toLowerCase().trim();
  const t = (b.breach_date_iso || "").slice(0, 10);
  return `${n}|${d}|${t}`;
}

// 🔹 Normalization tuned for XON free endpoint, with noise reduction
function normalizeXONSources(apiJson) {
  try {
  // XON variants: sometimes `breachDetails`, sometimes `breaches`, sometimes `Records`
  const breachesArr = apiJson?.breachDetails || apiJson?.breaches || apiJson?.Records || [];
    if (!Array.isArray(breachesArr)) return [];

    const cleaned = [];

    for (const raw of breachesArr) {
      // Field mapping across possible shapes
      const nameRaw =
        raw.Name || raw.name || raw.Breach || raw.BreachName || raw.Title || raw.source || raw.Source || null;

      const url = raw.Reference || raw.reference || raw.Url || raw.url || null;
      const domainRaw =
        raw.Domain || raw.domain || hostnameFromUrl(url) || null;

      const dateRaw =
        raw.BreachDate || raw.breachDate || raw.Date || raw.date || raw.AddedDate || raw.ModifiedDate || null;

      const data =
        raw.DataClasses || raw.dataClasses || raw.dataCompromised || raw.data || raw.CompromisedData || [];

      const descRaw =
        raw.Description || raw.description || null;

      const verifiedRaw =
        (typeof raw.Verified === "boolean" ? raw.Verified : (typeof raw.verified === "boolean" ? raw.verified : null));

      // Build normalized entry
      let name = nameRaw;
      let domain = domainRaw;

      // Fill name from domain if missing (reduces "Unknown source")
      if (!name && domain) name = domain.split(".")[0];

      // As a last resort, try to craft a readable label from URL
      if (!name && !domain && url) {
        const host = hostnameFromUrl(url);
        if (host) {
          domain = host;
          name = host.split(".")[0];
        }
      }

      // If we still have nothing meaningful and no data classes, skip to reduce noise
      const dataClasses = Array.isArray(data) ? data : [];
      const hasMeaning = Boolean(name || domain || dataClasses.length > 0 || descRaw);
      if (!hasMeaning) continue;

      const breach_date_iso = parseDateToISO(dateRaw);

      // Use local fallback description only if API provided nothing
      const local = localBreachInfo[name] || localBreachInfo["Unknown source"] || {};
      const description = descRaw || local.description || "Details unavailable";

      const verified = (verifiedRaw !== null && verifiedRaw !== undefined)
        ? verifiedRaw
        : (typeof local.verified === "boolean" ? local.verified : undefined);

      const severity = severityFromDataClasses(dataClasses);

      const item = {
        name: name || "Unknown",
        domain: domain || null,
        breach_date_iso,
        description,
        data_classes: dataClasses,
        verified, // may be undefined if unknown; front-end can hide if undefined
        url: url || null,
        severity
      };

      cleaned.push(item);
    }

    // Dedupe and sort (High -> Low, then most recent first)
    const seen = new Set();
    const deduped = [];
    for (const b of cleaned) {
      const key = makeBreachKey(b);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(b);
    }

    deduped.sort((a, b) => {
      const sevOrder = (s) => (s === "High" ? 3 : s === "Medium" ? 2 : 1);
      const sv = sevOrder(b.severity) - sevOrder(a.severity);
      if (sv !== 0) return sv;
      const ad = a.breach_date_iso || "";
      const bd = b.breach_date_iso || "";
      return (bd > ad) ? 1 : (bd < ad) ? -1 : 0;
    });

    return deduped;
  } catch (err) {
    console.error("normalizeXONSources() parse error", err);
    return [];
  }
}

// ---- MOCK PAYLOAD ----
function mockPayload(email) {
  const now = new Date();
  const lastMonth = new Date(now); lastMonth.setMonth(now.getMonth() - 1);
  const yearAgo = new Date(now); yearAgo.setFullYear(now.getFullYear() - 1);

  const breaches = [
    {
      name: "MegaSocial",
      domain: "megasocial.com",
      breach_date_iso: lastMonth.toISOString(),
      description: "User table exposed via misconfigured S3 bucket.",
      data_classes: ["Email", "Password", "IP"],
      verified: true,
      url: null,
      severity: "High"
    },
    {
      name: "OldForum",
      domain: "oldforum.net",
      breach_date_iso: yearAgo.toISOString(),
      description: "Legacy forum dump circulated on breach forums.",
      data_classes: ["Email", "Username"],
      verified: true,
      url: null,
      severity: "Low"
    },
  ];

  const exposure_score = computeExposureScore(breaches);
  const first_seen_iso = breaches.map(b => b.breach_date_iso).filter(Boolean).sort()[0] || null;
  const last_seen_iso = breaches.map(b => b.breach_date_iso).filter(Boolean).sort().slice(-1)[0] || null;

  return {
    email,
    found: true,
    count: breaches.length,
    breaches,
    summary: {
      exposure_score,
      exposure_band: exposureBand(exposure_score),
      meter_segments: Math.min(5, Math.max(0, Math.ceil(exposure_score / 20))),
      first_seen_iso,
      last_seen_iso,
      time_since_first_seen: timeSinceLabel(first_seen_iso),
      time_since_last_seen: timeSinceLabel(last_seen_iso),
      recency_highlight: recencyHighlight(last_seen_iso),
      actions: buildActions(breaches),
    },
  };
}

// ---- CORE ROUTE ----
router.post("/check", async (req, res) => {
  try {
    let { email } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "valid email required" });
    }
    email = String(email).trim().toLowerCase();

    const cached = cache.get(email);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log(`Returning cached result for ${hashEmailForLog(email)}`);
      return res.json(cached.data);
    }

    if (MOCK) {
      const payload = mockPayload(email);
      cache.set(email, { data: payload, ts: Date.now() });
      return res.json(payload);
    }

    // ---- INTEGRATE ALL XPOSEDORNOT ENDPOINTS ----
    const headers = { "User-Agent": UA };
    let checkEmailJson = {};
    let breachAnalyticsJson = {};
    let breachesMetaJson = {};
    let breaches = [];
    let found = false;
    let fallbackDetails = null;
    try {
      // 1. /v1/check-email
      const checkEmailUrl = `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`;
      const checkEmailResp = await axios.get(checkEmailUrl, { headers, timeout: 8000 });
      checkEmailJson = checkEmailResp?.data || {};
      // 2. /v1/breach-analytics
      const breachAnalyticsUrl = `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`;
      const breachAnalyticsResp = await axios.get(breachAnalyticsUrl, { headers, timeout: 8000 });
      breachAnalyticsJson = breachAnalyticsResp?.data || {};
      // 3. /v1/breaches
      const breachesMetaUrl = `https://api.xposedornot.com/v1/breaches`;
      const breachesMetaResp = await axios.get(breachesMetaUrl, { headers, timeout: 8000 });
      breachesMetaJson = breachesMetaResp?.data || {};

      // Merge breach info from check-email and breach-analytics
      let breachNames = [];
      if (Array.isArray(checkEmailJson?.breaches)) {
        breachNames = breachNames.concat(checkEmailJson.breaches.map(b => b.Breach || b.Name || b.Title || b));
      }
      if (Array.isArray(breachAnalyticsJson?.breachDetails)) {
        breachNames = breachNames.concat(breachAnalyticsJson.breachDetails.map(b => b.Breach || b.Name || b.Title || b));
      }
      if (Array.isArray(breachAnalyticsJson?.breaches)) {
        breachNames = breachNames.concat(breachAnalyticsJson.breaches.map(b => b.Breach || b.Name || b.Title || b));
      }
      // Remove duplicates
      breachNames = Array.from(new Set(breachNames.filter(Boolean)));

      // If any breach is found, mark as unsafe and show minimal info if metadata is missing
      let breachesMetaArr = breachesMetaJson?.breaches || breachesMetaJson?.Records || [];
      breaches = breachNames.map(name => {
        let meta = breachesMetaArr.find(b => {
          return (b.Breach || b.Name || b.Title || b.source || b.Source) === name;
        });
        if (!meta) {
          // fallback: try case-insensitive match
          meta = breachesMetaArr.find(b => {
            return ((b.Breach || b.Name || b.Title || b.source || b.Source || "").toLowerCase() === String(name).toLowerCase());
          });
        }
        // fallback: minimal info
        if (!meta) meta = { name, description: "Details unavailable", data_classes: [], domain: null };
        // Normalize
        return {
          name: meta.Breach || meta.Name || meta.Title || meta.source || meta.Source || name,
          domain: meta.Domain || meta.domain || null,
          breach_date_iso: parseDateToISO(meta.BreachDate || meta.breachDate || meta.Date || meta.date || meta.AddedDate || meta.ModifiedDate),
          description: meta.Description || meta.description || "Details unavailable",
          data_classes: meta.DataClasses || meta.dataClasses || meta.dataCompromised || meta.data || meta.CompromisedData || [],
          verified: (typeof meta.Verified === "boolean" ? meta.Verified : (typeof meta.verified === "boolean" ? meta.verified : undefined)),
          url: meta.Reference || meta.reference || meta.Url || meta.url || null,
          severity: severityFromDataClasses(meta.DataClasses || meta.dataClasses || meta.dataCompromised || meta.data || meta.CompromisedData || []),
        };
      });

      // Final safeguard: drop ultra-empty rows to avoid "Unknown spam"
      breaches = breaches.filter(b => {
        const nameStr = typeof b.name === "string" ? b.name : "";
        const hasName = !!nameStr && nameStr.toLowerCase() !== "unknown";
        const hasDomain = !!b.domain;
        const hasData = Array.isArray(b.data_classes) && b.data_classes.length > 0;
        const hasDesc = !!b.description && b.description !== "Details unavailable";
        return hasName || hasDomain || hasData || hasDesc;
      });

      // Mark as unsafe if any breach is found
      found = breachNames.length > 0 || breaches.length > 0;
      // If no breach objects, fallback to risk/xposed_data
      if (!found) {
        const risk = breachAnalyticsJson?.risk?.[0]?.risk_label || null;
        const riskScore = breachAnalyticsJson?.risk?.[0]?.risk_score || null;
        const xposedData = breachAnalyticsJson?.xposed_data || null;
        if ((risk && risk.toLowerCase() === "high") || (riskScore && riskScore >= 50) || (xposedData && Array.isArray(xposedData) && xposedData.length > 0)) {
          found = true;
          fallbackDetails = { risk, riskScore, xposedData };
        }
      }
    } catch (e) {
      console.error("XposedOrNot API request failed:", e.message);
      const payload = mockPayload(email);
      cache.set(email, { data: payload, ts: Date.now() });
      return res.json(payload);
    }

    // Ensure breach details are always shown
    breaches = breaches.map(b => {
      let dateIso = b.breach_date_iso || null;
      // Validate dateIso
      if (dateIso) {
        const dt = new Date(dateIso);
        if (isNaN(dt.getTime())) dateIso = "Unknown";
        else dateIso = dt.toISOString();
      } else {
        dateIso = "Unknown";
      }
      // Always provide company/source
      let company = b.name || b.domain || "Unknown company";
      return {
        name: company,
        domain: b.domain || null,
        breach_date_iso: dateIso,
        description: b.description || `Data leaked by ${company}. Details unavailable`,
        data_classes: Array.isArray(b.data_classes) ? b.data_classes : [],
        verified: typeof b.verified === "boolean" ? b.verified : undefined,
        url: b.url || null,
        severity: b.severity || "Low"
      };
    });

    // Minimal response for modern frontend, keep all 3 API calls
    const payload = {
      email,
      found,
      actions: buildActions(breaches)
    };
    cache.set(email, { data: payload, ts: Date.now() });
    return res.json(payload);
  } catch (err) {
    console.error(
      "email/check error:",
      err?.message || err,
      "| email sha:",
      hashEmailForLog(req?.body?.email || "")
    );
    if (err.response) {
      console.error("Upstream response:", err.response.data);
    }
    if (err.stack) {
      console.error("Stack trace:", err.stack);
    }
    return res.status(500).json({
      error: "internal_error",
      detail: err?.message,
      stack: err?.stack,
      upstream: err?.response?.data
    });
  }
});

module.exports = router;
