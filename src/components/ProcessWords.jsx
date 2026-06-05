import React, { useRef } from 'react';
import { Text, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function AscendingWord({ index, text, fontSize = 1.5, color = "#F4F0E8", letterSpacing = 0 }) {
  const textRef = useRef();
  const scroll = useScroll();

  useFrame((state) => {
    if (!textRef.current) return;

    // Get current scroll progress
    const t = scroll.offset || 0;

    // The titles phase begins at t >= 11/16 (0.6875) when the camera locks at Z = -115
    const tStart = 11/16;
    let tTitles = 0;
    if (t > tStart) {
      tTitles = (t - tStart) / (1 - tStart); // progresses from 0 to 1
    }

    const numTitles = 5;
    const interval = 1.0 / numTitles; // Each title gets a 20% scroll window

    const startProgress = index * interval;
    const endProgress = (index + 1) * interval;

    let opacity = 0;
    let curY = -9.5; // Start position deep at the waves

    // Only active during its specific scroll interval
    if (tTitles >= startProgress && tTitles <= endProgress) {
      const tLocal = (tTitles - startProgress) / interval; // progress within this title's interval (0 to 1)

      // Rise vertically from the waves (Y = -9.5) straight up to the camera lens (Y = 6.5)
      const startY = -9.5;
      const endY = 6.5;
      curY = startY + tLocal * (endY - startY);

      // Fade-in as it leaves the waves, and fade-out as it merges into the lens
      if (tLocal < 0.25) {
        opacity = tLocal / 0.25; // Smooth fade-in
      } else if (tLocal > 0.85) {
        opacity = (1 - tLocal) / 0.15; // Quick fade-out right at the lens
      } else {
        opacity = 1.0;
      }
    } else {
      opacity = 0;
    }

    // Keep X centered (0) and Z locked exactly under the camera (Z = -115)
    // The Y coordinate animates to fly straight from waves into the lens
    textRef.current.position.set(0, curY, -115);

    // Apply visibility and opacity
    textRef.current.visible = opacity > 0.01;
    if (textRef.current.material) {
      textRef.current.material.transparent = true;
      textRef.current.material.opacity = opacity;
    }
  });

  return (
    <Text
      ref={textRef}
      rotation={[-Math.PI / 2, 0, 0]} // Lies flat above waves, oriented horizontally (readable left-to-right from top camera view)
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
      {/* Placed at fixed Z = -115 (centered under top-down camera) */}
      <AscendingWord index={0} text="01 Verstehen" />
      <AscendingWord index={1} text="02 Fragen" />
      <AscendingWord index={2} text="03 Analysieren" />
      <AscendingWord index={3} text="04 Entscheiden" />
      
      {/* Final BUD clarity moment */}
      <AscendingWord 
        index={4}
        text="Klarheit" 
        fontSize={3.0}
        color="#AD175D" // Bud Magenta
        letterSpacing={0.1}
      />
    </group>
  );
}
