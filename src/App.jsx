import { useEffect, useState } from "react";
import words from "./data/words.json";

/* =========================
   UTILITAIRES
   ========================= */

// Mélange un tableau
function shuffle(array) {
  return [...array].sort(() => 0.5 - Math.random());
}

// Génère les propositions QCM
function getChoices(allWords, correctWord, count = 4) {
  const others = allWords
    .filter(w => w.he !== correctWord.he)
    .sort(() => 0.5 - Math.random())
    .slice(0, count - 1);

  return shuffle([...others, correctWord]);
}

// Vérifie doublons hébreu uniquement
function checkHebrewDuplicates(words) {
  const seen = new Set();
  words.forEach((w, i) => {
    if (seen.has(w.he)) {
      console.warn(
        `⚠️ Doublon hébreu détecté : "${w.he}" (ligne ${i + 1})`
      );
    }
    seen.add(w.he);
  });
}

/* =========================
   APP
   ========================= */

export default function App() {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);

  // Initialisation
  useEffect(() => {
    checkHebrewDuplicates(words);
    setQueue(shuffle(words));
  }, []);

  if (queue.length === 0) return null;

  const current = queue[index];
  const choices = getChoices(words, current);

  function next() {
    setSelected(null);

    if (index + 1 >= queue.length) {
      setQueue(shuffle(words));
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
  }

 return (
  <div className="app">
    <div className="word-he">{current.he}</div>

    {choices.map((choice, i) => {
      const isCorrect = choice.fr === current.fr;
      const isSelected = selected === choice.fr;

      let className = "choice";
      if (selected) {
        if (isCorrect) className += " correct";
        else if (isSelected) className += " wrong";
      }

      return (
        <button
          key={i}
          className={className}
          onClick={() => !selected && setSelected(choice.fr)}
        >
          {choice.fr}
        </button>
      );
    })}

    {selected && (
      <button className="next-btn" onClick={next}>
        Suivant
      </button>
    )}
  </div>
);

}
