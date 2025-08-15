import React, { useRef, useEffect } from "react";

// CyberPasswordBackground: Advanced animated cyber mesh for password analysis
export default function CyberPasswordBackground({ focusSelector = null, particleCount = 44, colors = ["#00faff", "#10ff8d", "#a259ff"], linkDistance = 140, particleSize = 4, speed = 0.22 }) {
  const canvasRef = useRef();
  const particles = useRef([]);
  const links = useRef([]);
  const animationRef = useRef();
  const mouse = useRef({ x: null, y: null, active: false });
  const dpr = window.devicePixelRatio || 1;

  // Particle class
  class Particle {
    constructor(x, y, vx, vy, color) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.baseColor = color;
      this.radius = particleSize + Math.random() * 1.5;
      this.glow = 0.22 + Math.random() * 0.28;
      this.pulse = Math.random() * Math.PI * 2;
      this.lock = Math.random() > 0.7; // Some particles are 'lock' icons
    }
    update(w, h) {
      this.x += this.vx;
      this.y += this.vy;
      // Wrap around edges for seamless mesh
      if (this.x < 0) this.x = w;
      if (this.x > w) this.x = 0;
      if (this.y < 0) this.y = h;
      if (this.y > h) this.y = 0;
      // Pulse effect
      this.pulse += 0.04 + Math.random() * 0.01;
      this.radius = particleSize + Math.sin(this.pulse) * 1.5;
    }
    draw(ctx, mouse) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * dpr, 0, 2 * Math.PI);
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 18 * dpr * this.glow;
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
      // Draw lock icon for some particles
      if (this.lock) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.translate(this.x, this.y);
        ctx.scale(0.7, 0.7);
        ctx.beginPath();
        ctx.arc(0, 0, 6 * dpr, Math.PI, 2 * Math.PI);
        ctx.moveTo(-6 * dpr, 0);
        ctx.lineTo(-6 * dpr, 6 * dpr);
        ctx.lineTo(6 * dpr, 6 * dpr);
        ctx.lineTo(6 * dpr, 0);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2 * dpr;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8 * dpr;
        ctx.stroke();
        ctx.restore();
      }
      // Interactivity: brighten/repel near mouse
      if (mouse.x !== null) {
        const dx = this.x - mouse.x, dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius * dpr * 1.7, 0, 2 * Math.PI);
          ctx.fillStyle = this.color;
          ctx.shadowColor = this.color;
          ctx.shadowBlur = 36 * dpr;
          ctx.fill();
          ctx.restore();
          // Repel
          this.x += dx / dist * 0.8;
          this.y += dy / dist * 0.8;
        }
      }
    }
  }

  // Link class
  class Link {
    constructor(a, b, color) {
      this.a = a;
      this.b = b;
      this.color = color;
      this.opacity = 0.22 + Math.random() * 0.16;
      this.wave = Math.random() * Math.PI * 2;
    }
    draw(ctx, frame) {
      const dx = this.a.x - this.b.x, dy = this.a.y - this.b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < linkDistance) {
        ctx.save();
        ctx.beginPath();
        // Animated wave effect on lines
        const midX = (this.a.x + this.b.x) / 2 + Math.sin(frame / 18 + this.wave) * 8 * dpr;
        const midY = (this.a.y + this.b.y) / 2 + Math.cos(frame / 18 + this.wave) * 8 * dpr;
        ctx.moveTo(this.a.x, this.a.y);
        ctx.quadraticCurveTo(midX, midY, this.b.x, this.b.y);
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = this.opacity * (1 - dist / linkDistance);
        ctx.lineWidth = 1.5 * dpr;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12 * dpr;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Setup particles and links
  function setup(w, h) {
    particles.current = [];
    links.current = [];
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed * (0.7 + Math.random() * 0.7);
      const vy = Math.sin(angle) * speed * (0.7 + Math.random() * 0.7);
      const color = colors[i % colors.length];
      particles.current.push(new Particle(x, y, vx, vy, color));
    }
    // Create links
    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        links.current.push(new Link(particles.current[i], particles.current[j], colors[(i + j) % colors.length]));
      }
    }
  }

  // Animation loop with FPS control
  function animate(frame = 0) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const targetFPS = 30;
    const interval = 1000 / targetFPS;
    let then = Date.now();
    
    function frameHandler() {
      const now = Date.now();
      const delta = now - then;
      
      if (delta > interval) {
        then = now - (delta % interval);
        
        const ctx = canvas.getContext("2d");
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        
        // Draw links
        links.current.forEach(link => link.draw(ctx, frame));
        // Draw particles
        particles.current.forEach(p => {
          p.update(w, h);
          p.draw(ctx, mouse.current);
        });
      }
      
      animationRef.current = requestAnimationFrame(frameHandler);
    }
    
    frameHandler();
  }

  // Resize canvas
  function resize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    setup(w * dpr, h * dpr);
  }

  // Mouse/touch interactivity
  useEffect(() => {
    function handleMove(e) {
      let x, y;
      if (e.touches) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      mouse.current.x = x * dpr;
      mouse.current.y = y * dpr;
      mouse.current.active = true;
    }
    function handleLeave() {
      mouse.current.x = null;
      mouse.current.y = null;
      mouse.current.active = false;
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("mouseleave", handleLeave);
    window.addEventListener("touchend", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("touchend", handleLeave);
    };
  }, [dpr]);

  // Setup and animate
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    resize();
    animate();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line
  }, [particleCount, colors, linkDistance, particleSize, speed]);

  // Static fallback for reduced motion
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    resize();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.current.forEach(p => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * dpr, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.restore();
    });
  }, [particleCount, colors, linkDistance, particleSize, speed]);

  // Focus mode: highlight particles near a selector
  useEffect(() => {
    if (!focusSelector) return;
    const el = document.querySelector(focusSelector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouse.current.x = (rect.left + rect.width / 2) * dpr;
    mouse.current.y = (rect.top + rect.height / 2) * dpr;
    mouse.current.active = true;
    // Remove focus after 2s
    const t = setTimeout(() => { mouse.current.x = null; mouse.current.y = null; mouse.current.active = false; }, 2000);
    return () => clearTimeout(t);
  }, [focusSelector]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        background: "#0a0f1c"
      }}
      aria-hidden="true"
    />
  );
}
