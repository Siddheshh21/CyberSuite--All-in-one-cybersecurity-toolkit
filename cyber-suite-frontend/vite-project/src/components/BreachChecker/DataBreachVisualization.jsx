import React from "react";
// Animated network graph for breach visualization
export default function DataBreachVisualization({ found }) {
  // Animated network graph with slow line/node reveal
  const [showLine, setShowLine] = React.useState(false);
  const [showNode, setShowNode] = React.useState(false);
  React.useEffect(() => {
    setShowLine(false);
    setShowNode(false);
    const lineTimer = setTimeout(() => setShowLine(true), 600);
    const nodeTimer = setTimeout(() => setShowNode(true), 1200);
    return () => { clearTimeout(lineTimer); clearTimeout(nodeTimer); };
  }, [found]);
  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 text-white shadow-lg p-6 flex flex-col items-center justify-center min-h-[180px] animate-fade-in animate-glow">
      <div className="text-sm font-semibold tracking-wide mb-2">Data Breach Visualization</div>
      <svg width="220" height="120">
        {/* Email node */}
        <circle cx="60" cy="60" r="22" fill="#6366f1" />
        <text x="60" y="66" textAnchor="middle" fill="#fff" fontSize="14">Email</text>
        {/* Animated line */}
        {showLine && (
          <line x1="82" y1="60" x2="160" y2="40" stroke={found ? "#ef4444" : "#10b981"} strokeWidth="4" style={{transition: "all 1s"}} />
        )}
        {/* Animated breach/safe node */}
        {showNode && (
          <circle cx="180" cy="40" r="18" fill={found ? "#ef4444" : "#10b981"} style={{transition: "all 1s"}} />
        )}
        {showNode && (
          <text x="180" y="45" textAnchor="middle" fill="#fff" fontSize="12">{found ? "Breach" : "Safe"}</text>
        )}
      </svg>
      <div className="mt-4 text-base font-bold">
        {found ? "Breach Detected" : "No Breach Found"}
      </div>
    </div>
  );
}
