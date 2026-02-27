const fs = require("fs");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  addDoc,
} = require("firebase/firestore");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCirsTIEJXkj6SDL6W-inUV3Gw0uOyH_is",
  authDomain: "hebrew2french.firebaseapp.com",
  projectId: "hebrew2french",
  storageBucket: "hebrew2french.firebasestorage.app",
  messagingSenderId: "890776485340",
  appId: "1:890776485340:web:f73146abecf71d3b092319",
  measurementId: "G-WL6TLLQB9J",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper: convertir en tableau
const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

// Fonction pour sauvegarder les catégories dans un fichier JSON
const saveCategoriesFile = async () => {
  const snapshot = await getDocs(collection(db, "questions"));
  const questions = snapshot.docs.map((doc) => doc.data());

  // Extraire toutes les catégories et matières uniques
  const allCategories = [
    ...new Set(questions.flatMap((q) => toArray(q.grande_categorie))),
  ]
    .filter(Boolean)
    .sort();
  const allMatieres = [...new Set(questions.flatMap((q) => toArray(q.matiere)))]
    .filter(Boolean)
    .sort();

  // Extraire les matières par catégorie
  const matieresByCategory = {};
  questions.forEach((q) => {
    const cats = toArray(q.grande_categorie);
    const mats = toArray(q.matiere);
    cats.forEach((cat) => {
      if (!matieresByCategory[cat]) {
        matieresByCategory[cat] = new Set();
      }
      mats.forEach((mat) => matieresByCategory[cat].add(mat));
    });
  });

  // Convertir les Sets en Arrays
  const matieresParCategorie = {};
  Object.keys(matieresByCategory)
    .sort()
    .forEach((cat) => {
      matieresParCategorie[cat] = [...matieresByCategory[cat]].sort();
    });

  const categoriesData = {
    _info: "Fichier généré automatiquement - Copie les noms exacts !",
    categories: allCategories,
    matieres: allMatieres,
    matieres_par_categorie: matieresParCategorie,
  };

  fs.writeFileSync(
    "src/data/categories.json",
    JSON.stringify(categoriesData, null, 2),
    "utf8",
  );
  console.log("📁 Fichier src/data/categories.json mis à jour !");
};

const importQuestions = async () => {
  try {
    console.log("📝 Chargement des questions...");

    // 1. Charger les questions du fichier JSON
    const jsonQuestionsRaw = fs.readFileSync("src/data/questions.json", "utf8");
    const jsonQuestions = JSON.parse(jsonQuestionsRaw);

    if (jsonQuestions.length === 0) {
      console.log("\n⚠️ Le fichier questions.json est vide.");
      return;
    }

    // 2. Charger les questions existantes dans Firebase
    const firebaseSnapshot = await getDocs(collection(db, "questions"));
    const firebaseQuestions = firebaseSnapshot.docs.map((doc) => doc.data());

    // Créer une clé unique pour chaque question (question + réponses)
    const createQuestionKey = (q) => {
      const questionText = (q.question || "").normalize("NFC");
      const optionA = (q.options?.A || "").normalize("NFC");
      const optionB = (q.options?.B || "").normalize("NFC");
      const optionC = (q.options?.C || "").normalize("NFC");
      const optionD = (q.options?.D || "").normalize("NFC");
      const correctAnswer = q.reponse_correcte || "";
      return `${questionText}|${optionA}|${optionB}|${optionC}|${optionD}|${correctAnswer}`;
    };

    // Créer un Set des questions existantes (basé sur question + réponses)
    const existingQuestions = new Set(
      firebaseQuestions.map((q) => createQuestionKey(q)),
    );

    console.log(`\n   Fichier JSON : ${jsonQuestions.length} questions`);
    console.log(`   Firebase : ${firebaseQuestions.length} questions`);

    // 3. Filtrer les questions invalides, séparer nouvelles et doublons
    const newQuestions = [];
    const duplicates = [];
    const invalid = [];

    jsonQuestions.forEach((q) => {
      // Vérifier que la question a les champs requis
      if (!q.question || !q.options || !q.reponse_correcte) {
        invalid.push(q);
        return;
      }
      
      if (existingQuestions.has(createQuestionKey(q))) {
        duplicates.push(q);
      } else {
        newQuestions.push(q);
      }
    });

    // Afficher les questions invalides
    if (invalid.length > 0) {
      console.log(
        `\n❌ ${invalid.length} question(s) invalide(s) (ignorées) :`,
      );
      invalid.forEach((q, index) => {
        console.log(`   ${index + 1}. Champs manquants: question=${!!q.question}, options=${!!q.options}, reponse=${!!q.reponse_correcte}`);
      });
    }

    // Afficher les doublons s'il y en a
    if (duplicates.length > 0) {
      console.log(
        `\n⚠️ ${duplicates.length} doublon(s) trouvé(s) (non importés) :`,
      );
      duplicates.forEach((q, index) => {
        const questionText = q.question || "(vide)";
        console.log(`   ${index + 1}. ${questionText.substring(0, 60)}...`);
      });
    }

    if (newQuestions.length === 0) {
      console.log("\n🎉 Aucune nouvelle question à ajouter.");
      // Vider le fichier JSON
      fs.writeFileSync("src/data/questions.json", "[]", "utf8");
      console.log("🧹 Fichier src/data/questions.json vidé.");
      return;
    }

    console.log(`\n🆕 ${newQuestions.length} nouvelles questions à ajouter :`);
    newQuestions.forEach((q, index) => {
      const questionText = q.question || "(question vide)";
      console.log(`   ${index + 1}. ${questionText.substring(0, 50)}...`);
    });

    // 4. Ajouter les nouvelles questions à Firebase
    for (const question of newQuestions) {
      await addDoc(collection(db, "questions"), question);
    }

    console.log(
      `\n🎉 Terminé ! ${newQuestions.length} nouvelles questions ajoutées à Firebase.`,
    );

    // 5. Vider le fichier JSON après l'importation réussie
    fs.writeFileSync("src/data/questions.json", "[]", "utf8");
    console.log("🧹 Fichier src/data/questions.json vidé.");

    // 6. Mettre à jour le fichier categories.json
    await saveCategoriesFile();
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
};

importQuestions();
