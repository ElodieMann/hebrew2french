import { useEffect, useState, useMemo } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

// Helper: convertir en tableau
const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

// Helper: normaliser le texte pour la recherche (retire les accents et voyelles hébraïques)
const normalizeSearch = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Retire les diacritiques latins (accents)
    .replace(/[\u0591-\u05C7]/g, ""); // Retire les voyelles hébraïques (nikud)
};

export default function Admin({ onBack }) {
  const [tab, setTab] = useState("questions"); // questions | words
  const [loading, setLoading] = useState(true);

  // Data
  const [questions, setQuestions] = useState([]);
  const [words, setWords] = useState([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMatiere, setFilterMatiere] = useState("");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [filterProf, setFilterProf] = useState(null); // null = tous, true = prof, false = non-prof
  const [filterMisrad, setFilterMisrad] = useState(null); // null = tous, true = misrad, false = non-misrad
  const [filterAnswered, setFilterAnswered] = useState(null); // null = tous, true = répondues, false = non-répondues

  // Edit modal
  const [editItem, setEditItem] = useState(null);
  const [editData, setEditData] = useState({});

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Bulk delete confirmation
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* LOAD DATA */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [questionsSnap, wordsSnap] = await Promise.all([
          getDocs(collection(db, "questions")),
          getDocs(collection(db, "words")),
        ]);

        setQuestions(
          questionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setWords(wordsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Erreur chargement:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Catégories et matières uniques
  const categories = useMemo(() => {
    const all = questions.flatMap((q) => toArray(q.grande_categorie));
    return [...new Set(all)].filter(Boolean).sort();
  }, [questions]);

  const matieres = useMemo(() => {
    let base = questions;
    if (filterCategory) {
      base = base.filter((q) =>
        toArray(q.grande_categorie).includes(filterCategory),
      );
    }
    const all = base.flatMap((q) => toArray(q.matiere));
    return [...new Set(all)].filter(Boolean).sort();
  }, [questions, filterCategory]);

  // Filtrer les questions
  const filteredQuestions = useMemo(() => {
    let result = questions;

    // Signalés d'abord
    if (showFlaggedOnly) {
      result = result.filter((q) => q.flagged);
    }

    // Catégorie
    if (filterCategory) {
      result = result.filter((q) =>
        toArray(q.grande_categorie).includes(filterCategory),
      );
    }

    // Matière
    if (filterMatiere) {
      result = result.filter((q) => toArray(q.matiere).includes(filterMatiere));
    }

    // Prof / Misrad (OR logic si les deux sont true)
    if (filterProf === true && filterMisrad === true) {
      // Si les deux sont sélectionnés, c'est un OR
      result = result.filter(
        (q) => q.is_prof === true || q.is_misrad_haavoda === true,
      );
    } else {
      if (filterProf !== null) {
        result = result.filter((q) => q.is_prof === filterProf);
      }
      if (filterMisrad !== null) {
        result = result.filter((q) => q.is_misrad_haavoda === filterMisrad);
      }
    }

    // Answered
    if (filterAnswered !== null) {
      result = result.filter((q) => (q.answered || q.wrong) === filterAnswered);
    }

    // Recherche (insensible aux accents)
    if (searchQuery.trim()) {
      const query = normalizeSearch(searchQuery);
      result = result.filter(
        (q) =>
          normalizeSearch(q.question).includes(query) ||
          Object.values(q.options || {}).some((opt) =>
            normalizeSearch(opt).includes(query),
          ),
      );
    }

    // Trier: flagged en premier
    return result.sort((a, b) => {
      if (a.flagged && !b.flagged) return -1;
      if (!a.flagged && b.flagged) return 1;
      return 0;
    });
  }, [
    questions,
    searchQuery,
    filterCategory,
    filterMatiere,
    showFlaggedOnly,
    filterProf,
    filterMisrad,
    filterAnswered,
  ]);

  // Filtrer les mots
  const filteredWords = useMemo(() => {
    let result = words;

    if (showFlaggedOnly) {
      result = result.filter((w) => w.flagged);
    }

    if (searchQuery.trim()) {
      const query = normalizeSearch(searchQuery);
      result = result.filter(
        (w) =>
          normalizeSearch(w.he).includes(query) ||
          normalizeSearch(w.fr).includes(query),
      );
    }

    return result.sort((a, b) => {
      if (a.flagged && !b.flagged) return -1;
      if (!a.flagged && b.flagged) return 1;
      return 0;
    });
  }, [words, searchQuery, showFlaggedOnly]);

  // Compter les signalés
  const flaggedQuestionsCount = questions.filter((q) => q.flagged).length;
  const flaggedWordsCount = words.filter((w) => w.flagged).length;

  /* EDIT HANDLERS */
  const openEdit = (item, type) => {
    setEditItem({ ...item, type });
    if (type === "question") {
      setEditData({
        question: item.question || "",
        reponse_correcte: item.reponse_correcte || "A",
        options: { ...item.options },
        explication: item.explication || "",
        grande_categorie: toArray(item.grande_categorie).join(", "),
        matiere: toArray(item.matiere).join(", "),
        is_prof: item.is_prof || false,
        is_misrad_haavoda: item.is_misrad_haavoda || false,
      });
    } else {
      setEditData({
        he: item.he || "",
        fr: item.fr || "",
      });
    }
  };

  const saveEdit = async () => {
    if (!editItem) return;

    try {
      if (editItem.type === "question") {
        const updateData = {
          question: editData.question,
          reponse_correcte: editData.reponse_correcte,
          options: editData.options,
          explication: editData.explication,
          grande_categorie: editData.grande_categorie
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          matiere: editData.matiere
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          is_prof: editData.is_prof,
          is_misrad_haavoda: editData.is_misrad_haavoda,
          flagged: false, // Retirer le flag après édition
        };

        await updateDoc(doc(db, "questions", editItem.id), updateData);
        setQuestions((prev) =>
          prev.map((q) => (q.id === editItem.id ? { ...q, ...updateData } : q)),
        );
      } else {
        const updateData = {
          he: editData.he,
          fr: editData.fr,
          flagged: false,
        };

        await updateDoc(doc(db, "words", editItem.id), updateData);
        setWords((prev) =>
          prev.map((w) => (w.id === editItem.id ? { ...w, ...updateData } : w)),
        );
      }

      setEditItem(null);
      setEditData({});
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      alert("Erreur lors de la sauvegarde");
    }
  };

  /* DELETE HANDLERS */
  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const { item, type } = deleteConfirm;

      if (type === "question") {
        await deleteDoc(doc(db, "questions", item.id));
        setQuestions((prev) => prev.filter((q) => q.id !== item.id));
      } else {
        await deleteDoc(doc(db, "words", item.id));
        setWords((prev) => prev.filter((w) => w.id !== item.id));
      }

      setDeleteConfirm(null);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression");
    }
  };

  /* BULK DELETE */
  const confirmBulkDelete = async () => {
    setBulkDeleting(true);

    try {
      const itemsToDelete =
        tab === "questions" ? filteredQuestions : filteredWords;
      const collectionName = tab === "questions" ? "questions" : "words";

      // Supprimer par batch de 500 (limite Firestore)
      const batchSize = 500;
      for (let i = 0; i < itemsToDelete.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = itemsToDelete.slice(i, i + batchSize);

        chunk.forEach((item) => {
          batch.delete(doc(db, collectionName, item.id));
        });

        await batch.commit();
      }

      // Mettre à jour le state local
      const deletedIds = new Set(itemsToDelete.map((item) => item.id));

      if (tab === "questions") {
        setQuestions((prev) => prev.filter((q) => !deletedIds.has(q.id)));
      } else {
        setWords((prev) => prev.filter((w) => !deletedIds.has(w.id)));
      }

      setBulkDeleteConfirm(false);
    } catch (error) {
      console.error("Erreur suppression en masse:", error);
      alert("Erreur lors de la suppression en masse");
    } finally {
      setBulkDeleting(false);
    }
  };

  /* EXPORT JSON */
  const exportQuestionsJSON = () => {
    // Juste question, options et réponse correcte
    const exportData = filteredQuestions.map((q) => ({
      question: q.question,
      options: q.options,
      reponse_correcte: q.reponse_correcte,
    }));

    const json = JSON.stringify(exportData, null, 2);
    
    // Créer un fichier téléchargeable
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `questions_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyQuestionsJSON = () => {
    // Juste question, options et réponse correcte
    const exportData = filteredQuestions.map((q) => ({
      question: q.question,
      options: q.options,
      reponse_correcte: q.reponse_correcte,
    }));

    const json = JSON.stringify(exportData, null, 2);
    
    navigator.clipboard.writeText(json).then(() => {
      alert(`${filteredQuestions.length} question(s) copiées dans le presse-papiers !`);
    }).catch((err) => {
      console.error("Erreur copie:", err);
      alert("Erreur lors de la copie");
    });
  };

  /* UNFLAG */
  const handleUnflag = async (item, type) => {
    try {
      const collectionName = type === "question" ? "questions" : "words";
      await updateDoc(doc(db, collectionName, item.id), { flagged: false });

      if (type === "question") {
        setQuestions((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, flagged: false } : q)),
        );
      } else {
        setWords((prev) =>
          prev.map((w) => (w.id === item.id ? { ...w, flagged: false } : w)),
        );
      }
    } catch (error) {
      console.error("Erreur unflag:", error);
    }
  };

  /* LOADING */
  if (loading) {
    return (
      <div className="app admin-app">
        <div className="empty-state">
          <span className="empty-icon">⏳</span>
          <span className="empty-text">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app admin-app">
      {/* Header */}
      <header className="admin-header">
        <button
          className="reset-small-btn home-small-btn"
          onClick={onBack}
          title="Accueil"
        >
          🏠
        </button>
        <h1 className="admin-title">🛠️ Admin</h1>
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === "questions" ? "active" : ""}`}
          onClick={() => {
            setTab("questions");
            setSearchQuery("");
          }}
        >
          📝 Questions
          {flaggedQuestionsCount > 0 && (
            <span className="admin-tab-badge">{flaggedQuestionsCount}</span>
          )}
        </button>
        <button
          className={`admin-tab ${tab === "words" ? "active" : ""}`}
          onClick={() => {
            setTab("words");
            setSearchQuery("");
            setFilterCategory("");
            setFilterMatiere("");
          }}
        >
          📚 Mots
          {flaggedWordsCount > 0 && (
            <span className="admin-tab-badge">{flaggedWordsCount}</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <input
          type="text"
          className="admin-search"
          placeholder={
            tab === "questions"
              ? "Rechercher une question..."
              : "Rechercher un mot..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <button
          className={`admin-filter-btn ${showFlaggedOnly ? "active" : ""}`}
          onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
        >
          ⚠️ Signalés (
          {tab === "questions" ? flaggedQuestionsCount : flaggedWordsCount})
        </button>

        {tab === "questions" && (
          <>
            <div className="admin-filter-row">
              <select
                className="admin-filter-select"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setFilterMatiere("");
                }}
              >
                <option value="">Toutes catégories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {filterCategory && matieres.length > 0 && (
                <select
                  className="admin-filter-select"
                  value={filterMatiere}
                  onChange={(e) => setFilterMatiere(e.target.value)}
                >
                  <option value="">Toutes matières</option>
                  {matieres.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="admin-filter-badges">
              <button
                className={`admin-badge-btn ${filterProf === true ? "active" : ""}`}
                onClick={() => setFilterProf(filterProf === true ? null : true)}
              >
                👩‍🏫 Prof
              </button>
              <button
                className={`admin-badge-btn ${filterProf === false ? "active" : ""}`}
                onClick={() =>
                  setFilterProf(filterProf === false ? null : false)
                }
              >
                ❌ Non-Prof
              </button>
              <button
                className={`admin-badge-btn misrad ${filterMisrad === true ? "active" : ""}`}
                onClick={() =>
                  setFilterMisrad(filterMisrad === true ? null : true)
                }
              >
                🏛️ Misrad
              </button>
              <button
                className={`admin-badge-btn misrad ${filterMisrad === false ? "active" : ""}`}
                onClick={() =>
                  setFilterMisrad(filterMisrad === false ? null : false)
                }
              >
                ❌ Non-Misrad
              </button>
              <button
                className={`admin-badge-btn answered ${filterAnswered === true ? "active" : ""}`}
                onClick={() =>
                  setFilterAnswered(filterAnswered === true ? null : true)
                }
              >
                ✓ Répondues
              </button>
              <button
                className={`admin-badge-btn answered ${filterAnswered === false ? "active" : ""}`}
                onClick={() =>
                  setFilterAnswered(filterAnswered === false ? null : false)
                }
              >
                ○ Non-répondues
              </button>
            </div>

            {(filterProf !== null ||
              filterMisrad !== null ||
              filterAnswered !== null ||
              filterCategory ||
              filterMatiere) && (
              <button
                className="admin-clear-filters"
                onClick={() => {
                  setFilterProf(null);
                  setFilterMisrad(null);
                  setFilterAnswered(null);
                  setFilterCategory("");
                  setFilterMatiere("");
                }}
              >
                🗑️ Effacer les filtres
              </button>
            )}
          </>
        )}
      </div>

      {/* Results count + Actions */}
      <div className="admin-results-row">
        <div className="admin-results-count">
          {tab === "questions"
            ? `${filteredQuestions.length} question(s)`
            : `${filteredWords.length} mot(s)`}
        </div>

        <div className="admin-results-actions">
          {/* Boutons export - visible pour questions */}
          {tab === "questions" && filteredQuestions.length > 0 && (
            <>
              <button
                className="admin-export-btn"
                onClick={copyQuestionsJSON}
                title="Copier en JSON"
              >
                📋 Copier
              </button>
              <button
                className="admin-export-btn"
                onClick={exportQuestionsJSON}
                title="Télécharger en JSON"
              >
                💾 Export
              </button>
            </>
          )}

          {/* Bouton supprimer tout - visible si filtres actifs et résultats > 0 */}
          {((tab === "questions" &&
            filteredQuestions.length > 0 &&
            (searchQuery ||
              filterCategory ||
              filterMatiere ||
              filterProf !== null ||
              filterMisrad !== null ||
              filterAnswered !== null ||
              showFlaggedOnly)) ||
            (tab === "words" &&
              filteredWords.length > 0 &&
              (searchQuery || showFlaggedOnly))) && (
            <button
              className="admin-bulk-delete-btn"
              onClick={() => setBulkDeleteConfirm(true)}
            >
              🗑️ Suppr. (
              {tab === "questions"
                ? filteredQuestions.length
                : filteredWords.length}
              )
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="admin-list">
        {tab === "questions" ? (
          filteredQuestions.length === 0 ? (
            <div className="admin-empty">Aucune question trouvée</div>
          ) : (
            filteredQuestions.map((q) => (
              <div
                key={q.id}
                className={`admin-item ${q.flagged ? "flagged" : ""}`}
              >
                <div className="admin-item-content">
                  {q.flagged && <span className="admin-flag-icon">⚠️</span>}
                  <div className="admin-item-meta">
                    <span className="admin-meta-cat">
                      {toArray(q.grande_categorie).join(", ")}
                    </span>
                    <span className="admin-meta-mat">
                      {toArray(q.matiere).join(", ")}
                    </span>
                    {q.is_prof && (
                      <span className="admin-meta-badge prof">👩‍🏫</span>
                    )}
                    {q.is_misrad_haavoda && (
                      <span className="admin-meta-badge misrad">🏛️</span>
                    )}
                    {(q.answered || q.wrong) && (
                      <span className="admin-meta-badge answered">✓</span>
                    )}
                  </div>
                  <p className="admin-item-text" dir="rtl">
                    {q.question?.length > 100
                      ? q.question.substring(0, 100) + "..."
                      : q.question}
                  </p>
                  <div className="admin-item-answer">
                    Réponse: <strong>{q.reponse_correcte}</strong> -{" "}
                    {q.options?.[q.reponse_correcte]}
                  </div>
                </div>
                <div className="admin-item-actions">
                  <button
                    className="admin-action-btn edit"
                    onClick={() => openEdit(q, "question")}
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  {q.flagged && (
                    <button
                      className="admin-action-btn unflag"
                      onClick={() => handleUnflag(q, "question")}
                      title="Retirer le signalement"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="admin-action-btn delete"
                    onClick={() =>
                      setDeleteConfirm({ item: q, type: "question" })
                    }
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )
        ) : filteredWords.length === 0 ? (
          <div className="admin-empty">Aucun mot trouvé</div>
        ) : (
          filteredWords.map((w) => (
            <div
              key={w.id}
              className={`admin-item ${w.flagged ? "flagged" : ""}`}
            >
              <div className="admin-item-content">
                {w.flagged && <span className="admin-flag-icon">⚠️</span>}
                <div className="admin-word-pair">
                  <span className="admin-word-he">{w.he}</span>
                  <span className="admin-word-fr">{w.fr}</span>
                </div>
              </div>
              <div className="admin-item-actions">
                <button
                  className="admin-action-btn edit"
                  onClick={() => openEdit(w, "word")}
                  title="Modifier"
                >
                  ✏️
                </button>
                {w.flagged && (
                  <button
                    className="admin-action-btn unflag"
                    onClick={() => handleUnflag(w, "word")}
                    title="Retirer le signalement"
                  >
                    ✓
                  </button>
                )}
                <button
                  className="admin-action-btn delete"
                  onClick={() => setDeleteConfirm({ item: w, type: "word" })}
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="admin-modal-overlay" onClick={() => setEditItem(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>✏️ Modifier</h2>
              <button
                className="admin-modal-close"
                onClick={() => setEditItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              {editItem.type === "question" ? (
                <>
                  <div className="admin-field">
                    <label>Question</label>
                    <textarea
                      value={editData.question}
                      onChange={(e) =>
                        setEditData({ ...editData, question: e.target.value })
                      }
                      dir="rtl"
                      rows={3}
                    />
                  </div>

                  <div className="admin-field">
                    <label>Réponse correcte</label>
                    <select
                      value={editData.reponse_correcte}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          reponse_correcte: e.target.value,
                        })
                      }
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>

                  {["A", "B", "C", "D"].map((key) => (
                    <div key={key} className="admin-field">
                      <label>Option {key}</label>
                      <input
                        type="text"
                        value={editData.options?.[key] || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            options: {
                              ...editData.options,
                              [key]: e.target.value,
                            },
                          })
                        }
                        dir="rtl"
                      />
                    </div>
                  ))}

                  <div className="admin-field">
                    <label>Explication</label>
                    <textarea
                      value={editData.explication}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          explication: e.target.value,
                        })
                      }
                      dir="rtl"
                      rows={2}
                    />
                  </div>

                  <div className="admin-field">
                    <label>Catégories (séparées par virgule)</label>
                    <input
                      type="text"
                      value={editData.grande_categorie}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          grande_categorie: e.target.value,
                        })
                      }
                      dir="rtl"
                    />
                  </div>

                  <div className="admin-field">
                    <label>Matières (séparées par virgule)</label>
                    <input
                      type="text"
                      value={editData.matiere}
                      onChange={(e) =>
                        setEditData({ ...editData, matiere: e.target.value })
                      }
                      dir="rtl"
                    />
                  </div>

                  <div className="admin-field-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={editData.is_prof}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            is_prof: e.target.checked,
                          })
                        }
                      />
                      Prof
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={editData.is_misrad_haavoda}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            is_misrad_haavoda: e.target.checked,
                          })
                        }
                      />
                      Misrad Haavoda
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="admin-field">
                    <label>Hébreu</label>
                    <input
                      type="text"
                      value={editData.he}
                      onChange={(e) =>
                        setEditData({ ...editData, he: e.target.value })
                      }
                      dir="rtl"
                    />
                  </div>

                  <div className="admin-field">
                    <label>Français</label>
                    <input
                      type="text"
                      value={editData.fr}
                      onChange={(e) =>
                        setEditData({ ...editData, fr: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-modal-btn cancel"
                onClick={() => setEditItem(null)}
              >
                Annuler
              </button>
              <button className="admin-modal-btn save" onClick={saveEdit}>
                💾 Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div
          className="admin-modal-overlay"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="admin-modal confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h2>🗑️ Confirmer la suppression</h2>
            </div>

            <div className="admin-modal-body">
              <p>Êtes-vous sûr de vouloir supprimer cet élément ?</p>
              <p className="admin-confirm-preview">
                {deleteConfirm.type === "question"
                  ? deleteConfirm.item.question?.substring(0, 50) + "..."
                  : `${deleteConfirm.item.he} - ${deleteConfirm.item.fr}`}
              </p>
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-modal-btn cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Annuler
              </button>
              <button
                className="admin-modal-btn delete"
                onClick={confirmDelete}
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {bulkDeleteConfirm && (
        <div
          className="admin-modal-overlay"
          onClick={() => !bulkDeleting && setBulkDeleteConfirm(false)}
        >
          <div
            className="admin-modal confirm bulk"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h2>⚠️ Suppression en masse</h2>
            </div>

            <div className="admin-modal-body">
              <p className="admin-bulk-warning">
                Attention ! Cette action est <strong>irréversible</strong>.
              </p>
              <p className="admin-bulk-count">
                {tab === "questions"
                  ? `${filteredQuestions.length} question(s)`
                  : `${filteredWords.length} mot(s)`}{" "}
                seront supprimé(e)s définitivement.
              </p>
              {(filterCategory || filterMatiere) && (
                <p className="admin-bulk-filters">
                  Filtres actifs:{" "}
                  {filterCategory && <span>{filterCategory}</span>}
                  {filterCategory && filterMatiere && " → "}
                  {filterMatiere && <span>{filterMatiere}</span>}
                </p>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                className="admin-modal-btn cancel"
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={bulkDeleting}
              >
                Annuler
              </button>
              <button
                className="admin-modal-btn delete bulk"
                onClick={confirmBulkDelete}
                disabled={bulkDeleting}
              >
                {bulkDeleting
                  ? "⏳ Suppression..."
                  : `🗑️ Supprimer ${tab === "questions" ? filteredQuestions.length : filteredWords.length} élément(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
