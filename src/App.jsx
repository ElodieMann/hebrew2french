import { useEffect, useState } from "react";
import rawWords from "./data/words.json";

/* =====================
   Utils
===================== */

const shuffle = arr => [...arr].sort(() => 0.5 - Math.random());

const saveProgress = words =>
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

  /* INIT */
  useEffect(() => {
    const saved = localStorage.getItem("hebrew-progress");
    setWords(saved ? JSON.parse(saved) : rawWords);
  }, []);

  /* BUILD QUEUE */
  useEffect(() => {
    if (!words.length) return;

    const minCount = Math.min(...words.map(w => w.count));

    const base =
      mode === "review"
        ? words.filter(w => w.wrong > 0)
        : words.filter(w => w.count === minCount);

    const shuffled = shuffle(base);

    setQueue(shuffled);
    setCurrent(shuffled[0] || null);
    setStatus("idle");
  }, [words, mode]);

  if (!current) return <div className="app">Aucun mot à afficher</div>;

  const minCount = Math.min(...words.map(w => w.count));
  const total = words.length;
  const done = words.filter(w => w.count > minCount).length;
  const hasReview = words.some(w => w.wrong > 0);

  const choices = shuffle([
    current,
    ...shuffle(
      words.filter(w => w.he !== current.he)
    ).slice(0, 3)
  ]);

  const handleClick = choice => {
    if (choice.fr === current.fr) {
      setStatus("correct");

      const updated = words.map(w =>
        w.he === current.he ? { ...w, count: w.count + 1 } : w
      );

      setWords(updated);
      saveProgress(updated);

      setTimeout(() => next(updated), 2000);
    } else {
      setStatus("wrong");

      const updated = words.map(w =>
        w.he === current.he ? { ...w, wrong: w.wrong + 1 } : w
      );

      setWords(updated);
      saveProgress(updated);
    }
  };

  const next = updatedWords => {
    const rest = queue.slice(1);

    if (!rest.length) {
      const nextBatch =
        mode === "review"
          ? updatedWords.filter(w => w.wrong > 0)
          : updatedWords.filter(w => w.count === minCount + 1);

      const shuffled = shuffle(nextBatch);
      setQueue(shuffled);
      setCurrent(shuffled[0] || null);
    } else {
      setQueue(rest);
      setCurrent(rest[0]);
    }

    setStatus("idle");
  };

  const reset = () => {
    const resetWords = rawWords.map(w => ({
      ...w,
      count: 0,
      wrong: 0
    }));

    localStorage.removeItem("hebrew-progress");
    setWords(resetWords);
  };

  return (
    <div className="app">
      {/* MODES */}
      <div className="modes">
        <button
          className={mode === "learn" ? "active" : ""}
          onClick={() => setMode("learn")}
        >
          Apprentissage
        </button>
        <button
          disabled={!hasReview}
          className={mode === "review" ? "active review" : ""}
          onClick={() => setMode("review")}
        >
          Révision
        </button>
      </div>

      {/* HEADER */}
      <div className="header">
        <div>Mot {done + 1} / {total}</div>
        <div>Niveau {minCount}</div>
      </div>

      {/* CONTENT */}
      {status === "correct" ? (
        <div className="success">
          <div className="word-he big">{current.he}</div>
          <div className="word-fr">{current.fr}</div>
        </div>
      ) : (
        <>
          <div className="word-he">{current.he}</div>

          {choices.map((c, i) => (
            <button
              key={i}
              className={`choice ${
                status === "wrong" && c.fr !== current.fr ? "wrong" : ""
              }`}
              onClick={() => handleClick(c)}
            >
              {c.fr}
            </button>
          ))}
        </>
      )}

      {/* RESET */}
      <button className="reset" onClick={reset}>
        Réinitialiser les compteurs
      </button>
    </div>
  );
}
