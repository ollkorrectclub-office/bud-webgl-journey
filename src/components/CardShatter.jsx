import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 350;
const DURATION = 2.8; // Slower, more majestic cinematic duration

export default function CardShatter({ position, onComplete }) {
  const glowRef = useRef();
  const startTime = useRef(null);
  const completed = useRef(false);

  const particles = useMemo(() => {
    const width = 6;
    const height = 4;

    return Array.from({ length: PARTICLE_COUNT }, () => {
      // Start position from card bounds
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;

      // Calculate radial direction outward from the card center
      const angle = Math.atan2(y, x) + (Math.random() - 0.5) * 0.4;
      const dist = Math.sqrt(x * x + y * y) || 1.0;

      // Cinematic speed profile: fast initial burst, then decelerating
      const speed = 2.5 + Math.random() * 5.0; // High speed for wide spread
      const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 1.0;
      const vy = Math.sin(angle) * speed + 0.8 + Math.random() * 1.5; // Upward drift bias

      // High Z velocity variation to push particles past the camera lens (Z = 9.0)
      // Since max Z traveled is vz * DURATION, a vz of 4.5 will reach 12.6 (well past camera)
      const vz = 0.5 + Math.random() * 5.5;

      const rx = (Math.random() - 0.5) * 5;
      const ry = (Math.random() - 0.5) * 5;
      const rz = (Math.random() - 0.5) * 5;

      // 3D Sphere sizes: delicate glowing crystals/pearls
      const scale = 0.04 + Math.random() * 0.12;

      return { x, y, vx, vy, vz, rx, ry, rz, scale };
    });
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const shardGeom = useMemo(() => {
    // 3D sphere geometry makes particles look solid and round from any angle
    return new THREE.SphereGeometry(0.3, 8, 8);
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
    
    // Quartic ease-out: starts with an explosive burst and smoothly decelerates
    const eased = 1 - Math.pow(1 - progress, 4);

    particles.forEach((p, i) => {
      // Interpolate position using the eased progression (explosive deceleration)
      const curX = p.x + p.vx * eased;
      const curY = p.y + p.vy * eased;
      const curZ = p.vz * eased * DURATION; // Travels along Z axis

      dummy.position.set(curX, curY, curZ);
      dummy.rotation.set(p.rx * elapsed, p.ry * elapsed, p.rz * elapsed);
      
      // Scale fades down to zero at the end of duration
      const fadeScale = p.scale * Math.max(0, 1 - progress);
      dummy.scale.set(fadeScale, fadeScale, fadeScale);
      dummy.updateMatrix();
      
      glowRef.current.setMatrixAt(i, dummy.matrix);
    });

    glowRef.current.instanceMatrix.needsUpdate = true;

    // Fade opacity out smoothly
    const alpha = Math.max(0, 1 - progress);
    if (glowRef.current.material) {
      glowRef.current.material.opacity = alpha;
    }

    if (progress >= 1 && !completed.current) {
      completed.current = true;
      if (onComplete) onComplete();
    }
  });

  return (
    <group position={position}>
      {/* 3D Champagne glowing particles */}
      <instancedMesh ref={glowRef} args={[shardGeom, null, PARTICLE_COUNT]} frustumCulled={false}>
        <meshBasicMaterial
          color={[2.5, 1.8, 1.0]} // Brighter glow for cinematic bloom
          toneMapped={false}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
