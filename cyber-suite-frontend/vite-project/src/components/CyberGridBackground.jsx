import React, { useRef, useEffect } from "react";

// Cyber grid + pulsing particles + sweep animation
export default function CyberGridBackground() {
  const canvasRef = useRef(null);
  const gridSize = 22; // number of columns/rows
  const dotRadius = 2.5;
  const gridGap = 32; // px between dots
  const sweepSpeed = 0.38; // px/ms (slightly faster)
  const pulseMin = 0.7, pulseMax = 1.7;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Generate grid points
    const points = [];
    for (let x = gridGap; x < width - gridGap; x += gridGap) {
      for (let y = gridGap; y < height - gridGap; y += gridGap) {
        points.push({ x, y, pulse: Math.random() });
      }
    }

    let sweepX = 0;
    let lastTime = performance.now();

    function draw(now) {
      const dt = now - lastTime;
      lastTime = now;
      sweepX += sweepSpeed * dt;
      if (sweepX > width) sweepX = 0;
      ctx.clearRect(0, 0, width, height);

      // Draw grid lines
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.strokeStyle = "#22d3ee";
      for (let x = gridGap; x < width - gridGap; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, gridGap);
        ctx.lineTo(x, height - gridGap);
        ctx.stroke();
      }
      for (let y = gridGap; y < height - gridGap; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(gridGap, y);
        ctx.lineTo(width - gridGap, y);
        ctx.stroke();
      }
      ctx.restore();

      // Draw sweep
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#0ff";
      ctx.fillRect(sweepX - 18, gridGap, 36, height - 2 * gridGap);
      ctx.restore();

      // Draw dots
      points.forEach((pt, i) => {
        // Pulse animation
        pt.pulse += (Math.random() - 0.5) * 0.04;
        pt.pulse = Math.max(pulseMin, Math.min(pulseMax, pt.pulse));
        // If sweep is near, brighten
        let glow = Math.abs(pt.x - sweepX) < 36 ? 0.7 : 0.3;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, dotRadius * pt.pulse, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(34,211,238,${glow})`;
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = glow > 0.5 ? 12 : 4;
        ctx.fill();
        ctx.restore();
      });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    // Resize handler
    function handleResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        background: "transparent"
      }}
      aria-hidden="true"
    />
  );
}
