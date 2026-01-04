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
const saveDailyStats = (stats) =>
  localStorage.setItem("hebrew-daily-stats", JSON.stringify(stats));

export default function App() {
  const [words, setWords] = useState([]);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [mode, setMode] = useState("learn"); // learn | review | trash | search | settings
  const [deletedList, setDeletedList] = useState([]);
  const [copied, setCopied] = useState(false);
  const [reviewView, setReviewView] = useState("list"); // list | quiz
  const [searchQuery, setSearchQuery] = useState("");
  
  // Objectif quotidien
  const [dailyGoal, setDailyGoal] = useState(10);
  const [todayCount, setTodayCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastDate, setLastDate] = useState("");

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
    
    // Charger les stats quotidiennes
    const statsRaw = localStorage.getItem("hebrew-daily-stats");
    if (statsRaw) {
      const stats = JSON.parse(statsRaw);
      setDailyGoal(stats.goal || 10);
      setStreak(stats.streak || 0);
      setLastDate(stats.lastDate || "");
      
      const today = new Date().toDateString();
      if (stats.lastDate === today) {
        setTodayCount(stats.todayCount || 0);
      } else {
        // Nouveau jour
        setTodayCount(0);
        // Vérifier le streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (stats.lastDate === yesterday.toDateString()) {
          // On continue le streak
        } else if (stats.lastDate !== today) {
          // Streak perdu
          setStreak(0);
        }
      }
    }
  }, []);

  /* BUILD QUEUE */
  useEffect(() => {
    // Ne pas construire de queue pour trash ou review en mode liste
    if (mode === "trash") return;
    if (mode === "review" && reviewView === "list") return;
    
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
  }, [words, mode, queue.length, reviewView]);

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

      // Bonne réponse : on incrémente count, on garde wrong tel quel (sera géré après)
      const updated = wordsRef.current.map((w) =>
        w.he === current.he ? { ...w, count: w.count + 1 } : w
      );

      setWords(updated);
      saveProgress(updated);

      // Incrémenter le compteur quotidien
      const today = new Date().toDateString();
      const newTodayCount = todayCount + 1;
      let newStreak = streak;
      let newLastDate = lastDate;
      
      if (lastDate !== today) {
        // Premier mot du jour
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastDate === yesterday.toDateString()) {
          newStreak = streak + 1;
        } else {
          newStreak = 1;
        }
        newLastDate = today;
      }
      
      setTodayCount(newTodayCount);
      setStreak(newStreak);
      setLastDate(newLastDate);
      saveDailyStats({ goal: dailyGoal, todayCount: newTodayCount, streak: newStreak, lastDate: newLastDate });
    } else {
      setStatus("wrong");

      // Mauvaise réponse : on met wrong à 1 (pas +1, juste marqué)
      const updated = wordsRef.current.map((w) =>
        w.he === current.he ? { ...w, wrong: 1 } : w
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
    
    // Marquer à réviser (wrong = 1) puis passer au suivant
    const updated = wordsRef.current.map((w) =>
      w.he === current.he ? { ...w, wrong: 1 } : w
    );
    setWords(updated);
    saveProgress(updated);
    
    goToNext();
  };

  /* CONTINUE WITHOUT MARKING (clear wrong if was correct) */
  const handleContinueClean = () => {
    if (!current) return;
    
    // Bonne réponse et on continue : on efface le wrong
    const updated = wordsRef.current.map((w) =>
      w.he === current.he ? { ...w, wrong: 0 } : w
    );
    setWords(updated);
    saveProgress(updated);
    
    goToNext();
  };

  /* MARK FOR REVIEW (bouton sur la carte) */
  const [markedReview, setMarkedReview] = useState(false);
  
  const handleMarkReview = () => {
    if (!current || markedReview) return;
    
    // Marquer à réviser = wrong à 1
    const updated = wordsRef.current.map((w) =>
      w.he === current.he ? { ...w, wrong: 1 } : w
    );
    
    setWords(updated);
    saveProgress(updated);
    setMarkedReview(true);
  };

  /* REMOVE FROM REVIEW LIST */
  const handleRemoveFromReview = (hebrewWord) => {
    const updated = wordsRef.current.map((w) =>
      w.he === hebrewWord ? { ...w, wrong: 0 } : w
    );
    setWords(updated);
    saveProgress(updated);
    wordsRef.current = updated;
  };

  /* DELETE FROM LIST (any list view) */
  const handleDeleteFromList = (hebrewWord) => {
    const deleted = getDeletedWords();
    deleted.push(hebrewWord);
    saveDeletedWords(deleted);
    setDeletedList(deleted);
    
    const updated = wordsRef.current.filter((w) => w.he !== hebrewWord);
    setWords(updated);
    saveProgress(updated);
    wordsRef.current = updated;
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

  const reviewWords = words.filter((w) => w.wrong > 0);
  
  // Filtrer les mots pour la recherche
  const searchResults = searchQuery.trim() 
    ? words.filter(w => 
        w.he.includes(searchQuery) || 
        w.fr.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Liste des catégories disponibles
  const categories = [...new Set(words.map(w => w.cat || "Sans catégorie"))].sort();

  /* SEARCH VIEW */
  if (mode === "search") {
    return (
      <div className="app">
        <header className="header">
          <div className="mode-toggle">
            <button
              className="mode-btn"
              onClick={() => {
                setMode("learn");
                setSearchQuery("");
                setQueue([]);
              }}
            >
              <span className="mode-icon">←</span>
              <span className="mode-text">Retour</span>
            </button>
          </div>
        </header>

        <div className="search-view">
          <h2 className="search-title">🔍 Recherche</h2>
          
          <input
            type="text"
            className="search-input"
            placeholder="Chercher un mot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          
          {searchQuery.trim() && (
            <p className="search-count">{searchResults.length} résultat(s)</p>
          )}
          
          <div className="search-list">
            {searchResults.map((w) => (
              <div key={w.he} className="search-item">
                <div className="search-word">
                  <span className="search-he">{w.he}</span>
                  <span className="search-fr">{w.fr}</span>
                  {w.cat && <span className="search-cat">{w.cat}</span>}
                </div>
                <div className="search-item-actions">
                  <button 
                    className={`search-action-btn ${w.wrong > 0 ? "marked" : ""}`}
                    onClick={() => {
                      if (w.wrong > 0) {
                        handleRemoveFromReview(w.he);
                      } else {
                        const updated = wordsRef.current.map((word) =>
                          word.he === w.he ? { ...word, wrong: 1 } : word
                        );
                        setWords(updated);
                        saveProgress(updated);
                        wordsRef.current = updated;
                      }
                    }}
                    title={w.wrong > 0 ? "Retirer de révision" : "Marquer à réviser"}
                  >
                    {w.wrong > 0 ? "✓" : "📌"}
                  </button>
                  <button 
                    className="search-delete-btn"
                    onClick={() => handleDeleteFromList(w.he)}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* SETTINGS VIEW */
  if (mode === "settings") {
    const today = new Date().toDateString();
    const goalReached = todayCount >= dailyGoal;
    
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

        <div className="settings-view">
          <h2 className="settings-title">⚙️ Paramètres</h2>
          
          {/* Objectif quotidien */}
          <div className="settings-section">
            <h3 className="settings-subtitle">🎯 Objectif quotidien</h3>
            
            <div className="goal-display">
              <span className={`goal-today ${goalReached ? "reached" : ""}`}>
                {todayCount}/{dailyGoal}
              </span>
              <span className="goal-label">mots aujourd'hui</span>
            </div>
            
            <div className="goal-setter">
              <button 
                className="goal-btn"
                onClick={() => {
                  const newGoal = Math.max(1, dailyGoal - 5);
                  setDailyGoal(newGoal);
                  saveDailyStats({ goal: newGoal, todayCount, streak, lastDate });
                }}
              >
                -5
              </button>
              <span className="goal-value">{dailyGoal}</span>
              <button 
                className="goal-btn"
                onClick={() => {
                  const newGoal = dailyGoal + 5;
                  setDailyGoal(newGoal);
                  saveDailyStats({ goal: newGoal, todayCount, streak, lastDate });
                }}
              >
                +5
              </button>
            </div>
            
            <div className="streak-display">
              <span className="streak-icon">🔥</span>
              <span className="streak-value">{streak}</span>
              <span className="streak-label">jours de suite</span>
            </div>
          </div>
          
          {/* Catégories */}
          <div className="settings-section">
            <h3 className="settings-subtitle">📁 Catégories ({categories.length})</h3>
            <div className="categories-list">
              {categories.map(cat => {
                const count = words.filter(w => (w.cat || "Sans catégorie") === cat).length;
                return (
                  <div key={cat} className="category-item">
                    <span className="category-name">{cat}</span>
                    <span className="category-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Stats */}
          <div className="settings-section">
            <h3 className="settings-subtitle">📊 Statistiques</h3>
            <div className="stats-grid">
              <div className="stats-item">
                <span className="stats-value">{words.length}</span>
                <span className="stats-label">Total mots</span>
              </div>
              <div className="stats-item">
                <span className="stats-value">{reviewWords.length}</span>
                <span className="stats-label">À réviser</span>
              </div>
              <div className="stats-item">
                <span className="stats-value">{deletedList.length}</span>
                <span className="stats-label">Supprimés</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* REVIEW LIST VIEW */
  if (mode === "review" && reviewView === "list") {
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

        <div className="review-list-view">
          <h2 className="review-list-title">📌 À réviser ({reviewWords.length})</h2>
          
          {reviewWords.length > 0 ? (
            <>
              <button 
                className="start-quiz-btn"
                onClick={() => {
                  setReviewView("quiz");
                  setQueue([]);
                }}
              >
                ▶️ Lancer le quiz
              </button>
              
              <div className="review-list">
                {reviewWords.map((w) => (
                  <div key={w.he} className="review-item">
                    <div className="review-word">
                      <span className="review-he">{w.he}</span>
                      <span className="review-fr">{w.fr}</span>
                    </div>
                    <div className="review-item-actions">
                      <button 
                        className="remove-review-btn"
                        onClick={() => handleRemoveFromReview(w.he)}
                        title="Retirer de la liste"
                      >
                        ✓
                      </button>
                      <button 
                        className="delete-review-btn"
                        onClick={() => handleDeleteFromList(w.he)}
                        title="Supprimer définitivement"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="review-empty">
              <span className="review-empty-icon">🎉</span>
              <span className="review-empty-text">Aucun mot à réviser !</span>
            </div>
          )}
        </div>
      </div>
    );
  }

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
                setReviewView("list");
                setQueue([]);
              }}
            >
              📋 Retour à la liste
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
                setReviewView("list");
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
              setReviewView("list");
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
          <button className="reset-small-btn" onClick={() => setMode("search")} title="Rechercher">
            🔍
          </button>
          <button className="reset-small-btn" onClick={() => setMode("settings")} title="Paramètres">
            ⚙️
          </button>
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
            <button className="correct-answer" onClick={handleContinueClean}>
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
