import React from "react";
import { Link } from "react-router-dom";

export default function PasswordSafetyBox() {
  return (
  <div className="rounded-xl bg-gradient-to-br from-sky-900 to-blue-700 text-white shadow-lg p-6 flex flex-col items-center justify-center min-h-[140px] animate-fade-in animate-glow mt-2">
      <div className="text-lg font-bold tracking-wide mb-2 flex items-center gap-2">
        <span role="img" aria-label="lock" className="animate-bounce">🔐</span>
        Password Safety Awareness
      </div>
      <div className="text-base text-center mb-2">Hackers can crack short passwords in seconds, don’t be a victim.</div>
      <div className="text-base text-center mb-2">Think Your Password is Safe? Let’s Find Out.</div>
      <div className="text-base text-center mb-2">Your password is analyzed locally in your browser — <span className="font-bold text-emerald-300">100% private</span>.</div>
      <div className="mt-2 text-base font-bold">
        <Link
          to="/password-analyzer"
          className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-extrabold shadow-cyan hover:scale-105 transition-transform duration-200"
          style={{ boxShadow: "0 0 12px #22d3ee, 0 0 2px #0ff" }}
        >
          Try our Password Analyzer
        </Link>
      </div>
    </div>
  );
}
