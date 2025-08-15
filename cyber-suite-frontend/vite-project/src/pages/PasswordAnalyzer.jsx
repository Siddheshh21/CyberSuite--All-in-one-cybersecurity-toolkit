// src/pages/PasswordAnalyzer.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import Odometer from "react-odometerjs";
import clsx from "clsx";
import "react-circular-progressbar/dist/styles.css";
import { Link } from "react-router-dom";
import CyberParticlesBackground from "../components/CyberParticlesBackground";
import CyberPasswordBackground from "../components/CyberPasswordBackground";
import EncryptedPasswords from "../components/EncryptedPasswords";

// UI labels + colors
const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-300", "bg-emerald-300", "bg-green-500"];

/* ---------- Utilities ---------- */

// simple pattern detection (keep frontend pattern detection for UI)
function detectPatterns(s) {
  if (!s) return [];
  const patterns = [];
  if (/^\d+$/.test(s)) patterns.push("All digits (PIN-like)");
  if (/^[a-z]+$/.test(s)) patterns.push("Lowercase only");
  if (/^[A-Z]+$/.test(s)) patterns.push("Uppercase only");
  if (/^[A-Za-z]+$/.test(s)) patterns.push("Letters only");
  if (/[^A-Za-z0-9]/.test(s)) patterns.push("Contains special characters");
  if (/(.)\1{2,}/.test(s)) patterns.push("Repeated chars (aaa, 111)");
  if (s.length >= 3) {
    const normalized = s.toLowerCase();
    for (let i = 0; i + 2 < normalized.length; i++) {
      const a = normalized.charCodeAt(i), b = normalized.charCodeAt(i+1), c = normalized.charCodeAt(i+2);
      if (b === a + 1 && c === b + 1) { patterns.push("Sequential (abc/123)"); break; }
      if (b === a - 1 && c === b - 1) { patterns.push("Reverse sequential (cba/321)"); break; }
    }
  }
  return Array.from(new Set(patterns));
}

// reuse risk heuristic based on score + breach count + entropy
function computeReuseRisk(localAnaly, hibpCount) {
  if (!localAnaly) return { level: "Unknown", reasons: ["No analysis"] };
  let score = 0;
  if (hibpCount === null) score += 0; // unknown
  else if (hibpCount > 0) score += 2;
  if (localAnaly.score <= 1) score += 1;
  if ((localAnaly.entropyBits ?? 0) < 40) score += 1;
  const level = score >= 3 ? "High" : score === 2 ? "Medium" : "Low";
  const reasons = [];
  if (hibpCount > 0) reasons.push(`Seen in breaches ${hibpCount} times`);
  if (localAnaly.score <= 1) reasons.push("Low score");
  if ((localAnaly.entropyBits ?? 0) < 40) reasons.push("Entropy < 40 bits");
  return { level, reasons: reasons.length ? reasons : ["No major reuse indicators"] };
}

export default function PasswordAnalyzer() {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [local, setLocal] = useState(null);
  const [hibpCount, setHibpCount] = useState(null);
  const [mutations, setMutations] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [scanLog, setScanLog] = useState([]);
  const timerRef = useRef(null);

  // Compute reuse risk
  const reuseRisk = computeReuseRisk(local, hibpCount);

  // Auto pick best suggestion
  function autoPickBestSuggestion() {
    if (mutations.length > 0) {
      applySuggestion(mutations[0]);
    }
  }

  // Apply suggestion
  function applySuggestion(suggestion) {
    handlePasswordChange(suggestion);
  }

  // Custom handler to add scan overlay delay
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handlePasswordChange(newPassword) {
    setPassword(newPassword);
    setLocal(null);
    setHibpCount(null);
    setError(null);
    setMutations([]);
    setShowResult(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true);
    setScanLog(["Initializing password analysis..."]);

    timerRef.current = setTimeout(async () => {
      try {
        // First analyze locally
        const patterns = detectPatterns(newPassword);
        const response = await fetch('/api/password/analyze', {
          credentials: 'include',
          mode: 'cors',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword })
        });

        if (!response.ok) throw new Error('Analysis failed');
        const data = await response.json();

        setScanLog(prev => [...prev, "Analyzing password strength..."]);
        setLocal({ 
          ...data, 
          patterns,
          entropyBits: data.entropy_bits // Update to match backend response field name
        });
        setHibpCount(data.breached_count || 0);
        setMutations(data.mutations || []);
        setShowResult(true);
      } catch (err) {
        setError('Failed to analyze password. Please try again.');
        console.error('Password analysis error:', err);
      } finally {
        setLoading(false);
      }
    }, 500);
  }

  return (
    <div className="min-h-screen p-6 relative overflow-hidden bg-[#0a0f1c]">
      <style>{`
        .hacker-result-box {
          background: linear-gradient(120deg, rgba(10,15,28,0.95) 0%, rgba(10,15,28,0.98) 60%, rgba(0,250,255,0.18) 100%);
          border-radius: 1.5rem;
          border: 2px solid #00faff;
          box-shadow: 0 0 32px #00faff, 0 0 16px #10ff8d, 0 0 48px #a259ff;
          color: #e0e7ff;
          overflow: hidden;
          position: relative;
          animation: hackerGlow 2.5s infinite alternate;
        }
        .hacker-result-box::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 1.5rem;
          pointer-events: none;
          background: radial-gradient(circle at 80% 20%, rgba(0,250,255,0.18) 0%, rgba(10,15,28,0.7) 80%);
          opacity: 0.8;
          z-index: 0;
          animation: hackerFade 4s ease-in-out infinite alternate;
        }
        @keyframes hackerGlow {
          0% { box-shadow: 0 0 16px #00faff, 0 0 8px #10ff8d, 0 0 24px #a259ff; }
          50% { box-shadow: 0 0 48px #00faff, 0 0 32px #10ff8d, 0 0 64px #a259ff; }
          100% { box-shadow: 0 0 16px #00faff, 0 0 8px #10ff8d, 0 0 24px #a259ff; }
        }
        @keyframes hackerFade {
          0% { opacity: 0.7; }
          50% { opacity: 1; box-shadow: 0 0 48px #00faff, 0 0 16px #10ff8d; }
          100% { opacity: 0.7; }
        }
        .hacker-animated-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: linear-gradient(135deg, rgba(0,250,255,0.12) 0%, rgba(162,89,255,0.08) 100%);
          animation: bgMove 8s linear infinite alternate;
        }
        @keyframes bgMove {
          0% { filter: blur(8px) brightness(1.1); }
          100% { filter: blur(16px) brightness(1.3); }
        }
      `}</style>
      {/* Neon Particle Network Background */}
      <CyberPasswordBackground focusSelector="input[aria-label='Password']" particleCount={44} colors={["#00faff", "#10ff8d", "#a259ff"]} linkDistance={140} particleSize={4} speed={0.22} />
      <EncryptedPasswords />
      <div className="max-w-3xl mx-auto">
        {/* Scan in progress overlay */}
        <AnimatePresence>
          {loading && password && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-60">
              <div className="relative w-full max-w-lg mx-auto p-8 rounded-xl bg-gray-900/80 border border-cyan-500 shadow-2xl">
                {/* Sweep line */}
                <div className="absolute left-0 top-0 w-full h-1">
                  <motion.div initial={{ x: -400 }} animate={{ x: 400 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="h-1 w-32 bg-cyan-400/80 rounded-full shadow-lg" />
                </div>
                {/* Terminal log */}
                <div className="mt-6 font-mono text-cyan-200 text-sm bg-gray-800/80 rounded p-4 shadow-inner" style={{ minHeight: 90 }}>
                  {scanLog.map((line, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.3 }}>{line}</motion.div>
                  ))}
                </div>
                <div className="mt-4 text-center text-cyan-400 font-bold animate-pulse">Scan in progress...</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-cyan-300 drop-shadow-lg">Password Analyzer</h2>
          <Link to="/" className="text-sm text-indigo-400 hover:underline">← Home</Link>
        </div>
        <div className="bg-transparent shadow-none rounded-xl p-0 relative">
          <div className="flex flex-col items-center justify-center w-full relative z-10">
            <div className="flex justify-end w-full">
              <button
                onClick={() => {
                  setPassword("");
                  setLocal(null);
                  setHibpCount(null);
                  setError(null);
                  setMutations([]);
                }}
                className="text-sm text-cyan-400 hover:text-cyan-200"
                style={{ position: "relative", overflow: "hidden" }}
              >
                <span className="shimmer">Reset</span>
                <style>{`
                  .shimmer {
                    background: linear-gradient(90deg, #e0e7ff 0%, #a5b4fc 50%, #e0e7ff 100%);
                    background-size: 200% 100%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer 2s infinite linear;
                  }
                  @keyframes shimmer { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
                `}</style>
              </button>
            </div>
            <div className="mt-4 w-full flex flex-col items-center">
              <label className="block text-sm font-medium text-cyan-300 mb-1">Password</label>
              <div className="flex gap-2 w-full max-w-md">
                <input
                  type={visible ? "text" : "password"}
                  value={password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  placeholder="Type password to analyze"
                  className="w-[380px] min-w-[270px] max-w-full border border-cyan-500 bg-gray-900 text-cyan-200 rounded px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg placeholder:text-cyan-300 text-base"
                  aria-label="Password"
                  style={{zIndex: 10, background: 'rgba(15,23,42,0.95)', letterSpacing: '0.02em'}}
                />
                <button
                  onClick={() => setVisible(v => !v)}
                  className="px-3 py-2 border border-cyan-500 rounded select-none bg-gray-800 text-cyan-200 hover:bg-cyan-700 hover:text-white"
                  aria-label={visible ? "Hide password" : "Show password"}
                  style={{zIndex: 10}}
                >
                  {visible ? "Hide" : "Show"}
                </button>
                <motion.button
                  onClick={autoPickBestSuggestion}
                  disabled={loading || mutations.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60 relative overflow-hidden"
                  title="Auto-Pick Best Suggestion"
                  whileTap={{ scale: 0.97 }}
                  style={{zIndex: 10}}
                >
                  <span className="shimmer">{loading ? "Analyzing…" : "Auto-Pick Best Suggestion"}</span>
                </motion.button>
              </div>
              {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
            </div>
            {/* Result */}
            {local && (
              <div className="hacker-result-box relative overflow-hidden animate-fadeIn p-6 mt-6 w-full">
                <div className="hacker-animated-bg" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-sm text-cyan-400">Strength</div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="text-lg font-semibold text-cyan-300 drop-shadow-lg">{labels[local.score ?? 0]}</div>
                        <div className="text-sm text-cyan-200">({local.score ?? 0} / 4)</div>
                      </div>
                      <div className="text-sm text-cyan-200 mt-1">
                        Entropy: {local?.entropyBits ? Math.round(local.entropyBits) + " bits" : "—"}
                      </div>
                    </div>
                    {/* Circular Strength Gauge */}
                    <motion.div className="w-24 h-24" initial={false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                      <CircularProgressbar
                        value={((local.score ?? 0) + 1) * 20}
                        maxValue={100}
                        text={labels[local.score ?? 0]}
                        styles={buildStyles({
                          pathColor: ["#ef4444", "#f59e42", "#fde047", "#34d399", "#22c55e"][local.score ?? 0],
                          textColor: "#0ea5e9",
                          trailColor: "#e0e7ff",
                          backgroundColor: "#0f172a",
                        })}
                      />
                    </motion.div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium text-cyan-300">Feedback</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {/* Requirement chips with ticks/shakes */}
                        {local.feedback?.suggestions?.length ? (
                          local.feedback.suggestions.map((s, i) => (
                            <motion.div
                              key={i}
                              className={clsx("px-3 py-1 rounded-full text-sm font-semibold border flex items-center gap-2", "bg-gray-100", "border-cyan-400")}
                              initial={{ scale: 1 }}
                              animate={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95, rotate: -5 }}
                            >
                              <span className="text-cyan-700">{s}</span>
                              <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-green-400"
                              >✔</motion.span>
                            </motion.div>
                          ))
                        ) : (
                          <motion.div className="px-3 py-1 rounded-full text-sm font-semibold border bg-green-100 border-green-300 flex items-center gap-2" initial={{ scale: 0.9 }} animate={{ scale: 1.05 }}>
                            <span className="text-green-700">All requirements met!</span>
                            <span className="text-green-500">✔</span>
                          </motion.div>
                        )}
                      </div>
                      {local.crackTimes && (
                        <div className="mt-3 text-sm text-cyan-300">
                          <strong>Estimated crack time (offline slow):</strong>
                          <div>{local.crackTimes.offline_slow_hashing_1e4_per_second}</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-cyan-300">Breach & Reuse Risk</h4>
                      <div className="mt-2 text-sm text-cyan-200">
                        <div>
                          <strong>Breach:</strong>{" "}
                          {hibpCount === null ? (
                            <span className="text-gray-500">Unknown</span>
                          ) : hibpCount === 0 ? (
                            <span className="text-green-400">No matches</span>
                          ) : (
                            <span className="text-red-400">Found ({hibpCount.toLocaleString()})</span>
                          )}
                        </div>
                        <div className="mt-3">
                          <strong>Reuse risk:</strong>{" "}
                          <span
                            className={
                              reuseRisk.level === "High"
                                ? "text-red-400"
                                : reuseRisk.level === "Medium"
                                ? "text-yellow-400"
                                : "text-green-400"
                            }
                          >
                            {reuseRisk.level}
                          </span>
                          <div className="text-xs text-cyan-400 mt-1">
                            {reuseRisk.reasons && reuseRisk.reasons.join(" · ")}
                          </div>
                        </div>
                        <div className="mt-3">
                          <strong>Detected patterns:</strong>
                          <div className="mt-2">
                            {local.patterns.length === 0 ? (
                              <span className="text-gray-500 text-sm">No obvious simple patterns</span>
                            ) : (
                              local.patterns.map((p, i) => (
                                <div key={i} className="text-sm text-cyan-300">
                                  • {p}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <strong className="text-cyan-300">Multiple Suggestions</strong>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mutations.length === 0 ? (
                        <div className="text-gray-500 text-sm">No suggestions</div>
                      ) : (
                        mutations.map((m, i) => (
                          <button
                            key={i}
                            onClick={() => applySuggestion(m)}
                            className="px-3 py-1 border border-cyan-400 rounded text-sm hover:bg-cyan-900 text-cyan-200 bg-gray-900"
                          >
                            {m}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-cyan-400">
                    Privacy note: password analysis and breach check are done securely on backend. No password is stored.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
