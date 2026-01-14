const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy, limit } = require("firebase/firestore");

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

// Helper pour vérifier si une matière correspond
const hasMatiere = (q, mat) => {
  const mats = Array.isArray(q.matiere) ? q.matiere : [q.matiere];
  return mats.includes(mat);
};

async function deleteQuestions() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📝 Usage:
  node scripts/delete-questions.cjs --count 62                    # Supprimer les 62 dernières
  node scripts/delete-questions.cjs --matiere "nom"               # Supprimer par matière
  node scripts/delete-questions.cjs --matiere "nom" --prof        # Supprimer matière + is_prof=true
  node scripts/delete-questions.cjs --list                        # Lister les matières
  node scripts/delete-questions.cjs --check "מבוא לקוסמטיקה"      # Voir les questions d'une matière
`);
    process.exit(0);
  }

  const snapshot = await getDocs(collection(db, "questions"));
  const questions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  console.log(`\n📊 Total questions dans Firebase: ${questions.length}\n`);

  // --check : voir les questions d'une matière
  const checkIndex = args.indexOf("--check");
  if (checkIndex !== -1 && args[checkIndex + 1]) {
    const matiere = args[checkIndex + 1];
    const filtered = questions.filter((q) => hasMatiere(q, matiere));
    
    console.log(`📚 ${filtered.length} questions pour "${matiere}":\n`);
    filtered.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q.question.substring(0, 60)}...`);
      console.log(`      prof: ${q.is_prof}, misrad: ${q.is_misrad_haavoda}`);
    });
    process.exit(0);
  }

  // --list : lister les matières
  if (args.includes("--list")) {
    const matieres = {};
    questions.forEach((q) => {
      const mats = Array.isArray(q.matiere) ? q.matiere : [q.matiere];
      mats.forEach((m) => {
        if (m) matieres[m] = (matieres[m] || 0) + 1;
      });
    });
    console.log("📚 Matières:");
    Object.entries(matieres).sort((a, b) => b[1] - a[1]).forEach(([m, count]) => {
      console.log(`   ${m}: ${count} questions`);
    });
    process.exit(0);
  }

  // --matiere : supprimer par matière (+ --prof pour filtrer is_prof=true)
  const matiereIndex = args.indexOf("--matiere");
  if (matiereIndex !== -1 && args[matiereIndex + 1]) {
    const matiere = args[matiereIndex + 1];
    const profOnly = args.includes("--prof");
    
    const toDelete = questions.filter((q) => {
      if (!hasMatiere(q, matiere)) return false;
      if (profOnly && q.is_prof !== true) return false;
      return true;
    });
    
    if (toDelete.length === 0) {
      console.log(`❌ Aucune question trouvée pour la matière "${matiere}"`);
      process.exit(1);
    }

    console.log(`🗑️  ${toDelete.length} questions à supprimer pour "${matiere}":`);
    toDelete.slice(0, 5).forEach((q, i) => {
      console.log(`   ${i + 1}. ${q.question.substring(0, 50)}...`);
    });
    if (toDelete.length > 5) console.log(`   ... et ${toDelete.length - 5} autres`);

    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    rl.question("\n⚠️  Confirmer la suppression ? (oui/non) ", async (answer) => {
      if (answer.toLowerCase() === "oui") {
        for (const q of toDelete) {
          await deleteDoc(doc(db, "questions", q.id));
        }
        console.log(`\n✅ ${toDelete.length} questions supprimées !`);
      } else {
        console.log("❌ Annulé");
      }
      rl.close();
      process.exit(0);
    });
    return;
  }

  // --count : supprimer les X dernières (basé sur l'ID qui est souvent chronologique)
  const countIndex = args.indexOf("--count");
  if (countIndex !== -1 && args[countIndex + 1]) {
    const count = parseInt(args[countIndex + 1]);
    
    // Trier par ID (les plus récents ont souvent des IDs plus "grands" dans Firestore)
    const sorted = questions.sort((a, b) => b.id.localeCompare(a.id));
    const toDelete = sorted.slice(0, count);
    
    console.log(`🗑️  ${toDelete.length} dernières questions à supprimer:`);
    toDelete.slice(0, 10).forEach((q, i) => {
      console.log(`   ${i + 1}. ${q.question.substring(0, 50)}...`);
    });
    if (toDelete.length > 10) console.log(`   ... et ${toDelete.length - 10} autres`);

    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    rl.question("\n⚠️  Confirmer la suppression ? (oui/non) ", async (answer) => {
      if (answer.toLowerCase() === "oui") {
        for (const q of toDelete) {
          await deleteDoc(doc(db, "questions", q.id));
        }
        console.log(`\n✅ ${toDelete.length} questions supprimées !`);
      } else {
        console.log("❌ Annulé");
      }
      rl.close();
      process.exit(0);
    });
    return;
  }

  console.log("❌ Option non reconnue. Utilisez --list, --matiere ou --count");
}

deleteQuestions();

