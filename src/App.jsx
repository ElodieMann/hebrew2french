import { useEffect, useState, useRef } from "react";
import rawWords from "./data/words.json";
import "./App.css";

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());
const saveProgress = (words) =>
  localStorage.setItem("hebrew-progress", JSON.stringify(words));
const getDeletedWords = () => 
  JSON.parse(localStorage.getItem("hebrew-deleted") || "[]");
const saveDeletedWords = (deleted) =>
  localStorage.setItem("hebrew-deleted", JSON.stringify(deleted));

export default function App() {
  const [words, setWords] = useState([]);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [mode, setMode] = useState("learn");
  
  const wordsRef = useRef([]);
  wordsRef.current = words;

  /* INIT */
  useEffect(() => {
    const saved = localStorage.getItem("hebrew-progress");
    const deleted = getDeletedWords();
    
    let loadedWords = saved ? JSON.parse(saved) : rawWords;
    loadedWords = loadedWords.filter((w) => !deleted.includes(w.he));
    
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

  /* GENERATE CHOICES */
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

  /* DELETE WORD */
  const handleDelete = () => {
    if (!current) return;
    
    const deleted = getDeletedWords();
    deleted.push(current.he);
    saveDeletedWords(deleted);
    
    const updated = wordsRef.current.filter((w) => w.he !== current.he);
    setWords(updated);
    saveProgress(updated);
    
    const nextQueue = queue.slice(1);
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setStatus("idle");
  };

  /* MARK FOR REVIEW */
  const handleMarkReview = () => {
    if (!current) return;
    
    const updated = wordsRef.current.map((w) =>
      w.he === current.he ? { ...w, wrong: w.wrong + 1 } : w
    );
    
    setWords(updated);
    saveProgress(updated);
    
    // Passer au mot suivant
    const nextQueue = queue.slice(1);
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setStatus("idle");
  };

  /* RESET ALL */
  const handleReset = () => {
    if (!window.confirm("Tout effacer ? Progression et mots supprimés seront réinitialisés.")) {
      return;
    }
    
    localStorage.removeItem("hebrew-progress");
    localStorage.removeItem("hebrew-deleted");
    
    setWords(rawWords);
    wordsRef.current = rawWords;
    setQueue([]);
    setMode("learn");
    setStatus("idle");
  };

  if (!current) {
    return (
      <div className="app">
        <div className="empty-state">
          <span className="empty-icon">🎉</span>
          <span className="empty-text">Plus de mots !</span>
          <button 
            className="reset-btn"
            onClick={() => {
              setMode("learn");
              setQueue([]);
            }}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

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
            <span className="stat-label">Mots</span>
          </div>
        </div>

        <div className="progress-row">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <button className="reset-small-btn" onClick={handleReset} title="Tout réinitialiser">
            ↺
          </button>
        </div>
      </header>

      {/* WORD CARD */}
      <main className="card-area">
        <div className="word-card">
          <div className="card-actions">
            <button className="action-btn review-action" onClick={handleMarkReview} title="À réviser">
              📌
            </button>
            <button className="action-btn delete-action" onClick={handleDelete} title="Supprimer">
              🗑️
            </button>
          </div>
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
