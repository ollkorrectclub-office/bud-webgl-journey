import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';

export default function CameraRig() {
  const scroll = useScroll();
  
  // Track current state separately from the ideal state to allow ultra-smooth lerping
  const currentPosition = useRef(new THREE.Vector3(0, 1, 20));
  const currentLookAt = useRef(new THREE.Vector3(0, 1, 10));

  // Define the cinematic camera path
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1, 20),       // Hero (Wide shot, starting slightly elevated)
    new THREE.Vector3(0, -2, 5),       // Entering the field (skimming surface)
    
    // Card 1 is exactly at (-3, -1, -20)
    new THREE.Vector3(-3, -1, -10),    // Swing into Card 1's lane early
    new THREE.Vector3(-3, -1, -15),    // Fly straight at Card 1 (guarantees dead-center focus)
    new THREE.Vector3(-3, -1, -17),    // Pause in front of Card 1
    new THREE.Vector3(-3, -1, -18),    // Linger
    new THREE.Vector3(-3, -1, -20),    // Pass through Card 1
    
    // Card 2 is exactly at (3, -1, -40)
    new THREE.Vector3(3, -1, -30),     // Swing into Card 2's lane early
    new THREE.Vector3(3, -1, -35),     // Fly straight at Card 2
    new THREE.Vector3(3, -1, -37),     // Pause in front of Card 2
    new THREE.Vector3(3, -1, -38),     // Linger
    new THREE.Vector3(3, -1, -40),     // Pass through Card 2
    
    // Card 3 is exactly at (-3, -1, -60)
    new THREE.Vector3(-3, -1, -50),    // Swing into Card 3's lane early
    new THREE.Vector3(-3, -1, -55),    // Fly straight at Card 3
    new THREE.Vector3(-3, -1, -57),    // Pause in front of Card 3
    new THREE.Vector3(-3, -1, -58),    // Linger
    new THREE.Vector3(-3, -1, -60),    // Pass through Card 3
    
    // Card 4 is exactly at (3, -1, -80)
    new THREE.Vector3(3, -1, -70),     // Swing into Card 4's lane early
    new THREE.Vector3(3, -1, -75),     // Fly straight at Card 4
    new THREE.Vector3(3, -1, -77),     // Pause in front of Card 4
    new THREE.Vector3(3, -1, -78),     // Linger
    new THREE.Vector3(3, -1, -80),     // Pass through Card 4
    
    new THREE.Vector3(0, -2, -95),     // Return to center channel
    
    new THREE.Vector3(0, -2, -105),    // Verstehen Word
    new THREE.Vector3(-2, -2, -120),   // Fragen Word
    new THREE.Vector3(2, -2, -135),    // Analysieren Word
    new THREE.Vector3(-1, -2, -150),   // Entscheiden Word
    new THREE.Vector3(0, -2, -165),    // Approaching Final Clarity
    new THREE.Vector3(0, -2, -180),    // Passing Final Clarity
  ]);

  useFrame((state, delta) => {
    // scroll.offset goes from 0 to 1
    const t = scroll.offset;

    // Optional: Hide hero text when scroll starts
    const heroText = document.getElementById('hero-text');
    if (heroText) {
      if (t > 0.02) {
        heroText.style.opacity = '0';
      } else {
        heroText.style.opacity = '1';
      }
    }

    // Calculate exactly where the camera SHOULD be based on the scroll position
    const idealPosition = curve.getPoint(t);
    const idealTangent = curve.getTangent(t).normalize();
    
    // Calculate exactly where the camera SHOULD be looking (10 units ahead on the curve)
    const idealLookAt = idealPosition.clone().add(idealTangent.multiplyScalar(10));

    // Framerate-independent smoothing factor
    // Lower number = heavier smoothing/lag, Higher number = snappier
    const dampFactor = 4.0 * delta;

    // Smoothly drag the actual position and lookAt target towards the ideal targets
    currentPosition.current.lerp(idealPosition, dampFactor);
    currentLookAt.current.lerp(idealLookAt, dampFactor);

    // Apply the smoothed vectors directly to the camera
    state.camera.position.copy(currentPosition.current);
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
}
