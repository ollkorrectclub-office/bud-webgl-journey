import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function DataField() {
  const pointsMatRef = useRef();
  const linesMatRef = useRef();

    const { positions, colors, sizes, intensities, lineIndices, dustPositions, version } = useMemo(() => {
    const gridX = 600;
    const gridZ = 600;
    const spacingX = 0.6;
    const spacingZ = 0.6;
    
    const numPoints = gridX * gridZ;
    const pos = new Float32Array(numPoints * 3);
    const col = new Float32Array(numPoints * 3);
    const size = new Float32Array(numPoints);
    const intensity = new Float32Array(numPoints);
    const indices = [];

    const colorPalette = [
      new THREE.Color('#5F7F93'), // Steel Blue
      new THREE.Color('#F4F0E8'), // Warm White
      new THREE.Color('#C8B68A'), // Champagne
      new THREE.Color('#AD175D'), // Bud Magenta (rare)
    ];

    for (let z = 0; z < gridZ; z++) {
      for (let x = 0; x < gridX; x++) {
        const i = z * gridX + x;
        
        // Perfectly aligned grid, no random jitter to act as structured wires
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

        // All perfectly the same size, no variation
        size[i] = 1.0;
        
        // No random intensities so bloom doesn't make them look different sizes
        intensity[i] = 1.0;

        // Sparse Data Wires: Because density is massive, dramatically lower connection probability
        if (x < gridX - 1 && Math.random() > 0.99) indices.push(i, i + 1);
        if (z < gridZ - 1 && Math.random() > 0.99) indices.push(i, i + gridX);
        if (x < gridX - 1 && z < gridZ - 1 && Math.random() > 0.996) indices.push(i, i + gridX + 1);
      }
    }
    
    // Deep volume dust points
    const dustCount = 15000;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 800; // Wide spread
      dustPos[i * 3 + 1] = (Math.random() - 1.0) * 80 - 5; // Deep underneath (-5 to -85)
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 800; // Deep spread
    }
    
    return { 
      positions: pos, 
      colors: col, 
      sizes: size, 
      intensities: intensity, 
      lineIndices: new Uint16Array(indices),
      dustPositions: dustPos,
      version: Date.now() // Unique ID to force rebuild
    };
  }, ['force_hmr_reload_v2']);

  const cardPositions = useMemo(() => [
    new THREE.Vector3(-3, -4, -20),
    new THREE.Vector3(3, -4, -40),
    new THREE.Vector3(-3, -4, -60),
    new THREE.Vector3(3, -4, -80)
  ], []);

  const vertexShader = `
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

    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vColor = customColor;
      vIntensity = customIntensity;
      vec3 pos = position;
      
      // Slower, majestic wave travel speed
      // To enforce a massive "Zoom In" / Forward speed illusion,
      // we must subtract time on the Z axis. This makes the waves travel TOWARDS the camera
      // at high speed, creating the optical illusion of zooming massively IN to the matrix!
      float rawNoise = snoise(vec2(pos.x * 0.01 + time * 0.04, pos.z * 0.01 - time * 0.04));
      float rawNoise2 = snoise(vec2(pos.x * 0.03 - time * 0.03, pos.z * 0.03 - time * 0.03));
      
      // Smooth power curve: No sharp corners. Maps noise to [0, 1] and gently narrows the peaks
      float n1 = pow((rawNoise + 1.0) * 0.5, 1.3);
      float n2 = pow((rawNoise2 + 1.0) * 0.5, 1.3);
      
      // Base terrain shape (scaled to keep the same overall height range)
      pos.y += (n1 * 10.0 - 5.0) + (n2 * 3.0 - 1.5);
      
      // Get the world position of the point
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);

      // --- CARD WEIGHT FORCEFIELD ---
      // Depress the waves smoothly directly underneath each card
      float totalCardEffect = 0.0;
      for (int c = 0; c < 4; c++) {
        float distToCard = distance(worldPosition.xz, cardPositions[c].xz);
        
        // Push radius of 14.0 units around the card center
        float cardEffect = smoothstep(14.0, 0.0, distToCard);
        
        // Quadratic curve for a smooth gravity-well shape
        cardEffect = cardEffect * cardEffect;
        
        totalCardEffect += cardEffect;
      }
      // Push waves down by up to 4.5 units under the card weight
      pos.y -= totalCardEffect * 4.5;
      
      // Re-evaluate world position for camera wake calculation
      worldPosition = modelMatrix * vec4(pos, 1.0);

      // --- CAMERA FORCEFIELD WAKE ---
      float distToCamera = distance(worldPosition.xz, cameraPosition.xz);
      
      // Calculate how close the dot is to the camera (0.0 to 1.0)
      float wakeEffect = smoothstep(18.0, 0.0, distToCamera);
      
      // Push the dots down aggressively to carve a trench for the camera
      pos.y -= wakeEffect * 10.0;
      
      // Add a slight upward splash on the outer edge of the wake
      float splashEffect = smoothstep(28.0, 15.0, distToCamera) * smoothstep(5.0, 15.0, distToCamera);
      pos.y += splashEffect * 4.0;
      
      vWake = wakeEffect; // Pass to fragment shader for glowing

      // Add a gentle, small vertical "breathing" ripple so it still feels alive
      pos.y += sin(pos.x * 0.05 + pos.z * 0.05 + time * 1.5) * 0.5;
      
      vHeight = pos.y;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vDistance = -mvPosition.z;

      #ifdef IS_POINTS
        // Force exactly the same pixel size regardless of 3D depth
        gl_PointSize = 2.5;
      #endif
    }
  `;

  const pointsShader = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { 
      time: { value: 0 },
      cardPositions: { value: cardPositions }
    },
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
        
        // --- 3D SPHERE ILLUSION ---
        // Calculate the 3D normal for the sphere surface at this pixel
        vec3 normal = vec3(xy * 2.0, sqrt(max(1.0 - dot(xy * 2.0, xy * 2.0), 0.0)));
        
        // Define a light direction (coming from top-right-front)
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        
        // Calculate diffuse lighting
        float diffuse = max(dot(normal, lightDir), 0.0);
        
        // Add ambient light so shadowed areas remain visible
        float ambient = 0.5;
        float lighting = ambient + diffuse * 0.5;
        
        // Calculate a small specular highlight for a polished 3D marble look
        vec3 viewDir = vec3(0.0, 0.0, 1.0); 
        vec3 halfDir = normalize(lightDir + viewDir);
        float specular = pow(max(dot(normal, halfDir), 0.0), 16.0) * 0.4;
        
        // Base color from the original dot palette
        vec3 dotColor = vColor;
        
        // Highlight factor: Only activates near the very top of the wave peaks
        float highlightFactor = smoothstep(1.5, 5.0, vHeight);
        
        // The champagne highlight color
        vec3 champagneLight = vec3(1.0, 0.85, 0.55);
        
        // Blend the dot color towards champagne ONLY when it rides up to a peak
        dotColor = mix(dotColor, champagneLight, highlightFactor * 0.85);

        // Combine base color, 3D lighting, and random glow intensity
        vec3 finalColor = dotColor * lighting * vIntensity + vec3(specular);

        // Height-based glow mapping
        // Valleys (approx -4.0) will be much darker, peaks (approx 5.0) will be much brighter
        float heightFactor = smoothstep(-4.0, 5.0, vHeight);
        
        // Extra intense glow for the champagne peaks
        float peakGlow = mix(0.3, 2.5, heightFactor); 
        finalColor *= peakGlow;

        // Camera forcefield glow (dots light up intensely as they are pushed away)
        finalColor += champagneLight * vWake * 2.5;

        // Keep the sharp edge
        float alpha = smoothstep(0.5, 0.45, ll);
        
        // Fade out in distance (fog) to guarantee the edge of the mesh is never seen
        float fogFactor = smoothstep(120.0, 20.0, vDistance);
        alpha *= fogFactor;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
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
      varying vec3 vColor;
      varying float vIntensity;
      varying float vDistance;
      varying float vHeight;
      varying float vWake;
      void main() {
        // Very faded, subtle lines
        float alpha = 0.06; 
        
        // Hide line edges in fog
        float fogFactor = smoothstep(100.0, 20.0, vDistance);
        alpha *= fogFactor;

        // Faded subtle color for the wire
        vec3 lineColor = vec3(0.5, 0.6, 0.7);
        gl_FragColor = vec4(lineColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }), [vertexShader]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (pointsMatRef.current) pointsMatRef.current.uniforms.time.value = time;
    if (linesMatRef.current) linesMatRef.current.uniforms.time.value = time;
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
        <pointsMaterial size={1.2} color="#3a5168" transparent opacity={0.3} sizeAttenuation={false} fog={true} />
      </points>
    </group>
  );
}
