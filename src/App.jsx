import { useEffect, useState, useMemo } from "react";
import rawWords from "./data/words.json";

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());
const saveProgress = (words) => localStorage.setItem("hebrew-progress", JSON.stringify(words));

export default function App() {
  const [words, setWords] = useState([]);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [status, setStatus] = useState("idle"); 
  const [mode, setMode] = useState("learn");

  useEffect(() => {
    const saved = localStorage.getItem("hebrew-progress");
    setWords(saved ? JSON.parse(saved) : rawWords);
  }, []);

  useEffect(() => {
    if (words.length > 0 && queue.length === 0) {
      const minCount = Math.min(...words.map((w) => w.count));
      const base = mode === "review"
          ? words.filter((w) => w.wrong > 0)
          : words.filter((w) => w.count === minCount);
      const shuffled = shuffle(base.length > 0 ? base : words);
      setQueue(shuffled);
      setCurrent(shuffled[0] || null);
    }
  }, [words, mode, queue.length]);

  const choices = useMemo(() => {
    if (!current || !words.length) return [];
    const otherWords = words.filter((w) => w.he !== current.he);
    return shuffle([current, ...shuffle(otherWords).slice(0, 3)]);
  }, [current, words]);

  const handleClick = (choice) => {
    if (status !== "idle") return;

    if (choice.fr === current.fr) {
      setStatus("correct");
      const updated = words.map((w) => 
        w.he === current.he ? { ...w, count: w.count + 1, wrong: 0 } : w
      );
      setWords(updated);
      saveProgress(updated);
      setTimeout(() => {
        const nextQueue = queue.slice(1);
        setQueue(nextQueue);
        setCurrent(nextQueue[0] || null);
        setStatus("idle");
      }, 800);
    } else {
      setStatus("wrong");
      const updated = words.map((w) => 
        w.he === current.he ? { ...w, wrong: w.wrong + 1 } : w
      );
      setWords(updated);
      saveProgress(updated);
      // On reset juste le statut pour permettre de re-cliquer, 
      // sans jamais montrer quelle était la bonne réponse.
      setTimeout(() => setStatus("idle"), 1000);
    }
  };

  if (!current) return null;

  const minCount = Math.min(...words.map((w) => w.count));
  const doneCount = words.filter((w) => w.count > minCount).length;
  const reviewCount = words.filter(w => w.wrong > 0).length;

  return (
    <div className={`app-canvas ${status}`}>
      {/* HEADER NUMÉRIQUE COMPACT */}
      <header className="app-header">
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-label">NV</span>
            <span className="stat-value">{minCount}</span>
          </div>
          <div className="stat-box main-stat">
            <span className="stat-value">{doneCount} / {words.length}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">ERR</span>
            <span className="stat-value">{reviewCount}</span>
          </div>
        </div>
        
        <div className="nav-tabs">
          <button className={mode === 'learn' ? 'tab active' : 'tab'} onClick={() => {setMode('learn'); setQueue([]);}}>Apprendre</button>
          <button className={mode === 'review' ? 'tab active rev' : 'tab'} onClick={() => {setMode('review'); setQueue([]);}} disabled={reviewCount === 0}>Réviser</button>
        </div>
      </header>

      {/* ZONE MOT HÉBREU */}
      <main className="word-section">
        <div className="word-card-full">
          <h1 className="hebrew-text">{current.he}</h1>
        </div>
      </main>

      {/* ZONE BOUTONS (Remplissage vertical total) */}
      <footer className="choices-section">
        {choices.map((c, i) => (
          <button
            key={`${current.he}-${i}`}
            className="huge-btn"
            onClick={() => handleClick(c)}
            disabled={status === "correct"} // Désactivé seulement si on a trouvé la bonne réponse
          >
            {c.fr}
          </button>
        ))}
      </footer>

      <style jsx>{`
        :global(html, body) { 
          margin: 0; padding: 0; height: 100%; width: 100%;
          overflow: hidden; background: #ffffff;
          font-family: -apple-system, system-ui, sans-serif;
        }

        .app-canvas {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          padding: 10px;
          box-sizing: border-box;
          transition: background 0.2s;
        }

        .app-canvas.correct { background: #dcfce7; }
        .app-canvas.wrong { background: #fee2e2; }

        .app-header { height: 15%; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
        .stats-row { display: flex; justify-content: space-between; align-items: center; padding: 0 10px; }
        .stat-box { display: flex; flex-direction: column; align-items: center; }
        .stat-label { font-size: 10px; font-weight: bold; color: #888; }
        .stat-value { font-size: 1.2rem; font-weight: 800; color: #333; }
        .main-stat .stat-value { font-size: 1.6rem; color: #007bff; }

        .nav-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tab { border: none; padding: 10px; border-radius: 10px; font-weight: bold; font-size: 14px; background: #f0f0f0; color: #666; }
        .tab.active { background: #007bff; color: white; }
        .tab.rev.active { background: #e91e63; }

        .word-section { height: 30%; display: flex; align-items: center; justify-content: center; }
        .hebrew-text { font-size: 5rem; margin: 0; direction: rtl; color: #000; font-weight: bold; }

        .choices-section { 
          flex-grow: 1; 
          display: flex; 
          flex-direction: column; 
          gap: 12px; 
          padding-bottom: 20px;
        }
        .huge-btn { 
          flex: 1; 
          background: white; border: 3px solid #e2e8f0; border-radius: 20px;
          font-size: 1.5rem; font-weight: bold; color: #1a202c;
          box-shadow: 0 4px 0 #cbd5e0; cursor: pointer; transition: 0.1s;
        }
        .huge-btn:active { transform: translateY(4px); box-shadow: 0 0px 0 #cbd5e0; }
        
        /* Supprimé : toute classe d'indice visuel "correct-hint" ou "is-hint" */

        @media (max-height: 650px) {
          .hebrew-text { font-size: 3.5rem; }
          .huge-btn { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  );
}
