import React, { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export default function GlassCard({ position, rotation, number, title, description }) {
  const cardRef = useRef();
  const groupRef = useRef();

  useFrame((state) => {
    if (!cardRef.current || !groupRef.current) return;

    // Get camera Z position and compute distance to the card's Z position
    const camZ = state.camera.position.z;
    const cardZ = position[2];
    const dz = camZ - cardZ;

    let opacity = 0;
    if (dz > 14) {
      // Camera is too far away
      opacity = 0;
    } else if (dz >= 6) {
      // Fade in as we get closer (from dz = 14 down to dz = 6)
      opacity = (14 - dz) / 8;
    } else if (dz >= 0) {
      // Fully visible right in front of the card (from dz = 6 down to dz = 0)
      opacity = 1;
    } else if (dz >= -3) {
      // Fade out as we pass the card (from dz = 0 down to dz = -3)
      opacity = (dz + 3) / 3;
    } else {
      // Camera has passed the card completely
      opacity = 0;
    }

    // Clamp opacity between 0 and 1
    opacity = Math.max(0, Math.min(1, opacity));

    if (opacity === 0) {
      // Hide the group completely (hides Three.js occlusion mesh and triggers Drei to hide the DOM element)
      groupRef.current.visible = false;
      cardRef.current.style.visibility = 'hidden';
      cardRef.current.style.pointerEvents = 'none';
    } else {
      // Make group visible and apply opacity
      groupRef.current.visible = true;
      cardRef.current.style.opacity = opacity;
      cardRef.current.style.visibility = 'visible';
      cardRef.current.style.pointerEvents = 'auto';
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <Html 
        transform 
        occlude="blending" 
        distanceFactor={3.5}
        zIndexRange={[100, 0]}
        sprite={false} // Allows perspective distortion as camera approaches
      >
        <div ref={cardRef} className="glass-card" style={{ opacity: 0, visibility: 'hidden', pointerEvents: 'none' }}>
          <div className="card-number">{number}</div>
          <h2 className="card-title">{title}</h2>
          <p className="card-description">{description}</p>
        </div>
      </Html>
    </group>
  );
}
