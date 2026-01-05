import { useState } from "react";
import Oulpan from "./Oulpan";
import "./App.css";

export default function App() {
  const [currentApp, setCurrentApp] = useState(null); // null = home, "oulpan", "test"

  // Page d'accueil
  if (!currentApp) {
    return (
      <div className="app home-screen">
        <div className="home-content">
          <h1 className="home-title">🇮🇱 Hebrew2French</h1>
          <p className="home-subtitle">Choisis ton mode d'apprentissage</p>

          <div className="home-buttons">
            <button
              className="home-choice-btn oulpan-btn"
              onClick={() => setCurrentApp("oulpan")}
            >
              <span className="home-choice-icon">📚</span>
              <span className="home-choice-title">Oulpan</span>
              <span className="home-choice-desc">Vocabulaire Hébreu → Français</span>
            </button>

            <button
              className="home-choice-btn test-btn"
              onClick={() => setCurrentApp("test")}
              disabled
            >
              <span className="home-choice-icon">📝</span>
              <span className="home-choice-title">Test</span>
              <span className="home-choice-desc">Bientôt disponible...</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Oulpan
  if (currentApp === "oulpan") {
    return <Oulpan onBack={() => setCurrentApp(null)} />;
  }

  // Test (future feature)
  if (currentApp === "test") {
    return (
      <div className="app">
        <div className="empty-state">
          <span className="empty-icon">🚧</span>
          <span className="empty-text">Bientôt disponible !</span>
          <button className="reset-btn" onClick={() => setCurrentApp(null)}>
            🏠 Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return null;
}
