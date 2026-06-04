import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

export default function CameraRig() {
  const scroll = useScroll();
  
  // Use a 1D timeline reference for GSAP buttery smooth physics without spatial sag
  const smoothT = useRef({ val: null });
  const currentLookAt = useRef(null);
  const prevIdealZ = useRef(null);

  // --- PURE MATHEMATICAL TRAJECTORY ENGINE ---
  const getIdealPosition = (t) => {
    // Perfect seamless 350-unit loop 
    const z = 120 - t * 350;
    
    // Slalom continues infinitely across the entire field!
    const x = -4 * Math.cos( ((z + 15) / 50) * 2 * Math.PI );
    
    const y = -2.5;
    
    return new THREE.Vector3(x, y, z);
  };

  // The exact fraction of the 350-unit journey where Z = 10.
  // 120 - (t * 350) = 10  ->  t = 110 / 350
  const startOffset = 110 / 350;

  useFrame((state, delta) => {
    // scroll.offset goes from 0 to 1 perfectly controlled by the browser/drei
    const rawScroll = scroll.offset || 0;
    
    // Base mathematical target using ARC LENGTH percentage
    let targetT = (rawScroll + startOffset) % 1.0;
    if (targetT < 0) targetT += 1.0;

    if (smoothT.current.val === null) smoothT.current.val = targetT;

    // Handle infinite loop wrapping for the 1D timeline
    if (Math.abs(targetT - smoothT.current.val) > 0.5) {
       if (targetT < smoothT.current.val) smoothT.current.val -= 1.0;
       else smoothT.current.val += 1.0;
    }

    // Use GSAP for the ultimate buttery-smooth cinematic scroll easing!
    gsap.to(smoothT.current, {
       val: targetT,
       duration: 1.5,
       ease: "power3.out",
       overwrite: true
    });
    
    // Extract the bounded T for actual geometry calculation
    const finalT = (smoothT.current.val % 1.0 + 1.0) % 1.0;
    
    // Optional: Smoothly fade hero text over a longer distance so it stays visible while
    // the camera begins its journey, and fades out right as the cards emerge from the fog.
    const heroText = document.getElementById('hero-text');
    if (heroText) {
      const fadeStart = 0.00;
      const fadeEnd = 0.03;
      
      let opacity = 0.0;
      if (rawScroll < fadeStart) opacity = 1.0;
      else if (rawScroll <= fadeEnd) opacity = 1.0 - (rawScroll - fadeStart) / (fadeEnd - fadeStart);
      else if (rawScroll >= 0.95) opacity = (rawScroll - 0.95) / 0.05; 
      
      heroText.style.opacity = Math.max(0, Math.min(1, opacity)).toString();
    }

    // Calculate mathematically perfect trajectory point
    const idealPosition = getIdealPosition(finalT);
    
    // --- EXPLICIT COMPONENT FRAMING ---
    const components = [
      { z: -20, x: -4, y: -3.0, switchOffset: 1 },  
      { z: -45, x: 4, y: -3.0, switchOffset: 1 },   
      { z: -70, x: -4, y: -3.0, switchOffset: 1 },  
      { z: -95, x: 4, y: -3.0, switchOffset: 1 },   
      { z: -120, x: -4, y: -3.0, switchOffset: 1 },    
      { z: -145, x: 4, y: -3.0, switchOffset: 1 }, 
      { z: -170, x: -4, y: -3.0, switchOffset: 1 },  
      { z: -195, x: 4, y: -3.0, switchOffset: 1 }, 
      { z: -220, x: -4, y: -3.0, switchOffset: 1 },   
      { z: -999, x: -4, y: -3.0, switchOffset: 1 }   
    ];

    let targetComp = components[components.length - 1];
    for (let i = 0; i < components.length; i++) {
       if (idealPosition.z > components[i].z + components[i].switchOffset) {
          targetComp = components[i];
          break;
       }
    }

    if (!currentLookAt.current) {
      currentLookAt.current = new THREE.Vector3(targetComp.x, targetComp.y, Math.min(idealPosition.z - 15, targetComp.z));
    }

    // --- INFINITE LOOP ROTATION FIX ---
    // Mathematically flawless jump logic keeps the camera gaze stable while teleporting
    if (prevIdealZ.current !== null) {
       if (idealPosition.z - prevIdealZ.current > 175) {
          currentLookAt.current.z += 350;
       } else if (idealPosition.z - prevIdealZ.current < -175) {
          currentLookAt.current.z -= 350;
       }
    }
    prevIdealZ.current = idealPosition.z;

    // Smoothly pan the head to look directly at the exact 3D coordinates of the component
    currentLookAt.current.x = THREE.MathUtils.damp(currentLookAt.current.x, targetComp.x, 3.0, delta);
    currentLookAt.current.y = THREE.MathUtils.damp(currentLookAt.current.y, targetComp.y, 3.0, delta);
    
    // Z gracefully locks onto the component's true depth
    const rawTargetZ = THREE.MathUtils.damp(currentLookAt.current.z, targetComp.z, 3.0, delta);
    currentLookAt.current.z = Math.min(rawTargetZ, idealPosition.z - 15);

    state.camera.position.copy(idealPosition);
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
}
