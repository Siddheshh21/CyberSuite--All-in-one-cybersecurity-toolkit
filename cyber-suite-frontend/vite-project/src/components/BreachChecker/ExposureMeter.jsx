import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const zoneColors = ["#16a34a","#7cbd3c","#f59e0b","#fb923c","#ef4444"];

export default function ExposureMeter({ score = 0, band = "Unknown" }){
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(()=>{
    let raf;
    const start = performance.now();
    const from = animatedScore;
    const to = score;
    function step(now){
      const t = Math.min(1, (now - start) / 700);
      setAnimatedScore(Math.round(from + (to - from) * t));
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return ()=> cancelAnimationFrame(raf);
  }, [score]);

  const rotation = -120 + (animatedScore / 100) * 240;
  const zoneIndex = Math.min(4, Math.floor(animatedScore / 20));

  return (
    <div className="p-4 rounded bg-white border text-center">
      <div className="text-sm text-gray-600">Dark web exposure</div>
      <div className="relative mt-3 h-36 flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-40 h-36" >
          {Array.from({length:5}).map((_, i) => {
            const start = -120 + (i*48);
            const end = start + 48;
            const r = 60;
            const cx = 100, cy = 90;
            const a1 = (Math.PI/180)*(start);
            const a2 = (Math.PI/180)*(end);
            const x1 = cx + r * Math.cos(a1);
            const y1 = cy + r * Math.sin(a1);
            const x2 = cx + r * Math.cos(a2);
            const y2 = cy + r * Math.sin(a2);
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                stroke={zoneColors[i]}
                strokeWidth={10}
                fill="none"
                strokeOpacity={i <= zoneIndex ? 1 : 0.18}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx="100" cy="90" r="34" fill="#0f1724" stroke="#e6edf3" strokeOpacity="0.06" />
        </svg>

        <div className="absolute flex flex-col items-center -bottom-1">
          <div className="text-2xl font-bold text-gray-800">{animatedScore}</div>
          <div className="text-xs text-gray-500">{band}</div>
          <div className="mt-2 w-40 text-xs text-gray-400">Score combines severity, recency and sensitive data types.</div>
        </div>

        <motion.div
          style={{ originX: "50%", originY: "80%" }}
          animate={{ rotate: rotation }}
          transition={{ type: "spring", stiffness: 90, damping: 12 }}
          className="absolute w-[2px] h-[72px] bg-gray-800 rounded"
        />
      </div>
    </div>
  );
}
