import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';


const snapPoints = [
  0,            // Start
  2 / 16,       // Card 1
  4 / 16,       // Card 2
  6 / 16,       // Card 3
  8 / 16,       // Card 4
  11 / 16,      // Title 1
  12 / 16,      // Title 2
  13 / 16,      // Title 3
  14 / 16,      // Title 4 (04 Entscheiden)
  15 / 16,      // Vortex Mid-Flight
  1.0           // End (Logo Complete)
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
  { camZ: -170.0, target: new THREE.Vector3(0, -1, -180) }, // Morph Vortex Mid-Flight
  { camZ: -190.0, target: new THREE.Vector3(0, -1, -205) }, // End
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

export default function CameraRig({ activeCard }) {
  const scroll = useScroll();
  const activeStage = useRef(0);
  const lastScrollTime = useRef(0);
  const cooldown = 1000; // ms (gives a nice travel time before enabling the next scroll)
  
  // Track current state separately from the ideal state to allow ultra-smooth lerping
  const currentPosition = useRef(new THREE.Vector3(0, 1, 20));
  const currentLookAt = useRef(new THREE.Vector3(0, -4, -20));
  const prevIdealZ = useRef(null);

  // Loop transition state refs
  const isLooping = useRef(false);
  const loopStartTime = useRef(0);
  const loopStartPos = useRef(new THREE.Vector3());
  const loopStartLookAt = useRef(new THREE.Vector3());
  const loopStartUp = useRef(new THREE.Vector3());

  // Refs to capture camera state in useFrame for access in the event listener closures
  const cameraPosRef = useRef(new THREE.Vector3());
  const cameraLookAtRef = useRef(new THREE.Vector3());
  const cameraUpRef = useRef(new THREE.Vector3());

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
    
    new THREE.Vector3(1.5, 1, -98),    // Center, elevate and travel a bit without text
    new THREE.Vector3(0, 6, -115),     // Reach top view static camera position!
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

    const triggerLoopTransition = (now) => {
      if (isLooping.current) return;
      isLooping.current = true;
      loopStartTime.current = now;
      lastScrollTime.current = now + 1500; // prevent scrolling during loop transition

      // Capture starting camera state for interpolation
      loopStartPos.current.copy(cameraPosRef.current);
      loopStartLookAt.current.copy(cameraLookAtRef.current);
      loopStartUp.current.copy(cameraUpRef.current);

      const overlay = document.getElementById('loop-overlay');
      if (overlay) {
        overlay.classList.add('active');
      }
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollTime.current < cooldown) return;

      const delta = e.deltaY;
      if (Math.abs(delta) < 10) return; // Ignore very small movements (flickering)
      if (activeCard) return; // Disable scroll when viewing card detail

      let changed = false;
      if (delta > 0) {
        // Scroll down
        if (activeStage.current < snapPoints.length - 1) {
          activeStage.current = activeStage.current + 1;
          changed = true;
        } else {
          // At the end, scrolling down triggers the loop!
          triggerLoopTransition(now);
        }
      } else {
        // Scroll up -> clamp to start
        if (activeStage.current > 0) {
          activeStage.current = activeStage.current - 1;
          changed = true;
        }
      }

      if (changed) {
        lastScrollTime.current = now;
        const maxScroll = el.scrollHeight - el.clientHeight;
        const targetScroll = snapPoints[activeStage.current] * maxScroll;
        
        gsap.to(el, {
          scrollTop: targetScroll,
          duration: 0.9,
          ease: "power2.out",
          overwrite: "auto"
        });
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
      if (activeCard) return; // Disable scroll when viewing card detail

      let changed = false;
      if (diffY > 0) {
        // Swipe up -> scroll down
        if (activeStage.current < snapPoints.length - 1) {
          activeStage.current = activeStage.current + 1;
          changed = true;
        } else {
          // At the end, swiping down triggers the loop!
          triggerLoopTransition(now);
        }
      } else {
        // Swipe down -> scroll up -> clamp to start
        if (activeStage.current > 0) {
          activeStage.current = activeStage.current - 1;
          changed = true;
        }
      }

      if (changed) {
        lastScrollTime.current = now;
        const maxScroll = el.scrollHeight - el.clientHeight;
        const targetScroll = snapPoints[activeStage.current] * maxScroll;
        
        gsap.to(el, {
          scrollTop: targetScroll,
          duration: 0.9,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
    };

    // Hook into the hero start button container to begin the journey
    const startBtnContainer = document.querySelector('.hero-btn-container');
    const handleStart = () => {
      const now = Date.now();
      activeStage.current = 1; // Snap directly to Card 1
      lastScrollTime.current = now;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const targetScroll = snapPoints[activeStage.current] * maxScroll;
      
      gsap.to(el, {
        scrollTop: targetScroll,
        duration: 1.2,
        ease: "power2.out",
        overwrite: "auto"
      });
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
  }, [scroll, activeCard]);

  useFrame((state, delta) => {
    // Handle camera looping transition
    if (isLooping.current) {
      const elapsed = (Date.now() - loopStartTime.current) / 1000.0;
      const progress = Math.min(1.0, elapsed);

      // Fly camera forward/downward along -Z and Y into the starfield
      const targetPos = new THREE.Vector3(0, 5.0, -200.0);
      const idealPosition = new THREE.Vector3().lerpVectors(loopStartPos.current, targetPos, progress);

      const targetLookAt = new THREE.Vector3(0, -10.0, -250.0);
      const idealLookAt = new THREE.Vector3().lerpVectors(loopStartLookAt.current, targetLookAt, progress);

      const targetUp = new THREE.Vector3(0, 1, 0);
      const upVector = new THREE.Vector3().lerpVectors(loopStartUp.current, targetUp, progress).normalize();

      state.camera.position.copy(idealPosition);
      state.camera.up.copy(upVector);
      state.camera.lookAt(idealLookAt);

      currentPosition.current.copy(idealPosition);
      currentLookAt.current.copy(idealLookAt);

      if (progress >= 1.0) {
        // Transition fully complete (screen is black): reset scroll and stage instantly
        const el = scroll.el;
        if (el) {
          el.scrollTop = 0;
        }
        activeStage.current = 0;
        isLooping.current = false;

        // Reset scroll offsets instantly to prevent Drei from damping/animating backwards
        scroll.offset = 0;
        scroll.current = 0;

        // Reset camera positions instantly to prevent dampening/animating backwards
        currentPosition.current.set(0, 1, 20);
        currentLookAt.current.set(0, -4, -20);
        prevIdealZ.current = null;

        // Fade back in
        const overlay = document.getElementById('loop-overlay');
        if (overlay) {
          overlay.classList.remove('active');
        }
      }

      // Capture parameters
      cameraPosRef.current.copy(state.camera.position);
      cameraUpRef.current.copy(state.camera.up);
      cameraLookAtRef.current.copy(currentLookAt.current);
      return;
    }

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
    let idealPosition, idealLookAt;
    
    // Calculate the camera's up vector based on scroll progress
    const upVector = new THREE.Vector3(0, 1, 0);
    
    if (activeCard) {
      // Lock camera in front of the active card
      const cp = activeCard.position;
      idealPosition = new THREE.Vector3(cp[0], cp[1], cp[2] + 9.0);
      idealLookAt = new THREE.Vector3(cp[0], cp[1], cp[2]);
    } else {
      if (t >= 11/16) {
        // Locked static position looking straight down!
        let cameraY = 6.0;
        if (t > 14/16) {
          const factor = (t - 14/16) / (1.0 - 14/16);
          // Dolly out vertically: increase Y from 6.0 to 38.0
          cameraY = 6.0 + factor * 32.0;
        }
        idealPosition = new THREE.Vector3(0, cameraY, -115);
        idealLookAt = new THREE.Vector3(0, -10, -115);
        upVector.set(0, 0, -1); // Camera's head points along -Z (forward) when looking down
      } else {
        // Map scroll range t < 11/16 to curve progress
        const curveProgress = Math.min(1.0, t / (11/16));
        idealPosition = curve.getPoint(curveProgress);
        
        if (t >= 8/16) {
          // Transition: tilt camera down!
          const factor = (t - 8/16) / (11/16 - 8/16);
          const startLook = getFocusTarget(idealPosition.z);
          const endLook = new THREE.Vector3(0, -10, -115);
          idealLookAt = new THREE.Vector3().lerpVectors(startLook, endLook, factor);
          
          // Interpolate camera up from [0, 1, 0] to [0, 0, -1]
          upVector.set(0, 1 - factor, -factor).normalize();
        } else {
          idealLookAt = getFocusTarget(idealPosition.z);
        }
      }
    }

    // If the Z jump between frames is very large, teleport instantly!
    if (prevIdealZ.current !== null) {
      const deltaZ = idealPosition.z - prevIdealZ.current;
      if (Math.abs(deltaZ) > 100) {
        currentPosition.current.copy(idealPosition);
        currentLookAt.current.copy(idealLookAt);
      }
    }
    prevIdealZ.current = idealPosition.z;

    // Frame-rate independent exponential asymptotic dampening
    const positionDamp = 1 - Math.exp(-2.5 * delta); // Slower, heavier positional tracking for smooth travel
    const lookAtDamp = 1 - Math.exp(-2.0 * delta);   // Slower, heavier rotation for solid cinematic feel

    // Smoothly drag the actual position and lookAt target towards the ideal targets
    currentPosition.current.lerp(idealPosition, positionDamp);
    currentLookAt.current.lerp(idealLookAt, lookAtDamp);

    // Apply the smoothed vectors directly to the camera
    state.camera.position.copy(currentPosition.current);
    state.camera.up.copy(upVector); // Apply smooth camera orientation up-vector
    state.camera.lookAt(currentLookAt.current);

    // Capture camera parameters for loop transition starters
    cameraPosRef.current.copy(state.camera.position);
    cameraUpRef.current.copy(state.camera.up);
    cameraLookAtRef.current.copy(currentLookAt.current);
  });

  return null;
}
