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

    let opacity = 0;
    let curY = -9.5;

    // 1. Hide all titles completely during the card boxes phase (t < 10/16)
    if (t < 10/16) {
      opacity = 0;
      curY = -9.5;
    } 
    // 2. Smoothly fade in only the first title as the camera completes its tilt down (10/16 <= t < 11/16)
    else if (t < 11/16) {
      if (index === 0) {
        curY = -7.5; // Lock at centered reading height
        opacity = (t - 10/16) / (1/16); // Fade in from 0 to 1
      } else {
        opacity = 0;
        curY = -9.5;
      }
    } 
    // 3. Sequential flight transitions during the top-down locked phase (t >= 11/16)
    else {
      const tTitles = (t - 11/16) / (1 - 11/16); // progresses from 0 to 1

      // Title snap points are separated by exactly 0.20 progress intervals in tTitles space:
      // Snap Point 5 (Title 0): tTitles = 0.0
      // Snap Point 6 (Title 1): tTitles = 0.20
      // Snap Point 7 (Title 2): tTitles = 0.40
      // Snap Point 8 (Title 3): tTitles = 0.60
      // Snap Point 9 (Title 4): tTitles = 0.80
      // Snap Point 10 (End): tTitles = 1.00
      const targetProgress = index * 0.20;
      const dx = tTitles - targetProgress;

      if (dx < -0.20) {
        // Future title: hidden deep at the waves
        curY = -9.5;
        opacity = 0;
      } else if (dx < 0) {
        // Entering title: flies from waves to center in the SECOND half of the scroll step
        const localT = (dx + 0.20) / 0.20; // 0 to 1 progress between snap points
        if (localT <= 0.5) {
          // First half: remain completely hidden so it doesn't overlap the departing title
          curY = -9.5;
          opacity = 0;
        } else {
          // Second half: fly up and fade in
          const pct = (localT - 0.5) / 0.5; // 0 to 1 progress within second half
          curY = -9.5 + pct * 2.0; // Rises from Y = -9.5 to Y = -7.5
          opacity = pct;
        }
      } else if (dx <= 0.20) {
        // Departing title: flies from center to camera lens in the FIRST half of the scroll step
        const localT = dx / 0.20; // 0 to 1 progress between snap points
        if (localT <= 0.5) {
          // First half: fly up and fade out
          const pct = localT / 0.5; // 0 to 1 progress within first half
          curY = -7.5 + pct * 14.0; // Rises from Y = -7.5 to Y = 6.5 (lens)
          opacity = 1.0 - pct;
        } else {
          // Second half: completely gone
          curY = 6.5;
          opacity = 0;
        }
      } else {
        // Past title: already vanished
        curY = 6.5;
        opacity = 0;
      }
    }

    // Keep X centered (0) and Z locked exactly under the camera (Z = -115)
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
      rotation={[-Math.PI / 2, 0, 0]} // Lies flat above waves, oriented horizontally (readable from top camera view)
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
