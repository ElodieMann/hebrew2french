# Hebrew2French 💆‍♀️✨

App d'apprentissage Hébreu → Français avec Firebase.

---

## 📥 AJOUTER DES NOUVEAUX MOTS

### 1. Ouvre le fichier `src/data/words.json`

### 2. Ajoute tes mots :
```json
[
  {"he": "מילה", "fr": "mot"},
  {"he": "חדש", "fr": "nouveau"}
]
```

### 3. Lance la commande :
```bash
node scripts/import-words.js
```

### 4. C'est fait ! 
- Les mots sont ajoutés à Firebase
- Le fichier est vidé automatiquement

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
