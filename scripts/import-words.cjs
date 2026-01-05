/**
 * =====================================================
 * SCRIPT D'IMPORT DE NOUVEAUX MOTS
 * =====================================================
 * 
 * COMMANDE À LANCER :
 * 
 *   node scripts/import-words.js
 * 
 * -----------------------------------------------------
 * COMMENT ÇA MARCHE :
 * -----------------------------------------------------
 * 
 * 1. Ajoute tes nouveaux mots dans : src/data/words.json
 *    Format : [{"he": "מילה", "fr": "mot"}, ...]
 * 
 * 2. Lance : node scripts/import-words.js
 * 
 * 3. Les mots sont ajoutés à Firebase
 * 
 * 4. Le fichier words.json est vidé automatiquement
 * 
 * -----------------------------------------------------
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { readFileSync, writeFileSync } from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyCirsTIEJXkj6SDL6W-inUV3Gw0uOyH_is",
  authDomain: "hebrew2french.firebaseapp.com",
  projectId: "hebrew2french",
  storageBucket: "hebrew2french.firebasestorage.app",
  messagingSenderId: "890776485340",
  appId: "1:890776485340:web:f73146abecf71d3b092319"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importNewWords() {
  // 1. Lire le fichier JSON local
  const wordsRaw = readFileSync("./src/data/words.json", "utf-8");
  const newWords = JSON.parse(wordsRaw);
  
  if (newWords.length === 0) {
    console.log("📭 Le fichier words.json est vide. Rien à importer.");
    process.exit(0);
  }
  
  console.log(`\n📚 ${newWords.length} mots à ajouter :\n`);
  
  // Afficher les mots
  newWords.forEach((w, i) => {
    console.log(`   ${i + 1}. ${w.he} = ${w.fr}`);
  });
  console.log("");
  
  // 2. Vérifier les doublons avec Firebase
  const snapshot = await getDocs(collection(db, "words"));
  const existingHebrew = new Set(snapshot.docs.map(doc => doc.data().he));
  
  const toAdd = newWords.filter(w => !existingHebrew.has(w.he));
  const duplicates = newWords.length - toAdd.length;
  
  if (duplicates > 0) {
    console.log(`⚠️  ${duplicates} mot(s) déjà existant(s) - ignoré(s)`);
  }
  
  if (toAdd.length === 0) {
    console.log("✅ Tous ces mots existent déjà dans Firebase.");
    // Vider le fichier quand même
    writeFileSync("./src/data/words.json", "[]");
    console.log("🧹 Fichier words.json vidé.\n");
    process.exit(0);
  }
  
  // 3. Ajouter à Firebase
  for (const word of toAdd) {
    await addDoc(collection(db, "words"), {
      he: word.he,
      fr: word.fr,
      wrong: false
    });
  }
  
  console.log(`🎉 ${toAdd.length} nouveaux mots ajoutés à Firebase !`);
  
  // 4. Vider le fichier words.json
  writeFileSync("./src/data/words.json", "[]");
  console.log("🧹 Fichier words.json vidé.\n");
  
  process.exit(0);
}

importNewWords().catch(err => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});
