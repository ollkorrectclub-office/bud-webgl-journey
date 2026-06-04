import React, { useEffect, useRef } from 'react';

export default function CursorGlow() {
  const glowRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (glowRef.current) {
        // High performance translate tracking the mouse perfectly
        glowRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
    };

    // Use passive listener for best performance
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '300px', // Small/medium size
        height: '300px',
        marginLeft: '-150px', // Perfect center offset
        marginTop: '-150px',
        // Perfectly mimics the champagne/gold soft radial gradient from the uploaded asset
        background: 'radial-gradient(circle, rgba(200, 182, 138, 0.15) 0%, rgba(200, 182, 138, 0.0) 60%)',
        borderRadius: '50%',
        pointerEvents: 'none', // Prevents the glow from blocking clicks!
        zIndex: 5, // Above the canvas, but behind the text/cards UI
        mixBlendMode: 'screen', // Additive blend makes it look like real light against the dark background
        willChange: 'transform' // GPU acceleration for buttery smooth 120fps tracking
      }}
    />
  );
}
