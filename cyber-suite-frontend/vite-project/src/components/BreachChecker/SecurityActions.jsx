import React from "react";
import { Link } from "react-router-dom";
// Animated personal security recommendations
const recommendations = [
  "Use strong and unique passwords for every account.",
  "Turn on 2-step verification (2FA) wherever possible.",
  "Never share your passwords or OTPs with anyone.",
  "Watch out for suspicious emails and links.",
  "Update your passwords regularly to stay safe."
];
export default function SecurityActions() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-700 text-white shadow-lg p-6 flex flex-col items-center justify-center min-h-[180px] animate-fade-in animate-glow">
      <div className="text-lg font-bold tracking-wide mb-3 flex items-center gap-2">
        <span role="img" aria-label="shield" className="animate-bounce">🛡️</span>
        Personal Security Recommendations
      </div>
      <ul className="pl-0 w-full flex flex-col gap-2">
        {recommendations.map((r, i) => (
          <li key={i} className="flex items-center gap-3 text-emerald-100 animate-slide-in" style={{animationDelay: `${i * 0.35}s`}}>
            <span role="img" aria-label="tip" className="text-emerald-300 animate-pulse">{i === 0 ? "🔑" : i === 1 ? "🔒" : i === 2 ? "🙅‍♂️" : i === 3 ? "⚠️" : "🔄"}</span>
            <span className="text-base font-semibold">{r}</span>
          </li>
        ))}
      </ul>
  {/* Password analyzer link removed, now in its own box */}
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-in { animation: slideIn 0.8s cubic-bezier(.4,2,.3,1) forwards; }
      `}</style>
    </div>
  );
}
