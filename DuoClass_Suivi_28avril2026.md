# DuoClass — Suivi de développement
**Date : Mardi 28 avril 2026**
**Branche de travail : `nouvelle-architecture`**
**Dépôt GitHub : `https://github.com/mhg4qs8m6r-lgtm/Duoclass.git`**
**Tag stable : `stable-avant-dexie`**

---

## ✅ ACCOMPLI aujourd'hui (27 avril)

### Audit sync global
- Couverture : 60% — source de tous les bugs de la semaine
- Détail : voir suivi 27 avril

### P1 — Sync Album frames/photos (commit f0929863)
- Sync des métadonnées frames sans base64 ajoutée dans :
  UniversalAlbumPage.tsx, CreationsAtelierV2.tsx, AssemblagePanel.tsx, useSync.ts
- Réinjection photoUrl/videoUrl/thumbnailUrl depuis Dexie au moment de la restauration

### P1 — Fix contamination Dexie (commit eb69316f)
- Bug identifié : branche B de populateLocalFromServer écrivait des frames
  sans photoUrl dans Dexie → "fantômes" bloquant la réinjection dans toutes
  les sessions suivantes
- Fix branche A : ne réinjecter photoUrl que si non-null dans Dexie
- Fix branche B : ne pas créer d'entrée db.albums si aucune frame n'a de photoUrl

---

## 🔴 À VÉRIFIER EN PREMIER (matin 28 avril)
- Tester scénario complet sur compte User (Safari privé) :
  1. Ouvrir album → ajouter photo → attendre 5s
  2. Fermer Safari complètement
  3. Rouvrir → reconnecter → vérifier que la photo est toujours visible
- Si Dexie était déjà contaminé avant le fix : vider db.albums dans IndexedDB
  manuellement (F12 → Application → IndexedDB) et retester

---

## 🔧 À FAIRE (suite)

### Priorité 2 — Sync Settings
- `db.settings.put()` jamais suivi d'un `addToSyncQueue`
- Mismatch schéma : Dexie `{key, value}` vs serveur champs plats
- Impact : code maître perdu à chaque déconnexion
- Fichiers : `Parametres.tsx`, `syncService.ts`

### Priorité 3 — Albums meta updates
- Renommage d'album non synchronisé
- Faible effort, impact modéré

### Priorité 4 — Collecteur items
- Sync indirecte via projet (OK dans 90% des cas)

### Priorité 5 — Clamping au chargement initial
- Éléments débordant de la zone de travail

### Priorité 6 — Version USER de la modale calques
- Masquer Découpe/Fond pour le rôle User

### Priorité 7 — Recréer projet "Modèles passe partout"
- Chevalier + bordures dorées + fond vert + texte

### Priorité 8 — Remise à zéro (bug Dexie)
- Migration v4 drop / v5 recreate avec clé `key`
- Ne pas utiliser en attendant

---

## 🔐 TEST DES DEUX VERSIONS
- **Admin** : Safari normal → `caron7501@gmail.com`
- **User** : Safari navigation privée → `test@duoclass.com` (mdp : testuser123)

---

## ⚙️ ARCHITECTURE RAPPEL
- Rôles gérés via PostgreSQL
- Fichiers clés : `CreationsAtelierV2.tsx`, `AssemblagePanel.tsx`,
  `lib/db.ts`, `syncService.ts`, `Layout.tsx`, `UniversalAlbumPage.tsx`
- Tables PostgreSQL : `projectVersions` ✅ `sharedModeles` ✅ `usefulLinks` ✅

---

## ⚠️ RÈGLES IMPORTANTES
- Ne plus modifier le modèle **Puzzle Classique**
- Les commits incluent toujours `Co-Authored-By: Claude`
- Toujours taper **1** pour approuver les commandes git composées
- Toujours taper **2** pour approuver les modifications de fichiers
- **Avant toute modification** : lister les éléments existants et vérifier
  qu'ils sont tous préservés après
- **Ne jamais toucher à `db.ts` ou Dexie** sans backup commit préalable
- **Ne pas utiliser la remise à zéro** tant que le bug Dexie n'est pas corrigé
