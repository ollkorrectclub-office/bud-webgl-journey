import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';

const snapPoints = [
  0,            // Start
  2 / 16,       // Card 1
  4 / 16,       // Card 2
  6 / 16,       // Card 3
  8 / 16,       // Card 4
  11 / 16,      // Title 1
  12 / 16,      // Title 2
  13 / 16,      // Title 3
  14 / 16,      // Title 4
  15 / 16,      // Title 5 (Klarheit)
  1.0           // End
];

const lookAtKeyframes = [
  { camZ: 20, target: new THREE.Vector3(0, -4, -20) },      // Start (looking ahead at Card 1)
  { camZ: -11.0, target: new THREE.Vector3(-3, -4, -20) },  // Card 1
  { camZ: -31.0, target: new THREE.Vector3(3, -4, -40) },   // Card 2
  { camZ: -51.0, target: new THREE.Vector3(-3, -4, -60) },  // Card 3
  { camZ: -71.0, target: new THREE.Vector3(3, -4, -80) },   // Card 4
  { camZ: -105.0, target: new THREE.Vector3(0, -1, -115) }, // Title 1
  { camZ: -120.0, target: new THREE.Vector3(0, -1, -130) }, // Title 2
  { camZ: -135.0, target: new THREE.Vector3(0, -1, -145) }, // Title 3
  { camZ: -150.0, target: new THREE.Vector3(0, -1, -160) }, // Title 4
  { camZ: -170.0, target: new THREE.Vector3(0, -1, -180) }, // Title 5 (Klarheit)
  { camZ: -190.0, target: new THREE.Vector3(0, -1, -205) }, // End (looking straight ahead past Klarheit)
];

// Calculates a stable, linear-interpolated focus target for the camera based on its Z position.
// This prevents camera wobblyness caused by curve tangents and keeps cards/titles in screen center.
function getFocusTarget(camZ) {
  if (camZ >= lookAtKeyframes[0].camZ) {
    return lookAtKeyframes[0].target.clone();
  }
  if (camZ <= lookAtKeyframes[lookAtKeyframes.length - 1].camZ) {
    return lookAtKeyframes[lookAtKeyframes.length - 1].target.clone();
  }

  for (let i = 0; i < lookAtKeyframes.length - 1; i++) {
    const k1 = lookAtKeyframes[i];
    const k2 = lookAtKeyframes[i + 1];
    if (camZ <= k1.camZ && camZ >= k2.camZ) {
      const factor = (k1.camZ - camZ) / (k1.camZ - k2.camZ);
      return new THREE.Vector3().lerpVectors(k1.target, k2.target, factor);
    }
  }

  return new THREE.Vector3(0, -1, camZ - 15);
}

export default function CameraRig() {
  const scroll = useScroll();
  const activeStage = useRef(0);
  const lastScrollTime = useRef(0);
  const cooldown = 400; // ms (gives a nice travel time before enabling the next scroll)
  
  // Track current state separately from the ideal state to allow ultra-smooth lerping
  const currentPosition = useRef(new THREE.Vector3(0, 1, 20));
  const currentLookAt = useRef(new THREE.Vector3(0, -4, -20));
  const prevIdealZ = useRef(null);

  // Define a simplified, wobblying-free cinematic camera path
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1, 20),       // Hero (Wide shot, starting slightly elevated)
    new THREE.Vector3(0, -4, 0),       // Entering the field at card height (Y = -4, Z = 0)
    
    // Card 1 is at (-3, -4, -20)
    new THREE.Vector3(-3, -4, -11.0),  // Linger in front of Card 1 (9.0 units away)
    new THREE.Vector3(-3, -4, -20),    // Pass through Card 1
    
    // Card 2 is at (3, -4, -40)
    new THREE.Vector3(3, -4, -31.0),   // Linger in front of Card 2 (9.0 units away)
    new THREE.Vector3(3, -4, -40),     // Pass through Card 2
    
    // Card 3 is at (-3, -4, -60)
    new THREE.Vector3(-3, -4, -51.0),  // Linger in front of Card 3 (9.0 units away)
    new THREE.Vector3(-3, -4, -60),    // Pass through Card 3
    
    // Card 4 is at (3, -4, -80)
    new THREE.Vector3(3, -4, -71.0),   // Linger in front of Card 4 (9.0 units away)
    new THREE.Vector3(3, -4, -80),     // Pass through Card 4
    
    new THREE.Vector3(3, -4, -98.4),   // Keep straight in Card 4 lane to stabilize spline tension before centering
    
    new THREE.Vector3(0, -1, -105),    // Title 1 Snap (10 units in front of -115)
    new THREE.Vector3(0, -1, -120),    // Title 2 Snap (10 units in front of -130)
    new THREE.Vector3(0, -1, -135),    // Title 3 Snap (10 units in front of -145)
    new THREE.Vector3(0, -1, -150),    // Title 4 Snap (10 units in front of -160)
    new THREE.Vector3(0, -1, -170),    // Title 5 Snap (10 units in front of -180)
    new THREE.Vector3(0, -1, -190),    // End
  ]);

  useEffect(() => {
    const el = scroll.el;
    if (!el) return;

    // Reset scroll position to top on mount
    el.scrollTop = 0;

    // Force hide scrollbars so it looks clean and overrides standard scrollbar scrolling
    el.style.overflow = 'hidden';

    // Touch swipe variables
    let touchStartY = 0;

    const handleWheel = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollTime.current < cooldown) return;

      const delta = e.deltaY;
      if (Math.abs(delta) < 10) return; // Ignore very small movements (flickering)

      let changed = false;
      if (delta > 0) {
        // Scroll down -> go next stage without wrapping
        if (activeStage.current < snapPoints.length - 1) {
          activeStage.current += 1;
          changed = true;
        }
      } else {
        // Scroll up -> go previous stage without wrapping
        if (activeStage.current > 0) {
          activeStage.current -= 1;
          changed = true;
        }
      }

      if (changed) {
        lastScrollTime.current = now;
        const maxScroll = el.scrollHeight - el.clientHeight;
        el.scrollTop = snapPoints[activeStage.current] * maxScroll;
      }
    };

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      const now = Date.now();
      if (now - lastScrollTime.current < cooldown) return;

      const touchY = e.touches[0].clientY;
      const diffY = touchStartY - touchY;

      if (Math.abs(diffY) < 40) return; // Require a minimum swipe distance

      let changed = false;
      if (diffY > 0) {
        // Swipe up -> scroll down -> go next stage without wrapping
        if (activeStage.current < snapPoints.length - 1) {
          activeStage.current += 1;
          changed = true;
        }
      } else {
        // Swipe down -> scroll up -> go previous stage without wrapping
        if (activeStage.current > 0) {
          activeStage.current -= 1;
          changed = true;
        }
      }

      if (changed) {
        lastScrollTime.current = now;
        const maxScroll = el.scrollHeight - el.clientHeight;
        el.scrollTop = snapPoints[activeStage.current] * maxScroll;
      }
    };

    // Hook into the hero start button container to begin the journey
    const startBtnContainer = document.querySelector('.hero-btn-container');
    const handleStart = () => {
      const now = Date.now();
      activeStage.current = 1; // Snap directly to Card 1
      lastScrollTime.current = now;
      const maxScroll = el.scrollHeight - el.clientHeight;
      el.scrollTop = snapPoints[activeStage.current] * maxScroll;
    };
    if (startBtnContainer) {
      startBtnContainer.addEventListener('click', handleStart);
    }

    // Attach listeners globally to window so that gestures over DOM overlays are caught
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      if (startBtnContainer) {
        startBtnContainer.removeEventListener('click', handleStart);
      }
    };
  }, [scroll]);

  useFrame((state, delta) => {
    // scroll.offset goes from 0 to 1
    const rawOffset = scroll.offset;
    const t = isNaN(rawOffset) || !isFinite(rawOffset) ? 0 : rawOffset;

    // Fade out and blur the hero text quickly before camera travels to Card 1
    const heroText = document.getElementById('hero-text');
    if (heroText) {
      const scrollFactor = Math.min(1, t / 0.02); // complete blur/fade in first 2% of scroll
      const opacity = 1 - scrollFactor;
      const blurVal = scrollFactor * 16;
      
      heroText.style.opacity = opacity.toString();
      heroText.style.filter = `blur(${blurVal}px)`;
      heroText.style.transform = 'translate(-50%, -50%)'; // clean centered overlay without movement
      heroText.style.pointerEvents = opacity > 0.001 ? 'auto' : 'none';
    }

    // Calculate exactly where the camera SHOULD be based on the scroll position
    const idealPosition = curve.getPoint(t);
    
    // Calculate exactly where the camera SHOULD be looking based on our focus target
    const idealLookAt = getFocusTarget(idealPosition.z);

    // If the Z jump between frames is very large, teleport instantly!
    if (prevIdealZ.current !== null) {
      const deltaZ = idealPosition.z - prevIdealZ.current;
      if (Math.abs(deltaZ) > 100) {
        currentPosition.current.copy(idealPosition);
        currentLookAt.current.copy(idealLookAt);
      }
    }
    prevIdealZ.current = idealPosition.z;

    // Frame-rate independent exponential asymptotic dampening (increased speed for tightness)
    const positionDamp = 1 - Math.exp(-4.5 * delta); // Positional tracking
    const lookAtDamp = 1 - Math.exp(-4.0 * delta);   // Rotation tracking

    // Smoothly drag the actual position and lookAt target towards the ideal targets
    currentPosition.current.lerp(idealPosition, positionDamp);
    currentLookAt.current.lerp(idealLookAt, lookAtDamp);

    // Apply the smoothed vectors directly to the camera
    state.camera.position.copy(currentPosition.current);
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
}
