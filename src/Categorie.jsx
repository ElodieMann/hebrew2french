import { useState, useMemo, useEffect } from "react";
import actifsData from "./data/actifs.json";
import typePeauRaw from "./data/typepeau.json";
import nettoyageRaw from "./data/premiernettoyage.json";

const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

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

// TYPES DE PEAU: Plusieurs aspects
const typePeauGames = {};

// 1. Caractéristiques
const caracData = {};
typePeauRaw.forEach((type) => {
  if (type.characteristics && type.characteristics.length > 0) {
    caracData[type.skin_type] = [...type.characteristics];
  }
});
if (Object.keys(caracData).length > 0) {
  typePeauGames.caracteristiques = {
    name: "Caractéristiques",
    description: "Reconnaître les signes de chaque type de peau",
    data: caracData,
    itemLabel: "caractéristique",
    categoryLabel: "type de peau",
  };
}

// 2. Objectifs de traitement
const objectifsData = {};
typePeauRaw.forEach((type) => {
  if (type.treatment_goals && type.treatment_goals.length > 0) {
    objectifsData[type.skin_type] = [...type.treatment_goals];
  }
});
if (Object.keys(objectifsData).length > 0) {
  typePeauGames.objectifs = {
    name: "Objectifs de traitement",
    description: "Quels soins pour chaque type de peau",
    data: objectifsData,
    itemLabel: "objectif",
    categoryLabel: "type de peau",
  };
}

// 3. Tendances vieillissement
const agingData = {};
typePeauRaw.forEach((type) => {
  if (type.aging_tendency) {
    agingData[type.skin_type] = [type.aging_tendency];
  }
});
if (Object.keys(agingData).length > 0) {
  typePeauGames.vieillissement = {
    name: "Tendance vieillissement",
    description: "Comment chaque type de peau vieillit",
    data: agingData,
    itemLabel: "tendance",
    categoryLabel: "type de peau",
  };
}

// 4. Sensibilité environnementale
const envData = {};
typePeauRaw.forEach((type) => {
  if (type.environmental_sensitivity) {
    envData[type.skin_type] = [type.environmental_sensitivity];
  }
});
if (Object.keys(envData).length > 0) {
  typePeauGames.environnement = {
    name: "Sensibilité environnement",
    description: "Réaction aux facteurs externes",
    data: envData,
    itemLabel: "sensibilité",
    categoryLabel: "type de peau",
  };
}

// PREMIER NETTOYAGE: Plusieurs aspects
const nettoyageGames = {};

// 1. Produit → Types de peau adaptés
const produitSkinData = {};
const skinTypeProducts = {};
nettoyageRaw.forEach((product) => {
  produitSkinData[product.product] = [product.skin_types];

  // Inverse: skin type -> products
  const st = product.skin_types;
  if (!skinTypeProducts[st]) skinTypeProducts[st] = [];
  skinTypeProducts[st].push(product.product);
});
nettoyageGames.produitPeau = {
  name: "Produit → Type de peau",
  description: "Pour quel type de peau chaque produit",
  data: produitSkinData,
  itemLabel: "indication",
  categoryLabel: "produit",
};

// 2. Type de peau → Produits (inversé)
if (Object.keys(skinTypeProducts).length > 0) {
  nettoyageGames.peauProduit = {
    name: "Type de peau → Produits",
    description: "Quels produits pour chaque type",
    data: skinTypeProducts,
    itemLabel: "produit",
    categoryLabel: "indication peau",
  };
}

// 3. Produit → Définition
const produitDefData = {};
nettoyageRaw.forEach((product) => {
  produitDefData[product.product] = [product.definition];
});
nettoyageGames.definitions = {
  name: "Définitions",
  description: "Quelle est la définition de chaque produit",
  data: produitDefData,
  itemLabel: "définition",
  categoryLabel: "produit",
};

// 4. Produit → Ingrédients actifs
const produitActifsData = {};
nettoyageRaw.forEach((product) => {
  if (product.active_ingredients && product.active_ingredients.length > 0) {
    produitActifsData[product.product] = [...product.active_ingredients];
  }
});
if (Object.keys(produitActifsData).length > 0) {
  nettoyageGames.ingredients = {
    name: "Ingrédients actifs",
    description: "Quels ingrédients dans chaque produit",
    data: produitActifsData,
    itemLabel: "ingrédient",
    categoryLabel: "produit",
  };
}

// 5. Produit → Composition
const produitCompoData = {};
nettoyageRaw.forEach((product) => {
  if (product.composition && product.composition.length > 0) {
    produitCompoData[product.product] = [...product.composition];
  }
});
if (Object.keys(produitCompoData).length > 0) {
  nettoyageGames.composition = {
    name: "Composition",
    description: "De quoi est composé chaque produit",
    data: produitCompoData,
    itemLabel: "composant",
    categoryLabel: "produit",
  };
}

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
  nettoyage: {
    name: "Premier nettoyage",
    icon: "🧼",
    games: nettoyageGames,
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
    setFoundCorrect(false);
    setShowAnswer(false);
    setSelectedAnswers([]);
    setWrongAnswers([]);
    setShakingOption(null);

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

        <div className="categorie-options mode1">
          {shuffledOptions.map((cat) => {
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

        <div className="categorie-options mode2">
          {shuffledOptions.map((item) => {
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
