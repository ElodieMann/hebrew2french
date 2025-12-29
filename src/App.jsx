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
      }, 600);
    } else {
      setStatus("wrong");
      const updated = words.map((w) => 
        w.he === current.he ? { ...w, wrong: w.wrong + 1 } : w
      );
      setWords(updated);
      saveProgress(updated);
      
      // On ne change pas de mot, on reset juste l'état pour retenter
      setTimeout(() => setStatus("idle"), 800);
    }
  };

  if (!current) return null;

  const minCount = Math.min(...words.map((w) => w.count));
  const doneCount = words.filter((w) => w.count > minCount).length;
  const reviewCount = words.filter(w => w.wrong > 0).length;

  return (
    <div className={`app-canvas ${status}`}>
      {/* HEADER : BOUTONS ET STATS XL */}
      <header className="app-header">
        <div className="nav-large">
          <button className={mode === 'learn' ? 'btn-mode active' : 'btn-mode'} onClick={() => {setMode('learn'); setQueue([]);}}>
            APPRENDRE
          </button>
          <button className={mode === 'review' ? 'btn-mode active rev' : 'btn-mode'} onClick={() => {setMode('review'); setQueue([]);}} disabled={reviewCount === 0}>
            RÉVISER ({reviewCount})
          </button>
        </div>
        
        <div className="stats-xl">
          <div className="stat-pill">NV <b>{minCount}</b></div>
          <div className="stat-pill">SCORE <b>{doneCount}/{words.length}</b></div>
        </div>
      </header>

      {/* MOT HÉBREU XXL */}
      <main className="word-section">
        <h1 className="hebrew-display">{current.he}</h1>
      </main>

      {/* RÉPONSES XXL */}
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
          font-family: -apple-system, sans-serif;
        }

        .app-canvas {
          display: flex; flex-direction: column;
          height: 100vh; width: 100vw;
          padding: 15px; box-sizing: border-box;
          transition: background 0.1s;
        }

        .app-canvas.correct { background: #bdf8d0; }
        .app-canvas.wrong { background: #ffcfcf; }

        /* HEADER */
        .app-header { height: 22%; display: flex; flex-direction: column; gap: 15px; justify-content: center; }
        
        .nav-large { display: flex; flex-direction: column; gap: 8px; }
        .btn-mode { 
          height: 55px; border: none; border-radius: 12px; 
          font-weight: 900; font-size: 1.1rem; background: #eee; 
          color: #666; box-shadow: 0 4px #ccc;
        }
        .btn-mode.active { background: #007bff; color: white; box-shadow: 0 4px #0056b3; }
        .btn-mode.rev.active { background: #e91e63; box-shadow: 0 4px #b0174b; }

        .stats-xl { display: flex; justify-content: space-between; gap: 10px; }
        .stat-pill { 
            flex: 1; background: #f8f9fa; padding: 8px; border-radius: 10px; 
            text-align: center; font-size: 1.1rem; border: 1px solid #ddd;
        }
        .stat-pill b { color: #007bff; font-size: 1.3rem; }

        /* MOT */
        .word-section { height: 28%; display: flex; align-items: center; justify-content: center; }
        .hebrew-display { font-size: 5.5rem; margin: 0; direction: rtl; color: #000; font-weight: 900; }

        /* BOUTONS RÉPONSES */
        .choices-section { 
          height: 50%; display: flex; flex-direction: column; 
          gap: 12px; padding-bottom: 20px;
        }
        .huge-btn { 
          flex: 1; background: white; border: 4px solid #333; border-radius: 20px;
          font-size: 1.8rem; font-weight: 900; color: #000;
          box-shadow: 0 6px 0 #000; cursor: pointer;
        }
        .huge-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #000; }

        @media (max-height: 750px) {
          .hebrew-display { font-size: 4rem; }
          .huge-btn { font-size: 1.5rem; }
          .btn-mode { height: 45px; }
        }
      `}</style>
    </div>
  );
}
