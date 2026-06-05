import React, { Suspense, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, Html } from '@react-three/drei';
import DataField from './components/DataField';
import CameraRig from './components/CameraRig';
import GlassCard3D from './components/GlassCard3D';
import ProcessWords from './components/ProcessWords';
import PostProcessing from './components/PostProcessing';
import CardShatter from './components/CardShatter';
import CardDetail from './components/CardDetail';
import './index.css';

// Prevent browser from restoring scroll position on page reload
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const CARDS = [
  { index: 0, position: [-3, -4, -20], number: "01", title: "Verstehen", description: "Bedürfnisse, Erwartungen und Verhalten erkennen." },
  { index: 1, position: [3, -4, -40], number: "02", title: "Märkte analysieren", description: "Chancen, Trends und Veränderungen frühzeitig verstehen." },
  { index: 2, position: [-3, -4, -60], number: "03", title: "Ideen validieren", description: "Potenziale prüfen. Strategien schärfen." },
  { index: 3, position: [3, -4, -80], number: "04", title: "Lösungen entwickeln", description: "Konzepte in funktionale und messbare Ergebnisse verwandeln." },
];

export default function App() {
  const [activeCard, setActiveCard] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleCardEnter = useCallback((card) => {
    setActiveCard(card);
    setShowDetail(false);
  }, []);

  const handleShatterComplete = useCallback(() => {
    setShowDetail(true);
  }, []);

  const handleBack = useCallback(() => {
    setShowDetail(false);
    setActiveCard(null);
    document.body.style.cursor = 'default';
  }, []);

  return (
    <>
      <Canvas
        camera={{ position: [0, 2, 10], fov: 40 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#08090b']} />
        {/* Pushed fog far distance out so objects can be seen as shadows from much further away */}
        <fog attach="fog" args={['#08090b', 20, 140]} />
        
        <Suspense fallback={null}>
          <ScrollControls pages={10} damping={0.2} distance={1}>
            <CameraRig activeCard={activeCard} />
            
            {/* The continuous living field */}
            <DataField />
            
            {/* Cards discovered along the path */}
            {CARDS.map((card) => (
              <GlassCard3D 
                key={card.index}
                position={card.position}
                number={card.number} 
                title={card.title} 
                description={card.description}
                onEnter={() => handleCardEnter(card)}
                isShattered={activeCard?.index === card.index}
              />
            ))}

            {/* Shatter effect when a card is entered */}
            {activeCard && (
              <CardShatter
                position={activeCard.position}
                onComplete={handleShatterComplete}
              />
            )}
            
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

      {/* Detail overlay when card is entered */}
      {showDetail && activeCard && (
        <CardDetail card={activeCard} onBack={handleBack} />
      )}
    </>
  );
}
