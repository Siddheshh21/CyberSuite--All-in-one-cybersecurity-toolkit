// src/pages/BreachChecker.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import EmailInput from "../components/BreachChecker/EmailInput";
import MicroInteractions from "../components/BreachChecker/MicroInteractions";
import BreachRiskMeter from "../components/BreachChecker/BreachRiskMeter";
import SecurityFactsCarousel from "../components/BreachChecker/SecurityFactsCarousel";
import BreachStatsCard from "../components/BreachChecker/BreachStatsCard";
import DataBreachVisualization from "../components/BreachChecker/DataBreachVisualization";
// ...existing code...
import RadarScanVisualization from "../components/BreachChecker/RadarScanVisualization";
import SecurityActions from "../components/BreachChecker/SecurityActions";
import HackerUsesPanel from "../components/BreachChecker/HackerUsesPanel";
import PasswordSafetyBox from "../components/BreachChecker/PasswordSafetyBox";
import CyberBackground from "../components/BreachChecker/CyberBackground";
// Only import new/needed components as you build them

export default function BreachChecker(){
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
    async function handleCheck(email){
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await fetch(`${API_BASE}/api/email/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.detail || "Failed to check email");
        setResult(json);
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }
  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-900 relative">
      <CyberBackground found={result?.found} />
      <div className="max-w-5xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div>
          {/* Home link at top left with reduced top margin */}
          <div className="flex items-center justify-center sm:justify-start mb-2 mt-0">
            <Link to="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold text-indigo-400 hover:text-indigo-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h5m4-11v11a1 1 0 001 1h5a1 1 0 001-1V10" />
              </svg>
              Home
            </Link>
          </div>
          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-100">Email Breach Checker</h2>
            <p className="text-sm text-gray-300 mt-1">Scan your email across known breaches and get step-by-step remediation.</p>
          </div>
          <div className="relative rounded-xl p-4 sm:p-6 cyber-outer-box">
            <EmailInput onSubmit={handleCheck} loading={loading} />
            {error && <div className="mt-4 p-3 rounded bg-red-100 text-red-700">{error}</div>}
            <MicroInteractions loading={loading} found={result?.found} />
            {result && (
              <div className="mt-6 space-y-6">
                {/* Status card at top */}
                {result.found ? (
                  <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
                    <div>
                      <h3 className="text-lg font-bold text-red-800">Warning — your email has been breached!</h3>
                      <div className="text-sm text-gray-700 mt-1">Email: <span className="font-semibold">{result.email}</span></div>
                      <div className="text-xs text-gray-600 mt-2">~sources: <a href="https://haveibeenpwned.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">HaveIBeenPwned</a>, <a href="https://xposedornot.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">XposedOrNot</a></div>
                      <div className="text-xs text-gray-500 mt-1">For detailed info, visit these websites!</div>
                    </div>
                    <div>
                      <div className="px-3 py-1 rounded bg-red-600 text-white font-semibold text-base">Unsafe</div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
                    <div>
                      <h3 className="text-lg font-bold text-emerald-800">Good news — no breaches found!</h3>
                      <div className="text-sm text-gray-700 mt-1">Email: <span className="font-semibold">{result.email}</span></div>
                      <div className="text-xs text-gray-600 mt-2">~sources: <a href="https://haveibeenpwned.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">HaveIBeenPwned</a>, <a href="https://xposedornot.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">XposedOrNot</a></div>
                    </div>
                    <div>
                      <div className="px-3 py-1 rounded bg-emerald-500 text-white font-semibold text-base">Safe</div>
                    </div>
                  </div>
                )}
                <div className="mb-6">
                  <BreachRiskMeter found={result.found} />
                </div>
                {/* Option to show RadarScanVisualization instead of DataShardsExplosion */}
                <RadarScanVisualization found={result.found} email={result.email} />
                <div className="mt-8">
                  <SecurityActions />
                </div>
              </div>
            )}
            <style>{`
              .cyber-outer-box {
                background: linear-gradient(135deg, #101a24 0%, #071018 60%, #0b2730 100%);
                box-shadow: 0 0 32px #00fff711, 0 0 2px #0ff inset;
                border: 2px solid #00fff7;
                transition: box-shadow 0.3s;
              }
            `}</style>
          </div>
        </div>
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-6 sm:gap-8 mt-8 sm:mt-32">
            <SecurityFactsCarousel />
            <BreachStatsCard />
            <HackerUsesPanel />
            <PasswordSafetyBox />
          </div>
        </div>
      </div>
    </div>
  );
}
