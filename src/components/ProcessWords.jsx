import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function AscendingWord({ position, text, blurDepth = 10 }) {
  const textRef = useRef();

  // Simple look-at-camera or static orientation
  useFrame(({ camera }) => {
    if (textRef.current) {
      // Rotate the text slightly to face the camera's general direction
      textRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <Text
      ref={textRef}
      position={position}
      fontSize={1.5}
      color="#F4F0E8"
      font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      anchorX="center"
      anchorY="middle"
      fillOpacity={0.9}
    >
      {text}
    </Text>
  );
}

export default function ProcessWords() {
  return (
    <group>
      <AscendingWord position={[0, -1, -105]} text="01 Verstehen" />
      <AscendingWord position={[-2, -1, -120]} text="02 Fragen" />
      <AscendingWord position={[2, -1, -135]} text="03 Analysieren" />
      <AscendingWord position={[-1, -1, -150]} text="04 Entscheiden" />
      
      {/* Final BUD clarity moment */}
      <Text
        position={[0, -1, -170]}
        fontSize={3}
        color="#AD175D" // Bud Magenta
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
      >
        Klarheit
      </Text>
    </group>
  );
}
