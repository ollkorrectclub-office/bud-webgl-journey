import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 400;
const DURATION = 2.4; // Elegant, majestic transition duration

// Helper to sample coordinates and normal vectors along a rounded rectangle perimeter
function sampleRoundedRect(w, h, r) {
  const lh = w - 2 * r;
  const lv = h - 2 * r;
  const lc = (Math.PI / 2) * r;
  const total = 2 * lh + 2 * lv + 4 * lc;
  
  const d = Math.random() * total;
  let px = 0, py = 0;
  let nx = 0, ny = 0; // outward normal vector for drift direction
  
  if (d < lh) {
    // Top segment
    px = -w / 2 + r + d;
    py = h / 2;
    nx = 0; ny = 1;
  } else if (d < lh + lc) {
    // Top-Right corner arc
    const t = (d - lh) / lc * (Math.PI / 2);
    px = w / 2 - r + Math.cos(t) * r;
    py = h / 2 - r + Math.sin(t) * r;
    nx = Math.cos(t); ny = Math.sin(t);
  } else if (d < lh + lc + lv) {
    // Right segment
    const offset = d - (lh + lc);
    px = w / 2;
    py = h / 2 - r - offset;
    nx = 1; ny = 0;
  } else if (d < lh + 2 * lc + lv) {
    // Bottom-Right corner arc
    const t = (d - (lh + lc + lv)) / lc * (Math.PI / 2) + Math.PI * 1.5;
    px = w / 2 - r + Math.cos(t) * r;
    py = -h / 2 + r + Math.sin(t) * r;
    nx = Math.cos(t); ny = Math.sin(t);
  } else if (d < 2 * lh + 2 * lc + lv) {
    // Bottom segment
    const offset = d - (lh + 2 * lc + lv);
    px = w / 2 - r - offset;
    py = -h / 2;
    nx = 0; ny = -1;
  } else if (d < 2 * lh + 3 * lc + lv) {
    // Bottom-Left corner arc
    const t = (d - (2 * lh + 2 * lc + lv)) / lc * (Math.PI / 2) + Math.PI;
    px = -w / 2 + r + Math.cos(t) * r;
    py = -h / 2 + r + Math.sin(t) * r;
    nx = Math.cos(t); ny = Math.sin(t);
  } else if (d < 2 * lh + 3 * lc + 2 * lv) {
    // Left segment
    const offset = d - (2 * lh + 3 * lc + lv);
    px = -w / 2;
    py = -h / 2 + r + offset;
    nx = -1; ny = 0;
  } else {
    // Top-Left corner arc
    const t = (d - (2 * lh + 3 * lc + 2 * lv)) / lc * (Math.PI / 2) + Math.PI * 0.5;
    px = -w / 2 + r + Math.cos(t) * r;
    py = h / 2 - r + Math.sin(t) * r;
    nx = Math.cos(t); ny = Math.sin(t);
  }
  
  return { x: px, y: py, nx, ny };
}

// Custom geometry for a rounded rectangle border frame
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

export default function CardShatter({ position, onComplete }) {
  const lineRef = useRef();
  const glowRef = useRef();
  const startTime = useRef(null);
  const completed = useRef(false);

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => {
      // Sample initial coordinate right on the card outline path
      const { x, y, nx, ny } = sampleRoundedRect(6, 4, 0.3);

      // Slower, subtle drift outward along normal direction (evaporative stardust look)
      const driftSpeed = 0.05 + Math.random() * 0.25;
      const vx = nx * driftSpeed + (Math.random() - 0.5) * 0.05;
      const vy = ny * driftSpeed + (Math.random() - 0.5) * 0.05 + 0.05; // very light upward lift
      const vz = (Math.random() - 0.5) * 0.05; // tiny depth drift

      const rx = (Math.random() - 0.5) * 1.5;
      const ry = (Math.random() - 0.5) * 1.5;
      const rz = (Math.random() - 0.5) * 1.5;

      // Small delicate champagne stardust size
      const scale = 0.04 + Math.random() * 0.06;

      return { x, y, vx, vy, vz, rx, ry, rz, scale };
    });
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const shardGeom = useMemo(() => {
    return new THREE.SphereGeometry(0.12, 6, 6);
  }, []);

  const frameGeometry = useMemo(() => {
    return createRoundedFrame(6, 4, 0.3, 0.03);
  }, []);

  useEffect(() => {
    if (glowRef.current) {
      particles.forEach((p, i) => {
        dummy.position.set(p.x, p.y, 0);
        dummy.scale.set(p.scale, p.scale, p.scale);
        dummy.rotation.set(0, 0, Math.random() * Math.PI * 2);
        dummy.updateMatrix();
        glowRef.current.setMatrixAt(i, dummy.matrix);
      });
      glowRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [particles, dummy]);

  useFrame((state) => {
    if (completed.current) return;
    if (!glowRef.current) return;

    if (startTime.current === null) {
      startTime.current = state.clock.getElapsedTime();
    }

    const elapsed = state.clock.getElapsedTime() - startTime.current;
    const progress = Math.min(elapsed / DURATION, 1);
    
    // Smooth ease-out
    const eased = 1 - Math.pow(1 - progress, 3);

    particles.forEach((p, i) => {
      // Particles drift slightly from the border and dissolve
      const curX = p.x + p.vx * eased;
      const curY = p.y + p.vy * eased;
      const curZ = p.vz * eased;

      dummy.position.set(curX, curY, curZ);
      dummy.rotation.set(p.rx * elapsed, p.ry * elapsed, p.rz * elapsed);
      
      const fadeScale = p.scale * Math.max(0, 1 - progress);
      dummy.scale.set(fadeScale, fadeScale, fadeScale);
      dummy.updateMatrix();
      
      glowRef.current.setMatrixAt(i, dummy.matrix);
    });

    glowRef.current.instanceMatrix.needsUpdate = true;

    // Fade opacity out smoothly for both the outline frame and the particles
    const alpha = Math.max(0, 1 - progress);
    
    if (glowRef.current.material) {
      glowRef.current.material.opacity = alpha;
    }
    
    if (lineRef.current && lineRef.current.material) {
      lineRef.current.material.opacity = alpha;
    }

    if (progress >= 1 && !completed.current) {
      completed.current = true;
      if (onComplete) onComplete();
    }
  });

  return (
    <group position={position}>
      {/* Glowing border frame line that dissolves */}
      <mesh ref={lineRef} geometry={frameGeometry} position={[0, 0, -0.05]} renderOrder={0} frustumCulled={false}>
        <meshBasicMaterial 
          color={[1.8, 1.25, 0.7]}
          toneMapped={false}
          transparent
          opacity={1}
          depthWrite={false}
        />
      </mesh>

      {/* Champagne stardust particles flaking off from the border */}
      <instancedMesh ref={glowRef} args={[shardGeom, null, PARTICLE_COUNT]} frustumCulled={false}>
        <meshBasicMaterial
          color="#C8B68A"
          toneMapped={true}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
