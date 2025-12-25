import React from "react";
import { timeSinceFromISO } from "../../utils/breachUtils";

function LogoCircle({ name, domain }){
  const letter = (name||domain||"U").charAt(0).toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl font-semibold text-white">
      {letter}
    </div>
  );
}

export default function BreachDetailsTable({ breaches = [] }){
  return (
    <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-lg">
      <h4 className="text-xl font-bold mb-4 text-slate-800">Breach Details</h4>
      <div className="space-y-4">
        {breaches.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🛡️</div>
            <div className="text-slate-600">No breaches found for this email</div>
          </div>
        )}
        {breaches.map((b, idx) => (
          <div key={idx} className="p-4 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
            <div className="flex items-start gap-4">
              <LogoCircle name={b.name} domain={b.domain} />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-800 text-lg">
                      {b.name} 
                      {b.verified ? (
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">✓ Verified</span>
                      ) : (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">⚠ Unverified</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 font-medium">{b.domain || "Domain unknown"}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700">{timeSinceFromISO(b.breach_date_iso)}</div>
                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {b.breach_date_iso ? new Date(b.breach_date_iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Unknown date"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border-l-4 border-blue-400">
                  {b.description}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(b.data_classes||[]).map((d, i) => (
                    <div key={i} className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 font-medium">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3 text-xs">
                  <div className="text-slate-600 font-semibold">Security actions:</div>
                  <div className="flex gap-2 flex-wrap">
                    {(() => {
                      const recommendations = new Set();
                      const dataClasses = b.data_classes || [];
                      
                      // Check all data classes and add relevant recommendations
                      dataClasses.forEach(d => {
                        const low = String(d).toLowerCase();
                        if (low.includes("password") || low.includes("hash")) {
                          recommendations.add("Change passwords");
                          recommendations.add("Use password manager");
                        }
                        if (low.includes("phone")) {
                          recommendations.add("Watch SMS phishing");
                        }
                        if (low.includes("credit")) {
                          recommendations.add("Check statements");
                        }
                        if (low.includes("email")) {
                          recommendations.add("Watch for phishing emails");
                        }
                        if (low.includes("address")) {
                          recommendations.add("Be cautious of mail scams");
                        }
                        if (low.includes("name")) {
                          recommendations.add("Monitor identity theft");
                        }
                      });
                      
                      // Always add 2FA recommendation for any breach
                      if (dataClasses.length > 0) {
                        recommendations.add("Enable 2FA");
                      }
                      
                      // Convert to array and render unique recommendations
                      return Array.from(recommendations).map((rec, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200 font-medium text-[11px] hover:shadow-sm transition-all">
                          {rec}
                        </span>
                      ));
                    })()}
                  </div>
                </div>

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
