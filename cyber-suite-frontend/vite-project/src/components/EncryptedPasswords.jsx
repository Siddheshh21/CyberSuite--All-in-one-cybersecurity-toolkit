import React, { useRef, useEffect } from 'react';

export default function EncryptedPasswords() {
  const canvasRef = useRef();
  const animationRef = useRef();
  const passwords = useRef([]);
  
  class EncryptedText {
    constructor(x, y, text) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.originalText = text;
      this.encryptedText = '';
      this.speed = 1 + Math.random() * 2;
      this.alpha = 0.1 + Math.random() * 0.4;
      this.size = 12 + Math.random() * 4;
      this.encryptionTimer = 0;
      this.encryptionInterval = 30 + Math.random() * 50;
    }

    encrypt() {
      const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?*****';
      let result = '';
      for (let i = 0; i < this.originalText.length; i++) {
        if (Math.random() < 0.5) {
          result += chars[Math.floor(Math.random() * chars.length)];
        } else {
          result += this.originalText[i];
        }
      }
      return result;
    }

    update() {
      this.y += this.speed;
      this.encryptionTimer++;
      
      if (this.encryptionTimer > this.encryptionInterval) {
        this.encryptedText = this.encrypt();
        this.encryptionTimer = 0;
      }
    }

    draw(ctx) {
      ctx.font = `${this.size}px monospace`;
      ctx.fillStyle = `rgba(0, 250, 255, ${this.alpha})`;
      ctx.shadowColor = '#00faff';
      ctx.shadowBlur = 5;
      ctx.fillText(this.encryptedText || this.originalText, this.x, this.y);
    }
  }

  const samplePasswords = [
    'P@ssw0rd123!',
    'Secur3P@ss',
    'Str0ngP@ss!',
    'C0mpl3x1ty',
    'P@ssPhrase!',
    'S@feP@ss123',
    'Crypt0Gr@ph',
    'H@sh3dP@ss',
    'Auth3nt1c@te',
    'V@l1d@t10n',
    '*********',
    '**********',
    '*****',
    '************'
  ];

  function createPassword() {
    const x = Math.random() * window.innerWidth;
    const password = samplePasswords[Math.floor(Math.random() * samplePasswords.length)];
    return new EncryptedText(x, -20, password);
  }

  function animate() {
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
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Add new passwords occasionally
        if (Math.random() < 0.03 && passwords.current.length < 50) {
          passwords.current.push(createPassword());
        }

        // Update and draw passwords
        passwords.current = passwords.current.filter(p => p.y < canvas.height);
        passwords.current.forEach(password => {
          password.update();
          password.draw(ctx);
        });
      }

      animationRef.current = requestAnimationFrame(frameHandler);
    }

    frameHandler();
  }

  function resize() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  useEffect(() => {
    resize();
    // Initialize with some passwords immediately
    for (let i = 0; i < 15; i++) {
      passwords.current.push(createPassword());
    }
    animate();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
}