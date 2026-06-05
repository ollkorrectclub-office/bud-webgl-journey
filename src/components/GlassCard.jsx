import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function GlassCard({ position, rotation, number, title, subtitle, description }) {
  const groupRef = useRef();
  const divRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Gentle floating animation
      groupRef.current.position.y = position[1] + Math.sin(time * 1.5 + position[0]) * 0.15;
    }

    // Calculate distance to camera along Z-axis
    const camZ = state.camera.position.z;
    const cardZ = position[2];
    const dz = camZ - cardZ;

    let opacity = 0;
    if (dz > 18) {
      opacity = 0;
    } else if (dz >= 10) {
      // Fade in as we approach (from 18 down to 10)
      opacity = (18 - dz) / 8;
    } else if (dz >= 5) {
      // Stay fully visible in the snap/reading zone (10 down to 5)
      opacity = 1.0;
    } else if (dz >= 2) {
      // Fade out as the camera gets extremely close (5 down to 2) to prevent clipping
      opacity = (dz - 2) / 3;
    } else {
      // Completely invisible when camera has passed or is too close
      opacity = 0;
    }

    if (divRef.current) {
      divRef.current.style.opacity = opacity;
      divRef.current.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
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
        <div ref={divRef} className="glass-card" style={{ transition: 'opacity 0.1s linear' }}>
          <div className="card-number">{number}</div>
          <h2 className="card-title">{title}</h2>
          <h3 className="card-subtitle">{subtitle}</h3>
          <p className="card-description">{description}</p>
        </div>
      </Html>
    </group>
  );
}
