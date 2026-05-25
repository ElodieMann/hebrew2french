# Hebrew2French 💆‍♀️✨

App d'apprentissage Hébreu → Français avec Firebase.

---

## 📥 AJOUTER DES NOUVEAUX MOTS (Oulpan)

### 1. Ouvre le fichier `src/data/words.json`

### 2. Ajoute tes mots :

```json
[
  { "he": "מילה", "fr": "mot" },
  { "he": "חדש", "fr": "nouveau" }
]
```

### 3. Lance la commande :

```bash
node scripts/import-words.cjs
```

---

## 📝 AJOUTER DES QUESTIONS (Test)

### Méthode 1 : Par catégorie/matière (RECOMMANDÉ)

**1. Mets tes questions dans `src/data/questions.json` (format simplifié) :**

```json
[
  {
    "question": "מהו התפקיד של...?",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "reponse_correcte": "B",
    "explication": "..."
  }
]
```

**2. Lance le script avec la catégorie et matière :**

```bash
# Une seule catégorie/matière
node scripts/add-questions.cjs "אנטומיה" "מערכת השרירים"

# PLUSIEURS catégories/matières (séparées par des virgules)
node scripts/add-questions.cjs "אנטומיה,פיזיולוגיה" "מערכת השרירים,מערכת הדם"
```

**Arguments optionnels :**

```bash
# Avec is_prof=true et is_misrad=false (défaut)
node scripts/add-questions.cjs "אנטומיה" "מערכת השרירים"

# Avec is_prof=true et is_misrad=true
node scripts/add-questions.cjs "אנטומיה" "מערכת השרירים" true true

# Avec is_prof=false et is_misrad=true
node scripts/add-questions.cjs "אנטומיה" "מערכת השרירים" false true
```

### Méthode 2 : Import complet

Si tes questions ont déjà toutes les métadonnées :

```json
[
  {
    "grande_categorie": "אנטומיה",
    "matiere": "מערכת השרירים",
    "is_prof": true,
    "is_misrad_haavoda": false,
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "reponse_correcte": "B",
    "explication": "..."
  }
]
```

**Pour plusieurs catégories/matières par question :**

```json
[
  {
    "grande_categorie": ["אנטומיה", "פיזיולוגיה"],
    "matiere": ["מערכת השרירים", "מערכת הדם"],
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "reponse_correcte": "B",
    "explication": "..."
  }
]
```

```bash
node scripts/import-questions.cjs
```

---

## 🔍 VOIR LES CATÉGORIES EXISTANTES

```bash
node scripts/add-questions.cjs --list
```

---

## 🚀 Développement

```bash
npm install
npm run dev
```

## 📦 Build & déploiement (Vercel + PWA)

L'app est hébergée sur **Vercel**. Firebase sert uniquement à la base de données (questions, mots).

### Déployer les changements

1. Commit et push sur GitHub :
```bash
git add .
git commit -m "Protocole facial + corrections"
git push
```
2. Vercel redéploie automatiquement (1–2 min). Vérifie sur [vercel.com/dashboard](https://vercel.com/dashboard).

### Mettre à jour la PWA sur ton téléphone

1. Attends que le déploiement Vercel soit **Ready** (vert).
2. Sur le téléphone :
   - **Ferme complètement** l'app PWA (pas seulement minimiser).
   - Ouvre le **site dans Safari/Chrome** (l'URL Vercel, pas l'icône).
   - Rafraîchis une fois, attends 5 secondes.
   - Rouvre depuis l'icône sur l'écran d'accueil.
3. Si tu ne vois toujours pas **Protocole facial** :
   - Supprime l'icône PWA.
   - Rouvre le site → **Ajouter à l'écran d'accueil**.

Tu dois voir **4 boutons** sur l'accueil : Oulpan, Test, Catégories, **Protocole facial**.
