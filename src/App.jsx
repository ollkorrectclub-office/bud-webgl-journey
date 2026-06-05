import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import DataField from './components/DataField';
import CameraRig from './components/CameraRig';
import GlassCard3D from './components/GlassCard3D';
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
        {/* Pushed fog far distance out so objects can be seen as shadows from much further away */}
        <fog attach="fog" args={['#08090b', 20, 140]} />
        
        <Suspense fallback={null}>
          <CameraRig />
          
          {/* The continuous living field */}
          <DataField />
          
          {/* Cards discovered along the path (Now completely native 3D WebGL objects!) */}
          <GlassCard3D 
            position={[-4, -3, -20]} 
            number="01" 
            title="Verstehen" 
            description="Bedürfnisse, Erwartungen und Verhalten erkennen." 
          />
          
          <GlassCard3D 
            position={[4, -3, -45]} 
            number="02" 
            title="Märkte analysieren" 
            description="Chancen, Trends und Veränderungen frühzeitig verstehen." 
          />
          
          <GlassCard3D 
            position={[-4, -3, -70]} 
            number="03" 
            title="Ideen validieren" 
            description="Potenziale prüfen. Strategien schärfen." 
          />

          <GlassCard3D 
            position={[4, -3, -95]} 
            number="04" 
            title="Lösungen entwickeln" 
            description="Konzepte in funktionale und messbare Ergebnisse verwandeln." 
          />
          
          {/* Words discovered ascending */}
          <ProcessWords />
          
          <PostProcessing />
        </Suspense>
      </Canvas>

      <div className="hero-overlay" style={{ opacity: 1, transition: 'opacity 1s', zIndex: 20 }} id="hero-text">
        <h1>Aus Gesprächen<br />wird <span>Klarheit.</span></h1>
        <button className="hero-start-btn">Reise Beginnen &gt;&gt;</button>
      </div>
    </>
  );
}
