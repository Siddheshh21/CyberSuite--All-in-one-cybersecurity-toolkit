import React, { useRef, useEffect } from 'react';

export default function DataFlowBackground() {
  const canvasRef = useRef();
  const animationRef = useRef();
  const dpr = window.devicePixelRatio || 1;

  // Node types and their properties
  const nodeTypes = {
    password: { icon: '🔒', color: '#10ff8d' },
    cve: { icon: '⚠️', color: '#ff4444' },
    email: { icon: '📧', color: '#4488ff' },
    network: { icon: '🌐', color: '#ffffff' },
    report: { icon: '📊', color: '#ffaa44' }
  };

  class Node {
    constructor(type, x, y) {
      this.type = type;
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.3; // Reduced velocity for smoother movement
      this.vy = (Math.random() - 0.5) * 0.3;
      this.connections = [];
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.targetX = x;
      this.targetY = y;
    }

    update(width, height) {
      // Smooth movement with easing
      const easing = 0.02;
      
      // Update position with smooth interpolation
      this.x += this.vx;
      this.y += this.vy;
      
      // Bounce off edges with smooth transition
      if (this.x < 0 || this.x > width) {
        this.vx *= -0.8; // Reduced bounce intensity
        this.x = Math.max(0, Math.min(width, this.x));
      }
      if (this.y < 0 || this.y > height) {
        this.vy *= -0.8;
        this.y = Math.max(0, Math.min(height, this.y));
      }
      
      // Apply friction
      this.vx *= 0.99;
      this.vy *= 0.99;
      
      // Update pulse with smoother frequency
      this.pulsePhase += 0.03;
      if (this.pulsePhase > Math.PI * 2) this.pulsePhase -= Math.PI * 2;
    }
  }

  function createNodes(width, height) {
    const nodes = [];
    const types = Object.keys(nodeTypes);
    const nodeCount = 25; // Total number of nodes

    for (let i = 0; i < nodeCount; i++) {
      const type = types[i % types.length];
      nodes.push(new Node(
        type,
        Math.random() * width,
        Math.random() * height
      ));
    }

    // Create connections between nodes
    nodes.forEach(node => {
      const nearbyNodes = nodes
        .filter(n => n !== node)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      node.connections = nearbyNodes;
    });

    return nodes;
  }

  function drawBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0F2027');
    gradient.addColorStop(1, '#2C5364');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawConnections(ctx, nodes) {
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.lineCap = 'round';

    nodes.forEach(node => {
      node.connections.forEach(connected => {
        const dx = connected.x - node.x;
        const dy = connected.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Draw glowing line with bezier curve for smoother appearance
        const controlPoint1X = node.x + dx * 0.4;
        const controlPoint1Y = node.y + dy * 0.4;
        const controlPoint2X = node.x + dx * 0.6;
        const controlPoint2Y = node.y + dy * 0.6;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.bezierCurveTo(
          controlPoint1X, controlPoint1Y,
          controlPoint2X, controlPoint2Y,
          connected.x, connected.y
        );

        // Animate flow along the line with smoother transition
        const flowOffset = (Date.now() / 2000) % 1; // Slower animation
        const gradient = ctx.createLinearGradient(
          node.x, node.y, connected.x, connected.y
        );

        gradient.addColorStop((0 + flowOffset) % 1, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop((0.4 + flowOffset) % 1, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop((0.5 + flowOffset) % 1, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop((0.6 + flowOffset) % 1, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop((1 + flowOffset) % 1, 'rgba(255, 255, 255, 0)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    });

    // Reset shadow for other drawings
    ctx.shadowBlur = 0;
  }

  function drawNodes(ctx, nodes) {
    nodes.forEach(node => {
      const { icon, color } = nodeTypes[node.type];
      const pulseScale = 1 + Math.sin(node.pulsePhase) * 0.15; // Reduced pulse intensity

      // Draw outer glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 18 * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = `${color}22`;
      ctx.fill();

      // Draw inner glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, 12 * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = `${color}33`;
      ctx.fill();

      // Draw icon with glow
      ctx.shadowBlur = 2;
      ctx.fillStyle = color;
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, node.x, node.y);

      // Reset shadow
      ctx.shadowBlur = 0;
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      return { width, height };
    }

    const { width, height } = resize();
    const nodes = createNodes(width, height);

    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    function animate(currentTime) {
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= frameInterval) {
        lastTime = currentTime - (deltaTime % frameInterval);
        
        // Clear canvas with alpha for smooth trails
        ctx.fillStyle = 'rgba(15, 32, 39, 0.1)';
        ctx.fillRect(0, 0, width * dpr, height * dpr);

        // Draw background with reduced frequency
        drawBackground(ctx, width * dpr, height * dpr);

        // Update and draw nodes
        nodes.forEach(node => node.update(width, height));
        
        // Apply anti-aliasing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        drawConnections(ctx, nodes);
        drawNodes(ctx, nodes);
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}