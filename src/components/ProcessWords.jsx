import React, { useRef } from 'react';
import { Text, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function AscendingWord({ position, text, fontSize = 1.5, color = "#F4F0E8", letterSpacing = 0 }) {
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

    const initialZ = position[2];
    
    // Total Z distance to slide all titles past the camera.
    // The final title ("Klarheit") starts at -180. To pass the camera at -115, it must travel 65 units.
    // We set total displacement to 85 units so it completely clears past the camera lens.
    const totalDistance = 85;
    const curZ = initialZ + tTitles * totalDistance;

    // Move the title along Z towards the camera
    textRef.current.position.set(position[0], position[1], curZ);

    // Fade logic based on position relative to the camera lens (Z = -115)
    // dz is the distance of the word behind the camera
    const dz = -115 - curZ;

    let opacity = 0;
    if (dz > 25) {
      // Too far away in the distance
      opacity = 0;
    } else if (dz >= 8) {
      // Fades in as it approaches the static camera view
      opacity = (25 - dz) / 17;
    } else if (dz >= -5) {
      // Fully visible right under the top-down camera lens
      opacity = 1;
    } else if (dz >= -15) {
      // Fades out as it passes underneath and behind the camera lens
      opacity = (dz + 15) / 10;
    } else {
      // Completely passed
      opacity = 0;
    }

    opacity = Math.max(0, Math.min(1, opacity));

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
      rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Lies flat above waves, rotated 90 degrees in Z axis (runs along Z axis)
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
      <AscendingWord position={[0, -8.5, -115]} text="01 Verstehen" />
      <AscendingWord position={[0, -8.5, -130]} text="02 Fragen" />
      <AscendingWord position={[0, -8.5, -145]} text="03 Analysieren" />
      <AscendingWord position={[0, -8.5, -160]} text="04 Entscheiden" />
      
      {/* Final BUD clarity moment */}
      <AscendingWord 
        position={[0, -8.5, -180]} 
        text="Klarheit" 
        fontSize={3.0}
        color="#AD175D" // Bud Magenta
        letterSpacing={0.1}
      />
    </group>
  );
}
