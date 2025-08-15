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
    <div className="p-4 rounded bg-white border">
      <h4 className="text-lg font-semibold mb-3">Breach details</h4>
      <div className="space-y-4">
        {breaches.length === 0 && <div className="text-sm text-gray-600">No breaches listed.</div>}
        {breaches.map((b, idx) => (
          <div key={idx} className="p-3 rounded border hover:shadow-sm">
            <div className="flex items-start gap-4">
              <LogoCircle name={b.name} domain={b.domain} />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">{b.name} {b.verified ? <span className="ml-2 text-xs text-emerald-600">verified</span> : <span className="ml-2 text-xs text-gray-400">unverified</span>}</div>
                    <div className="text-xs text-gray-500">{b.domain || "—"}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-700">{timeSinceFromISO(b.breach_date_iso)}</div>
                    <div className="text-xs text-gray-500">{b.breach_date_iso ? new Date(b.breach_date_iso).toLocaleDateString() : "Unknown date"}</div>
                  </div>
                </div>

                <div className="mt-2 text-sm text-gray-700">{b.description}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(b.data_classes||[]).map((d, i) => (
                    <div key={i} className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 border">{d}</div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs">
                  <div className="text-gray-600">Inline recommendations:</div>
                  <div className="flex gap-2 flex-wrap">
                    {b.data_classes && b.data_classes.map((d,i) => {
                      const low = String(d).toLowerCase();
                      if (low.includes("password") || low.includes("hash")) return <span key={i} className="px-2 py-1 rounded bg-red-50 text-red-700">Rotate passwords</span>;
                      if (low.includes("phone")) return <span key={i} className="px-2 py-1 rounded bg-yellow-50 text-yellow-700">Watch SMS phishing</span>;
                      if (low.includes("credit")) return <span key={i} className="px-2 py-1 rounded bg-orange-50 text-orange-700">Check statements</span>;
                      return <span key={i} className="px-2 py-1 rounded bg-slate-50 text-slate-700">Review</span>;
                    })}
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
