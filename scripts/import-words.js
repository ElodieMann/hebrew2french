// Script pour importer les mots dans Firebase
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

async function importWords() {
  // Lire le fichier JSON
  const wordsRaw = readFileSync("./src/data/words.json", "utf-8");
  const words = JSON.parse(wordsRaw);
  
  console.log(`📚 ${words.length} mots à importer...`);
  
  // Vérifier si des mots existent déjà
  const existing = await getDocs(collection(db, "words"));
  if (existing.size > 0) {
    console.log(`⚠️  La base contient déjà ${existing.size} mots.`);
    console.log("Pour éviter les doublons, videz d'abord la collection ou ignorez ce message.");
    // On continue quand même
  }
  
  // Importer chaque mot
  let count = 0;
  for (const word of words) {
    await addDoc(collection(db, "words"), {
      he: word.he,
      fr: word.fr,
      wrong: false
    });
    count++;
    if (count % 50 === 0) {
      console.log(`✅ ${count}/${words.length} importés...`);
    }
  }
  
  console.log(`🎉 Terminé ! ${count} mots importés dans Firebase.`);
  process.exit(0);
}

importWords().catch(err => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});

