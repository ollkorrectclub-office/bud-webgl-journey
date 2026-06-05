import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

export default function CameraRig() {
  const activeStage = useRef(0);
  
  // The exact fraction of the 350-unit journey (Z=120 to Z=-230)
  // Adjusted to stop the camera exactly 8 units IN FRONT of each card/title!
  // This ensures the cards are extremely readable when you add text, completely filling the view comfortably.
  const baseTValues = [
    110 / 350,   // Stage 0: Hero (Z=10)
    132 / 350,   // Stage 1: Card 1 (Z=-12) | Distance to Card Z=-20 is exactly 8
    157 / 350,   // Stage 2: Card 2 (Z=-37) | Distance to Card Z=-45 is exactly 8
    182 / 350,   // Stage 3: Card 3 (Z=-62) | Distance to Card Z=-70 is exactly 8
    207 / 350,   // Stage 4: Card 4 (Z=-87) | Distance to Card Z=-95 is exactly 8
    232 / 350,   // Stage 5: Title 1 (Z=-112) | Distance to Title Z=-120 is exactly 8
    257 / 350,   // Stage 6: Title 2 (Z=-137) | Distance to Title Z=-145 is exactly 8
    282 / 350,   // Stage 7: Title 3 (Z=-162) | Distance to Title Z=-170 is exactly 8
    307 / 350,   // Stage 8: Title 4 (Z=-187) | Distance to Title Z=-195 is exactly 8
    332 / 350,   // Stage 9: Title 5 (Z=-212) | Distance to Title Z=-220 is exactly 8
    390 / 350,   // Stage 10: Logo Morph (Z=80) 
    440 / 350    // Stage 11: Logo Flythrough (Z=30)
  ];
  
  // 1D timeline for GSAP buttery smooth travel 
  const smoothT = useRef({ val: baseTValues[0] });
  
  const currentLookAt = useRef(new THREE.Vector3(0, -3.0, 0));
  const prevIdealZ = useRef(null);

  // Exact X-coordinate keyframes for flawless, wobble-free centering!
  const positionKeyframes = [
    { z: 120, x: 0 },
    { z: 10, x: 0 }, // Hero
    { z: -12, x: -4 }, // Card 1 (Centers exactly on X=-4)
    { z: -37, x: 4 }, // Card 2 (Centers exactly on X=4)
    { z: -62, x: -4 }, // Card 3
    { z: -87, x: 4 }, // Card 4
    { z: -112, x: -4 }, // Title 1
    { z: -137, x: 4 }, // Title 2
    { z: -162, x: -4 }, // Title 3
    { z: -187, x: 4 }, // Title 4
    { z: -212, x: -4 }, // Title 5
    { z: -230, x: 0 }, 
    { z: -270, x: 0 }
  ];

  // --- PURE MATHEMATICAL TRAJECTORY ENGINE ---
  const getIdealPosition = (t) => {
    const z = 120 - t * 350;
    
    let x = 0;
    for (let i = 0; i < positionKeyframes.length - 1; i++) {
       const k1 = positionKeyframes[i];
       const k2 = positionKeyframes[i+1];
       if (z <= k1.z && z >= k2.z) {
          const factor = (k1.z - z) / (k1.z - k2.z);
          // Pure linear interpolation. Since Z is animated by GSAP power3.inOut, 
          // this creates a flawless, perfectly straight diagonal flight path 
          // that naturally accelerates/decelerates! No more swerving or 'S-curves'.
          x = k1.x + (k2.x - k1.x) * factor;
          break;
       }
    }
    
    // Y is locked to -3.0 so the camera is perfectly level with the center of the cards.
    return new THREE.Vector3(x, -3.0, z);
  };

  // The camera turns its head to look directly at the NEXT card while traveling,
  // creating a completely natural "flying straight to" sensation.
  const lookAtKeyframes = [
    { z: 120, target: new THREE.Vector3(0, -3.0, 0) },
    { z: 10, target: new THREE.Vector3(0, -3.0, -20) }, // Hero
    
    { z: -12, target: new THREE.Vector3(-4, -3.0, -20) }, // Parked at Card 1
    { z: -15, target: new THREE.Vector3(4, -3.0, -45) },  // Turn head to Card 2
    
    { z: -37, target: new THREE.Vector3(4, -3.0, -45) },  // Parked at Card 2
    { z: -40, target: new THREE.Vector3(-4, -3.0, -70) }, // Turn head to Card 3

    { z: -62, target: new THREE.Vector3(-4, -3.0, -70) }, // Parked at Card 3
    { z: -65, target: new THREE.Vector3(4, -3.0, -95) },  // Turn head to Card 4

    { z: -87, target: new THREE.Vector3(4, -3.0, -95) },  // Parked at Card 4
    { z: -90, target: new THREE.Vector3(-4, -3.0, -120) },// Turn head to Title 1

    { z: -112, target: new THREE.Vector3(-4, -3.0, -120) },// Parked at Title 1
    { z: -115, target: new THREE.Vector3(4, -3.0, -145) }, // Turn head to Title 2

    { z: -137, target: new THREE.Vector3(4, -3.0, -145) }, // Parked at Title 2
    { z: -140, target: new THREE.Vector3(-4, -3.0, -170) },// Turn head to Title 3

    { z: -162, target: new THREE.Vector3(-4, -3.0, -170) },// Parked at Title 3
    { z: -165, target: new THREE.Vector3(4, -3.0, -195) }, // Turn head to Title 4

    { z: -187, target: new THREE.Vector3(4, -3.0, -195) }, // Parked at Title 4
    { z: -190, target: new THREE.Vector3(-4, -3.0, -220) },// Turn head to Title 5

    { z: -212, target: new THREE.Vector3(-4, -3.0, -220) },// Parked at Title 5
    { z: -215, target: new THREE.Vector3(0, -3.0, -270) }, // Turn head to Logo
    
    { z: -230, target: new THREE.Vector3(0, -3.0, -270) }, 
    { z: -270, target: new THREE.Vector3(0, -3.0, -270) }
  ];

  const getIdealLookAt = (camZ) => {
     let localZ = camZ;
     for (let i = 0; i < lookAtKeyframes.length - 1; i++) {
        const k1 = lookAtKeyframes[i];
        const k2 = lookAtKeyframes[i+1];
        if (localZ <= k1.z && localZ >= k2.z) {
           const factor = (k1.z - localZ) / (k1.z - k2.z);
           return new THREE.Vector3().lerpVectors(k1.target, k2.target, factor);
        }
     }
     return new THREE.Vector3(0, -3.0, camZ - 8);
  };

  useEffect(() => {
    // Hide native scrollbars and prevent manual scrolling completely
    document.body.style.overflow = 'hidden';

    let isScrollLocked = false;
    let scrollTimeout = null;
    let touchStartY = 0;

    const navigateToNextStage = () => {
       activeStage.current++;
       const loop = Math.floor(activeStage.current / 12);
       const index = activeStage.current % 12;
       const targetT = baseTValues[index] + loop;
       
       gsap.to(smoothT.current, {
           val: targetT,
           duration: 1.8, // Slightly longer for luxurious smoothness
           ease: "power3.inOut",
           overwrite: true
       });
    };

    const navigateToPrevStage = () => {
       if (activeStage.current > 0) {
           activeStage.current--;
           const loop = Math.floor(activeStage.current / 12);
           const index = activeStage.current % 12;
           const targetT = baseTValues[index] + loop;
           
           gsap.to(smoothT.current, {
               val: targetT,
               duration: 1.8,
               ease: "power3.inOut",
               overwrite: true
           });
       }
    };

    // --- TRACKPAD MOMENTUM DEBOUNCER ---
    // This absolutely guarantees that ONE physical scroll movement equals exactly ONE jump.
    const handleScrollEvent = (delta) => {
      // Ignore extreme micro-movements (like resting a finger on a Mac trackpad)
      if (Math.abs(delta) < 3) return;

      // Every significant momentum event resets the lock clock!
      if (scrollTimeout) clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
         isScrollLocked = false; // Unlocks when trackpad has been completely physically dead for 80ms
      }, 80);

      if (isScrollLocked) return;

      // We are unlocked and received a real scroll! Trigger jump!
      if (delta > 0) navigateToNextStage();
      else navigateToPrevStage();

      isScrollLocked = true; // Instantly lock it!
    };

    const handleWheel = (e) => {
      e.preventDefault(); // Stop native scrolling
      handleScrollEvent(e.deltaY);
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      e.preventDefault(); 
      const touchY = e.touches[0].clientY;
      const diffY = touchStartY - touchY;

      if (Math.abs(diffY) < 10) return; // Threshold for touch

      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
         isScrollLocked = false;
      }, 80);

      if (isScrollLocked) return;

      if (diffY > 0) navigateToNextStage();
      else navigateToPrevStage();

      isScrollLocked = true;
      touchStartY = touchY; 
    };

    const startBtnContainer = document.querySelector('.hero-btn-container');
    const handleStart = () => {
      if (activeStage.current === 0) navigateToNextStage();
    };
    if (startBtnContainer) startBtnContainer.addEventListener('click', handleStart);

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (startBtnContainer) startBtnContainer.removeEventListener('click', handleStart);
    };
  }, []);

  useFrame((state, delta) => {
    // Extract the bounded T for actual geometry calculation
    const finalT = (smoothT.current.val % 1.0 + 1.0) % 1.0;
    
    // Optional: Smoothly fade hero text over a longer distance
    const heroText = document.getElementById('hero-text');
    if (heroText) {
      // smoothT goes from 110/350 (0.314) up.
      const currentVal = smoothT.current.val;
      const distanceScrolled = currentVal - baseTValues[0];
      
      let opacity = 1.0;
      if (distanceScrolled > 0.05) opacity = 0;
      else if (distanceScrolled > 0) opacity = 1.0 - (distanceScrolled / 0.05);
      
      if (finalT > 0.1 && finalT < 0.3) {
         if (finalT > 0.28) opacity = (finalT - 0.28) / 0.034; 
         else opacity = 0;
      }

      heroText.style.opacity = Math.max(0, Math.min(1, opacity)).toString();
      heroText.style.pointerEvents = opacity > 0.01 ? 'auto' : 'none';
    }

    // Calculate mathematically perfect trajectory point
    const idealPosition = getIdealPosition(finalT);
    const idealLookAt = getIdealLookAt(idealPosition.z);

    // --- INFINITE LOOP ROTATION FIX ---
    if (prevIdealZ.current !== null) {
       if (idealPosition.z - prevIdealZ.current > 175) {
          currentLookAt.current.z += 350;
       } else if (idealPosition.z - prevIdealZ.current < -175) {
          currentLookAt.current.z -= 350;
       }
    }
    prevIdealZ.current = idealPosition.z;

    const lookAtDamp = 1 - Math.exp(-4.5 * delta); // Smooth but responsive head tracking
    currentLookAt.current.lerp(idealLookAt, lookAtDamp);

    state.camera.position.copy(idealPosition);
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
}
