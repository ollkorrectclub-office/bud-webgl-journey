import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 300;
const DURATION = 2.0; // Slightly longer duration for a slower, more graceful fade

export default function CardShatter({ position, onComplete }) {
  const glowRef = useRef();
  const startTime = useRef(null);
  const completed = useRef(false);

  const particles = useMemo(() => {
    const width = 6;
    const height = 4;

    return Array.from({ length: PARTICLE_COUNT }, () => {
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;

      // Normalized coordinates from center
      const dx = x / (width / 2);
      const dy = y / (height / 2);

      // Slower, elegant floating velocities: drift outward, upward, and forward
      const speed = 0.4 + Math.random() * 1.0;
      const vx = dx * speed + (Math.random() - 0.5) * 0.3;
      const vy = dy * speed + 0.4 + Math.random() * 0.6; // gentle upward lift
      const vz = 1.0 + Math.random() * 2.0; // drift towards camera

      const rx = (Math.random() - 0.5) * 3;
      const ry = (Math.random() - 0.5) * 3;
      const rz = (Math.random() - 0.5) * 3;

      // Small, delicate glowing dust particles
      const scale = 0.02 + Math.random() * 0.08;

      return { x, y, vx, vy, vz, rx, ry, rz, scale };
    });
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const shardGeom = useMemo(() => {
    return new THREE.CircleGeometry(0.4, 8); // Simple, efficient circular shapes
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
    
    // Smooth quintic ease-out so particles decelerate and disappear gracefully
    const eased = 1 - Math.pow(1 - progress, 5);

    particles.forEach((p, i) => {
      const t = elapsed;
      dummy.position.set(
        p.x + p.vx * t,
        p.y + p.vy * t + 0.1 * t * t, // light upward acceleration (anti-gravity drift)
        p.vz * t // drifting forward to create 3D depth
      );
      dummy.rotation.set(p.rx * t, p.ry * t, p.rz * t);
      
      const fadeScale = p.scale * Math.max(0, 1 - eased);
      dummy.scale.set(fadeScale, fadeScale, fadeScale);
      dummy.updateMatrix();
      glowRef.current.setMatrixAt(i, dummy.matrix);
    });

    glowRef.current.instanceMatrix.needsUpdate = true;

    const alpha = Math.max(0, 1 - eased);
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
      {/* Pure champagne gold glowing particles (bloom enabled) */}
      <instancedMesh ref={glowRef} args={[shardGeom, null, PARTICLE_COUNT]} frustumCulled={false}>
        <meshBasicMaterial
          color={[2.2, 1.6, 0.9]} // Champagne Gold emissive tone
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
