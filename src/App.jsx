import { useState } from "react";
import Oulpan from "./Oulpan";
import Test from "./Test";
import Categorie from "./Categorie";
import Admin from "./Admin";
import "./App.css";

export default function App() {
  const [currentApp, setCurrentApp] = useState(null); // null = home, "oulpan", "test", "categorie", "admin"
  const [categorieStart, setCategorieStart] = useState(null); // "protocol" | null

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
              <span className="home-choice-desc">
                Vocabulaire Hébreu → Français
              </span>
            </button>

            <button
              className="home-choice-btn test-btn"
              onClick={() => setCurrentApp("test")}
            >
              <span className="home-choice-icon">📝</span>
              <span className="home-choice-title">Test</span>
              <span className="home-choice-desc">QCM par catégorie</span>
            </button>

            <button
              className="home-choice-btn categorie-btn"
              onClick={() => {
                setCategorieStart(null);
                setCurrentApp("categorie");
              }}
            >
              <span className="home-choice-icon">🗂️</span>
              <span className="home-choice-title">Catégories</span>
              <span className="home-choice-desc">
                Mémoriser les associations
              </span>
            </button>

            <button
              className="home-choice-btn protocol-btn"
              onClick={() => {
                setCategorieStart("protocol");
                setCurrentApp("categorie");
              }}
            >
              <span className="home-choice-icon">💆</span>
              <span className="home-choice-title">Protocole facial</span>
              <span className="home-choice-desc">
                Étapes de traitement Hava Zingboim
              </span>
            </button>
          </div>

          <button
            className="home-admin-btn"
            onClick={() => setCurrentApp("admin")}
          >
            🛠️ Admin
          </button>
        </div>
      </div>
    );
  }

  // Oulpan
  if (currentApp === "oulpan") {
    return <Oulpan onBack={() => setCurrentApp(null)} />;
  }

  // Test
  if (currentApp === "test") {
    return <Test onBack={() => setCurrentApp(null)} />;
  }

  // Categorie
  if (currentApp === "categorie") {
    return (
      <Categorie
        onBack={() => {
          setCategorieStart(null);
          setCurrentApp(null);
        }}
        initialDataset={categorieStart}
      />
    );
  }

  // Admin
  if (currentApp === "admin") {
    return <Admin onBack={() => setCurrentApp(null)} />;
  }

  return null;
}
