import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// Custom geometry for a perfect flat rounded rectangle
function createRoundedRect(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + height - radius);
  shape.quadraticCurveTo(x, y + height, x + radius, y + height);
  shape.lineTo(x + width - radius, y + height);
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  shape.lineTo(x + width, y + radius);
  shape.quadraticCurveTo(x + width, y, x + width - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);
  return new THREE.ShapeGeometry(shape, 32); // 32 segments for ultra-smooth curves
}

// Custom geometry for a rounded rectangle border frame (outer outline only)
function createRoundedFrame(width, height, radius, thickness) {
  const shape = new THREE.Shape();
  
  const ow = width + 2 * thickness;
  const oh = height + 2 * thickness;
  const or = radius + thickness;
  const ox = -ow / 2;
  const oy = -oh / 2;

  // Outer contour (counter-clockwise)
  shape.moveTo(ox, oy + or);
  shape.lineTo(ox, oy + oh - or);
  shape.quadraticCurveTo(ox, oy + oh, ox + or, oy + oh);
  shape.lineTo(ox + ow - or, oy + oh);
  shape.quadraticCurveTo(ox + ow, oy + oh, ox + ow, oy + oh - or);
  shape.lineTo(ox + ow, oy + or);
  shape.quadraticCurveTo(ox + ow, oy, ox + ow - or, oy);
  shape.lineTo(ox + or, oy);
  shape.quadraticCurveTo(ox, oy, ox, oy + or);

  // Inner contour (clockwise) to create a hole
  const hole = new THREE.Path();
  const ix = -width / 2;
  const iy = -height / 2;

  hole.moveTo(ix, iy + height - radius);
  hole.lineTo(ix, iy + radius);
  hole.quadraticCurveTo(ix, iy, ix + radius, iy);
  hole.lineTo(ix + width - radius, iy);
  hole.quadraticCurveTo(ix + width, iy, ix + width, iy + radius);
  hole.lineTo(ix + width, iy + height - radius);
  hole.quadraticCurveTo(ix + width, iy + height, ix + width - radius, iy + height);
  hole.lineTo(ix + radius, iy + height);
  hole.quadraticCurveTo(ix, iy + height, ix, iy + height - radius);
  hole.closePath();

  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape, 32);
}

export default function GlassCard3D({ position, rotation, number, title, description }) {
  const groupRef = useRef();

  // Floating animation and dynamic fade
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Gentle floating
      groupRef.current.position.y = position[1] + Math.sin(time * 1.5 + position[0]) * 0.15;

      // Calculate camera Z position and compute distance to the card's Z position
      const camZ = state.camera.position.z;
      const cardZ = position[2];
      const dz = camZ - cardZ;

      let opacity = 0;
      if (dz > 18) {
        // Camera is too far away
        opacity = 0;
      } else if (dz >= 10) {
        // Fade in as we get closer (from dz = 18 down to dz = 10)
        opacity = (18 - dz) / 8;
      } else if (dz >= 0) {
        // Fully visible right in front of the card (from dz = 10 down to dz = 0)
        opacity = 1;
      } else if (dz >= -3) {
        // Fade out as we pass the card (from dz = 0 down to dz = -3)
        opacity = (dz + 3) / 3;
      } else {
        // Camera has passed the card completely
        opacity = 0;
      }

      const targetOpacity = Math.max(0, Math.min(1, opacity));

      // Apply opacity to all materials inside this card
      groupRef.current.traverse((child) => {
        if (child.material) {
          // The dark glass panel has a max opacity of 0.70, everything else is 1.0
          const maxOpacity = child.material.type === 'MeshPhysicalMaterial' ? 0.70 : 1.0;
          child.material.opacity = targetOpacity * maxOpacity;
          // Hide completely when invisible to prevent ghosting from refraction
          child.visible = targetOpacity > 0.01;
        }
      });
    }
  });

  const width = 6;
  const height = 4;
  const radius = 0.3;

  const geometry = useMemo(() => createRoundedRect(width, height, radius), [width, height, radius]);
  const frameGeometry = useMemo(() => createRoundedFrame(width, height, radius, 0.03), [width, height, radius]);

  return (
    <group ref={groupRef} position={position} rotation={rotation || [0, 0, 0]}>
      {/* The Dark Glass Panel */}
      <mesh geometry={geometry}>
        <meshPhysicalMaterial 
          color="#0a0c10"
          transmission={0.0}
          opacity={0.70}
          transparent
          metalness={0.1}
          roughness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
        
        {/* The Sleek Glowing Edge (Champagne Gold) - Mesh-based outline positioned behind to avoid inner glow */}
        <mesh geometry={frameGeometry} position={[0, 0, -0.02]}>
          <meshBasicMaterial 
            color={[1.8, 1.25, 0.7]} // Slightly reduced brightness to control bloom feather/spread
            toneMapped={false}
            transparent
          />
        </mesh>
      </mesh>

      {/* Typography Container */}
      <group position={[-2.4, 0, 0.01]}>
        {/* Number Badge */}
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.2}
          color="#b31b5a" // Matching Magenta Pink from Logo
          anchorX="left"
          anchorY="middle"
          letterSpacing={0.1}
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
        >
          {number}
        </Text>

        {/* Title */}
        <Text
          position={[0, 0.7, 0]}
          fontSize={0.45}
          color="#ffffff"
          anchorX="left"
          anchorY="middle"
          maxWidth={4.8}
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
        >
          {title}
        </Text>

        {/* Description */}
        <Text
          position={[0, 0.1, 0]}
          fontSize={0.18}
          color="#aaaaaa"
          anchorX="left"
          anchorY="top"
          maxWidth={4.8}
          lineHeight={1.6}
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
        >
          {description}
        </Text>

        {/* Demo Text */}
        <Text
          position={[0, -0.6, 0]}
          fontSize={0.14}
          color="#666666"
          anchorX="left"
          anchorY="top"
          maxWidth={4.8}
          lineHeight={1.6}
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
        >
          [Demo Text] Hier steht ein Platzhaltertext, um das Layout der Karte und die Intensität des Glas-Effekts zu demonstrieren. 
          Das Design ist nun absolut minimalistisch, mit einer feinen, leuchtenden Umrandung und einer dunklen Glasfläche.
        </Text>
      </group>
    </group>
  );
}
