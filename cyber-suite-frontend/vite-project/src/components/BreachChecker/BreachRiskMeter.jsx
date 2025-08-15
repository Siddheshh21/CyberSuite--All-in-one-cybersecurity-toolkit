import React from "react";
// Animated circular risk meter for breach status
export default function BreachRiskMeter({ found }) {
  // Animate percentage from 0 to 100%
  const targetPercent = 100;
  const [percent, setPercent] = React.useState(0);
  const color = found ? "#ef4444" : "#10b981";
  React.useEffect(() => {
    let frame;
    let start = 0;
    function animate() {
      if (start < targetPercent) {
        start += 2;
        setPercent(Math.min(start, targetPercent));
        frame = requestAnimationFrame(animate);
      }
    }
    setPercent(0);
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [found]);
  return (
    <div className="flex flex-col items-center justify-center animate-glow">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle
          cx="60" cy="60" r="50"
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={2 * Math.PI * 50}
          strokeDashoffset={2 * Math.PI * 50 * (1 - percent / 100)}
          style={{ transition: "stroke-dashoffset 0.5s" }}
        />
        <text x="60" y="68" textAnchor="middle" fontSize="2em" fill={color} fontWeight="bold">
          {percent}%
        </text>
      </svg>
      <div className={`mt-2 text-lg font-bold ${found ? "text-red-600" : "text-emerald-600"}`}>
        {found ? "100% High Risk" : "100% Safe"}
      </div>
    </div>
  );
}
