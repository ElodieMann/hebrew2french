import { useEffect, useState, useMemo } from "react";
import rawWords from "./data/words.json";

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());
const saveProgress = (words) =>
  localStorage.setItem("hebrew-progress", JSON.stringify(words));

export default function App() {
  const [words, setWords] = useState([]);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [mode, setMode] = useState("learn");

  /* INIT */
  useEffect(() => {
    const saved = localStorage.getItem("hebrew-progress");
    setWords(saved ? JSON.parse(saved) : rawWords);
  }, []);

  /* BUILD QUEUE */
  useEffect(() => {
    if (words.length > 0 && queue.length === 0) {
      const minCount = Math.min(...words.map((w) => w.count));
      const base =
        mode === "review"
          ? words.filter((w) => w.wrong > 0)
          : words.filter((w) => w.count === minCount);

      const shuffled = shuffle(base.length ? base : words);
      setQueue(shuffled);
      setCurrent(shuffled[0] || null);
      setStatus("idle");
    }
  }, [words, mode, queue.length]);

  const choices = useMemo(() => {
    if (!current || !words.length) return [];
    const others = words.filter((w) => w.he !== current.he);
    return shuffle([current, ...shuffle(others).slice(0, 3)]);
  }, [current, words]);

  /* CLICK */
  const handleClick = (choice) => {
    if (status !== "idle") return;

    if (choice.fr === current.fr) {
      setStatus("correct");

      const updated = words.map((w) =>
        w.he === current.he
          ? { ...w, count: w.count + 1, wrong: 0 }
          : w
      );

      setWords(updated);
      saveProgress(updated);

      setTimeout(() => {
        const nextQueue = queue.slice(1);
        setQueue(nextQueue);
        setCurrent(nextQueue[0] || null);
        setStatus("idle");
      }, 900);
    } else {
      setStatus("wrong");

      const updated = words.map((w) =>
        w.he === current.he ? { ...w, wrong: w.wrong + 1 } : w
      );

      setWords(updated);
      saveProgress(updated);

      setTimeout(() => setStatus("idle"), 900);
    }
  };

  if (!current) return null;

  const minCount = Math.min(...words.map((w) => w.count));
  const doneCount = words.filter((w) => w.count > minCount).length;
  const reviewCount = words.filter((w) => w.wrong > 0).length;

  return (
    <div className={`app-canvas ${status}`}>
      {/* HEADER */}
      <header className="app-header">
        <div className="nav-large">
          <button
            className={`btn-mode ${mode === "learn" ? "active" : ""}`}
            onClick={() => {
              setMode("learn");
              setQueue([]);
            }}
          >
            📘 APPRENDRE
          </button>

          <button
            className={`btn-mode rev ${mode === "review" ? "active" : ""}`}
            onClick={() => {
              setMode("review");
              setQueue([]);
            }}
            disabled={reviewCount === 0}
          >
            🔁 RÉVISER ({reviewCount})
          </button>
        </div>

        <div className="stats-xl">
          <div className="stat-pill">NIVEAU<br /><b>{minCount}</b></div>
          <div className="stat-pill">
            MOTS<br /><b>{doneCount}/{words.length}</b>
          </div>
        </div>
      </header>

      {/* MOT */}
      <main className="word-section">
        <h1 className="hebrew-display">{current.he}</h1>
      </main>

      {/* CHOICES */}
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

      {/* STYLES */}
      <style jsx>{`
        :global(html, body) {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          background: #fff;
          font-family: -apple-system, system-ui, sans-serif;
        }

        .app-canvas {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 16px;
          box-sizing: border-box;
          transition: background 0.15s;
        }

        .app-canvas.correct { background: #c9f7d8; }
        .app-canvas.wrong { background: #ffd2d2; }

        /* HEADER */
        .app-header {
          height: 26%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nav-large {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn-mode {
          height: 72px;
          font-size: 1.8rem;
          font-weight: 900;
          border: none;
          border-radius: 16px;
          background: #ececec;
          color: #555;
          box-shadow: 0 6px #ccc;
        }

        .btn-mode.active {
          background: #007bff;
          color: white;
          box-shadow: 0 6px #0056b3;
        }

        .btn-mode.rev.active {
          background: #e91e63;
          box-shadow: 0 6px #b0174b;
        }

        .stats-xl {
          display: flex;
          gap: 12px;
        }

        .stat-pill {
          flex: 1;
          background: #f8f9fa;
          border-radius: 14px;
          text-align: center;
          font-size: 1.3rem;
          padding: 10px;
          border: 2px solid #ddd;
        }

        .stat-pill b {
          font-size: 2rem;
          color: #007bff;
        }

        /* WORD */
        .word-section {
          height: 26%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hebrew-display {
          font-size: 6.5rem;
          font-weight: 900;
          direction: rtl;
          margin: 0;
        }

        /* CHOICES */
        .choices-section {
          height: 48%;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-bottom: 20px;
        }

        .huge-btn {
          flex: 1;
          font-size: 2.4rem;
          font-weight: 900;
          border-radius: 24px;
          border: 5px solid #000;
          background: #fff;
          box-shadow: 0 8px 0 #000;
        }

        .huge-btn:active {
          transform: translateY(6px);
          box-shadow: 0 2px 0 #000;
        }

        @media (max-height: 750px) {
          .hebrew-display { font-size: 5rem; }
          .huge-btn { font-size: 2rem; }
          .btn-mode { height: 60px; font-size: 1.5rem; }
        }
      `}</style>
    </div>
  );
}
