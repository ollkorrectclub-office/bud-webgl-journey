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

    // Title index 0 is centered at tTitles = 0.0 (Snap Point 5)
    // Title index 1 is centered at tTitles = 0.25 (Snap Point 6)
    // Title index 2 is centered at tTitles = 0.50 (Snap Point 7)
    // Title index 3 is centered at tTitles = 0.75 (Snap Point 8)
    // Title index 4 is centered at tTitles = 1.00 (Snap Point 9)
    const targetProgress = index * 0.25;
    const dx = tTitles - targetProgress;

    let opacity = 0;
    let curY = -9.5;

    if (dx < -0.25) {
      // Too far in the future: hidden deep at the waves
      curY = -9.5;
      opacity = 0;
    } else if (dx < 0) {
      // Flying from the waves to the center
      const pct = (dx + 0.25) / 0.25;
      curY = -9.5 + pct * 2.0; // rises from Y = -9.5 up to Y = -7.5 (centered reading height)
      opacity = pct; // fades in
    } else if (dx <= 0.25) {
      // Flying from the center to the camera lens
      const pct = dx / 0.25;
      curY = -7.5 + pct * 14.0; // rises from Y = -7.5 up to Y = 6.5 (past camera lens Y = 6.0)
      opacity = 1.0 - pct; // fades out
    } else {
      // Already passed and gone
      curY = 6.5;
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
