import { useEffect, useState, useRef } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import "./App.css";

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

export default function App() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | wrong | correct
  const [mode, setMode] = useState("learn"); // learn | review | search | add
  const [reviewView, setReviewView] = useState("list"); // list | quiz
  const [searchQuery, setSearchQuery] = useState("");

  // Pour ajouter un mot
  const [newHe, setNewHe] = useState("");
  const [newFr, setNewFr] = useState("");

  const wordsRef = useRef([]);
  wordsRef.current = words;

  /* LOAD WORDS FROM FIREBASE */
  useEffect(() => {
    const loadWords = async () => {
      try {
        const snapshot = await getDocs(collection(db, "words"));
        const loadedWords = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setWords(loadedWords);
        wordsRef.current = loadedWords;
      } catch (error) {
        console.error("Erreur chargement:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWords();
  }, []);

  /* BUILD QUEUE */
  useEffect(() => {
    if (mode === "review" && reviewView === "list") return;
    if (mode === "search" || mode === "add") return;

    if (words.length > 0 && queue.length === 0) {
      const base = mode === "review" ? words.filter((w) => w.wrong) : words;

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
    const others = wordsRef.current.filter((w) => w.id !== current.id);
    const newChoices = shuffle([current, ...shuffle(others).slice(0, 3)]);
    setChoices(newChoices);
  }, [current]);

  /* CLICK */
  const handleClick = (choice) => {
    if (status !== "idle") return;

    if (choice.fr === current.fr) {
      setStatus("correct");
    } else {
      setStatus("wrong");

      // Marquer comme à réviser dans Firebase
      updateDoc(doc(db, "words", current.id), { wrong: true });

      const updated = wordsRef.current.map((w) =>
        w.id === current.id ? { ...w, wrong: true } : w
      );
      setWords(updated);

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

  /* DELETE WORD - vraiment supprimer de Firebase */
  const handleDelete = async () => {
    if (!current) return;

    await deleteDoc(doc(db, "words", current.id));

    const updated = wordsRef.current.filter((w) => w.id !== current.id);
    setWords(updated);

    goToNext();
  };

  /* DELETE FROM LIST */
  const handleDeleteFromList = async (wordId) => {
    await deleteDoc(doc(db, "words", wordId));

    const updated = wordsRef.current.filter((w) => w.id !== wordId);
    setWords(updated);
    wordsRef.current = updated;
  };

  /* MARK FOR REVIEW AND CONTINUE */
  const handleMarkAndContinue = async () => {
    if (!current) return;

    await updateDoc(doc(db, "words", current.id), { wrong: true });

    const updated = wordsRef.current.map((w) =>
      w.id === current.id ? { ...w, wrong: true } : w
    );
    setWords(updated);

    goToNext();
  };

  /* CONTINUE WITHOUT MARKING (clear wrong) */
  const handleContinueClean = async () => {
    if (!current) return;

    if (current.wrong) {
      await updateDoc(doc(db, "words", current.id), { wrong: false });

      const updated = wordsRef.current.map((w) =>
        w.id === current.id ? { ...w, wrong: false } : w
      );
      setWords(updated);
    }

    goToNext();
  };

  /* MARK FOR REVIEW (bouton sur la carte) */
  const [markedReview, setMarkedReview] = useState(false);

  const handleMarkReview = async () => {
    if (!current || markedReview) return;

    await updateDoc(doc(db, "words", current.id), { wrong: true });

    const updated = wordsRef.current.map((w) =>
      w.id === current.id ? { ...w, wrong: true } : w
    );

    setWords(updated);
    setMarkedReview(true);
  };

  /* REMOVE FROM REVIEW LIST */
  const handleRemoveFromReview = async (wordId) => {
    await updateDoc(doc(db, "words", wordId), { wrong: false });

    const updated = wordsRef.current.map((w) =>
      w.id === wordId ? { ...w, wrong: false } : w
    );
    setWords(updated);
    wordsRef.current = updated;
  };

  /* ADD NEW WORD */
  const handleAddWord = async () => {
    if (!newHe.trim() || !newFr.trim()) return;

    const newWord = {
      he: newHe.trim(),
      fr: newFr.trim(),
      wrong: false,
    };

    const docRef = await addDoc(collection(db, "words"), newWord);

    const wordWithId = { ...newWord, id: docRef.id };
    setWords([...words, wordWithId]);
    wordsRef.current = [...wordsRef.current, wordWithId];

    setNewHe("");
    setNewFr("");
  };

  const reviewCount = words.filter((w) => w.wrong).length;
  const reviewWords = words.filter((w) => w.wrong);

  const searchResults = searchQuery.trim()
    ? words.filter(
        (w) =>
          w.he.includes(searchQuery) ||
          w.fr.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  /* LOADING STATE */
  if (loading) {
    return (
      <div className="app">
        <div className="empty-state">
          <span className="empty-icon">⏳</span>
          <span className="empty-text">Chargement...</span>
        </div>
      </div>
    );
  }

  /* ADD WORD VIEW */
  if (mode === "add") {
    return (
      <div className="app">
        <header className="header">
          <div className="mode-toggle">
            <button className="mode-btn" onClick={() => setMode("learn")}>
              <span className="mode-icon">←</span>
              <span className="mode-text">Retour</span>
            </button>
          </div>
        </header>

        <div className="add-view">
          <h2 className="add-title">➕ Ajouter un mot</h2>

          <input
            type="text"
            className="add-input"
            placeholder="Mot en hébreu"
            value={newHe}
            onChange={(e) => setNewHe(e.target.value)}
            dir="rtl"
          />

          <input
            type="text"
            className="add-input"
            placeholder="Traduction en français"
            value={newFr}
            onChange={(e) => setNewFr(e.target.value)}
          />

          <button
            className="add-btn"
            onClick={handleAddWord}
            disabled={!newHe.trim() || !newFr.trim()}
          >
            ✓ Ajouter
          </button>
        </div>
      </div>
    );
  }

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
              <div key={w.id} className="search-item">
                <div className="search-word">
                  <span className="search-he">{w.he}</span>
                  <span className="search-fr">{w.fr}</span>
                </div>
                <div className="search-item-actions">
                  <button
                    className={`search-action-btn ${w.wrong ? "marked" : ""}`}
                    onClick={async () => {
                      if (w.wrong) {
                        await handleRemoveFromReview(w.id);
                      } else {
                        await updateDoc(doc(db, "words", w.id), {
                          wrong: true,
                        });
                        const updated = wordsRef.current.map((word) =>
                          word.id === w.id ? { ...word, wrong: true } : word
                        );
                        setWords(updated);
                        wordsRef.current = updated;
                      }
                    }}
                    title={
                      w.wrong ? "Retirer de révision" : "Marquer à réviser"
                    }
                  >
                    {w.wrong ? "✓" : "📌"}
                  </button>
                  <button
                    className="search-delete-btn"
                    onClick={() => handleDeleteFromList(w.id)}
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
          <h2 className="review-list-title">
            📌 À réviser ({reviewWords.length})
          </h2>

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
                  <div key={w.id} className="review-item">
                    <div className="review-word">
                      <span className="review-he">{w.he}</span>
                      <span className="review-fr">{w.fr}</span>
                    </div>
                    <div className="review-item-actions">
                      <button
                        className="remove-review-btn"
                        onClick={() => handleRemoveFromReview(w.id)}
                        title="Retirer de la liste"
                      >
                        ✓
                      </button>
                      <button
                        className="delete-review-btn"
                        onClick={() => handleDeleteFromList(w.id)}
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

  /* EMPTY STATE */
  if (!current) {
    return (
      <div className="app">
        <div className="empty-state">
          <span className="empty-icon">{mode === "review" ? "✅" : "🎉"}</span>
          <span className="empty-text">
            {mode === "review" ? "Révisions terminées !" : "Aucun mot !"}
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
            <button className="reset-btn" onClick={() => setMode("add")}>
              ➕ Ajouter des mots
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
        </div>
      </div>
    );
  }

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
            className="mode-btn add-mode-btn"
            onClick={() => setMode("add")}
          >
            <span className="mode-icon">➕</span>
          </button>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat-value">{words.length}</span>
            <span className="stat-label">Mots</span>
          </div>
          <div className="stat">
            <span className="stat-value">{reviewCount}</span>
            <span className="stat-label">À réviser</span>
          </div>
        </div>

        <div className="progress-row">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${
                  words.length > 0
                    ? ((words.length - reviewCount) / words.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <span className="progress-count">
            {words.length - reviewCount}/{words.length}
          </span>
          <button
            className="reset-small-btn"
            onClick={() => setMode("search")}
            title="Rechercher"
          >
            🔍
          </button>
        </div>
      </header>

      {/* WORD CARD */}
      <main className="card-area">
        <div className="word-card">
          <div className="card-actions">
            <button
              className={`action-btn review-action ${
                markedReview ? "marked" : ""
              }`}
              onClick={handleMarkReview}
              title="À réviser"
              disabled={markedReview}
            >
              {markedReview ? "✓" : "📌"}
            </button>
            <button
              className="action-btn delete-action"
              onClick={handleDelete}
              title="Supprimer"
            >
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
              <button
                className="popup-btn review-btn"
                onClick={handleMarkAndContinue}
              >
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
              key={`${current.id}-${c.fr}-${i}`}
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
