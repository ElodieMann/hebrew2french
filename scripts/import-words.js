/**
 * =====================================================
 * SCRIPT D'IMPORT DE NOUVEAUX MOTS
 * =====================================================
 * 
 * Ce script ajoute les nouveaux mots de words.json vers Firebase.
 * Il ne crée PAS de doublons (vérifie si le mot hébreu existe déjà).
 * 
 * -----------------------------------------------------
 * COMMENT L'UTILISER :
 * -----------------------------------------------------
 * 
 * 1. Ajoute tes nouveaux mots dans : src/data/words.json
 *    Format : {"he": "מילה", "fr": "mot"}
 * 
 * 2. Ouvre le terminal dans le dossier du projet
 * 
 * 3. Lance la commande :
 *    node scripts/import-words.js
 * 
 * 4. C'est tout ! Les nouveaux mots sont ajoutés à Firebase.
 * 
 * -----------------------------------------------------
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { readFileSync } from "fs";

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
  console.log("📚 Chargement des mots...\n");
  
  // 1. Lire le fichier JSON local
  const wordsRaw = readFileSync("./src/data/words.json", "utf-8");
  const localWords = JSON.parse(wordsRaw);
  console.log(`   Fichier JSON : ${localWords.length} mots`);
  
  // 2. Charger les mots existants de Firebase
  const snapshot = await getDocs(collection(db, "words"));
  const firebaseWords = snapshot.docs.map(doc => doc.data());
  console.log(`   Firebase : ${firebaseWords.length} mots\n`);
  
  // 3. Créer un Set des mots hébreux existants (pour comparaison rapide)
  const existingHebrew = new Set(firebaseWords.map(w => w.he));
  
  // 4. Trouver les nouveaux mots (pas encore dans Firebase)
  const newWords = localWords.filter(w => !existingHebrew.has(w.he));
  
  if (newWords.length === 0) {
    console.log("✅ Aucun nouveau mot à ajouter. Tout est déjà synchronisé !");
    process.exit(0);
  }
  
  console.log(`🆕 ${newWords.length} nouveaux mots à ajouter :\n`);
  
  // Afficher les nouveaux mots
  newWords.forEach((w, i) => {
    console.log(`   ${i + 1}. ${w.he} = ${w.fr}`);
  });
  console.log("");
  
  // 5. Ajouter les nouveaux mots à Firebase
  let count = 0;
  for (const word of newWords) {
    await addDoc(collection(db, "words"), {
      he: word.he,
      fr: word.fr,
      wrong: false
    });
    count++;
  }
  
  console.log(`🎉 Terminé ! ${count} nouveaux mots ajoutés à Firebase.\n`);
  process.exit(0);
}

importNewWords().catch(err => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});
