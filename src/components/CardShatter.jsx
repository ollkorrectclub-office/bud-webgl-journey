import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 400;
const DURATION = 1.6;

export default function CardShatter({ position, onComplete }) {
  const darkRef = useRef();
  const glowRef = useRef();
  const startTime = useRef(null);
  const completed = useRef(false);

  const particles = useMemo(() => {
    const width = 6;
    const height = 4;

    return Array.from({ length: PARTICLE_COUNT }, () => {
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;

      const dx = x / (width / 2);
      const dy = y / (height / 2);

      const speed = 2 + Math.random() * 6;
      const vx = dx * speed + (Math.random() - 0.5) * 2;
      const vy = dy * speed + Math.random() * 3;
      const vz = Math.random() * 5 + 1;

      const rx = (Math.random() - 0.5) * 12;
      const ry = (Math.random() - 0.5) * 12;
      const rz = (Math.random() - 0.5) * 12;

      const scale = 0.04 + Math.random() * 0.14;

      return { x, y, vx, vy, vz, rx, ry, rz, scale };
    });
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const shardGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.5);
    shape.lineTo(-0.43, -0.25);
    shape.lineTo(0.43, -0.25);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  useEffect(() => {
    [darkRef, glowRef].forEach((ref) => {
      if (!ref.current) return;
      particles.forEach((p, i) => {
        dummy.position.set(p.x, p.y, 0);
        dummy.scale.set(p.scale, p.scale, p.scale);
        dummy.rotation.set(0, 0, Math.random() * Math.PI * 2);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    });
  }, [particles, dummy]);

  useFrame((state) => {
    if (completed.current) return;
    if (!darkRef.current || !glowRef.current) return;

    if (startTime.current === null) {
      startTime.current = state.clock.getElapsedTime();
    }

    const elapsed = state.clock.getElapsedTime() - startTime.current;
    const progress = Math.min(elapsed / DURATION, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    particles.forEach((p, i) => {
      const t = elapsed;
      dummy.position.set(
        p.x + p.vx * t,
        p.y + p.vy * t - 3.5 * t * t,
        p.vz * t
      );
      dummy.rotation.set(p.rx * t, p.ry * t, p.rz * t);
      const fadeScale = p.scale * Math.max(0, 1 - eased);
      dummy.scale.set(fadeScale, fadeScale, fadeScale);
      dummy.updateMatrix();
      darkRef.current.setMatrixAt(i, dummy.matrix);
      glowRef.current.setMatrixAt(i, dummy.matrix);
    });

    darkRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;

    const alpha = Math.max(0, 1 - eased);
    if (darkRef.current.material) darkRef.current.material.opacity = alpha * 0.7;
    if (glowRef.current.material) glowRef.current.material.opacity = alpha;

    if (progress >= 1 && !completed.current) {
      completed.current = true;
      if (onComplete) onComplete();
    }
  });

  return (
    <group position={position}>
      {/* Dark glass shards */}
      <instancedMesh ref={darkRef} args={[shardGeom, null, PARTICLE_COUNT]} frustumCulled={false}>
        <meshBasicMaterial
          color="#080810"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>
      {/* Champagne gold glowing shards (bloom) */}
      <instancedMesh ref={glowRef} args={[shardGeom, null, PARTICLE_COUNT]} frustumCulled={false}>
        <meshBasicMaterial
          color={[2.0, 1.5, 0.8]}
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
