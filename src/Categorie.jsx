import { useState, useMemo, useEffect } from "react";
import actifsData from "./data/actifs.json";

// Structure pour les différents jeux de données
const DATASETS = {
  actifs: {
    name: "Actifs",
    icon: "🧴",
    data: actifsData,
    itemLabel: "actif",
    categoryLabel: "fonction",
  },
  // Ajouter d'autres datasets ici plus tard:
  // peaux: {
  //   name: "Types de peau",
  //   icon: "🧑",
  //   data: peauxData,
  //   itemLabel: "caractéristique",
  //   categoryLabel: "type de peau",
  // },
};

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

export default function Categorie({ onBack }) {
  // Sélection du dataset et mode
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [mode, setMode] = useState(null);

  // État du quiz
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [quizItems, setQuizItems] = useState([]);

  // Options mélangées pour la question courante
  const [shuffledOptions, setShuffledOptions] = useState([]);

  // Préparer les données du dataset sélectionné
  const dataset = selectedDataset ? DATASETS[selectedDataset] : null;

  // Extraire catégories et items
  const { categories, allItems, itemToCategories } = useMemo(() => {
    if (!dataset) return { categories: [], allItems: [], itemToCategories: {} };

    const data = dataset.data;
    const cats = Object.keys(data);

    const mapping = {};
    const items = new Set();

    cats.forEach((cat) => {
      data[cat].forEach((item) => {
        items.add(item);
        if (!mapping[item]) mapping[item] = [];
        mapping[item].push(cat);
      });
    });

    return {
      categories: cats,
      allItems: [...items],
      itemToCategories: mapping,
    };
  }, [dataset]);

  // Mélanger les options quand on change de question
  useEffect(() => {
    if (mode === "mode1" && categories.length > 0) {
      setShuffledOptions(shuffle(categories));
    } else if (mode === "mode2" && allItems.length > 0) {
      setShuffledOptions(shuffle(allItems));
    }
  }, [mode, currentIndex, categories, allItems]);

  // Démarrer le quiz
  const startQuiz = (selectedMode) => {
    setMode(selectedMode);
    setCurrentIndex(0);
    setScore(0);
    setShowResult(false);
    setShowAnswer(false);
    setSelectedAnswers([]);

    if (selectedMode === "mode1") {
      setQuizItems(shuffle(allItems));
      setShuffledOptions(shuffle(categories));
    } else {
      setQuizItems(shuffle(categories));
      setShuffledOptions(shuffle(allItems));
    }
  };

  // Réinitialiser
  const reset = () => {
    setMode(null);
    setCurrentIndex(0);
    setScore(0);
    setShowResult(false);
    setShowAnswer(false);
    setSelectedAnswers([]);
    setQuizItems([]);
    setShuffledOptions([]);
  };

  // Retour au choix de dataset
  const backToDatasets = () => {
    setSelectedDataset(null);
    reset();
  };

  /* ========== MODE 1: Item → Catégorie ========== */
  const handleMode1Answer = (category) => {
    if (showResult) return;

    const currentItem = quizItems[currentIndex];
    const correctCategories = itemToCategories[currentItem] || [];
    const isCorrect = correctCategories.includes(category);

    setSelectedAnswers([category]);
    setShowResult(true);

    if (isCorrect) {
      setScore((s) => s + 1);
    }
  };

  const nextMode1 = () => {
    if (currentIndex + 1 >= quizItems.length) {
      setCurrentIndex((i) => i + 1); // Aller aux résultats
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswers([]);
    setShowResult(false);
    setShowAnswer(false);
  };

  /* ========== MODE 2: Catégorie → Items ========== */
  const toggleMode2Answer = (item) => {
    if (showResult || showAnswer) return;

    setSelectedAnswers((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const validateMode2 = () => {
    const currentCategory = quizItems[currentIndex];
    const correctItems = dataset.data[currentCategory] || [];

    const selectedSet = new Set(selectedAnswers);
    const correctSet = new Set(correctItems);

    const allCorrectSelected = correctItems.every((item) =>
      selectedSet.has(item),
    );
    const noWrongSelected = selectedAnswers.every((item) =>
      correctSet.has(item),
    );

    if (allCorrectSelected && noWrongSelected) {
      setScore((s) => s + 1);
    }

    setShowResult(true);
  };

  const nextMode2 = () => {
    if (currentIndex + 1 >= quizItems.length) {
      setCurrentIndex((i) => i + 1); // Aller aux résultats
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswers([]);
    setShowResult(false);
    setShowAnswer(false);
  };

  const revealAnswer = () => {
    setShowAnswer(true);
  };

  /* ========== RENDER ========== */

  // Choix du dataset
  if (!selectedDataset) {
    return (
      <div className="app categorie-app">
        <header className="categorie-header">
          <button
            className="reset-small-btn home-small-btn"
            onClick={onBack}
            title="Accueil"
          >
            🏠
          </button>
          <h1 className="categorie-title">🗂️ Catégories</h1>
          <div style={{ width: 32 }} />
        </header>

        <div className="categorie-datasets">
          <p className="categorie-subtitle">Choisis un thème</p>
          {Object.entries(DATASETS).map(([key, ds]) => (
            <button
              key={key}
              className="categorie-dataset-btn"
              onClick={() => setSelectedDataset(key)}
            >
              <span className="dataset-icon">{ds.icon}</span>
              <span className="dataset-name">{ds.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Choix du mode
  if (!mode) {
    return (
      <div className="app categorie-app">
        <header className="categorie-header">
          <button
            className="reset-small-btn home-small-btn"
            onClick={backToDatasets}
            title="Retour"
          >
            ←
          </button>
          <h1 className="categorie-title">
            {dataset.icon} {dataset.name}
          </h1>
          <div style={{ width: 32 }} />
        </header>

        <div className="categorie-modes">
          <p className="categorie-subtitle">Choisis un mode</p>

          <button
            className="categorie-mode-btn"
            onClick={() => startQuiz("mode1")}
          >
            <span className="mode-icon">🎯</span>
            <span className="mode-title">Mode 1</span>
            <span className="mode-desc">
              Voir un {dataset.itemLabel} → trouver sa {dataset.categoryLabel}
            </span>
          </button>

          <button
            className="categorie-mode-btn"
            onClick={() => startQuiz("mode2")}
          >
            <span className="mode-icon">📋</span>
            <span className="mode-title">Mode 2</span>
            <span className="mode-desc">
              Voir une {dataset.categoryLabel} → sélectionner tous les{" "}
              {dataset.itemLabel}s
            </span>
          </button>
        </div>

        <div className="categorie-stats">
          <span>{categories.length} catégories</span>
          <span>•</span>
          <span>{allItems.length} éléments</span>
        </div>
      </div>
    );
  }

  // Variables communes pour le quiz
  const totalQuestions = quizItems.length;
  const progress =
    totalQuestions > 0
      ? ((currentIndex + (showResult ? 1 : 0)) / totalQuestions) * 100
      : 0;

  // Résultats finaux
  if (currentIndex >= quizItems.length) {
    const percentage =
      totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    return (
      <div className="app categorie-app">
        <header className="categorie-header">
          <button
            className="reset-small-btn home-small-btn"
            onClick={reset}
            title="Retour"
          >
            ←
          </button>
          <h1 className="categorie-title">📊 Résultats</h1>
          <div style={{ width: 32 }} />
        </header>

        <div className="categorie-results">
          <span className="results-icon">
            {percentage >= 80 ? "🏆" : percentage >= 50 ? "👍" : "📚"}
          </span>
          <div className="results-score">
            <span className="score-value">
              {score}/{totalQuestions}
            </span>
            <span className="score-percent">{percentage}%</span>
          </div>

          <div className="results-actions">
            <button
              className="categorie-btn primary"
              onClick={() => startQuiz(mode)}
            >
              🔄 Recommencer
            </button>
            <button className="categorie-btn secondary" onClick={reset}>
              ← Changer de mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode 1: Item → Catégorie
  if (mode === "mode1") {
    const currentItem = quizItems[currentIndex];
    const correctCategories = itemToCategories[currentItem] || [];

    return (
      <div className="app categorie-app">
        <header className="categorie-header">
          <button className="reset-small-btn home-small-btn" onClick={reset}>
            ✕
          </button>
          <div className="categorie-progress">
            <span className="progress-text">
              {currentIndex + 1} / {totalQuestions}
            </span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="categorie-score">
            <span>{score}</span>
            <span>⭐</span>
          </div>
        </header>

        <div className="categorie-question">
          <p className="question-label">Dans quelle catégorie ?</p>
          <div className="question-item" dir="rtl">
            {currentItem}
          </div>
        </div>

        <div className="categorie-options mode1">
          {shuffledOptions.map((cat) => {
            let className = "categorie-option";
            if (showResult) {
              if (correctCategories.includes(cat)) {
                className += " correct";
              } else if (selectedAnswers.includes(cat)) {
                className += " wrong";
              }
            } else if (selectedAnswers.includes(cat)) {
              className += " selected";
            }

            return (
              <button
                key={cat}
                className={className}
                onClick={() => handleMode1Answer(cat)}
                disabled={showResult}
                dir="rtl"
              >
                {cat}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="categorie-actions">
            <button className="categorie-btn primary" onClick={nextMode1}>
              {currentIndex + 1 >= totalQuestions
                ? "Voir les résultats"
                : "Suivant"}{" "}
              →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Mode 2: Catégorie → Items
  if (mode === "mode2") {
    const currentCategory = quizItems[currentIndex];
    const correctItems = dataset.data[currentCategory] || [];

    return (
      <div className="app categorie-app">
        <header className="categorie-header">
          <button className="reset-small-btn home-small-btn" onClick={reset}>
            ✕
          </button>
          <div className="categorie-progress">
            <span className="progress-text">
              {currentIndex + 1} / {totalQuestions}
            </span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="categorie-score">
            <span>{score}</span>
            <span>⭐</span>
          </div>
        </header>

        <div className="categorie-question">
          <p className="question-label">Sélectionne tous les éléments de :</p>
          <div className="question-item category" dir="rtl">
            {currentCategory}
          </div>
          {!showResult && !showAnswer && (
            <p className="question-hint">
              {correctItems.length} élément(s) à trouver
            </p>
          )}
        </div>

        <div className="categorie-options mode2">
          {shuffledOptions.map((item) => {
            let className = "categorie-option";
            const isCorrect = correctItems.includes(item);
            const isSelected = selectedAnswers.includes(item);

            if (showResult || showAnswer) {
              if (isCorrect && isSelected) {
                className += " correct";
              } else if (isCorrect && !isSelected) {
                className += " missed";
              } else if (!isCorrect && isSelected) {
                className += " wrong";
              }
            } else if (isSelected) {
              className += " selected";
            }

            return (
              <button
                key={item}
                className={className}
                onClick={() => toggleMode2Answer(item)}
                disabled={showResult || showAnswer}
                dir="rtl"
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="categorie-actions">
          {!showResult && !showAnswer && (
            <>
              <button
                className="categorie-btn primary"
                onClick={validateMode2}
                disabled={selectedAnswers.length === 0}
              >
                ✓ Valider
              </button>
              <button
                className="categorie-btn secondary"
                onClick={revealAnswer}
              >
                👁️ Voir la réponse
              </button>
            </>
          )}

          {(showResult || showAnswer) && (
            <button className="categorie-btn primary" onClick={nextMode2}>
              {currentIndex + 1 >= totalQuestions
                ? "Voir les résultats"
                : "Suivant"}{" "}
              →
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
