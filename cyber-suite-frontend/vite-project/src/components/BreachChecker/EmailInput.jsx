import React, { useState, useEffect, useRef } from "react";
import { isValidEmail } from "../../utils/breachUtils";

const placeholderText = "Enter your email to check for breaches...";

export default function EmailInput({ onSubmit, loading }){
  const [email, setEmail] = useState("");
  const ph = placeholderText;

  function submit(e){
    e.preventDefault();
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    onSubmit(email);
  }

  return (
    <form onSubmit={submit} className="relative cyber-input-form p-5 rounded-xl border-2 border-cyan-900 shadow-cyber bg-gradient-to-br from-[#101a24] via-[#071018] to-[#0b2730] text-cyan-200 font-cyber overflow-hidden animate-cyber-box">
      {/* Animated background lines */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[...Array(12)].map((_,i)=>(
          <div key={i} className="absolute top-0 left-0 w-full h-full animate-cyber-lines" style={{left: `${i*8}%`, opacity: 0.06 + 0.03*(i%3), background: 'linear-gradient(180deg, #00fff7 0%, transparent 100%)', width: '2px', height: '100%', filter: 'blur(2px)'}}></div>
        ))}
      </div>
      <div className="flex gap-3 items-center relative z-10">
        <div className="flex-1">
          <input
            className="w-full bg-transparent outline-none placeholder:text-cyan-400 text-cyan-100 p-3 typing-placeholder rounded font-cyber text-lg tracking-wider shadow-cyber focus:ring-2 focus:ring-cyan-400"
            placeholder={ph || placeholderText}
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            aria-label="email"
            autoComplete="off"
            spellCheck={false}
            style={{ transition: 'color 0.3s, opacity 0.3s', opacity: ph.length ? 1 : 0.5 }}
          />
          <div className="text-xs text-cyan-400 mt-2 font-mono">We hash & cache your email server-side; nothing is stored client-side.</div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`px-5 py-2 rounded font-bold text-lg shadow-cyber border-2 border-cyan-900 bg-cyan-800 hover:bg-cyan-600 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${loading ? "bg-gray-600 cursor-not-allowed" : ""}`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <span className="loader-dots text-cyan-200">
                <div></div><div></div><div></div>
              </span>
              <span className="text-xs">Scanning</span>
            </div>
          ) : <span className="glow-text">Check</span>}
        </button>
      </div>
      {/* Cyber font and glow effect styles */}
      <style>{`
        .font-cyber { font-family: 'Share Tech Mono', 'Fira Mono', 'Consolas', monospace; }
        .shadow-cyber { box-shadow: 0 0 8px #00fff7, 0 0 1px #0ff inset; }
        .glow-text { text-shadow: 0 0 3px #00fff7, 0 0 1px #0ff; }
        .cyber-input-form { box-shadow: 0 0 12px #00fff722, 0 0 1px #0ff inset; }
        @keyframes cyber-lines { 0% {transform: translateY(-100%);} 100% {transform: translateY(100%);} }
        .animate-cyber-lines { animation: cyber-lines 2.5s linear infinite; }
        @keyframes cyber-box {
          0%, 100% { box-shadow: 0 0 12px #00fff722, 0 0 1px #0ff inset; }
          50% { box-shadow: 0 0 20px #00fff744, 0 0 2px #0ff inset; }
        }
        .animate-cyber-box { animation: cyber-box 4s ease-in-out infinite; }
        .typing-placeholder::placeholder { opacity: 0.7; transition: opacity 0.3s; }
      `}</style>
    </form>
  );
}
