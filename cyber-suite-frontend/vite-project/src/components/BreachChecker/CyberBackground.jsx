import React from "react";
// Animated cyber background (matrix code rain)
export default function CyberBackground({ found }) {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrame;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    const columns = Math.floor(w / 18);
    const drops = Array(columns).fill(1);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
    function draw() {
      ctx.fillStyle = found ? "rgba(40,10,10,0.18)" : "rgba(10,40,10,0.18)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = "16px monospace";
      ctx.fillStyle = found ? "#ff2d55" : "#00ff99";
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * 18, drops[i] * 18);
        if (drops[i] * 18 > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.2; // slower speed
      }
      animationFrame = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, [found]);
  return (
    <canvas ref={canvasRef} style={{position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none"}} />
  );
}
