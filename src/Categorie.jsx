import { useState, useMemo, useEffect } from "react";
import actifsData from "./data/actifs.json";
import typePeauRaw from "./data/typepeau.json";

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

// Helper: normaliser le texte pour la recherche
const normalizeSearch = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0591-\u05C7]/g, "");
};

// ============ TRANSFORMATION DES DONNÉES ============

// ACTIFS: fonction -> actifs (déjà au bon format)
const actifsGames = {
  fonctions: {
    name: "Fonctions des actifs",
    description: "Actif → Fonction / Fonction → Actifs",
    data: actifsData,
    itemLabel: "actif",
    categoryLabel: "fonction",
  },
};

// TYPES DE PEAU: Un seul jeu avec tout combiné
const typePeauData = {};
typePeauRaw.forEach((type) => {
  typePeauData[type.skin_type] = [];
  
  // Caractéristiques
  if (type.characteristics && type.characteristics.length > 0) {
    typePeauData[type.skin_type].push(...type.characteristics);
  }
  
  // Objectifs de traitement
  if (type.treatment_goals && type.treatment_goals.length > 0) {
    typePeauData[type.skin_type].push(...type.treatment_goals);
  }
});

// Supprimer les types vides
Object.keys(typePeauData).forEach((key) => {
  if (typePeauData[key].length === 0) {
    delete typePeauData[key];
  }
});

const typePeauGames = {
  general: {
    name: "Types de peau",
    description: "Caractéristiques et objectifs de traitement",
    data: typePeauData,
    itemLabel: "élément",
    categoryLabel: "type de peau",
  },
};

// ============ STRUCTURE DES DATASETS ============
const DATASETS = {
  actifs: {
    name: "Actifs",
    icon: "🧴",
    games: actifsGames,
  },
  typepeau: {
    name: "Types de peau",
    icon: "🧑",
    games: typePeauGames,
  },
};

// ============ COMPOSANT ============
export default function Categorie({ onBack }) {
  // Navigation
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [mode, setMode] = useState(null); // "mode1" ou "mode2"

  // État du quiz
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [shakingOption, setShakingOption] = useState(null);
  const [foundCorrect, setFoundCorrect] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [quizItems, setQuizItems] = useState([]);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  
  // Recherche
  const [searchQuery, setSearchQuery] = useState("");

  // Données du jeu sélectionné
  const gameData = useMemo(() => {
    if (!selectedDataset || !selectedGame) return null;
    return DATASETS[selectedDataset]?.games?.[selectedGame] || null;
  }, [selectedDataset, selectedGame]);

  // Extraire catégories et items
  const { categories, allItems, itemToCategories } = useMemo(() => {
    if (!gameData)
      return { categories: [], allItems: [], itemToCategories: {} };

    const data = gameData.data;
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
  }, [gameData]);

  // Mélanger les options quand on change de question
  useEffect(() => {
    setSearchQuery(""); // Reset search on question change
    if (mode === "mode1" && categories.length > 0) {
      setShuffledOptions(shuffle(categories));
    } else if (mode === "mode2" && allItems.length > 0) {
      setShuffledOptions(shuffle(allItems));
    }
  }, [mode, currentIndex, categories, allItems]);

  // Options filtrées par recherche
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return shuffledOptions;
    const query = normalizeSearch(searchQuery);
    return shuffledOptions.filter((opt) =>
      normalizeSearch(opt).includes(query)
    );
  }, [shuffledOptions, searchQuery]);

  // Démarrer le quiz
  const startQuiz = (selectedMode) => {
    setMode(selectedMode);
    setCurrentIndex(0);
    setScore(0);
    setFoundCorrect(false);
    setShowAnswer(false);
    setSelectedAnswers([]);
    setWrongAnswers([]);
    setShakingOption(null);
    setSearchQuery("");

    if (selectedMode === "mode1") {
      setQuizItems(shuffle(allItems));
      setShuffledOptions(shuffle(categories));
    } else {
      setQuizItems(shuffle(categories));
      setShuffledOptions(shuffle(allItems));
    }
  };

  // Réinitialiser au choix du mode
  const resetToMode = () => {
    setMode(null);
    setCurrentIndex(0);
    setScore(0);
    setFoundCorrect(false);
    setShowAnswer(false);
    setSelectedAnswers([]);
    setWrongAnswers([]);
    setShakingOption(null);
    setQuizItems([]);
    setShuffledOptions([]);
    setSearchQuery("");
  };

  // Retour au choix du jeu
  const backToGames = () => {
    setSelectedGame(null);
    resetToMode();
  };

  // Retour au choix du dataset
  const backToDatasets = () => {
    setSelectedDataset(null);
    setSelectedGame(null);
    resetToMode();
  };

  /* ========== MODE 1: Item → Catégorie ========== */
  const handleMode1Answer = (category) => {
    if (foundCorrect || showAnswer) return;
    if (wrongAnswers.includes(category)) return;

    const currentItem = quizItems[currentIndex];
    const correctCategories = itemToCategories[currentItem] || [];
    const isCorrect = correctCategories.includes(category);

    if (isCorrect) {
      setFoundCorrect(true);
      setScore((s) => s + 1);
    } else {
      setShakingOption(category);
      setTimeout(() => {
        setShakingOption(null);
        setWrongAnswers((prev) => [...prev, category]);
      }, 500);
    }
  };

  const nextMode1 = () => {
    if (currentIndex + 1 >= quizItems.length) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswers([]);
    setWrongAnswers([]);
    setFoundCorrect(false);
    setShowAnswer(false);
    setShakingOption(null);
  };

  const revealMode1Answer = () => {
    setShowAnswer(true);
  };

  /* ========== MODE 2: Catégorie → Items ========== */
  const toggleMode2Answer = (item) => {
    if (foundCorrect || showAnswer) return;

    setSelectedAnswers((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const validateMode2 = () => {
    const currentCategory = quizItems[currentIndex];
    const correctItems = gameData.data[currentCategory] || [];

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
      setFoundCorrect(true);
    } else {
      const wrongSelected = selectedAnswers.filter(
        (item) => !correctSet.has(item),
      );
      setShakingOption("validate");
      setTimeout(() => {
        setShakingOption(null);
        setSelectedAnswers((prev) =>
          prev.filter((item) => correctSet.has(item)),
        );
        setWrongAnswers((prev) => [...prev, ...wrongSelected]);
      }, 500);
    }
  };

  const nextMode2 = () => {
    if (currentIndex + 1 >= quizItems.length) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswers([]);
    setWrongAnswers([]);
    setFoundCorrect(false);
    setShowAnswer(false);
    setShakingOption(null);
  };

  const revealMode2Answer = () => {
    setShowAnswer(true);
  };

  /* ========== RENDER ========== */

  // 1. Choix du dataset
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
              <span className="dataset-games-count">
                {Object.keys(ds.games).length} jeux
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const dataset = DATASETS[selectedDataset];

  // 2. Choix du jeu (aspect à apprendre)
  if (!selectedGame) {
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

        <div className="categorie-games">
          <p className="categorie-subtitle">Que veux-tu apprendre ?</p>
          {Object.entries(dataset.games).map(([key, game]) => (
            <button
              key={key}
              className="categorie-game-btn"
              onClick={() => setSelectedGame(key)}
            >
              <span className="game-name">{game.name}</span>
              <span className="game-desc">{game.description}</span>
              <span className="game-count">
                {Object.keys(game.data).length} catégories
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 3. Choix du mode
  if (!mode) {
    return (
      <div className="app categorie-app">
        <header className="categorie-header">
          <button
            className="reset-small-btn home-small-btn"
            onClick={backToGames}
            title="Retour"
          >
            ←
          </button>
          <h1 className="categorie-title">{gameData.name}</h1>
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
              Voir un {gameData.itemLabel} → trouver le {gameData.categoryLabel}
            </span>
          </button>

          <button
            className="categorie-mode-btn"
            onClick={() => startQuiz("mode2")}
          >
            <span className="mode-icon">📋</span>
            <span className="mode-title">Mode 2</span>
            <span className="mode-desc">
              Voir un {gameData.categoryLabel} → sélectionner les{" "}
              {gameData.itemLabel}s
            </span>
          </button>
        </div>

        <div className="categorie-stats">
          <span>
            {categories.length} {gameData.categoryLabel}s
          </span>
          <span>•</span>
          <span>
            {allItems.length} {gameData.itemLabel}s
          </span>
        </div>
      </div>
    );
  }

  // Variables communes pour le quiz
  const totalQuestions = quizItems.length;
  const progress =
    totalQuestions > 0
      ? ((currentIndex + (foundCorrect || showAnswer ? 1 : 0)) /
          totalQuestions) *
        100
      : 0;

  // 4. Résultats finaux
  if (currentIndex >= quizItems.length) {
    const percentage =
      totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    return (
      <div className="app categorie-app">
        <header className="categorie-header">
          <button
            className="reset-small-btn home-small-btn"
            onClick={resetToMode}
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
            <button className="categorie-btn secondary" onClick={resetToMode}>
              ← Changer de mode
            </button>
            <button className="categorie-btn secondary" onClick={backToGames}>
              ← Autre aspect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Mode 1: Item → Catégorie
  if (mode === "mode1") {
    const currentItem = quizItems[currentIndex];
    const correctCategories = itemToCategories[currentItem] || [];

    return (
      <div className="app categorie-app">
        <header className="categorie-header">
          <button
            className="reset-small-btn home-small-btn"
            onClick={resetToMode}
          >
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
          <p className="question-label">Quel {gameData.categoryLabel} ?</p>
          <div className="question-item" dir="rtl">
            {currentItem}
          </div>
        </div>

        <div className="categorie-search">
          <input
            type="text"
            placeholder="🔍 Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="categorie-search-input"
          />
        </div>

        <div className="categorie-options mode1">
          {filteredOptions.map((cat) => {
            let className = "categorie-option";
            const isCorrect = correctCategories.includes(cat);
            const isWrong = wrongAnswers.includes(cat);
            const isShaking = shakingOption === cat;

            if (foundCorrect || showAnswer) {
              if (isCorrect) {
                className += " correct";
              }
            }
            if (isShaking) {
              className += " shake";
            }
            if (isWrong) {
              className += " disabled-wrong";
            }

            return (
              <button
                key={cat}
                className={className}
                onClick={() => handleMode1Answer(cat)}
                disabled={foundCorrect || showAnswer || isWrong}
                dir="rtl"
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="categorie-actions">
          {!foundCorrect && !showAnswer && (
            <button
              className="categorie-btn secondary"
              onClick={revealMode1Answer}
            >
              👁️ Voir la réponse
            </button>
          )}
          {(foundCorrect || showAnswer) && (
            <button className="categorie-btn primary" onClick={nextMode1}>
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

  // 6. Mode 2: Catégorie → Items
  if (mode === "mode2") {
    const currentCategory = quizItems[currentIndex];
    const correctItems = gameData.data[currentCategory] || [];

    return (
      <div className="app categorie-app">
        <header className="categorie-header">
          <button
            className="reset-small-btn home-small-btn"
            onClick={resetToMode}
          >
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
          <p className="question-label">
            Sélectionne les {gameData.itemLabel}s de :
          </p>
          <div className="question-item category" dir="rtl">
            {currentCategory}
          </div>
          {!foundCorrect && !showAnswer && (
            <p className="question-hint">
              {correctItems.length} à trouver
              {selectedAnswers.length > 0 &&
                ` (${selectedAnswers.length} sélectionné${
                  selectedAnswers.length > 1 ? "s" : ""
                })`}
            </p>
          )}
        </div>

        <div className="categorie-search">
          <input
            type="text"
            placeholder="🔍 Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="categorie-search-input"
          />
        </div>

        <div className="categorie-options mode2">
          {filteredOptions.map((item) => {
            let className = "categorie-option";
            const isCorrect = correctItems.includes(item);
            const isSelected = selectedAnswers.includes(item);
            const isWrong = wrongAnswers.includes(item);

            if (foundCorrect || showAnswer) {
              if (isCorrect) {
                className += " correct";
              }
            } else {
              if (isSelected) {
                className += " selected";
              }
              if (isWrong) {
                className += " disabled-wrong";
              }
            }

            return (
              <button
                key={item}
                className={className}
                onClick={() => toggleMode2Answer(item)}
                disabled={foundCorrect || showAnswer || isWrong}
                dir="rtl"
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="categorie-actions">
          {!foundCorrect && !showAnswer && (
            <>
              <button
                className={`categorie-btn primary ${
                  shakingOption === "validate" ? "shake" : ""
                }`}
                onClick={validateMode2}
                disabled={selectedAnswers.length === 0}
              >
                ✓ Valider
              </button>
              <button
                className="categorie-btn secondary"
                onClick={revealMode2Answer}
              >
                👁️ Voir la réponse
              </button>
            </>
          )}

          {(foundCorrect || showAnswer) && (
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
