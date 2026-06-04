import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, Html } from '@react-three/drei';
import DataField from './components/DataField';
import CameraRig from './components/CameraRig';
import GlassCard from './components/GlassCard';
import ProcessWords from './components/ProcessWords';
import PostProcessing from './components/PostProcessing';
import './index.css';

export default function App() {
  return (
    <>
      <Canvas
        camera={{ position: [0, 2, 10], fov: 40 }}
        gl={{ antialias: false, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#08090b']} />
        <fog attach="fog" args={['#08090b', 10, 80]} />
        
        <Suspense fallback={null}>
          <ScrollControls pages={10} damping={0.2} distance={1}>
            <CameraRig />
            
            {/* The continuous living field */}
            <DataField />
            
            {/* Cards discovered along the path */}
            <GlassCard 
              position={[-3, -1, -20]} 
              number="01" 
              title="Verstehen" 
              description="Bedürfnisse, Erwartungen und Verhalten erkennen." 
            />
            
            <GlassCard 
              position={[3, -1, -40]} 
              number="02" 
              title="Märkte analysieren" 
              description="Chancen, Trends und Veränderungen frühzeitig verstehen." 
            />
            
            <GlassCard 
              position={[-3, -1, -60]} 
              number="03" 
              title="Ideen validieren" 
              description="Potenziale prüfen. Strategien schärfen." 
            />

            <GlassCard 
              position={[3, -1, -80]} 
              number="04" 
              title="Lösungen entwickeln" 
              description="Konzepte in funktionale und messbare Ergebnisse verwandeln." 
            />
            
            {/* Words discovered ascending */}
            <ProcessWords />

            <Scroll html>
              <div style={{ position: 'absolute', top: '10vh', left: '10vw' }}>
                {/* We can put UI here if needed, but cards are inside the 3D world */}
              </div>
            </Scroll>
          </ScrollControls>
          
          <PostProcessing />
        </Suspense>
      </Canvas>

      <div className="hero-overlay" style={{ opacity: 1, transition: 'opacity 1s' }} id="hero-text">
        <h1>Aus Gesprächen<br />wird <span>Klarheit.</span></h1>
        <button className="hero-start-btn">Reise Beginnen &gt;&gt;</button>
      </div>
    </>
  );
}
