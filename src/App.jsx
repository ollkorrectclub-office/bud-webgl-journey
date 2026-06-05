import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, Html } from '@react-three/drei';
import DataField from './components/DataField';
import CameraRig from './components/CameraRig';
import GlassCard from './components/GlassCard';
import ProcessWords from './components/ProcessWords';
import PostProcessing from './components/PostProcessing';
import './index.css';

// Prevent browser from restoring scroll position on page reload
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

export default function App() {
  return (
    <>
      <Canvas
        camera={{ position: [0, 2, 10], fov: 40 }}
        gl={{ antialias: false, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#08090b']} />
        {/* Pushed fog far distance out so objects can be seen as shadows from much further away */}
        <fog attach="fog" args={['#08090b', 20, 140]} />
        
        <Suspense fallback={null}>
          <ScrollControls pages={10} damping={0.2} distance={1}>
            <CameraRig />
            
            {/* The continuous living field */}
            <DataField />
            
            {/* Cards discovered along the path (Premium 3D HTML glassmorphism!) */}
            <GlassCard 
              position={[-3, -4, -20]} 
              number="01" 
              title="Verstehen" 
              description="Bedürfnisse, Erwartungen und Verhalten erkennen." 
            />
            
            <GlassCard 
              position={[3, -4, -40]} 
              number="02" 
              title="Märkte analysieren" 
              description="Chancen, Trends und Veränderungen frühzeitig verstehen." 
            />
            
            <GlassCard 
              position={[-3, -4, -60]} 
              number="03" 
              title="Ideen validieren" 
              description="Potenziale prüfen. Strategien schärfen." 
            />
 
            <GlassCard 
              position={[3, -4, -80]} 
              number="04" 
              title="Lösungen entwickeln" 
              description="Konzepte in funktionale und messbare Ergebnisse verwandeln." 
            />
            
            {/* Words discovered ascending */}
            <ProcessWords />
          </ScrollControls>
          
          <PostProcessing />
        </Suspense>
      </Canvas>

      <div className="hero-overlay" id="hero-text">
        <h1>Aus Gesprächen<br />wird <span className="highlight-champagne">Klarheit.</span></h1>
        <div className="hero-btn-container">
          <button className="hero-start-btn">
            Reise Beginnen <span className="arrow">&gt;&gt;</span>
          </button>
          <div className="hero-btn-line"></div>
        </div>
      </div>
    </>
  );
}
