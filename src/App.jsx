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

  // 1. Initialisation
  useEffect(() => {
    const saved = localStorage.getItem("hebrew-progress");
    const data = saved ? JSON.parse(saved) : rawWords;
    setWords(data);
  }, []);

  // 2. Gestion de la file d'attente (Queue)
  // On ne reconstruit la queue que si elle est vide OU si on change de mode
  useEffect(() => {
    if (words.length > 0 && queue.length === 0) {
      const minCount = Math.min(...words.map((w) => w.count));
      
      const base =
        mode === "review"
          ? words.filter((w) => w.wrong > 0)
          : words.filter((w) => w.count === minCount);

      const shuffled = shuffle(base.length > 0 ? base : words);
      setQueue(shuffled);
      setCurrent(shuffled[0] || null);
    }
  }, [words, mode, queue.length]);

  // 3. Génération des choix (mémorisée pour éviter que ça change au clic)
  const choices = useMemo(() => {
    if (!current || !words.length) return [];
    const otherWords = words.filter((w) => w.he !== current.he);
    return shuffle([current, ...shuffle(otherWords).slice(0, 3)]);
  }, [current, words]);

  // 4. Actions
  const handleClick = (choice) => {
    if (status !== "idle") return; // Empêche le multi-clic

    if (choice.fr === current.fr) {
      setStatus("correct");

      const updated = words.map((w) =>
        w.he === current.he ? { ...w, count: w.count + 1, wrong: 0 } : w
      );

      setWords(updated);
      saveProgress(updated);

      // On attend que l'utilisateur voit le succès avant de passer au suivant
      setTimeout(() => {
        const nextQueue = queue.slice(1);
        setQueue(nextQueue);
        setCurrent(nextQueue[0] || null);
        setStatus("idle");
      }, 1500);
    } else {
      setStatus("wrong");

      const updated = words.map((w) =>
        w.he === current.he ? { ...w, wrong: w.wrong + 1 } : w
      );

      setWords(updated);
      saveProgress(updated);

      // On laisse le statut "wrong" pour afficher l'erreur, 
      // puis on reset l'état pour permettre de rééssayer le MÊME mot
      setTimeout(() => {
        setStatus("idle");
      }, 2000);
    }
  };

  const reset = () => {
    if (window.confirm("Réinitialiser toute ta progression ?")) {
      localStorage.removeItem("hebrew-progress");
      setWords(rawWords);
      setQueue([]);
      setCurrent(null);
    }
  };

  const changeMode = (m) => {
    setMode(m);
    setQueue([]); // Vider la queue force le useEffect à la reconstruire
  };

  if (!current) return <div className="app">Chargement ou aucun mot trouvé...</div>;

  const minCount = Math.min(...words.map((w) => w.count));
  const done = words.filter((w) => w.count > minCount).length;

  return (
    <div className="app">
      {/* MODES */}
      <div className="modes">
        <button
          className={mode === "learn" ? "active" : ""}
          onClick={() => changeMode("learn")}
        >
          Apprentissage
        </button>
        <button
          className={mode === "review" ? "active review" : ""}
          onClick={() => changeMode("review")}
          disabled={!words.some((w) => w.wrong > 0)}
        >
          Révision ({words.filter((w) => w.wrong > 0).length})
        </button>
      </div>

      {/* HEADER */}
      <div className="header">
        <div>Progression: {done} / {words.length}</div>
        <div>Niveau global: {minCount}</div>
      </div>

      {/* CONTENT */}
      <div className="quiz-container">
        <div className={`word-he ${status === "correct" ? "big success-text" : ""}`}>
          {current.he}
        </div>

        {status === "correct" ? (
          <div className="success-message">
            <p>Bien joué !</p>
            <p className="translation">{current.fr}</p>
          </div>
        ) : (
          <div className="choices-grid">
            {choices.map((c, i) => (
              <button
                key={`${current.he}-${i}`}
                className={`choice ${status === "wrong" ? "show-error" : ""}`}
                onClick={() => handleClick(c)}
                disabled={status !== "idle"}
              >
                {c.fr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RESET */}
      <button className="reset-btn" onClick={reset}>
        Réinitialiser les compteurs
      </button>

      <style jsx>{`
        .app { font-family: sans-serif; max-width: 500px; margin: 20px auto; text-align: center; padding: 20px; }
        .modes { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
        .modes button { padding: 10px; cursor: pointer; border: 1px solid #ccc; background: white; border-radius: 8px; }
        .modes button.active { background: #007bff; color: white; border-color: #0056b3; }
        .modes button.review.active { background: #dc3545; }
        .header { display: flex; justify-content: space-between; font-size: 0.9em; color: #666; margin-bottom: 30px; }
        .word-he { font-size: 3rem; margin-bottom: 20px; direction: rtl; }
        .big { font-size: 4rem; color: #28a745; }
        .choices-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .choice { padding: 15px; border: 2px solid #eee; border-radius: 12px; background: white; cursor: pointer; font-size: 1rem; transition: 0.2s; }
        .choice:hover { background: #f8f9fa; }
        .choice.show-error { border-color: #ffc107; }
        .reset-btn { margin-top: 40px; background: none; border: none; color: #999; text-decoration: underline; cursor: pointer; font-size: 0.8rem; }
        .success-message { color: #28a745; font-weight: bold; }
      `}</style>
    </div>
  );
}