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
      
      // ON NE PASSE AU SUIVANT QUE SI C'EST JUSTE
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
      
      // RESTE SUR LE MÊME MOT SI C'EST FAUX
      setTimeout(() => setStatus("idle"), 1000);
    }
  };

  if (!current) return null;

  const minCount = Math.min(...words.map((w) => w.count));
  const doneCount = words.filter((w) => w.count > minCount).length;
  const reviewCount = words.filter(w => w.wrong > 0).length;

  return (
    <div className={`app-canvas ${status}`}>
      {/* HEADER AVEC GROS BOUTONS */}
      <header className="app-header">
        <div className="nav-tabs-large">
          <button className={mode === 'learn' ? 'tab active' : 'tab'} onClick={() => {setMode('learn'); setQueue([]);}}>
            🚀 APPRENDRE
          </button>
          <button className={mode === 'review' ? 'tab active rev' : 'tab'} onClick={() => {setMode('review'); setQueue([]);}} disabled={reviewCount === 0}>
            🎯 RÉVISER ({reviewCount})
          </button>
        </div>
        
        <div className="stats-row-mini">
          <div className="mini-box">NV <b>{minCount}</b></div>
          <div className="mini-box">SCORE <b>{doneCount}/{words.length}</b></div>
        </div>
      </header>

      {/* MOT GEANT */}
      <main className="word-section">
        <h1 className="hebrew-text">{current.he}</h1>
      </main>

      {/* BOUTONS ACTIONS */}
      <footer className="choices-section">
        {choices.map((c, i) => (
          <button
            key={`${current.he}-${i}`}
            className="huge-btn"
            onClick={() => handleClick(c)}
            disabled={status === "correct"}
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
          display: flex; flex-direction: column;
          height: 100vh; width: 100vw;
          padding: 15px; box-sizing: border-box;
          transition: background 0.2s;
        }

        .app-canvas.correct { background: #dcfce7; }
        .app-canvas.wrong { background: #fee2e2; }

        /* HEADER AVEC BOUTONS LARGES */
        .app-header { height: 20%; display: flex; flex-direction: column; gap: 15px; padding-top: 10px; }
        
        .nav-tabs-large { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .tab { 
          border: none; height: 60px; border-radius: 15px; 
          font-weight: 900; font-size: 14px; background: #f0f0f0; 
          color: #888; box-shadow: 0 4px #ddd; transition: 0.1s;
        }
        .tab.active { background: #007bff; color: white; box-shadow: 0 4px #0056b3; }
        .tab.rev.active { background: #e91e63; box-shadow: 0 4px #c2185b; }
        .tab:active { transform: translateY(2px); box-shadow: 0 2px #ccc; }

        .stats-row-mini { display: flex; justify-content: space-around; font-size: 13px; color: #666; }
        .mini-box b { color: #333; font-size: 16px; margin-left: 5px; }

        /* ZONE MOT */
        .word-section { height: 25%; display: flex; align-items: center; justify-content: center; }
        .hebrew-text { font-size: 4.5rem; margin: 0; direction: rtl; color: #000; font-weight: bold; }

        /* ZONE BOUTONS REPONSES */
        .choices-section { 
          flex-grow: 1; display: flex; flex-direction: column; 
          gap: 12px; padding-bottom: 25px;
        }
        .huge-btn { 
          flex: 1; background: white; border: 3px solid #e2e8f0; border-radius: 20px;
          font-size: 1.4rem; font-weight: bold; color: #1a202c;
          box-shadow: 0 5px 0 #cbd5e0; cursor: pointer; transition: 0.1s;
        }
        .huge-btn:active { transform: translateY(4px); box-shadow: 0 1px 0 #cbd5e0; }

        @media (max-height: 700px) {
          .hebrew-text { font-size: 3.5rem; }
          .tab { height: 50px; }
        }
      `}</style>
    </div>
  );
}
