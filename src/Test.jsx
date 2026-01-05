import { useEffect, useState, useMemo } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

export default function Test({ onBack }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("config"); // config | quiz | results

  // Filtres
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMatieres, setSelectedMatieres] = useState([]);
  const [filterProf, setFilterProf] = useState(null); // null = tous, true = prof only, false = non-prof only
  const [filterMisrad, setFilterMisrad] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]); // historique des réponses

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
      } catch (error) {
        console.error("Erreur chargement:", error);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, []);

  // Extraire les catégories et matières uniques
  const categories = useMemo(() => {
    return [...new Set(questions.map((q) => q.grande_categorie))].sort();
  }, [questions]);

  const matieres = useMemo(() => {
    const filtered = selectedCategories.length > 0
      ? questions.filter((q) => selectedCategories.includes(q.grande_categorie))
      : questions;
    return [...new Set(filtered.map((q) => q.matiere))].sort();
  }, [questions, selectedCategories]);

  // Questions filtrées
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(q.grande_categorie)) {
        return false;
      }
      if (selectedMatieres.length > 0 && !selectedMatieres.includes(q.matiere)) {
        return false;
      }
      if (filterProf !== null && q.is_prof !== filterProf) {
        return false;
      }
      if (filterMisrad !== null && q.is_misrad_haavoda !== filterMisrad) {
        return false;
      }
      return true;
    });
  }, [questions, selectedCategories, selectedMatieres, filterProf, filterMisrad]);

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
  const handleSelectAnswer = (key) => {
    if (selectedAnswer) return; // déjà répondu
    
    setSelectedAnswer(key);
    const isCorrect = key === quizQuestions[currentIndex].reponse_correcte;
    
    if (isCorrect) {
      setScore((s) => s + 1);
    }
    
    setAnswers((prev) => [...prev, {
      question: quizQuestions[currentIndex],
      selected: key,
      correct: isCorrect,
    }]);
    
    setShowExplanation(true);
  };

  // Passer à la question suivante
  const nextQuestion = () => {
    if (currentIndex + 1 >= quizQuestions.length) {
      setMode("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  // Toggle catégorie
  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setSelectedMatieres([]); // reset matières quand on change de catégorie
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

  /* RESULTS */
  if (mode === "results") {
    const percentage = Math.round((score / quizQuestions.length) * 100);
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

          <div className="results-actions">
            <button className="test-btn primary" onClick={() => setMode("config")}>
              🔄 Nouveau quiz
            </button>
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
        {/* Progress */}
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

        {/* Question */}
        <div className="quiz-question">
          <div className="quiz-meta">
            <span className="quiz-category">{current.grande_categorie}</span>
            <span className="quiz-matiere">{current.matiere}</span>
          </div>
          <p className="quiz-question-text" dir="rtl">{current.question}</p>
        </div>

        {/* Options */}
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

        {/* Explication */}
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
      </header>

      <div className="test-config">
        {/* Catégories */}
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
                ✓ Prof
              </button>
              <button
                className={`config-toggle ${filterProf === false ? "active" : ""}`}
                onClick={() => setFilterProf(false)}
              >
                ✗ Non-Prof
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
                ✓ Officiel
              </button>
              <button
                className={`config-toggle ${filterMisrad === false ? "active" : ""}`}
                onClick={() => setFilterMisrad(false)}
              >
                ✗ Non-Officiel
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
                onClick={() => setQuestionCount((c) => Math.min(filteredQuestions.length, c + 5))}
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

