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
  const [mode, setMode] = useState("learn"); // learn | review | trash
  const [deletedList, setDeletedList] = useState([]);
  const [copied, setCopied] = useState(false);

  const wordsRef = useRef([]);
  wordsRef.current = words;

  /* INIT - Détecte les nouveaux mots ajoutés au JSON */
  useEffect(() => {
    const saved = localStorage.getItem("hebrew-progress");
    const deleted = getDeletedWords();
    setDeletedList(deleted);
    
    let loadedWords;
    
    if (saved) {
      const savedWords = JSON.parse(saved);
      const savedHebrewSet = new Set(savedWords.map(w => w.he));
      const newWords = rawWords.filter(w => !savedHebrewSet.has(w.he));
      loadedWords = [...savedWords, ...newWords];
      
      if (newWords.length > 0) {
        saveProgress(loadedWords);
      }
    } else {
      loadedWords = rawWords;
    }
    
    loadedWords = loadedWords.filter((w) => !deleted.includes(w.he));
    
    setWords(loadedWords);
    wordsRef.current = loadedWords;
  }, []);

  /* BUILD QUEUE */
  useEffect(() => {
    if (words.length > 0 && queue.length === 0 && mode !== "trash") {
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

  /* GO TO NEXT WORD */
  const goToNext = () => {
    const nextQueue = queue.slice(1);
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setStatus("idle");
    setMarkedReview(false);
  };

  /* DELETE WORD */
  const handleDelete = () => {
    if (!current) return;
    
    const deleted = getDeletedWords();
    deleted.push(current.he);
    saveDeletedWords(deleted);
    setDeletedList(deleted);
    
    const updated = wordsRef.current.filter((w) => w.he !== current.he);
    setWords(updated);
    saveProgress(updated);
    
    goToNext();
  };

  /* RESTORE WORD FROM TRASH */
  const handleRestore = (hebrewWord) => {
    const deleted = getDeletedWords();
    const newDeleted = deleted.filter(w => w !== hebrewWord);
    saveDeletedWords(newDeleted);
    setDeletedList(newDeleted);
    
    // Retrouver le mot original dans rawWords
    const originalWord = rawWords.find(w => w.he === hebrewWord);
    if (originalWord) {
      const restoredWord = { ...originalWord, count: 0, wrong: 0 };
      const updated = [...wordsRef.current, restoredWord];
      setWords(updated);
      saveProgress(updated);
    }
  };

  /* COPY DELETED LIST */
  const handleCopyList = () => {
    const text = deletedList.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* RESTORE ALL FROM TRASH */
  const handleRestoreAll = () => {
    if (!window.confirm(`Restaurer les ${deletedList.length} mots ?`)) {
      return;
    }
    
    // Retrouver tous les mots originaux
    const restoredWords = deletedList
      .map(he => rawWords.find(w => w.he === he))
      .filter(Boolean)
      .map(w => ({ ...w, count: 0, wrong: 0 }));
    
    const updated = [...wordsRef.current, ...restoredWords];
    setWords(updated);
    saveProgress(updated);
    
    // Vider la corbeille
    saveDeletedWords([]);
    setDeletedList([]);
  };

  /* MARK FOR REVIEW AND CONTINUE */
  const handleMarkAndContinue = () => {
    if (!current) return;
    
    if (!markedReview) {
      const updated = wordsRef.current.map((w) =>
        w.he === current.he ? { ...w, wrong: w.wrong + 1 } : w
      );
      setWords(updated);
      saveProgress(updated);
    }
    
    goToNext();
  };

  /* MARK FOR REVIEW */
  const [markedReview, setMarkedReview] = useState(false);
  
  const handleMarkReview = () => {
    if (!current || markedReview) return;
    
    const updated = wordsRef.current.map((w) =>
      w.he === current.he ? { ...w, wrong: w.wrong + 1 } : w
    );
    
    setWords(updated);
    saveProgress(updated);
    setMarkedReview(true);
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
    setDeletedList([]);
    setQueue([]);
    setMode("learn");
    setStatus("idle");
  };

  const reviewCount = words.filter((w) => w.wrong > 0).length;

  /* TRASH VIEW */
  if (mode === "trash") {
    return (
      <div className="app">
        <header className="header">
          <div className="mode-toggle">
            <button
              className="mode-btn"
              onClick={() => {
                setMode("learn");
                setQueue([]);
              }}
            >
              <span className="mode-icon">←</span>
              <span className="mode-text">Retour</span>
            </button>
          </div>
        </header>

        <div className="trash-view">
          <h2 className="trash-title">🗑️ Corbeille ({deletedList.length})</h2>
          
          {deletedList.length > 0 ? (
            <>
              <div className="trash-actions">
                <button 
                  className={`trash-action-btn copy-btn ${copied ? "copied" : ""}`} 
                  onClick={handleCopyList}
                >
                  {copied ? "✓ Copié !" : "📋 Copier"}
                </button>
                <button 
                  className="trash-action-btn restore-all-btn"
                  onClick={handleRestoreAll}
                >
                  ↩️ Tout restaurer
                </button>
              </div>
              
              <div className="trash-list">
                {deletedList.map((he) => {
                  const original = rawWords.find(w => w.he === he);
                  return (
                    <div key={he} className="trash-item">
                      <div className="trash-word">
                        <span className="trash-he">{he}</span>
                        <span className="trash-fr">{original?.fr || "?"}</span>
                      </div>
                      <button 
                        className="restore-btn"
                        onClick={() => handleRestore(he)}
                      >
                        ↩️
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="trash-empty">La corbeille est vide</p>
          )}
        </div>
      </div>
    );
  }

  /* EMPTY STATE */
  if (!current) {
    return (
      <div className="app">
        <div className="empty-state">
          <span className="empty-icon">{mode === "review" ? "✅" : "🎉"}</span>
          <span className="empty-text">
            {mode === "review" ? "Révisions terminées !" : "Niveau terminé !"}
          </span>
          
          {mode === "review" ? (
            <button 
              className="reset-btn"
              onClick={() => {
                setMode("learn");
                setQueue([]);
              }}
            >
              📚 Continuer à apprendre
            </button>
          ) : (
            <button 
              className="reset-btn"
              onClick={() => setQueue([])}
            >
              ▶️ Niveau suivant
            </button>
          )}
          
          {reviewCount > 0 && mode !== "review" && (
            <button 
              className="reset-btn review-reset-btn"
              onClick={() => {
                setMode("review");
                setQueue([]);
              }}
            >
              🔄 Réviser ({reviewCount})
            </button>
          )}

          {deletedList.length > 0 && (
            <button 
              className="reset-btn trash-reset-btn"
              onClick={() => setMode("trash")}
            >
              🗑️ Corbeille ({deletedList.length})
            </button>
          )}
        </div>
      </div>
    );
  }

  const minCount = Math.min(...words.map((w) => w.count));
  const doneCount = words.filter((w) => w.count > minCount).length;
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

          <button
            className="mode-btn trash-btn"
            onClick={() => setMode("trash")}
          >
            <span className="mode-icon">🗑️</span>
            {deletedList.length > 0 && <span className="badge">{deletedList.length}</span>}
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
            <button 
              className={`action-btn review-action ${markedReview ? "marked" : ""}`} 
              onClick={handleMarkReview} 
              title="À réviser"
              disabled={markedReview}
            >
              {markedReview ? "✓" : "📌"}
            </button>
            <button className="action-btn delete-action" onClick={handleDelete} title="Supprimer">
              🗑️
            </button>
          </div>
          <span className="hebrew">{current.he}</span>
        </div>
      </main>

      {/* CHOICES or POPUP */}
      <footer className="choices">
        {status === "correct" ? (
          <>
            <button className="correct-answer" onClick={goToNext}>
              <span className="correct-icon">✓</span>
              <span className="correct-text">{current.fr}</span>
              <span className="tap-hint">Tap pour continuer</span>
            </button>
            <div className="popup-actions">
              <button className="popup-btn review-btn" onClick={handleMarkAndContinue}>
                📌 À réviser
              </button>
              <button className="popup-btn delete-btn" onClick={handleDelete}>
                🗑️ Supprimer
              </button>
            </div>
          </>
        ) : (
          choices.map((c, i) => (
          <button
              key={`${current.he}-${c.fr}-${i}`}
              className="choice-btn"
            onClick={() => handleClick(c)}
          >
            {c.fr}
          </button>
          ))
        )}
      </footer>
    </div>
  );
}
