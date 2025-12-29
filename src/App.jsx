import { useEffect, useState, useRef } from "react";
import rawWords from "./data/words.json";
import "./App.css";

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());
const saveProgress = (words) =>
  localStorage.setItem("hebrew-progress", JSON.stringify(words));

export default function App() {
  const [words, setWords] = useState([]);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [mode, setMode] = useState("learn");

  // Ref pour accéder aux words sans déclencher de re-render des choices
  const wordsRef = useRef([]);
  wordsRef.current = words;

  /* INIT */
  useEffect(() => {
    const saved = localStorage.getItem("hebrew-progress");
    const loadedWords = saved ? JSON.parse(saved) : rawWords;
    setWords(loadedWords);
    wordsRef.current = loadedWords;
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

  /* GENERATE CHOICES - seulement quand current change */
  useEffect(() => {
    if (!current || !wordsRef.current.length) {
      setChoices([]);
      return;
    }
    const others = wordsRef.current.filter((w) => w.he !== current.he);
    const newChoices = shuffle([current, ...shuffle(others).slice(0, 3)]);
    setChoices(newChoices);
  }, [current]);

  /* CLICK */
  const handleClick = (choice) => {
    if (status !== "idle") return;

    if (choice.fr === current.fr) {
      setStatus("correct");

      const updated = wordsRef.current.map((w) =>
        w.he === current.he ? { ...w, count: w.count + 1, wrong: 0 } : w
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

      const updated = wordsRef.current.map((w) =>
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
  const progress = (doneCount / words.length) * 100;

  return (
    <div className={`app ${status}`}>
      {/* HEADER */}
      <header className="header">
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === "learn" ? "active" : ""}`}
            onClick={() => {
              setMode("learn");
              setQueue([]);
            }}
          >
            <span className="mode-icon">📚</span>
            <span className="mode-text">Apprendre</span>
          </button>

          <button
            className={`mode-btn review ${mode === "review" ? "active" : ""}`}
            onClick={() => {
              setMode("review");
              setQueue([]);
            }}
            disabled={reviewCount === 0}
          >
            <span className="mode-icon">🔄</span>
            <span className="mode-text">Réviser</span>
            {reviewCount > 0 && <span className="badge">{reviewCount}</span>}
          </button>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat-value">{minCount}</span>
            <span className="stat-label">Niveau</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {doneCount}
              <span className="stat-total">/{words.length}</span>
            </span>
            <span className="stat-label">Mots maîtrisés</span>
          </div>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* WORD CARD */}
      <main className="card-area">
        <div className="word-card">
          <span className="hebrew">{current.he}</span>
        </div>
      </main>

      {/* CHOICES */}
      <footer className="choices">
        {choices.map((c, i) => (
          <button
            key={`${current.he}-${c.fr}-${i}`}
            className={`choice-btn ${
              status === "correct" && c.fr === current.fr ? "correct" : ""
            }`}
            onClick={() => handleClick(c)}
            disabled={status === "correct"}
          >
            {c.fr}
          </button>
        ))}
      </footer>
    </div>
  );
}
