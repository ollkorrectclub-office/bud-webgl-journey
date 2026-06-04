import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function DataField() {
  const pointsMatRef = useRef();
  const dustMatRef = useRef();

  const { positions, colors, sizes, intensities, dustPositions, version } = useMemo(() => {
    // EXPANDED GRID FOR INFINITE SENSE
    const gridX = 600;
    const gridZ = 600;
    const spacingX = 0.6;
    const spacingZ = 0.6;
    
    const numPoints = gridX * gridZ;
    const pos = new Float32Array(numPoints * 3);
    const col = new Float32Array(numPoints * 3);
    const size = new Float32Array(numPoints);
    const intensity = new Float32Array(numPoints);

    const colorPalette = [
      new THREE.Color('#5F7F93'), // Steel Blue
      new THREE.Color('#F4F0E8'), // Warm White
      new THREE.Color('#C8B68A'), // Champagne
      new THREE.Color('#AD175D'), // Bud Magenta (rare)
    ];

    for (let z = 0; z < gridZ; z++) {
      for (let x = 0; x < gridX; x++) {
        const i = z * gridX + x;
        
        pos[i * 3] = (x - gridX / 2) * spacingX;
        pos[i * 3 + 1] = 0; 
        pos[i * 3 + 2] = (z - gridZ / 2) * spacingZ;

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
      }
    }
    
    // Deep volume dust points
    // To seamlessly loop over 350 units, we only need to spawn them in a 350 wide bounding box
    const dustCount = 8000;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 800; // Wide X spread
      dustPos[i * 3 + 1] = (Math.random() - 1.0) * 80 - 5; // Deep underneath (-5 to -85)
      // Exactly 350 units of spread on Z so the shader can tile it perfectly
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 350; 
    }
    
    return { 
      positions: pos, 
      colors: col, 
      sizes: size, 
      intensities: intensity, 
      dustPositions: dustPos,
      version: Date.now()
    };
  }, []);

  const vertexShader = `
    uniform float time;
    uniform float cameraZ;
    attribute vec3 customColor;
    attribute float customSize;
    attribute float customIntensity;
    varying vec3 vColor;
    varying float vIntensity;
    varying float vDistance;
    varying float vHeight;
    varying float vWake;

    void main() {
      vColor = customColor;
      vIntensity = customIntensity;
      vec3 pos = position;
      
      // --- INFINITE TERRAIN WRAPPING ---
      // Wrap the grid seamlessly so the terrain physically moves with the camera infinitely
      float localCameraZ = cameraZ + 50.0;
      float distZ = pos.z - localCameraZ;
      pos.z = localCameraZ + mod(distZ + 175.0, 350.0) - 175.0;
      
      // PERFECT MATHEMATICAL LOOP LOGIC
      // The camera jumps exactly 350 units on the Z axis when the loop wraps.
      // To ensure the terrain shape doesn't pop, the wave frequency must be an exact multiple of 2*PI / 350.
      float baseFreq = 0.017951958; // 2.0 * PI / 350.0
      
      // Create organic ocean waves using overlapping sine waves that are mathematically periodic over 340 units
      float t1 = time * 0.8;
      float t2 = time * 0.5;
      
      // Layer 1: Broad rolling waves
      float w1 = sin(pos.x * 0.015 + time * 0.5) * cos(pos.z * baseFreq * 1.0 - time * 0.8);
      
      // Layer 2: Medium chop
      float w2 = sin(pos.x * 0.03 - time * 0.3) * sin(pos.z * baseFreq * 3.0 - time * 0.6);
      
      // Layer 3: Fine details
      float w3 = cos(pos.x * 0.07 + time * 0.7) * cos(pos.z * baseFreq * 7.0 - time * 0.4);
      
      float rawNoise = (w1 + w2 * 0.5 + w3 * 0.25) / 1.75;
      
      float w4 = sin(pos.x * 0.02 - time * 0.4) * cos(pos.z * baseFreq * 2.0 - time * 0.5);
      float w5 = cos(pos.x * 0.05 + time * 0.2) * sin(pos.z * baseFreq * 5.0 - time * 0.7);
      
      float rawNoise2 = (w4 + w5 * 0.5) / 1.5;
      
      // Smooth power curve: No sharp corners
      float n1 = pow((rawNoise + 1.0) * 0.5, 1.3);
      float n2 = pow((rawNoise2 + 1.0) * 0.5, 1.3);
      
      // Base terrain shape (scaled to match previous heights)
      pos.y += (n1 * 10.0 - 5.0) + (n2 * 3.0 - 1.5);
      
      // --- CAMERA FORCEFIELD WAKE ---
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      float distToCamera = distance(worldPosition.xz, cameraPosition.xz);
      
      float wakeEffect = smoothstep(18.0, 0.0, distToCamera);
      pos.y -= wakeEffect * 10.0;
      
      float splashEffect = smoothstep(28.0, 15.0, distToCamera) * smoothstep(5.0, 15.0, distToCamera);
      pos.y += splashEffect * 4.0;
      
      vWake = wakeEffect;

      // Small vertical breathing
      pos.y += sin(pos.x * 0.05 + pos.z * 0.05 + time * 1.5) * 0.5;
      
      vHeight = pos.y;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vDistance = -mvPosition.z;

      #ifdef IS_POINTS
        gl_PointSize = 2.5;
      #endif
    }
  `;

  const pointsShader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, cameraZ: { value: 0 } },
    defines: { IS_POINTS: '' },
    vertexShader,
    fragmentShader: `
      varying vec3 vColor;
      varying float vIntensity;
      varying float vDistance;
      varying float vHeight;
      varying float vWake;
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

        float alpha = smoothstep(0.5, 0.45, ll);
        float fogFactor = smoothstep(120.0, 20.0, vDistance);
        alpha *= fogFactor;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    blending: THREE.NormalBlending
  }), [vertexShader]);

  // Special shader for dust that perfectly wraps around the camera!
  const dustShader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { cameraZ: { value: 0 } },
    vertexShader: `
      uniform float cameraZ;
      varying float vDistance;
      void main() {
        vec3 pos = position;
        
        // Group is at Z=-50, so local camera Z is cameraZ + 50
        float localCameraZ = cameraZ + 50.0;
        float distZ = pos.z - localCameraZ;
        
        // Wrap Z over exactly 350 units
        pos.z = localCameraZ + mod(distZ + 175.0, 350.0) - 175.0;
        
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
    if (pointsMatRef.current) {
       pointsMatRef.current.uniforms.time.value = time;
       pointsMatRef.current.uniforms.cameraZ.value = state.camera.position.z;
    }
    if (dustMatRef.current) dustMatRef.current.uniforms.cameraZ.value = state.camera.position.z;
  });

  return (
    <group position={[0, -10, -50]}>
      {/* Points */}
      <points>
        <bufferGeometry key={"pts-" + version}>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-customColor" count={colors.length / 3} array={colors} itemSize={3} />
          <bufferAttribute attach="attributes-customSize" count={sizes.length} array={sizes} itemSize={1} />
          <bufferAttribute attach="attributes-customIntensity" count={intensities.length} array={intensities} itemSize={1} />
        </bufferGeometry>
        <primitive object={pointsShader} attach="material" ref={pointsMatRef} />
      </points>

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
