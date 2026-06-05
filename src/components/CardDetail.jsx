import React, { useState, useEffect } from 'react';

export default function CardDetail({ card, onBack }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleBack = () => {
    setExiting(true);
    setTimeout(() => {
      onBack();
    }, 500);
  };

  return (
    <div
      className={`card-detail-overlay ${
        exiting ? 'card-detail-exit' : visible ? 'card-detail-enter' : ''
      }`}
    >
      <button className="card-detail-back" onClick={handleBack}>
        <span className="back-arrow">←</span> Zurück
      </button>

      <div className="card-detail-layout">
        <div className="card-detail-left">
          <div className="card-detail-video">
            <div className="video-placeholder">
              <div className="video-play-icon">▶</div>
              <span>Video wird hier eingebettet</span>
            </div>
          </div>
        </div>

        <div className="card-detail-right">
          <span className="card-detail-number">{card.number}</span>
          <h1 className="card-detail-title">{card.title}</h1>
          <p className="card-detail-description">{card.description}</p>

          <div className="card-detail-body">
            <p>
              Hier werden ausführliche Inhalte zu diesem Thema angezeigt.
              Texte, Bilder und interaktive Elemente können hier platziert werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
