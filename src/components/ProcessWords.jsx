import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function FloatingWord({ position, text, fontSize = 2, color = "#F4F0E8" }) {
  const ref = useRef();

  useFrame(({ camera }) => {
    if (!ref.current) return;
    // Always perfectly align with the camera lens so they look like holograms painted on the glass
    ref.current.quaternion.copy(camera.quaternion);

    // Use exact 3D Euclidean distance to prevent distortion during steep vertical climbs
    const dx = camera.position.x - position[0];
    const dy = camera.position.y - position[1];
    const dz = camera.position.z - position[2];
    const euclideanDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    let targetOpacity = 0;
    if (dz >= 0 && euclideanDist >= 4) {
      // DEEP FOG EFFECT: Mimic the data points' depth fade.
      // Words are faintly visible deep in the mist (up to 120 units away),
      // and become brilliantly bright as you approach (fully visible at 15 units).
      const fogFactor = 1.0 - Math.min(Math.max((euclideanDist - 15) / 105.0, 0), 1);
      targetOpacity = fogFactor * 0.9;
    } else if (dz >= 0 && euclideanDist < 4) {
      // Smoothly dissolve the text directly into the camera lens as we fly exactly through it
      targetOpacity = Math.max(0, (euclideanDist / 4) * 0.9);
    } else if (dz < 0) {
      // The camera has passed the word, hide it completely to prevent backward rendering
      targetOpacity = 0;
    }
    
    ref.current.fillOpacity = targetOpacity;
  });

  return (
    <Text
      ref={ref}
      position={position}
      fontSize={fontSize}
      color={color}
      font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      anchorX="center"
      anchorY="middle"
      fillOpacity={0} // Start invisible
    >
      {text}
    </Text>
  );
}

export default function ProcessWords() {
  return (
    <group>
      {/* Positioned on the ground, alternating left and right exactly like the cards */}
      <FloatingWord position={[-4, -3.0, -120]} text="Verstehen" />
      <FloatingWord position={[4, -3.0, -145]} text="Märkte analysieren" />
      <FloatingWord position={[-4, -3.0, -170]} text="Ideen validieren" />
      <FloatingWord position={[4, -3.0, -195]} text="Lösungen entwickeln" />
      
      {/* Final BUD clarity moment */}
      <FloatingWord position={[-4, -3.0, -220]} text="Klarheit" fontSize={4} color="#AD175D" />
    </group>
  );
}
