import React from "react";
// Static breach stats card
const stats = {
  totalBreaches: 3200,
  mostTargetedDomains: ["gmail.com", "yahoo.com", "outlook.com"],
  percentGmailBreached: "31%"
};
export default function BreachStatsCard() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 text-white shadow-lg p-6 flex flex-col items-center justify-center min-h-[140px] animate-fade-in animate-glow">
      <div className="text-sm font-semibold tracking-wide mb-2">2025 Breach Stats</div>
      <div className="text-lg font-bold mb-2">Total Breaches: {stats.totalBreaches}</div>
      <div className="text-sm mb-1">Most Targeted Domains:</div>
      <div className="flex gap-2 mb-2">
        {stats.mostTargetedDomains.map((d, i) => (
          <span key={i} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-semibold">{d}</span>
        ))}
      </div>
      <div className="text-sm">% Gmail Breached: <span className="font-bold text-emerald-300">{stats.percentGmailBreached}</span></div>
    </div>
  );
}
