import React, { useEffect, useRef } from 'react';

export default function CursorParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let particles = [];
    let animationFrameId;
    let mouse = { x: -1000, y: -1000, speed: 0 };
    let lastMouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e) => {
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      
      const dx = mouse.x - lastMouse.x;
      const dy = mouse.y - lastMouse.y;
      mouse.speed = Math.sqrt(dx * dx + dy * dy);
      
      // Spawn particles based on how fast the mouse is moving
      // Cap at 4 particles per event to prevent overcrowding
      const numParticles = Math.min(Math.floor(mouse.speed / 8), 4); 
      
      // Always spawn at least 1 particle if the mouse is moving
      const spawnCount = Math.max(1, numParticles);
      
      for (let i = 0; i < spawnCount; i++) {
        // Random offset within a 40px radius of the cursor
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 40;
        
        particles.push({
          x: mouse.x + Math.cos(angle) * radius,
          y: mouse.y + Math.sin(angle) * radius,
          size: Math.random() * 1.5 + 0.5, // 0.5px to 2.0px (matches the DataField dots)
          life: 1.0, // 1.0 to 0.0
          decay: Math.random() * 0.02 + 0.01, // How fast they fade
          color: Math.random() > 0.85 ? '#AD175D' : '#C8B68A', // Mostly Champagne, 15% Magenta
          vx: (Math.random() - 0.5) * 0.5, // Very slight horizontal drift
          vy: (Math.random() - 0.5) * 0.5 - 0.2 // Slight upward float
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Update physics
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        
        // Draw the dot!
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Reset alpha for next frame
      ctx.globalAlpha = 1.0;
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
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
        zIndex: 5, // Same layer as the glow would have been
      }}
    />
  );
}
