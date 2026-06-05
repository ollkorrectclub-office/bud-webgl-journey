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

// Custom geometry for a rounded rectangle inner border highlight
function createInnerRoundedFrame(width, height, radius, thickness) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  
  // Outer contour (counter-clockwise) - matches card dimensions exactly
  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + height - radius);
  shape.quadraticCurveTo(x, y + height, x + radius, y + height);
  shape.lineTo(x + width - radius, y + height);
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  shape.lineTo(x + width, y + radius);
  shape.quadraticCurveTo(x + width, y, x + width - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);

  // Inner contour (clockwise) to create a hole inside the card
  const hole = new THREE.Path();
  const iw = width - 2 * thickness;
  const ih = height - 2 * thickness;
  const ir = Math.max(0.01, radius - thickness);
  const ix = -iw / 2;
  const iy = -ih / 2;

  hole.moveTo(ix, iy + ih - ir);
  hole.lineTo(ix, iy + ir);
  hole.quadraticCurveTo(ix, iy, ix + ir, iy);
  hole.lineTo(ix + iw - ir, iy);
  hole.quadraticCurveTo(ix + iw, iy, ix + iw, iy + ir);
  hole.lineTo(ix + iw, iy + ih - ir);
  hole.quadraticCurveTo(ix + iw, iy + ih, ix + iw - ir, iy + ih);
  hole.lineTo(ix + ir, iy + ih);
  hole.quadraticCurveTo(ix, iy + ih, ix, iy + ih - ir);
  hole.closePath();

  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape, 32);
}

export default function GlassCard3D({ position, rotation, number, title, description, onEnter, isShattered }) {
  const groupRef = useRef();
  const shatterStartTime = useRef(null);

  const handlePointerOver = () => { document.body.style.cursor = 'pointer'; };
  const handlePointerOut = () => { document.body.style.cursor = 'default'; };
  const handleClick = (e) => {
    e.stopPropagation();
    if (onEnter) onEnter();
  };

  // Floating animation and dynamic fade
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Gentle floating
      groupRef.current.position.y = position[1] + Math.sin(time * 1.5 + position[0]) * 0.15;

      // When shattered, smoothly fade out the entire card box with texts/CTA
      if (isShattered) {
        if (shatterStartTime.current === null) {
          shatterStartTime.current = state.clock.getElapsedTime();
        }
        const elapsed = state.clock.getElapsedTime() - shatterStartTime.current;
        const fadeOutDuration = 0.8; // Smooth 0.8s fade out to blend with stardust
        const shatterOpacity = Math.max(0, 1 - elapsed / fadeOutDuration);

        if (shatterOpacity <= 0.001) {
          groupRef.current.visible = false;
          return;
        }

        groupRef.current.visible = true;
        groupRef.current.traverse((child) => {
          if (child.material) {
            const maxOpacity = child.material.name === 'glassEdgeMaterial' 
              ? 0.12 
              : (child.material.name === 'glassPanelMaterial' ? 0.55 : 1.0);
            child.material.opacity = shatterOpacity * maxOpacity;
          }
        });
        return;
      } else {
        shatterStartTime.current = null;
      }

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

      // Hide entire group when invisible to skip all GPU work
      groupRef.current.visible = targetOpacity > 0.01;
      if (!groupRef.current.visible) return;

      // Apply opacity to all materials inside this card
      groupRef.current.traverse((child) => {
        if (child.material) {
          const maxOpacity = child.material.name === 'glassEdgeMaterial' 
            ? 0.12 
            : (child.material.name === 'glassPanelMaterial' ? 0.55 : 1.0);
          child.material.opacity = targetOpacity * maxOpacity;
        }
      });
    }
  });

  const width = 6;
  const height = 4;
  const radius = 0.3;

  const geometry = useMemo(() => createRoundedRect(width, height, radius), [width, height, radius]);
  const frameGeometry = useMemo(() => createRoundedFrame(width, height, radius, 0.03), [width, height, radius]);
  const glassEdgeGeometry = useMemo(() => createInnerRoundedFrame(width, height, radius, 0.015), [width, height, radius]);

  return (
    <group ref={groupRef} position={position} rotation={rotation || [0, 0, 0]}>
      {/* The Dark Glass Panel - clickable */}
      <mesh 
        geometry={geometry} 
        renderOrder={1} 
        frustumCulled={false}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshPhysicalMaterial 
          name="glassPanelMaterial"
          color="#080810"
          opacity={0.55}
          transparent
          roughness={0.15}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          depthWrite={true}
          side={THREE.DoubleSide}
        />
        
        {/* Subtle glass edge highlight (white/champagne) to enhance the glassmorphism look */}
        <mesh geometry={glassEdgeGeometry} position={[0, 0, 0.015]} renderOrder={2}>
          <meshBasicMaterial 
            name="glassEdgeMaterial"
            color="#ffffff"
            opacity={0.12}
            transparent
            depthWrite={false}
          />
        </mesh>
      </mesh>

      {/* The Sleek Glowing Edge (Champagne Gold) - positioned behind the glass to create outer-only glow */}
      <mesh geometry={frameGeometry} position={[0, 0, -0.05]} renderOrder={0} frustumCulled={false}>
        <meshBasicMaterial 
          color={[1.8, 1.25, 0.7]}
          toneMapped={false}
          transparent
          depthWrite={false}
        />
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

      {/* Learn More CTA at bottom-right edge */}
      <Text
        position={[2.5, -1.65, 0.02]}
        fontSize={0.16}
        color="#b31b5a"
        anchorX="right"
        anchorY="middle"
        letterSpacing={0.08}
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf"
      >
        Learn More  →
      </Text>
    </group>
  );
}
