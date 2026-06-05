import React, { useRef } from 'react';
import { Text, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function AscendingWord({ index, position, text, fontSize = 1.5, color = "#F4F0E8", letterSpacing = 0 }) {
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
    let curZ = -150; // default start Z in the distance (behind waves)

    // Only active during its specific scroll interval
    if (tTitles >= startProgress && tTitles <= endProgress) {
      const tLocal = (tTitles - startProgress) / interval; // progress within this title's interval (0 to 1)

      // Fly from -150 (deep distance) to -80 (well past camera lens Z = -115)
      const startZ = -150;
      const endZ = -80;
      curZ = startZ + tLocal * (endZ - startZ);

      // Smooth local fade-in and fade-out
      if (tLocal < 0.2) {
        opacity = tLocal / 0.2; // Fade in (0 to 1)
      } else if (tLocal > 0.8) {
        opacity = (1 - tLocal) / 0.2; // Fade out (1 to 0)
      } else {
        opacity = 1; // Fully visible
      }
    } else {
      opacity = 0;
    }

    // Set position
    textRef.current.position.set(position[0], position[1], curZ);

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
      position={position}
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
      {/* Placed at Y = -8.5 (just above the wave field group which is at Y = -10) */}
      <AscendingWord index={0} position={[0, -8.5, -115]} text="01 Verstehen" />
      <AscendingWord index={1} position={[0, -8.5, -130]} text="02 Fragen" />
      <AscendingWord index={2} position={[0, -8.5, -145]} text="03 Analysieren" />
      <AscendingWord index={3} position={[0, -8.5, -160]} text="04 Entscheiden" />
      
      {/* Final BUD clarity moment */}
      <AscendingWord 
        index={4}
        position={[0, -8.5, -180]} 
        text="Klarheit" 
        fontSize={3.0}
        color="#AD175D" // Bud Magenta
        letterSpacing={0.1}
      />
    </group>
  );
}
