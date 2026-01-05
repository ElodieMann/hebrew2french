/**
 * Script pour ajouter des questions par catégorie/matière
 * 
 * UTILISATION:
 * 1. Remplir le fichier src/data/questions.json avec tes questions
 *    (tu peux omettre grande_categorie et matiere, ils seront ajoutés automatiquement)
 * 
 * 2. Lancer le script avec les paramètres:
 *    node scripts/add-questions.cjs "CATÉGORIE" "MATIÈRE" [is_prof] [is_misrad]
 * 
 * EXEMPLES:
 *    node scripts/add-questions.cjs "אנטומיה" "מערכת השרירים"
 *    node scripts/add-questions.cjs "אנטומיה" "מערכת השרירים" true false
 *    node scripts/add-questions.cjs "פיזיולוגיה" "מערכת הדם" false true
 * 
 * FORMAT DU JSON (simplifié):
 * [
 *   {
 *     "question": "מהו התפקיד של...?",
 *     "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
 *     "reponse_correcte": "B",
 *     "explication": "..."
 *   }
 * ]
 * 
 * Le script ajoutera automatiquement:
 * - grande_categorie (1er argument)
 * - matiere (2ème argument)
 * - is_prof (3ème argument, défaut: true)
 * - is_misrad_haavoda (4ème argument, défaut: false)
 * - wrong: false
 */

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Récupérer les arguments
const args = process.argv.slice(2);
const categorie = args[0];
const matiere = args[1];
const isProf = args[2] !== 'false'; // true par défaut
const isMisrad = args[3] === 'true'; // false par défaut

if (!categorie || !matiere) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           📝 SCRIPT D'AJOUT DE QUESTIONS                       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  UTILISATION:                                                  ║
║  node scripts/add-questions.cjs "CATÉGORIE" "MATIÈRE"          ║
║                                                                ║
║  EXEMPLES:                                                     ║
║  node scripts/add-questions.cjs "אנטומיה" "מערכת השרירים"        ║
║  node scripts/add-questions.cjs "אנטומיה" "מערכת הדם" true false║
║                                                                ║
║  ARGUMENTS OPTIONNELS:                                         ║
║  - 3ème: is_prof (true/false, défaut: true)                    ║
║  - 4ème: is_misrad_haavoda (true/false, défaut: false)         ║
║                                                                ║
║  1. Mets tes questions dans src/data/questions.json            ║
║  2. Lance le script avec la catégorie et matière               ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

const addQuestions = async () => {
  try {
    console.log('\n📝 Ajout de questions...');
    console.log(`   📁 Catégorie: ${categorie}`);
    console.log(`   📚 Matière: ${matiere}`);
    console.log(`   👨‍🏫 Prof: ${isProf}`);
    console.log(`   🏛️ Misrad: ${isMisrad}`);

    // 1. Charger les questions du fichier JSON
    const jsonRaw = fs.readFileSync('src/data/questions.json', 'utf8');
    let jsonQuestions = [];
    
    try {
      jsonQuestions = JSON.parse(jsonRaw);
    } catch (e) {
      console.error('❌ Erreur: Le fichier questions.json n\'est pas un JSON valide');
      process.exit(1);
    }

    if (!Array.isArray(jsonQuestions) || jsonQuestions.length === 0) {
      console.log('\n⚠️ Aucune question dans src/data/questions.json');
      console.log('   Ajoute des questions au format:');
      console.log(`   [{"question": "...", "options": {"A":"...", "B":"...", "C":"...", "D":"..."}, "reponse_correcte": "A", "explication": "..."}]`);
      process.exit(1);
    }

    // 2. Charger les questions existantes pour éviter les doublons
    const firebaseSnapshot = await getDocs(collection(db, 'questions'));
    const existingQuestions = new Set(
      firebaseSnapshot.docs.map(doc => doc.data().question.normalize('NFC'))
    );

    console.log(`\n   📊 Questions dans le fichier: ${jsonQuestions.length}`);
    console.log(`   📊 Questions dans Firebase: ${firebaseSnapshot.size}`);

    // 3. Préparer les questions avec les métadonnées
    const questionsToAdd = jsonQuestions
      .filter(q => !existingQuestions.has(q.question.normalize('NFC')))
      .map(q => ({
        grande_categorie: q.grande_categorie || categorie,
        matiere: q.matiere || matiere,
        is_prof: q.is_prof !== undefined ? q.is_prof : isProf,
        is_misrad_haavoda: q.is_misrad_haavoda !== undefined ? q.is_misrad_haavoda : isMisrad,
        question: q.question,
        options: q.options,
        reponse_correcte: q.reponse_correcte,
        explication: q.explication || '',
        wrong: false
      }));

    if (questionsToAdd.length === 0) {
      console.log('\n🎉 Toutes les questions existent déjà dans Firebase!');
      fs.writeFileSync('src/data/questions.json', '[]', 'utf8');
      console.log('🧹 Fichier questions.json vidé.');
      return;
    }

    const duplicates = jsonQuestions.length - questionsToAdd.length;
    if (duplicates > 0) {
      console.log(`\n   ⚠️ ${duplicates} question(s) déjà existante(s) (ignorées)`);
    }

    console.log(`\n🆕 ${questionsToAdd.length} nouvelle(s) question(s) à ajouter:\n`);
    questionsToAdd.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q.question.substring(0, 60)}...`);
    });

    // 4. Ajouter à Firebase
    console.log('\n⏳ Ajout en cours...');
    for (const question of questionsToAdd) {
      await addDoc(collection(db, 'questions'), question);
    }

    console.log(`\n✅ ${questionsToAdd.length} question(s) ajoutée(s) avec succès!`);
    console.log(`   📁 Catégorie: ${categorie}`);
    console.log(`   📚 Matière: ${matiere}`);

    // 5. Vider le fichier JSON
    fs.writeFileSync('src/data/questions.json', '[]', 'utf8');
    console.log('\n🧹 Fichier questions.json vidé.');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
};

addQuestions();

