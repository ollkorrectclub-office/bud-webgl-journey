import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function GlassCard({ position, rotation, number, title, description }) {
  const groupRef = useRef();
  const cardRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Gentle floating animation
      groupRef.current.position.y = position[1] + Math.sin(time * 1.5 + position[0]) * 0.15;
    }

    // Calculate camera distance to the card to fade it out before passing through
    const camZ = state.camera.position.z;
    const cardZ = position[2];
    const dz = camZ - cardZ;

    let opacity = 0;
    if (dz > 18) {
      // Camera is too far away
      opacity = 0;
    } else if (dz >= 10) {
      // Smooth fade in as camera approaches
      opacity = (18 - dz) / 8;
    } else if (dz >= 5) {
      // Fully visible in front of card (including linger snap point at dz = 9)
      opacity = 1.0;
    } else if (dz >= 2) {
      // Smooth fade out BEFORE camera gets close enough to clip
      opacity = (dz - 2) / 3;
    } else {
      // Completely invisible when camera passes through or is behind
      opacity = 0;
    }

    if (cardRef.current) {
      cardRef.current.style.opacity = opacity;
      cardRef.current.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation || [0, 0, 0]}>
      <Html 
        transform 
        distanceFactor={1.5}
        zIndexRange={[100, 0]}
        sprite={false}
      >
        <div ref={cardRef} className="glass-card" style={{ transition: 'opacity 0.1s ease-out' }}>
          <div className="card-number">{number}</div>
          <h2 className="card-title">{title}</h2>
          <p className="card-description">{description}</p>
          <div className="demo-text" style={{ marginTop: '24px', opacity: 0.6, fontSize: '13px', lineHeight: '1.6' }}>
            [Demo Text] Hier steht ein Platzhaltertext, um das Layout der Karte und die Intensität des Glas-Effekts zu demonstrieren. 
            Der Hintergrund wird weichgezeichnet und die Umrandung leuchtet subtil.
          </div>
        </div>
      </Html>
    </group>
  );
}
