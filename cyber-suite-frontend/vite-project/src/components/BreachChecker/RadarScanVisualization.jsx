import React, { useRef, useEffect } from "react";

// Dark Web Radar Scan Visualization
export default function RadarScanVisualization({ found, email }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrame;
    const w = 340;
    const h = 340;
    canvas.width = w;
    canvas.height = h;
    const center = { x: w / 2, y: h / 2 };
    let angle = 0;
    // Each dot represents a scan source or breach check
    const breachDots = [
      { r: 110, theta: 0.2, label: "HaveIBeenPwned" },
      { r: 140, theta: 1.1, label: "XposedOrNot" },
      { r: 90, theta: 2.2, label: "CyberNews" },
      { r: 120, theta: 3.0, label: "Dehashed" },
      { r: 80, theta: 4.1, label: "LeakCheck" },
      { r: 130, theta: 5.0, label: "Dark Web Scan" }
    ];
    let dotStates = breachDots.map(() => false);
    function drawRadar() {
      ctx.clearRect(0, 0, w, h);
      // Background
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, w, h);
      // Radar circles
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 2;
      for (let r = 60; r <= 160; r += 30) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, 2 * Math.PI);
        ctx.stroke();
      }
      // Radar beam
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 160, -0.04, 0.04);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fillStyle = found ? "rgba(255,45,85,0.18)" : "rgba(16,185,129,0.18)";
      ctx.fill();
      ctx.restore();
      // Email center
      ctx.beginPath();
      ctx.arc(center.x, center.y, 32, 0, 2 * Math.PI);
      ctx.shadowColor = found ? "#ff2d55" : "#10b981";
      ctx.shadowBlur = 16;
      ctx.fillStyle = found ? "#ff2d55" : "#10b981";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = "bold 1.1em monospace";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText(email || "Your Email", center.x, center.y + 4);
      // Dots
      breachDots.forEach((dot, i) => {
        const dotAngle = dot.theta;
        const beamAngle = angle % (2 * Math.PI);
        if (!dotStates[i] && Math.abs(beamAngle - dotAngle) < 0.08) {
          dotStates[i] = true;
        }
        let color = found ? (dotStates[i] ? "#ff2d55" : "#222") : (dotStates[i] ? "#10b981" : "#222");
        ctx.beginPath();
        ctx.arc(center.x + dot.r * Math.cos(dotAngle), center.y + dot.r * Math.sin(dotAngle), 10, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = dotStates[i] ? 1 : 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
        // Draw label for each dot
        ctx.font = "bold 0.9em monospace";
        ctx.fillStyle = dotStates[i] ? (found ? "#ff2d55" : "#10b981") : "#888";
        ctx.textAlign = "center";
        ctx.fillText(dot.label, center.x + dot.r * Math.cos(dotAngle), center.y + dot.r * Math.sin(dotAngle) + 22);
      });
      // If safe, fade dots after full rotation
      if (!found && angle > 2 * Math.PI) {
        dotStates = dotStates.map(() => false);
        angle = 0;
      }
      angle += 0.03;
      animationFrame = requestAnimationFrame(drawRadar);
    }
    drawRadar();
    return () => cancelAnimationFrame(animationFrame);
  }, [found, email]);
  return (
    <div className="w-full flex flex-col items-center justify-center">
      <canvas ref={canvasRef} width={340} height={340} style={{borderRadius: "50%", boxShadow: "0 0 32px #222", background: "#18181b"}} />
    </div>
  );
}
