import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function GlassCard({ position, rotation, number, title, description, body }) {
  const groupRef = useRef();
  const cardRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Gentle floating animation matching the design system
      groupRef.current.position.y = position[1] + Math.sin(time * 1.5 + position[0]) * 0.15;
    }

    // Calculate camera distance to card to handle fading
    const camZ = state.camera.position.z;
    const cardZ = position[2];
    const dz = camZ - cardZ;

    let opacity = 0;
    if (dz > 18) {
      opacity = 0;
    } else if (dz >= 10) {
      // Fade in as we approach
      opacity = (18 - dz) / 8;
    } else if (dz >= 5) {
      // Fully visible
      opacity = 1.0;
    } else if (dz >= 2) {
      // Fade out before the camera passes through to prevent screen-level clipping
      opacity = (dz - 2) / 3;
    } else {
      // Completely hidden when camera is past/touching the card
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
        <div ref={cardRef} className="glass-card" style={{ transition: 'opacity 0.1s linear' }}>
          <div className="card-number">{number}</div>
          <h2 className="card-title">{title}</h2>
          <p className="card-description">{description}</p>
          <div className="card-body">
            {body || (
              <>
                [Demo Text] Hier steht ein Platzhaltertext, um das Layout der Karte und die Intensität des Glas-Effekts zu demonstrieren. 
                Das Design ist nun absolut und elegant gelöst.
              </>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}
