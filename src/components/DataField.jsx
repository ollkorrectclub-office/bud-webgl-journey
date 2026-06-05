import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';

const GRID_X = 600;
const GRID_Z = 800;
const NUM_POINTS = GRID_X * GRID_Z;

export default function DataField() {
  const pointsGeometryRef = useRef();
  const pointsMatRef = useRef();
  const linesMatRef = useRef();
  const dustMatRef = useRef();
  const scroll = useScroll();

  const cardPositions = useMemo(() => [
    new THREE.Vector3(-3, -4, -20),
    new THREE.Vector3(3, -4, -40),
    new THREE.Vector3(-3, -4, -60),
    new THREE.Vector3(3, -4, -80)
  ], []);

  const { positions, colors, sizes, intensities, lineIndices, customLogoTarget, customLogoColor, dustPositions, version } = useMemo(() => {
    const spacingX = 0.6;
    const spacingZ = 0.6;
    
    const pos = new Float32Array(NUM_POINTS * 3);
    const col = new Float32Array(NUM_POINTS * 3);
    const size = new Float32Array(NUM_POINTS);
    const intensity = new Float32Array(NUM_POINTS);
    const logoTgt = new Float32Array(NUM_POINTS * 3);
    const logoCol = new Float32Array(NUM_POINTS * 3);
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
        // Center the grid Z around world Z = -85. Since group is at Z = -50, local Z centers around -35.
        // The span is GRID_Z * spacingZ = 800 * 0.6 = 480 units.
        pos[i * 3 + 2] = (z - GRID_Z / 2) * spacingZ - 35.0;
        
        // Initialize logo target to start identical to the grid
        logoTgt[i * 3] = pos[i * 3];
        logoTgt[i * 3 + 1] = pos[i * 3 + 1];
        logoTgt[i * 3 + 2] = pos[i * 3 + 2];

        // Logo color initializes to original color
        logoCol[i * 3] = col[i * 3];
        logoCol[i * 3 + 1] = col[i * 3 + 1];
        logoCol[i * 3 + 2] = col[i * 3 + 2];

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
    
    // Deep static dust points spanning the entire grid Z range
    const dustCount = 8000;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 800; // Wide X spread
      dustPos[i * 3 + 1] = (Math.random() - 1.0) * 80 - 5; // Deep underneath (-5 to -85)
      // Spanning local Z range -275 to 205 (world Z -325 to 155)
      dustPos[i * 3 + 2] = Math.random() * 480 - 275; 
    }
    
    return { 
      positions: pos, 
      colors: col, 
      sizes: size, 
      intensities: intensity, 
      lineIndices: new Uint16Array(indices),
      customLogoTarget: logoTgt,
      customLogoColor: logoCol,
      dustPositions: dustPos,
      version: Date.now()
    };
  }, []);

  // --- LOGO PARSING ENGINE ---
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
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
          const alpha = imgData[idx + 3];
          if (alpha > 50) {
            validPixels.push({
              x: (x - canvas.width / 2) * 0.35, 
              y: -(y - canvas.height / 2) * 0.35 + 2.0, // Invert Y, elevate into sky
              r: imgData[idx] / 255.0,
              g: imgData[idx + 1] / 255.0,
              b: imgData[idx + 2] / 255.0
            });
          }
        }
      }

      if (validPixels.length > 0 && pointsGeometryRef.current) {
        const tgtArray = pointsGeometryRef.current.attributes.customLogoTarget.array;
        const colArray = pointsGeometryRef.current.attributes.customLogoColor.array;
        
        // Since the camera is aligned centered (X = 0) at the end, keep the logo centered
        const centerXOffset = 0; 
        
        for (let i = 0; i < NUM_POINTS; i++) {
           const p = validPixels[Math.floor(Math.random() * validPixels.length)];
           
           tgtArray[i * 3] = p.x + centerXOffset + (Math.random() - 0.5) * 0.08;     
           tgtArray[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.08; 
           // Place the target logo at local Z = -155.0 (world Z = -205.0)
           tgtArray[i * 3 + 2] = -155.0 + (Math.random() - 0.5) * 2.5; 
           
           colArray[i * 3] = p.r;
           colArray[i * 3 + 1] = p.g;
           colArray[i * 3 + 2] = p.b;
        }
        pointsGeometryRef.current.attributes.customLogoTarget.needsUpdate = true;
        pointsGeometryRef.current.attributes.customLogoColor.needsUpdate = true;
      }
    };
    img.src = '/src/assets/BUD.svg';
  }, []);

  const vertexShader = `
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

      vec3 wavePos = pos;
      vec3 finalLogoPos = customLogoTarget;
      
      vec3 midPoint = (wavePos + finalLogoPos) * 0.5;
      midPoint.y += 30.0 + randomSeed * 20.0; 
      
      float t = localProgress;
      float invT = 1.0 - t;
      
      vec3 morphedPos = invT * invT * wavePos + 2.0 * invT * t * midPoint + t * t * finalLogoPos;
      pos = morphedPos;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vDistance = -mvPosition.z;

      #ifdef IS_POINTS
        gl_PointSize = 2.5;
      #endif
    }
  `;

  const pointsShader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { 
       time: { value: 0 }, 
       uMorphProgress: { value: 0 },
       cardPositions: { value: cardPositions }
    },
    defines: { IS_POINTS: '' },
    vertexShader,
    fragmentShader: `
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
        // Quantize X to precisely target specific columns in the 0.6-spaced grid
        float gridLineX = floor(vPosXZ.x / 0.6);
        float hashX = fract(sin(gridLineX * 12.9898) * 43758.5453);
        float hasElecZ = step(0.96, hashX); // 4% of columns active
        float dirZ = sign(fract(hashX * 13.3) - 0.5); // Random direction (+1 or -1)
        float speedZ = 1.0 + fract(hashX * 27.1) * 2.5; // Random speed
        
        float cycleZ = mod(vPosXZ.y * 0.015 - time * speedZ * dirZ + hashX * 100.0, 10.0);
        float coreZ = smoothstep(4.9, 5.0, cycleZ) * smoothstep(5.1, 5.0, cycleZ);
        float glowZ = smoothstep(4.4, 5.0, cycleZ) * smoothstep(5.6, 5.0, cycleZ) * 0.4;
        float finalSparkZ = (coreZ + glowZ) * hasElecZ;
        
        // X-axis sparks (traveling horizontally)
        float gridLineZ = floor(vPosXZ.y / 0.6);
        float hashZ = fract(sin(gridLineZ * 78.233) * 43758.5453);
        float hasElecX = step(0.97, hashZ); // 3% of rows active
        float dirX = sign(fract(hashZ * 17.5) - 0.5); // Random direction (+1 or -1)
        float speedX = 1.0 + fract(hashZ * 33.3) * 3.0; // Random speed
        
        float cycleX = mod(vPosXZ.x * 0.015 - time * speedX * dirX + hashZ * 100.0, 10.0);
        float coreX = smoothstep(4.9, 5.0, cycleX) * smoothstep(5.1, 5.0, cycleX);
        float glowX = smoothstep(4.4, 5.0, cycleX) * smoothstep(5.6, 5.0, cycleX) * 0.4;
        float finalSparkX = (coreX + glowX) * hasElecX;

        float totalSpark = max(finalSparkZ, finalSparkX);

        // Brilliant champagne glow electricity
        vec3 elecColor = champagneLight * 3.0; 
        
        finalColor += elecColor * totalSpark;

        float alpha = smoothstep(0.5, 0.45, ll);
        float fogFactor = smoothstep(120.0, 20.0, vDistance);
        float finalAlpha = alpha * fogFactor;
        if (finalAlpha < 0.15) discard;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    transparent: false,
    depthWrite: true,
    blending: THREE.NormalBlending
  }), [vertexShader, cardPositions]);

  const linesShader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { 
      time: { value: 0 },
      cardPositions: { value: cardPositions }
    },
    vertexShader,
    fragmentShader: `
      varying float vDistance;

      void main() {
        float alpha = 0.06; 
        float fogFactor = smoothstep(100.0, 20.0, vDistance);
        alpha *= fogFactor;

        vec3 lineColor = vec3(0.5, 0.6, 0.7);
        gl_FragColor = vec4(lineColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }), [vertexShader, cardPositions]);

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

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const rawScroll = scroll.offset || 0;
    
    // Morph logic: active after the camera passes Title 5 (Klarheit at 0.9375)
    let morph = 0;
    const cycle = Math.min(rawScroll, 1.0); // Clamp to 1.0 instead of modulo to prevent disappearing at the end
    
    if (cycle > 0.94 && cycle <= 0.98) {
       morph = (cycle - 0.94) / 0.04; 
    } else if (cycle > 0.98) {
       morph = 1.0;
    }

    if (pointsMatRef.current) {
       pointsMatRef.current.uniforms.time.value = time;
       pointsMatRef.current.uniforms.uMorphProgress.value = morph;
    }
    if (linesMatRef.current) {
       linesMatRef.current.uniforms.time.value = time;
    }
  });

  return (
    <group position={[0, -10, -50]}>
      {/* Points */}
      <points>
        <bufferGeometry ref={pointsGeometryRef} key={"pts-" + version}>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-customColor" count={colors.length / 3} array={colors} itemSize={3} />
          <bufferAttribute attach="attributes-customSize" count={sizes.length} array={sizes} itemSize={1} />
          <bufferAttribute attach="attributes-customIntensity" count={intensities.length} array={intensities} itemSize={1} />
          <bufferAttribute attach="attributes-customLogoTarget" count={customLogoTarget.length / 3} array={customLogoTarget} itemSize={3} />
          <bufferAttribute attach="attributes-customLogoColor" count={customLogoColor.length / 3} array={customLogoColor} itemSize={3} />
        </bufferGeometry>
        <primitive object={pointsShader} attach="material" ref={pointsMatRef} />
      </points>

      {/* Lines */}
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
