import { useEffect, useState, useMemo, useRef } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore";

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

export default function Test({ onBack }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("config"); // config | quiz | results | review

  // Filtres
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMatieres, setSelectedMatieres] = useState([]);
  const [filterProf, setFilterProf] = useState(null);
  const [filterMisrad, setFilterMisrad] = useState(null);
  const [filterWrong, setFilterWrong] = useState(false); // Filtre questions ratées
  const [questionCount, setQuestionCount] = useState(10);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);

  const questionsRef = useRef([]);
  questionsRef.current = questions;

  /* LOAD QUESTIONS FROM FIREBASE */
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const snapshot = await getDocs(collection(db, "questions"));
        const loadedQuestions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setQuestions(loadedQuestions);
        questionsRef.current = loadedQuestions;
      } catch (error) {
        console.error("Erreur chargement:", error);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, []);

  // Catégories et matières uniques
  const categories = useMemo(() => {
    const base = filterWrong ? questions.filter((q) => q.wrong) : questions;
    return [...new Set(base.map((q) => q.grande_categorie))].sort();
  }, [questions, filterWrong]);

  const matieres = useMemo(() => {
    let base = filterWrong ? questions.filter((q) => q.wrong) : questions;
    if (selectedCategories.length > 0) {
      base = base.filter((q) => selectedCategories.includes(q.grande_categorie));
    }
    return [...new Set(base.map((q) => q.matiere))].sort();
  }, [questions, selectedCategories, filterWrong]);

  // Questions filtrées
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filterWrong && !q.wrong) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(q.grande_categorie)) return false;
      if (selectedMatieres.length > 0 && !selectedMatieres.includes(q.matiere)) return false;
      if (filterProf !== null && q.is_prof !== filterProf) return false;
      if (filterMisrad !== null && q.is_misrad_haavoda !== filterMisrad) return false;
      return true;
    });
  }, [questions, selectedCategories, selectedMatieres, filterProf, filterMisrad, filterWrong]);

  // Questions à réviser
  const wrongQuestions = useMemo(() => {
    return questions.filter((q) => q.wrong);
  }, [questions]);

  // Démarrer le quiz
  const startQuiz = () => {
    let selected = [...filteredQuestions];
    if (shuffleQuestions) {
      selected = shuffle(selected);
    }
    selected = selected.slice(0, Math.min(questionCount, selected.length));

    setQuizQuestions(selected);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnswers([]);
    setMode("quiz");
  };

  // Sélectionner une réponse
  const handleSelectAnswer = async (key) => {
    if (selectedAnswer) return;

    setSelectedAnswer(key);
    const current = quizQuestions[currentIndex];
    const isCorrect = key === current.reponse_correcte;

    if (isCorrect) {
      setScore((s) => s + 1);
      // Si c'était une question "wrong" et qu'on répond bien, on la retire
      if (current.wrong) {
        await updateDoc(doc(db, "questions", current.id), { wrong: false });
        const updated = questionsRef.current.map((q) =>
          q.id === current.id ? { ...q, wrong: false } : q
        );
        setQuestions(updated);
        questionsRef.current = updated;
      }
    } else {
      // Marquer comme à réviser
      if (!current.wrong) {
        await updateDoc(doc(db, "questions", current.id), { wrong: true });
        const updated = questionsRef.current.map((q) =>
          q.id === current.id ? { ...q, wrong: true } : q
        );
        setQuestions(updated);
        questionsRef.current = updated;
      }
    }

    setAnswers((prev) => [...prev, { question: current, selected: key, correct: isCorrect }]);
    setShowExplanation(true);
  };

  // Question suivante
  const nextQuestion = () => {
    if (currentIndex + 1 >= quizQuestions.length) {
      setMode("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  // Retirer de la liste de révision
  const handleRemoveFromReview = async (questionId) => {
    await updateDoc(doc(db, "questions", questionId), { wrong: false });
    const updated = questionsRef.current.map((q) =>
      q.id === questionId ? { ...q, wrong: false } : q
    );
    setQuestions(updated);
    questionsRef.current = updated;
  };

  // Reset toutes les révisions
  const handleResetAllWrong = async () => {
    if (!confirm("Remettre toutes les questions à zéro ?")) return;

    const toReset = questionsRef.current.filter((q) => q.wrong);
    if (toReset.length === 0) return;

    const batch = writeBatch(db);
    toReset.forEach((q) => {
      batch.update(doc(db, "questions", q.id), { wrong: false });
    });
    await batch.commit();

    const updated = questionsRef.current.map((q) => ({ ...q, wrong: false }));
    setQuestions(updated);
    questionsRef.current = updated;
  };

  // Toggle catégorie
  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setSelectedMatieres([]);
  };

  // Toggle matière
  const toggleMatiere = (mat) => {
    setSelectedMatieres((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
    );
  };

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

  /* NO QUESTIONS */
  if (questions.length === 0) {
    return (
      <div className="app">
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <span className="empty-text">Aucune question disponible</span>
          <button className="reset-btn" onClick={onBack}>
            🏠 Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  /* REVIEW LIST */
  if (mode === "review") {
    // Filtrer les questions à réviser selon les filtres actuels
    const reviewFiltered = wrongQuestions.filter((q) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(q.grande_categorie)) return false;
      if (selectedMatieres.length > 0 && !selectedMatieres.includes(q.matiere)) return false;
      return true;
    });

    return (
      <div className="app test-app">
        <header className="test-header">
          <button className="mode-btn" onClick={() => setMode("config")}>
            <span className="mode-icon">←</span>
            <span className="mode-text">Retour</span>
          </button>
          <h1 className="test-title">📌 À réviser ({wrongQuestions.length})</h1>
        </header>

        {/* Filtres rapides */}
        {categories.length > 1 && (
          <div className="review-filters">
            <div className="config-chips">
              {[...new Set(wrongQuestions.map((q) => q.grande_categorie))].sort().map((cat) => (
                <button
                  key={cat}
                  className={`config-chip small ${selectedCategories.includes(cat) ? "active" : ""}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="review-list-container">
          {reviewFiltered.length > 0 ? (
            <>
              <button
                className="start-quiz-btn"
                onClick={() => {
                  setFilterWrong(true);
                  startQuiz();
                }}
              >
                ▶️ Quiz révision ({reviewFiltered.length})
              </button>

              <div className="review-questions-list">
                {reviewFiltered.map((q) => (
                  <div key={q.id} className="review-question-item">
                    <div className="review-question-content">
                      <div className="review-question-meta">
                        <span className="quiz-category small">{q.grande_categorie}</span>
                        <span className="quiz-matiere small">{q.matiere}</span>
                      </div>
                      <p className="review-question-text" dir="rtl">
                        {q.question.length > 80 ? q.question.substring(0, 80) + "..." : q.question}
                      </p>
                    </div>
                    <button
                      className="remove-review-btn"
                      onClick={() => handleRemoveFromReview(q.id)}
                      title="Retirer de la liste"
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>

              <button className="reset-all-review-btn" onClick={handleResetAllWrong}>
                🗑️ Tout effacer
              </button>
            </>
          ) : (
            <div className="review-empty">
              <span className="review-empty-icon">🎉</span>
              <span className="review-empty-text">Aucune question à réviser !</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* RESULTS */
  if (mode === "results") {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    const wrongCount = answers.filter((a) => !a.correct).length;

    return (
      <div className="app test-app">
        <div className="test-results">
          <div className="results-header">
            <span className="results-icon">
              {percentage >= 80 ? "🏆" : percentage >= 50 ? "👍" : "📚"}
            </span>
            <h2 className="results-title">Résultats</h2>
          </div>

          <div className="results-score">
            <span className="score-value">{score}/{quizQuestions.length}</span>
            <span className="score-percent">{percentage}%</span>
          </div>

          <div className="results-summary">
            {answers.map((a, i) => (
              <div key={i} className={`result-item ${a.correct ? "correct" : "wrong"}`}>
                <span className="result-num">{i + 1}</span>
                <span className="result-status">{a.correct ? "✓" : "✗"}</span>
              </div>
            ))}
          </div>

          {wrongCount > 0 && (
            <p className="results-wrong-info">
              📌 {wrongCount} question(s) ajoutée(s) à réviser
            </p>
          )}

          <div className="results-actions">
            <button className="test-btn primary" onClick={() => setMode("config")}>
              🔄 Nouveau quiz
            </button>
            {wrongQuestions.length > 0 && (
              <button className="test-btn review" onClick={() => setMode("review")}>
                📌 Réviser ({wrongQuestions.length})
              </button>
            )}
            <button className="test-btn secondary" onClick={onBack}>
              🏠 Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* QUIZ */
  if (mode === "quiz") {
    const current = quizQuestions[currentIndex];
    const options = Object.entries(current.options);

    return (
      <div className="app test-app">
        <div className="quiz-header">
          <button className="quiz-back-btn" onClick={() => setMode("config")}>
            ✕
          </button>
          <div className="quiz-progress">
            <span className="quiz-progress-text">
              {currentIndex + 1} / {quizQuestions.length}
            </span>
            <div className="quiz-progress-bar">
              <div
                className="quiz-progress-fill"
                style={{ width: `${((currentIndex + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="quiz-score">
            <span className="quiz-score-value">{score}</span>
            <span className="quiz-score-icon">⭐</span>
          </div>
        </div>

        <div className="quiz-question">
          <div className="quiz-meta">
            <span className="quiz-category">{current.grande_categorie}</span>
            <span className="quiz-matiere">{current.matiere}</span>
            {current.wrong && <span className="quiz-wrong-badge">📌</span>}
          </div>
          <p className="quiz-question-text" dir="rtl">{current.question}</p>
        </div>

        <div className="quiz-options">
          {options.map(([key, value]) => {
            let className = "quiz-option";
            if (selectedAnswer) {
              if (key === current.reponse_correcte) {
                className += " correct";
              } else if (key === selectedAnswer) {
                className += " wrong";
              }
            }

            return (
              <button
                key={key}
                className={className}
                onClick={() => handleSelectAnswer(key)}
                disabled={!!selectedAnswer}
              >
                <span className="option-key">{key}</span>
                <span className="option-text" dir="rtl">{value}</span>
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className="quiz-explanation">
            <p className="explanation-text" dir="rtl">{current.explication}</p>
            <button className="quiz-next-btn" onClick={nextQuestion}>
              {currentIndex + 1 >= quizQuestions.length ? "Voir les résultats" : "Question suivante"} →
            </button>
          </div>
        )}
      </div>
    );
  }

  /* CONFIG */
  return (
    <div className="app test-app">
      <header className="test-header">
        <button className="mode-btn" onClick={onBack}>
          <span className="mode-icon">←</span>
          <span className="mode-text">Accueil</span>
        </button>
        <h1 className="test-title">📝 Test</h1>
        {wrongQuestions.length > 0 && (
          <button className="review-badge-btn" onClick={() => setMode("review")}>
            📌 {wrongQuestions.length}
          </button>
        )}
      </header>

      <div className="test-config">
        {/* Mode: Toutes / À réviser */}
        <div className="config-section">
          <div className="config-mode-toggle">
            <button
              className={`config-mode-btn ${!filterWrong ? "active" : ""}`}
              onClick={() => {
                setFilterWrong(false);
                setSelectedCategories([]);
                setSelectedMatieres([]);
              }}
            >
              📚 Toutes ({questions.length})
            </button>
            <button
              className={`config-mode-btn review ${filterWrong ? "active" : ""}`}
              onClick={() => {
                setFilterWrong(true);
                setSelectedCategories([]);
                setSelectedMatieres([]);
              }}
              disabled={wrongQuestions.length === 0}
            >
              📌 À réviser ({wrongQuestions.length})
            </button>
          </div>
        </div>

        {/* Catégories */}
        {categories.length > 0 && (
          <div className="config-section">
            <h3 className="config-title">📁 Catégories</h3>
            <div className="config-chips">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`config-chip ${selectedCategories.includes(cat) ? "active" : ""}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Matières */}
        {matieres.length > 0 && (
          <div className="config-section">
            <h3 className="config-title">📚 Matières</h3>
            <div className="config-chips">
              {matieres.map((mat) => (
                <button
                  key={mat}
                  className={`config-chip ${selectedMatieres.includes(mat) ? "active" : ""}`}
                  onClick={() => toggleMatiere(mat)}
                >
                  {mat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="config-section">
          <h3 className="config-title">🎯 Filtres</h3>

          <div className="config-row">
            <span className="config-label">Prof :</span>
            <div className="config-toggle-group">
              <button
                className={`config-toggle ${filterProf === null ? "active" : ""}`}
                onClick={() => setFilterProf(null)}
              >
                Tous
              </button>
              <button
                className={`config-toggle ${filterProf === true ? "active" : ""}`}
                onClick={() => setFilterProf(true)}
              >
                ✓
              </button>
              <button
                className={`config-toggle ${filterProf === false ? "active" : ""}`}
                onClick={() => setFilterProf(false)}
              >
                ✗
              </button>
            </div>
          </div>

          <div className="config-row">
            <span className="config-label">Misrad :</span>
            <div className="config-toggle-group">
              <button
                className={`config-toggle ${filterMisrad === null ? "active" : ""}`}
                onClick={() => setFilterMisrad(null)}
              >
                Tous
              </button>
              <button
                className={`config-toggle ${filterMisrad === true ? "active" : ""}`}
                onClick={() => setFilterMisrad(true)}
              >
                ✓
              </button>
              <button
                className={`config-toggle ${filterMisrad === false ? "active" : ""}`}
                onClick={() => setFilterMisrad(false)}
              >
                ✗
              </button>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="config-section">
          <h3 className="config-title">⚙️ Options</h3>

          <div className="config-row">
            <span className="config-label">Questions :</span>
            <div className="config-number">
              <button
                className="config-num-btn"
                onClick={() => setQuestionCount((c) => Math.max(5, c - 5))}
              >
                −
              </button>
              <span className="config-num-value">{questionCount}</span>
              <button
                className="config-num-btn"
                onClick={() => setQuestionCount((c) => Math.min(filteredQuestions.length || 100, c + 5))}
              >
                +
              </button>
            </div>
          </div>

          <div className="config-row">
            <span className="config-label">Mélanger :</span>
            <button
              className={`config-toggle-single ${shuffleQuestions ? "active" : ""}`}
              onClick={() => setShuffleQuestions((s) => !s)}
            >
              {shuffleQuestions ? "✓ Oui" : "✗ Non"}
            </button>
          </div>
        </div>

        {/* Start */}
        <div className="config-start">
          <p className="config-count">
            {filteredQuestions.length} question(s) disponible(s)
          </p>
          <button
            className="start-quiz-btn"
            onClick={startQuiz}
            disabled={filteredQuestions.length === 0}
          >
            ▶️ Commencer le quiz
          </button>
        </div>
      </div>
    </div>
  );
}
