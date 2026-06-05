import React from 'react';
import { Html } from '@react-three/drei';

export default function GlassCard({ position, rotation, number, title, description }) {
  return (
    <group position={position} rotation={rotation}>
      <Html 
        transform 
        distanceFactor={1.5}
        zIndexRange={[100, 0]}
        sprite={false}
      >
        <div className="glass-card">
          <div className="card-number">{number}</div>
          <h2 className="card-title">{title}</h2>
          <p className="card-description">{description}</p>
          <div className="demo-text" style={{ marginTop: '24px', opacity: 0.6, fontSize: '13px', lineHeight: '1.6' }}>
            [Demo Text] Hier steht ein Platzhaltertext, um das Layout der Karte und die Intensität des Glas-Effekts zu demonstrieren. Der Hintergrund wird weichgezeichnet und die Umrandung leuchtet subtil.
          </div>
        </div>
      </Html>
    </group>
  );
}
