import React from 'react';
import { Html } from '@react-three/drei';

export default function GlassCard({ position, rotation, number, title, description }) {
  return (
    <group position={position} rotation={rotation}>
      <Html 
        transform 
        occlude="blending" 
        distanceFactor={1.5}
        zIndexRange={[100, 0]}
        sprite={false} // Allows perspective distortion as camera approaches
      >
        <div className="glass-card">
          <div className="card-number">{number}</div>
          <h2 className="card-title">{title}</h2>
          <p className="card-description">{description}</p>
        </div>
      </Html>
    </group>
  );
}
