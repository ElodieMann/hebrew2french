const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCirsTIEJXkj6SDL6W-inUV3Gw0uOyH_is",
  authDomain: "hebrew2french.firebaseapp.com",
  projectId: "hebrew2french",
  storageBucket: "hebrew2french.firebasestorage.app",
  messagingSenderId: "890776485340",
  appId: "1:890776485340:web:f73146abecf71d3b092319",
  measurementId: "G-WL6TLLQB9J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const importQuestions = async () => {
  try {
    console.log('📝 Chargement des questions...');

    // 1. Charger les questions du fichier JSON
    const jsonQuestionsRaw = fs.readFileSync('src/data/questions.json', 'utf8');
    const jsonQuestions = JSON.parse(jsonQuestionsRaw);

    if (jsonQuestions.length === 0) {
      console.log('\n⚠️ Le fichier questions.json est vide.');
      return;
    }

    // 2. Charger les questions existantes dans Firebase
    const firebaseSnapshot = await getDocs(collection(db, 'questions'));
    const firebaseQuestions = firebaseSnapshot.docs.map(doc => doc.data());
    
    // Créer un Set des questions existantes (basé sur le texte de la question)
    const existingQuestions = new Set(
      firebaseQuestions.map(q => q.question.normalize('NFC'))
    );

    console.log(`\n   Fichier JSON : ${jsonQuestions.length} questions`);
    console.log(`   Firebase : ${firebaseQuestions.length} questions`);

    // 3. Filtrer les nouvelles questions
    const newQuestions = jsonQuestions.filter(
      q => !existingQuestions.has(q.question.normalize('NFC'))
    );

    if (newQuestions.length === 0) {
      console.log('\n🎉 Aucune nouvelle question à ajouter.');
      // Vider le fichier JSON
      fs.writeFileSync('src/data/questions.json', '[]', 'utf8');
      console.log('🧹 Fichier src/data/questions.json vidé.');
      return;
    }

    console.log(`\n🆕 ${newQuestions.length} nouvelles questions à ajouter :`);
    newQuestions.forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.question.substring(0, 50)}...`);
    });

    // 4. Ajouter les nouvelles questions à Firebase
    for (const question of newQuestions) {
      await addDoc(collection(db, 'questions'), question);
    }

    console.log(`\n🎉 Terminé ! ${newQuestions.length} nouvelles questions ajoutées à Firebase.`);

    // 5. Vider le fichier JSON après l'importation réussie
    fs.writeFileSync('src/data/questions.json', '[]', 'utf8');
    console.log('🧹 Fichier src/data/questions.json vidé.');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

importQuestions();

