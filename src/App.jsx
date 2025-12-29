import { useEffect, useState, useMemo } from "react";
import rawWords from "./data/words.json";

/* =====================
   Utils
===================== */
const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

const saveProgress = (words) =>
  localStorage.setItem("hebrew-progress", JSON.stringify(words));

/* =====================
   App
===================== */
export default function App() {
  const [words, setWords] = useState([]);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [mode, setMode] = useState("learn"); // learn | review

  useEffect(() => {
    const saved = localStorage.getItem("hebrew-progress");
    const data = saved ? JSON.parse(saved) : rawWords;
    setWords(data);
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
      }, 1200);
    } else {
      setStatus("wrong");
      const updated = words.map((w) =>
        w.he === current.he ? { ...w, wrong: w.wrong + 1 } : w
      );
      setWords(updated);
      saveProgress(updated);
      setTimeout(() => setStatus("idle"), 1500);
    }
  };

  const reset = () => {
    if (window.confirm("Effacer toute ta progression ?")) {
      localStorage.removeItem("hebrew-progress");
      window.location.reload();
    }
  };

  if (!current) return <div className="loader">Chargement...</div>;

  const minCount = Math.min(...words.map((w) => w.count));
  const done = words.filter((w) => w.count > minCount).length;
  const progressPercent = (done / words.length) * 100;

  return (
    <div className={`app-container ${status}`}>
      {/* BARRE DE PROGRESSION */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="content">
        {/* MODES */}
        <div className="modes-nav">
          <button className={mode === "learn" ? "active" : ""} onClick={() => { setMode("learn"); setQueue([]); }}>
            🚀 Apprendre
          </button>
          <button className={mode === "review" ? "active review" : ""} onClick={() => { setMode("review"); setQueue([]); }} disabled={!words.some(w => w.wrong > 0)}>
            🎯 Réviser ({words.filter(w => w.wrong > 0).length})
          </button>
        </div>

        {/* MOT HEBREU */}
        <div className={`card ${status === "correct" ? "bounce" : status === "wrong" ? "shake" : ""}`}>
          <h1 className="hebrew-word">{current.he}</h1>
          {status === "correct" && <p className="success-hint">C'est ça !</p>}
        </div>

        {/* CHOIX */}
        <div className="choices-grid">
          {choices.map((c, i) => (
            <button
              key={`${current.he}-${i}`}
              className={`choice-btn ${status === "wrong" && c.fr === current.fr ? "blink-guide" : ""}`}
              onClick={() => handleClick(c)}
              disabled={status !== "idle"}
            >
              {c.fr}
            </button>
          ))}
        </div>

        <button className="btn-reset" onClick={reset}>Réinitialiser</button>
      </div>

      <style jsx>{`
        :global(body) { margin: 0; background: #f0f4f8; font-family: 'Segoe UI', Roboto, sans-serif; }
        
        .app-container { min-height: 100vh; display: flex; flex-direction: column; transition: background 0.3s; }
        .app-container.correct { background: #d4edda; }
        .app-container.wrong { background: #f8d7da; }

        .progress-bar { width: 100%; height: 12px; background: #e0e0e0; position: fixed; top: 0; }
        .progress-fill { height: 100%; background: #4cc9f0; transition: width 0.5s ease; border-radius: 0 5px 5px 0; }

        .content { flex: 1; padding: 20px; max-width: 600px; margin: 40px auto; width: 90%; display: flex; flex-direction: column; gap: 20px; }

        .modes-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .modes-nav button { border: none; padding: 12px; border-radius: 15px; font-weight: bold; cursor: pointer; background: white; box-shadow: 0 4px #ddd; transition: 0.1s; font-size: 0.9rem; }
        .modes-nav button:active { transform: translateY(2px); box-shadow: 0 2px #ddd; }
        .modes-nav button.active { background: #4cc9f0; color: white; box-shadow: 0 4px #3a9dbb; }
        .modes-nav button.review.active { background: #f72585; box-shadow: 0 4px #b5179e; }

        .card { background: white; padding: 40px 20px; border-radius: 25px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); text-align: center; margin: 20px 0; border: 2px solid #eee; }
        .hebrew-word { font-size: 3.5rem; margin: 0; color: #333; direction: rtl; }
        .success-hint { color: #28a745; font-weight: bold; margin-top: 10px; font-size: 1.2rem; }

        .choices-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .choice-btn { background: white; border: 2px solid #e5e5e5; border-radius: 18px; padding: 18px; font-size: 1.1rem; cursor: pointer; transition: 0.2s; box-shadow: 0 5px #e5e5e5; font-weight: 500; color: #444; }
        .choice-btn:active { transform: translateY(3px); box-shadow: 0 2px #e5e5e5; }
        
        .correct .choice-btn:disabled { opacity: 0.5; }
        .wrong .choice-btn { border-color: #ff8fa3; color: #ff8fa3; }
        
        /* Aide visuelle en cas d'erreur */
        .blink-guide { background: #d4edda !important; border-color: #28a745 !important; color: #155724 !important; animation: blink 0.5s infinite; }

        .btn-reset { margin-top: auto; background: none; border: none; color: #aaa; text-decoration: underline; cursor: pointer; padding: 20px; }

        /* ANIMATIONS */
        @keyframes blink { 50% { opacity: 0.7; } }
        .shake { animation: shake 0.4s; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .bounce { animation: bounce 0.5s; }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        /* RESPONSIVE MOBILE */
        @media (max-width: 480px) {
          .hebrew-word { font-size: 2.8rem; }
          .choice-btn { padding: 15px; font-size: 1rem; }
        }
      `}</style>
    </div>
  );
}