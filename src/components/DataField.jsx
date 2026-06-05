import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';
import budLogoUrl from '../assets/BUD.svg';

const GRID_X = 600;
const GRID_Z = 800;
const NUM_POINTS = GRID_X * GRID_Z;
const NUM_LOGO_POINTS = 20000;

export default function DataField() {
  const pointsGeometryRef = useRef();
  const logoGeometryRef = useRef();
  const pointsMatRef = useRef();
  const logoMatRef = useRef();
  const linesMatRef = useRef();
  const dustMatRef = useRef();
  const scroll = useScroll();

  const cardPositions = useMemo(() => [
    new THREE.Vector3(-3, -4, -20),
    new THREE.Vector3(3, -4, -40),
    new THREE.Vector3(-3, -4, -60),
    new THREE.Vector3(3, -4, -80)
  ], []);

  const { 
    positions, colors, sizes, intensities, lineIndices, 
    logoPositions, logoColors, logoSizes, logoIntensities, logoTargets, logoTargetColors,
    dustPositions, version 
  } = useMemo(() => {
    const spacingX = 0.6;
    const spacingZ = 0.6;
    
    const pos = new Float32Array(NUM_POINTS * 3);
    const col = new Float32Array(NUM_POINTS * 3);
    const size = new Float32Array(NUM_POINTS);
    const intensity = new Float32Array(NUM_POINTS);
    const indices = [];

    const colorPalette = [
      new THREE.Color('#5F7F93'), // Steel Blue
      new THREE.Color('#F4F0E8'), // Warm White
      new THREE.Color('#C8B68A'), // Champagne
      new THREE.Color('#AD175D'), // Bud Magenta (rare)
    ];

    for (let z = 0; z < GRID_Z; z++) {
      for (let x = 0; x < GRID_X; x++) {
        const i = z * GRID_X + x;
        
        pos[i * 3] = (x - GRID_X / 2) * spacingX;
        pos[i * 3 + 1] = 0; 
        pos[i * 3 + 2] = (z - GRID_Z / 2) * spacingZ - 35.0;

        const rand = Math.random();
        let c;
        if (rand > 0.99) c = colorPalette[3]; 
        else if (rand > 0.95) c = colorPalette[2]; 
        else if (rand > 0.8) c = colorPalette[1]; 
        else c = colorPalette[0];

        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;

        size[i] = 1.0;
        intensity[i] = 1.0;

        // Sparse Data Wires: connecting grid lines
        if (x < GRID_X - 1 && Math.random() > 0.99) indices.push(i, i + 1);
        if (z < GRID_Z - 1 && Math.random() > 0.99) indices.push(i, i + GRID_X);
      }
    }
    
    // Filter grid indices to a localized central region to keep the rest of the waves untouched
    const localIndices = [];
    const minX = 250;
    const maxX = 350;
    const minZ = 310;
    const maxZ = 390;
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        localIndices.push(z * GRID_X + x);
      }
    }

    // Initialize the logo points by picking coordinates from the localized central waves area
    const logoStartPos = new Float32Array(NUM_LOGO_POINTS * 3);
    const logoStartColors = new Float32Array(NUM_LOGO_POINTS * 3);
    const logoTgt = new Float32Array(NUM_LOGO_POINTS * 3);
    const logoCol = new Float32Array(NUM_LOGO_POINTS * 3);
    const logoSizesArr = new Float32Array(NUM_LOGO_POINTS).fill(1.0);
    const logoIntensitiesArr = new Float32Array(NUM_LOGO_POINTS).fill(1.0);

    for (let i = 0; i < NUM_LOGO_POINTS; i++) {
      const gridIdx = localIndices[Math.floor(Math.random() * localIndices.length)];
      
      logoStartPos[i * 3] = pos[gridIdx * 3];
      logoStartPos[i * 3 + 1] = pos[gridIdx * 3 + 1];
      logoStartPos[i * 3 + 2] = pos[gridIdx * 3 + 2];
      
      logoStartColors[i * 3] = col[gridIdx * 3];
      logoStartColors[i * 3 + 1] = col[gridIdx * 3 + 1];
      logoStartColors[i * 3 + 2] = col[gridIdx * 3 + 2];
      
      // Initialize targets to start identical to grid position
      logoTgt[i * 3] = logoStartPos[i * 3];
      logoTgt[i * 3 + 1] = logoStartPos[i * 3 + 1];
      logoTgt[i * 3 + 2] = logoStartPos[i * 3 + 2];
      
      logoCol[i * 3] = logoStartColors[i * 3];
      logoCol[i * 3 + 1] = logoStartColors[i * 3 + 1];
      logoCol[i * 3 + 2] = logoStartColors[i * 3 + 2];
    }

    // Deep static dust points spanning the entire grid Z range
    const dustCount = 8000;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 800; // Wide X spread
      dustPos[i * 3 + 1] = (Math.random() - 1.0) * 80 - 5; // Deep underneath (-5 to -85)
      dustPos[i * 3 + 2] = Math.random() * 480 - 275; 
    }
    
    return { 
      positions: pos, 
      colors: col, 
      sizes: size, 
      intensities: intensity, 
      lineIndices: new Uint16Array(indices),
      logoPositions: logoStartPos,
      logoColors: logoStartColors,
      logoSizes: logoSizesArr,
      logoIntensities: logoIntensitiesArr,
      logoTargets: logoTgt,
      logoTargetColors: logoCol,
      dustPositions: dustPos,
      version: Date.now()
    };
  }, []);

  // --- LOGO PARSING ENGINE ---
  useEffect(() => {
    console.log("Fetching logo SVG to extract embedded base64 PNG from:", budLogoUrl);
    fetch(budLogoUrl)
      .then(res => res.text())
      .then(svgText => {
        const match = svgText.match(/xlink:href="([^"]+)"/) || svgText.match(/href="([^"]+)"/);
        if (!match) {
          throw new Error("Could not find embedded base64 image in BUD.svg");
        }
        const base64Src = match[1];
        console.log("Successfully extracted base64 image source. Length:", base64Src.length);

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onerror = (e) => {
          console.error("Failed to load extracted base64 PNG image", e);
        };
        img.onload = () => {
          try {
            console.log("Logo PNG loaded successfully. Dimensions:", img.width, "x", img.height);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = 250 / Math.max(img.width, img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            
            const validPixels = [];
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                const r = imgData[idx];
                const g = imgData[idx + 1];
                const b = imgData[idx + 2];
                const brightness = (r + g + b) / 3.0;
                // Only extract non-black logo shapes (letters/arrow), ignoring the black background mask
                if (brightness > 40) {
                  validPixels.push({
                    x: (x - canvas.width / 2) * 0.22, 
                    y: -(y - canvas.height / 2) * 0.22,
                    r: r / 255.0,
                    g: g / 255.0,
                    b: b / 255.0
                  });
                }
              }
            }
            
            console.log("Parsed valid pixels count:", validPixels.length);

            if (validPixels.length > 0 && logoGeometryRef.current) {
              const tgtArray = logoGeometryRef.current.attributes.customLogoTarget.array;
              const colArray = logoGeometryRef.current.attributes.customLogoColor.array;
              
              for (let i = 0; i < NUM_LOGO_POINTS; i++) {
                 const p = validPixels[Math.floor(Math.random() * validPixels.length)];
                 
                 // Crisp, high-resolution layout: reduce random jitter and lock Y exactly to 0.0
                 tgtArray[i * 3] = p.x + (Math.random() - 0.5) * 0.05;     
                 tgtArray[i * 3 + 1] = 0.0; 
                 tgtArray[i * 3 + 2] = -65.0 - p.y + (Math.random() - 0.5) * 0.05; 
                 
                 // Color Separation: Arrow shapes (on the right, X > 3.6) get Bud Magenta.
                 // The letters "BUD" (on the left, X <= 3.6) get Pure White.
                 if (p.x > 3.6) {
                   colArray[i * 3] = 173.0 / 255.0;     // Bud Magenta R
                   colArray[i * 3 + 1] = 23.0 / 255.0;  // Bud Magenta G
                   colArray[i * 3 + 2] = 93.0 / 255.0;  // Bud Magenta B
                 } else {
                   colArray[i * 3] = 1.0;               // Pure White R
                   colArray[i * 3 + 1] = 1.0;           // Pure White G
                   colArray[i * 3 + 2] = 1.0;           // Pure White B
                 }
              }
              logoGeometryRef.current.attributes.customLogoTarget.needsUpdate = true;
              logoGeometryRef.current.attributes.customLogoColor.needsUpdate = true;
              console.log("Logo targets written to attribute buffer successfully.");
            } else {
              console.warn("No valid pixels found in logo canvas or logoGeometryRef is null.");
            }
          } catch (err) {
            console.error("Error drawing or extracting pixels from PNG logo canvas:", err);
          }
        };
        img.src = base64Src;
      })
      .catch(err => {
        console.error("Error fetching or parsing BUD.svg:", err);
      });
  }, []);

  // --- BACKGROUND WAVES SHADERS ---
  const wavesVertexShader = `
    uniform float time;
    uniform vec3 cardPositions[4];
    attribute vec3 customColor;
    attribute float customSize;
    attribute float customIntensity;
    varying vec3 vColor;
    varying float vIntensity;
    varying float vDistance;
    varying float vHeight;
    varying float vWake;
    varying vec2 vPosXZ;

    void main() {
      vColor = customColor;
      vIntensity = customIntensity;
      vec3 pos = position;
      
      vPosXZ = pos.xz; 
      
      // Organic ocean waves using overlapping sine waves (static landscape, no wrapping)
      float w1 = sin(pos.x * 0.015 + time * 0.25) * cos(pos.z * 0.012 - time * 0.4);
      float w2 = sin(pos.x * 0.03 - time * 0.15) * sin(pos.z * 0.036 - time * 0.3);
      float w3 = cos(pos.x * 0.07 + time * 0.35) * cos(pos.z * 0.084 - time * 0.2);
      
      float rawNoise = (w1 + w2 * 0.5 + w3 * 0.25) / 1.75;
      
      float w4 = sin(pos.x * 0.02 - time * 0.2) * cos(pos.z * 0.024 - time * 0.25);
      float w5 = cos(pos.x * 0.05 + time * 0.1) * sin(pos.z * 0.06 - time * 0.35);
      
      float rawNoise2 = (w4 + w5 * 0.5) / 1.5;
      
      float n1 = pow((rawNoise + 1.0) * 0.5, 1.4);
      float n2 = pow((rawNoise2 + 1.0) * 0.5, 1.4);
      
      pos.y += (n1 * 15.0 - 7.5) + (n2 * 5.0 - 2.5);
      
      // --- CARD WEIGHT FORCEFIELD ---
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      float totalCardEffect = 0.0;
      for (int c = 0; c < 4; c++) {
        float distToCard = distance(worldPosition.xz, cardPositions[c].xz);
        float cardEffect = smoothstep(14.0, 0.0, distToCard);
        cardEffect = cardEffect * cardEffect;
        totalCardEffect += cardEffect;
      }
      pos.y -= totalCardEffect * 4.5;
      
      // --- CAMERA FORCEFIELD WAKE ---
      worldPosition = modelMatrix * vec4(pos, 1.0);
      float distToCamera = distance(worldPosition.xz, cameraPosition.xz);
      
      float wakeEffect = smoothstep(18.0, 0.0, distToCamera);
      pos.y -= wakeEffect * 10.0;
      
      float splashEffect = smoothstep(28.0, 15.0, distToCamera) * smoothstep(5.0, 15.0, distToCamera);
      pos.y += splashEffect * 4.0;
      
      vWake = wakeEffect;

      pos.y += sin(pos.x * 0.05 + pos.z * 0.05 + time * 0.5) * 0.5;
      
      vHeight = pos.y;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vDistance = -mvPosition.z;

      #ifdef IS_POINTS
        gl_PointSize = 2.5;
      #endif
    }
  `;

  const wavesFragmentShader = `
    uniform float time;
    varying vec3 vColor;
    varying float vIntensity;
    varying float vDistance;
    varying float vHeight;
    varying float vWake;
    varying vec2 vPosXZ;
    
    void main() {
      vec2 xy = gl_PointCoord.xy - vec2(0.5);
      float ll = length(xy);
      if (ll > 0.5) discard;
      
      vec3 normal = vec3(xy * 2.0, sqrt(max(1.0 - dot(xy * 2.0, xy * 2.0), 0.0)));
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float diffuse = max(dot(normal, lightDir), 0.0);
      
      float ambient = 0.5;
      float lighting = ambient + diffuse * 0.5;
      
      vec3 viewDir = vec3(0.0, 0.0, 1.0); 
      vec3 halfDir = normalize(lightDir + viewDir);
      float specular = pow(max(dot(normal, halfDir), 0.0), 16.0) * 0.4;
      
      vec3 dotColor = vColor;
      float highlightFactor = smoothstep(1.5, 5.0, vHeight);
      vec3 champagneLight = vec3(1.0, 0.85, 0.55);
      dotColor = mix(dotColor, champagneLight, highlightFactor * 0.85);

      vec3 finalColor = dotColor * lighting * vIntensity + vec3(specular);

      float heightFactor = smoothstep(-4.0, 5.0, vHeight);
      float peakGlow = mix(0.3, 2.5, heightFactor); 
      finalColor *= peakGlow;

      finalColor += champagneLight * vWake * 2.5;

      // --- ELECTRICITY DATA STREAMS ---
      float gridLineX = floor(vPosXZ.x / 0.6);
      float hashX = fract(sin(gridLineX * 12.9898) * 43758.5453);
      float hasElecZ = step(0.96, hashX);
      float dirZ = sign(fract(hashX * 13.3) - 0.5);
      float speedZ = 1.0 + fract(hashX * 27.1) * 2.5;
      
      float cycleZ = mod(vPosXZ.y * 0.015 - time * speedZ * dirZ + hashX * 100.0, 10.0);
      float coreZ = smoothstep(4.9, 5.0, cycleZ) * smoothstep(5.1, 5.0, cycleZ);
      float glowZ = smoothstep(4.4, 5.0, cycleZ) * smoothstep(5.6, 5.0, cycleZ) * 0.4;
      float finalSparkZ = (coreZ + glowZ) * hasElecZ;
      
      float gridLineZ = floor(vPosXZ.y / 0.6);
      float hashZ = fract(sin(gridLineZ * 78.233) * 43758.5453);
      float hasElecX = step(0.97, hashZ);
      float dirX = sign(fract(hashZ * 17.5) - 0.5);
      float speedX = 1.0 + fract(hashZ * 33.3) * 3.0;
      
      float cycleX = mod(vPosXZ.x * 0.015 - time * speedX * dirX + hashZ * 100.0, 10.0);
      float coreX = smoothstep(4.9, 5.0, cycleX) * smoothstep(5.1, 5.0, cycleX);
      float glowX = smoothstep(4.4, 5.0, cycleX) * smoothstep(5.6, 5.0, cycleX) * 0.4;
      float finalSparkX = (coreX + glowX) * hasElecX;

      float totalSpark = max(finalSparkZ, finalSparkX);
      vec3 elecColor = champagneLight * 3.0; 
      finalColor += elecColor * totalSpark;

      float alpha = smoothstep(0.5, 0.45, ll);
      float fogFactor = smoothstep(120.0, 20.0, vDistance);
      float finalAlpha = alpha * fogFactor;
      if (finalAlpha < 0.15) discard;
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;

  // --- LOGO MORPHING SHADERS ---
  const logoVertexShader = `
    uniform float time;
    uniform vec3 cardPositions[4];
    uniform float uMorphProgress;
    attribute vec3 customColor;
    attribute float customSize;
    attribute float customIntensity;
    attribute vec3 customLogoTarget;
    attribute vec3 customLogoColor;
    varying vec3 vColor;
    varying float vIntensity;
    varying float vDistance;
    varying float vHeight;
    varying float vWake;
    varying vec2 vPosXZ;
    varying float vMorphProgress;

    void main() {
      vColor = customColor;
      vIntensity = customIntensity;
      vec3 pos = position;
      
      vPosXZ = pos.xz; 
      
      // Organic ocean waves using overlapping sine waves (static landscape, no wrapping)
      float w1 = sin(pos.x * 0.015 + time * 0.25) * cos(pos.z * 0.012 - time * 0.4);
      float w2 = sin(pos.x * 0.03 - time * 0.15) * sin(pos.z * 0.036 - time * 0.3);
      float w3 = cos(pos.x * 0.07 + time * 0.35) * cos(pos.z * 0.084 - time * 0.2);
      
      float rawNoise = (w1 + w2 * 0.5 + w3 * 0.25) / 1.75;
      
      float w4 = sin(pos.x * 0.02 - time * 0.2) * cos(pos.z * 0.024 - time * 0.25);
      float w5 = cos(pos.x * 0.05 + time * 0.1) * sin(pos.z * 0.06 - time * 0.35);
      
      float rawNoise2 = (w4 + w5 * 0.5) / 1.5;
      
      float n1 = pow((rawNoise + 1.0) * 0.5, 1.4);
      float n2 = pow((rawNoise2 + 1.0) * 0.5, 1.4);
      
      pos.y += (n1 * 15.0 - 7.5) + (n2 * 5.0 - 2.5);
      
      // --- CARD WEIGHT FORCEFIELD ---
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      float totalCardEffect = 0.0;
      for (int c = 0; c < 4; c++) {
        float distToCard = distance(worldPosition.xz, cardPositions[c].xz);
        float cardEffect = smoothstep(14.0, 0.0, distToCard);
        cardEffect = cardEffect * cardEffect;
        totalCardEffect += cardEffect;
      }
      pos.y -= totalCardEffect * 4.5;
      
      // --- CAMERA FORCEFIELD WAKE ---
      worldPosition = modelMatrix * vec4(pos, 1.0);
      float distToCamera = distance(worldPosition.xz, cameraPosition.xz);
      
      float wakeEffect = smoothstep(18.0, 0.0, distToCamera);
      pos.y -= wakeEffect * 10.0;
      
      float splashEffect = smoothstep(28.0, 15.0, distToCamera) * smoothstep(5.0, 15.0, distToCamera);
      pos.y += splashEffect * 4.0;
      
      vWake = wakeEffect;

      pos.y += sin(pos.x * 0.05 + pos.z * 0.05 + time * 0.5) * 0.5;
      
      vHeight = pos.y; // Save height for shading BEFORE the logo morph

      // --- LOGO MORPH PHYSICS ---
      float randomSeed = fract(sin(dot(customLogoTarget.xy, vec2(12.9898, 78.233))) * 43758.5453);
      float localProgress = smoothstep(randomSeed * 0.3, randomSeed * 0.3 + 0.7, uMorphProgress);

      vColor = mix(customColor, customLogoColor, localProgress);
      vMorphProgress = localProgress; // Pass local progress to fragment shader!

      vec3 wavePos = pos;
      vec3 finalLogoPos = customLogoTarget;
      
      vec3 midPoint = (wavePos + finalLogoPos) * 0.5;
      midPoint.y += 8.0 + randomSeed * 6.0; // Shallower vertical arch for luxury 3D lift
      
      float t = localProgress;
      float invT = 1.0 - t;
      
      vec3 morphedPos = invT * invT * wavePos + 2.0 * invT * t * midPoint + t * t * finalLogoPos;
      
      // Gentle helical twisted 3D rotation in X-Z around center (0.0, -65.0)
      vec2 center = vec2(0.0, -65.0);
      float swirlAngle = (1.0 - localProgress) * sin(localProgress * 3.14159265) * (0.8 * (0.5 + randomSeed * 1.5) + morphedPos.y * 0.01);
      float cosA = cos(swirlAngle);
      float sinA = sin(swirlAngle);
      
      vec2 rotatedPos = morphedPos.xz - center;
      rotatedPos = vec2(
        rotatedPos.x * cosA - rotatedPos.y * sinA,
        rotatedPos.x * sinA + rotatedPos.y * cosA
      );
      morphedPos.xz = rotatedPos + center;
      
      // Reduced horizontal dispersion
      float dispersion = (1.0 - localProgress) * sin(localProgress * 3.14159265) * 2.0 * (randomSeed - 0.5);
      morphedPos.x += dispersion;
      morphedPos.z += dispersion * 1.2;
      
      pos = morphedPos;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vDistance = -mvPosition.z;

      #ifdef IS_POINTS
        // Grow from 2.5 to 3.2 for a highly refined, delicate final alignment
        gl_PointSize = mix(2.5, 3.2, localProgress);
      #endif
    }
  `;

  const logoFragmentShader = `
    uniform float time;
    varying vec3 vColor;
    varying float vIntensity;
    varying float vDistance;
    varying float vHeight;
    varying float vWake;
    varying vec2 vPosXZ;
    varying float vMorphProgress;
    
    void main() {
      vec2 xy = gl_PointCoord.xy - vec2(0.5);
      float ll = length(xy);
      if (ll > 0.5) discard;
      
      vec3 normal = vec3(xy * 2.0, sqrt(max(1.0 - dot(xy * 2.0, xy * 2.0), 0.0)));
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float diffuse = max(dot(normal, lightDir), 0.0);
      
      float ambient = 0.5;
      // Fade from dynamic diffuse lighting on waves to clean full lighting on the logo
      float lighting = mix(ambient + diffuse * 0.5, 1.0, vMorphProgress);
      
      vec3 viewDir = vec3(0.0, 0.0, 1.0); 
      vec3 halfDir = normalize(lightDir + viewDir);
      
      // Minimalist: Fade out specular shine completely when morphed
      float specular = pow(max(dot(normal, halfDir), 0.0), 16.0) * 0.4 * (1.0 - vMorphProgress);
      
      vec3 dotColor = vColor;
      
      // Fade out height-based highlights on waves as particles morph
      float highlightFactor = smoothstep(1.5, 5.0, vHeight);
      vec3 champagneLight = vec3(1.0, 0.85, 0.55);
      dotColor = mix(dotColor, champagneLight, highlightFactor * 0.85 * (1.0 - vMorphProgress));

      vec3 finalColor = dotColor * lighting * vIntensity + vec3(specular);

      float heightFactor = smoothstep(-4.0, 5.0, vHeight);
      float peakGlow = mix(0.3, 2.5, heightFactor); 
      
      // Fade out wave shading for a perfectly flat and clean matte finish
      float finalGlow = mix(peakGlow, 1.0, vMorphProgress);
      finalColor *= finalGlow;

      // Subtle camera wake glow (fades out completely as morph finishes)
      finalColor += champagneLight * vWake * 1.2 * (1.0 - vMorphProgress);

      float alpha = smoothstep(0.5, 0.45, ll);
      float fogFactor = smoothstep(120.0, 20.0, vDistance);
      
      // Bypass fog for the logo particles to keep them perfectly crisp and bold
      float finalFogFactor = mix(fogFactor, 1.0, vMorphProgress);
      float finalAlpha = alpha * finalFogFactor;
      
      if (finalAlpha < 0.15) discard;
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;

  // --- LINES SHADERS ---
  const linesVertexShader = `
    uniform float time;
    uniform vec3 cardPositions[4];
    uniform float uMorphProgress;
    varying float vDistance;

    void main() {
      vec3 pos = position;
      
      // Organic ocean waves using overlapping sine waves (static landscape, no wrapping)
      float w1 = sin(pos.x * 0.015 + time * 0.25) * cos(pos.z * 0.012 - time * 0.4);
      float w2 = sin(pos.x * 0.03 - time * 0.15) * sin(pos.z * 0.036 - time * 0.3);
      float w3 = cos(pos.x * 0.07 + time * 0.35) * cos(pos.z * 0.084 - time * 0.2);
      
      float rawNoise = (w1 + w2 * 0.5 + w3 * 0.25) / 1.75;
      
      float w4 = sin(pos.x * 0.02 - time * 0.2) * cos(pos.z * 0.024 - time * 0.25);
      float w5 = cos(pos.x * 0.05 + time * 0.1) * sin(pos.z * 0.06 - time * 0.35);
      
      float rawNoise2 = (w4 + w5 * 0.5) / 1.5;
      
      float n1 = pow((rawNoise + 1.0) * 0.5, 1.4);
      float n2 = pow((rawNoise2 + 1.0) * 0.5, 1.4);
      
      pos.y += (n1 * 15.0 - 7.5) + (n2 * 5.0 - 2.5);
      
      // --- CARD WEIGHT FORCEFIELD ---
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      float totalCardEffect = 0.0;
      for (int c = 0; c < 4; c++) {
        float distToCard = distance(worldPosition.xz, cardPositions[c].xz);
        float cardEffect = smoothstep(14.0, 0.0, distToCard);
        cardEffect = cardEffect * cardEffect;
        totalCardEffect += cardEffect;
      }
      pos.y -= totalCardEffect * 4.5;
      
      // --- CAMERA FORCEFIELD WAKE ---
      worldPosition = modelMatrix * vec4(pos, 1.0);
      float distToCamera = distance(worldPosition.xz, cameraPosition.xz);
      
      float wakeEffect = smoothstep(18.0, 0.0, distToCamera);
      pos.y -= wakeEffect * 10.0;
      
      float splashEffect = smoothstep(28.0, 15.0, distToCamera) * smoothstep(5.0, 15.0, distToCamera);
      pos.y += splashEffect * 4.0;
      
      pos.y += sin(pos.x * 0.05 + pos.z * 0.05 + time * 0.5) * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vDistance = -mvPosition.z;
    }
  `;

  // --- SHADER MATERIALS ---
  const wavesShader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { 
       time: { value: 0 }, 
       cardPositions: { value: cardPositions }
    },
    defines: { IS_POINTS: '' },
    vertexShader: wavesVertexShader,
    fragmentShader: wavesFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  }), [cardPositions]);

  const logoPointsShader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { 
       time: { value: 0 }, 
       uMorphProgress: { value: 0 },
       cardPositions: { value: cardPositions }
    },
    defines: { IS_POINTS: '' },
    vertexShader: logoVertexShader,
    fragmentShader: logoFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  }), [cardPositions]);

  const linesShader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { 
      time: { value: 0 },
      uMorphProgress: { value: 0 },
      cardPositions: { value: cardPositions }
    },
    vertexShader: linesVertexShader,
    fragmentShader: `
      uniform float uMorphProgress;
      varying float vDistance;

      void main() {
        float alpha = 0.06 * (1.0 - uMorphProgress); 
        float fogFactor = smoothstep(100.0, 20.0, vDistance);
        alpha *= fogFactor;

        vec3 lineColor = vec3(0.5, 0.6, 0.7);
        gl_FragColor = vec4(lineColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }), [cardPositions]);

  // Static dust shader
  const dustShader = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `
      varying float vDistance;
      void main() {
        vec3 pos = position;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = 1.2;
        vDistance = -mvPosition.z;
      }
    `,
    fragmentShader: `
      varying float vDistance;
      void main() {
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        if (length(xy) > 0.5) discard;
        float fogFactor = smoothstep(120.0, 20.0, vDistance);
        gl_FragColor = vec4(0.22, 0.31, 0.4, 0.3 * fogFactor);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  }), []);

  const morphProgressRef = useRef(0);
  const frameCountRef = useRef(0);
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const rawScroll = scroll.offset || 0;
    
    // Morph logic: active after the camera passes Title 4 (04 Entscheiden at 14/16 = 0.875)
    let targetMorph = 0;
    const cycle = Math.min(rawScroll, 1.0); // Clamp to 1.0 instead of modulo to prevent disappearing at the end
    
    if (cycle > 0.875) {
       targetMorph = (cycle - 0.875) / (1.0 - 0.875); 
    }

    // Majestic, slow easing transition (snap to 0.0 instantly on loop reset)
    const lerpFactor = 1.0 - Math.exp(-1.5 * delta);
    if (rawScroll <= 0.0) {
      morphProgressRef.current = 0.0;
    } else {
      morphProgressRef.current = THREE.MathUtils.lerp(morphProgressRef.current, targetMorph, lerpFactor);
    }
    const morph = morphProgressRef.current;

    frameCountRef.current++;
    if (frameCountRef.current % 100 === 0) {
      console.log(`[DIAG] rawScroll: ${rawScroll.toFixed(4)}, morph: ${morph.toFixed(4)}, firstTgtZ: ${logoGeometryRef.current?.attributes?.customLogoTarget?.array?.[2]}`);
    }

    if (pointsMatRef.current) {
       pointsMatRef.current.uniforms.time.value = time;
    }
    if (logoMatRef.current) {
       logoMatRef.current.uniforms.time.value = time;
       logoMatRef.current.uniforms.uMorphProgress.value = morph;
    }
    if (linesMatRef.current) {
       linesMatRef.current.uniforms.time.value = time;
       linesMatRef.current.uniforms.uMorphProgress.value = morph;
    }
  });

  return (
    <group position={[0, -10, -50]}>
      {/* Background Wave Points (Stays as waves in original colors) */}
      <points>
        <bufferGeometry ref={pointsGeometryRef} key={"pts-" + version}>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-customColor" count={colors.length / 3} array={colors} itemSize={3} />
          <bufferAttribute attach="attributes-customSize" count={sizes.length} array={sizes} itemSize={1} />
          <bufferAttribute attach="attributes-customIntensity" count={intensities.length} array={intensities} itemSize={1} />
        </bufferGeometry>
        <primitive object={wavesShader} attach="material" ref={pointsMatRef} />
      </points>

      {/* Dedicated Logo Points (swirl and form the logo) */}
      <points>
        <bufferGeometry ref={logoGeometryRef} key={"logo-" + version}>
          <bufferAttribute attach="attributes-position" count={logoPositions.length / 3} array={logoPositions} itemSize={3} />
          <bufferAttribute attach="attributes-customColor" count={logoColors.length / 3} array={logoColors} itemSize={3} />
          <bufferAttribute attach="attributes-customSize" count={logoSizes.length} array={logoSizes} itemSize={1} />
          <bufferAttribute attach="attributes-customIntensity" count={logoIntensities.length} array={logoIntensities} itemSize={1} />
          <bufferAttribute attach="attributes-customLogoTarget" count={logoTargets.length / 3} array={logoTargets} itemSize={3} />
          <bufferAttribute attach="attributes-customLogoColor" count={logoTargetColors.length / 3} array={logoTargetColors} itemSize={3} />
        </bufferGeometry>
        <primitive object={logoPointsShader} attach="material" ref={logoMatRef} />
      </points>

      {/* Wave Lines */}
      <lineSegments>
        <bufferGeometry key={"lns-" + version}>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="index" array={lineIndices} count={lineIndices.length} itemSize={1} />
        </bufferGeometry>
        <primitive object={linesShader} attach="material" ref={linesMatRef} />
      </lineSegments>

      {/* Deep Background Dust */}
      <points>
        <bufferGeometry key={"dust-" + version}>
          <bufferAttribute attach="attributes-position" count={dustPositions.length / 3} array={dustPositions} itemSize={3} />
        </bufferGeometry>
        <primitive object={dustShader} attach="material" ref={dustMatRef} />
      </points>
    </group>
  );
}
