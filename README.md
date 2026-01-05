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
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "reponse_correcte": "B",
    "explication": "..."
  }
]
```

**2. Lance le script avec la catégorie et matière :**

```bash
node scripts/add-questions.cjs "אנטומיה" "מערכת השרירים"
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
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "reponse_correcte": "B",
    "explication": "..."
  }
]
```

```bash
node scripts/import-questions.cjs
```

---

## 🚀 Développement

```bash
npm install
npm run dev
```

## 📦 Build

```bash
npm run build
```
