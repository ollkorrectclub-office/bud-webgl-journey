import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function AscendingWord({ position, text, fontSize = 1.5, color = "#F4F0E8", letterSpacing = 0 }) {
  const textRef = useRef();

  useFrame(({ camera }) => {
    if (!textRef.current) return;

    // Rotate the text slightly to face the camera's general direction
    textRef.current.quaternion.copy(camera.quaternion);

    // Calculate camera distance to the text Z position
    const camZ = camera.position.z;
    const wordZ = position[2];
    const dz = camZ - wordZ;

    let opacity = 0;
    if (dz > 22) {
      // Camera is too far away
      opacity = 0;
    } else if (dz >= 10) {
      // Fade in as we approach (from dz = 22 down to dz = 10)
      opacity = (22 - dz) / 12;
    } else if (dz >= 0) {
      // Fully visible right in front of the text (from dz = 10 down to dz = 0)
      opacity = 1;
    } else if (dz >= -3) {
      // Fade out as we pass the text (from dz = 0 down to dz = -3)
      opacity = (dz + 3) / 3;
    } else {
      // Camera has passed the text completely
      opacity = 0;
    }

    opacity = Math.max(0, Math.min(1, opacity));

    // Update Three.js mesh visibility and material opacity
    textRef.current.visible = opacity > 0;
    if (textRef.current.material) {
      textRef.current.material.transparent = true;
      textRef.current.material.opacity = opacity;
    }
  });

  return (
    <Text
      ref={textRef}
      position={position}
      fontSize={fontSize}
      color={color}
      font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      anchorX="center"
      anchorY="middle"
      letterSpacing={letterSpacing}
    >
      {text}
    </Text>
  );
}

export default function ProcessWords() {
  return (
    <group>
      <AscendingWord position={[0, -1, -115]} text="01 Verstehen" />
      <AscendingWord position={[0, -1, -130]} text="02 Fragen" />
      <AscendingWord position={[0, -1, -145]} text="03 Analysieren" />
      <AscendingWord position={[0, -1, -160]} text="04 Entscheiden" />
      
      {/* Final BUD clarity moment */}
      <AscendingWord 
        position={[0, -1, -180]} 
        text="Klarheit" 
        fontSize={3}
        color="#AD175D" // Bud Magenta
        letterSpacing={0.1}
      />
    </group>
  );
}
