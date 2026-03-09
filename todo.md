# DuoClass — TODO

## Migration & Infrastructure

- [x] Copier tous les fichiers sources depuis /upload vers /duoclass
- [x] Installer les dépendances manquantes (uuid, @types/uuid, etc.)
- [x] Reconstruire le db.ts client Dexie/IndexedDB avec tous les types
- [x] Corriger les alias de chemins (@/db, @/components/creations/*)
- [x] Résoudre 0 erreur TypeScript (compilation propre)
- [x] 66 tests vitest passés (license, contour, sync, mes-collages, auth.logout)

## Outil Ligne — Bugs S6

- [x] S6-1 : Saut de ligne au clic de validation — utiliser lineDrawStartRef synchrone au lieu du state
- [x] S6-2 : Touche Échap pour quitter le mode pointillé et réinitialiser la chaîne
- [x] S6-3 : Bouton "Éditer les segments" inopérant — connecter segmentEditorActive dans AssemblagePanel
- [x] S6-4 : Bouton "Arrondir la ligne" absent — passer lineSelected/lineIsRounded/onRoundLine

## Outil Ligne — Améliorations UX

- [x] Indicateur visuel du nombre de segments dans la chaîne (badge orange dans le panneau Assemblage)
- [x] Sélecteur de couleur de ligne (input type=color dans le panneau Assemblage, visible en mode tracé)
- [x] Slider d'épaisseur de ligne 1–5 px (pas 0.5) dans le panneau Assemblage
- [x] Couleur et épaisseur appliquées à chaque newLine tracé (openingColor + strokeWidth)
- [x] Message d'aide contextuel (Cliquer-glisser / Échap pour annuler)

## Passe-partout — Simplification section B

- [x] activeOpeningId passé à null dans l'appel AssemblagePanel (clic direct = placement)
- [x] Aucun bouton "Valider" dans le JSX de PassePartoutSection
- [x] onValidateOpening absent de CreationsAtelierV2 (logique de validation supprimée)

## Corrections supplémentaires (session courante)

- [x] Schéma Dexie v2 : ajout index `dateAdded` sur `creations_basket` (migration automatique)
- [x] Icônes et images statiques uploadées sur CDN (icon-book, icon-camera, icon-video-projector, app-demo, apple-touch-icon)
- [x] Remplacement de tous les chemins `/images/*` et `/assets/*` par URLs CDN dans 4 fichiers sources

## Fonctionnalités à venir

- [ ] Détourage Python (endpoint API /api/detourage)
- [ ] Synchronisation cloud tRPC (sync-router.ts → procédures protectedProcedure)
- [ ] Système de licences backend (license-db.ts → routers)
- [ ] Tests vitest pour db.ts client, routes tRPC, utilitaires imageUtils
- [ ] Indicateur de progression du détourage dans DetourageTab
- [x] Bug : erreur 404 à la publication — build de production vérifié OK (HTTP 200 sur /, /albums, /workspace, /api/trpc, assets CSS)
- [x] Bug critique : erreur 404 à la publication — cause : boutons CTA redirigaient vers OAuth Manus (manus.im/authorize) inaccessible aux utilisateurs externes. Correction : handleStartFree() redirige directement vers /albums (accès sans compte requis). handleLogin() conservé pour "Se connecter" uniquement.
- [x] Bug critique : échec build Docker — package sharp supprimé (inutilisé dans le code, uniquement en dépendance orpheline). Build de production validé (17.89s, aucune référence sharp dans dist/).
- [x] Bug : erreur 404 quelques secondes après le chargement de /albums — cause : TrialBanner appelait subscription.getStatus (protectedProcedure) → UNAUTHORIZED → redirection vers manus.im/authorize (HTTP 404). Triple correction : (1) subscription.getStatus en publicProcedure, (2) getLoginUrl() corrigé /authorize→/login, (3) main.tsx ne redirige que sur auth.me.

## Outil Ligne — Sélection et arrondissement (session 2026-03-05 après-midi)
- [x] Bug : sélection "tout" compte 4 éléments pour 1 ligne — confirmé : chaque segment tracé = 1 élément canvas indépendant (comportement attendu)
- [x] Bug : zone de clic trop fine sur les segments de ligne (2-3px) — corrigé : ajout d'une hit area transparente de 16px sur chaque segment (path/line SVG transparent strokeWidth=16)
- [x] Problème 1 : arrondir un segment individuel — corrigé : hit area transparente 16px sur chaque segment SVG, le clic sélectionne le bon segment, le bouton Arrondir fonctionne
- [x] Problème 2 : regrouper les N segments d'une chaîne — corrigé : finalizeLineChain() assigne un groupId commun à la fin du tracé (Escape, toggle, fermeture, annulation). Cliquer sur 1 segment sélectionne toute la chaîne.
- [x] Amélioration : "Arrondir la ligne" visible/actif uniquement quand exactement 1 ligne est sélectionnée (déjà implémenté via lineSelected)

## Éditeur de segments sur formes géométriques (session 2026-03-06)
- [x] Afficher les nœuds (points de contrôle) sur le canvas quand une forme B est sélectionnée
- [x] Permettre la sélection d'un segment individuel (clic sur le segment)
- [x] Bouton "Concave" (arc vers l'intérieur) et "Convexe" (arc vers l'extérieur) sur le segment sélectionné
- [x] Bouton "Supprimer ce segment" (ouvre la forme à cet endroit)
- [x] Bouton "Redresser" (remet le segment en ligne droite)
- [x] Bouton "Arrondir tous les segments" conservé dans le panneau
- [x] Étendre le bouton "Éditer les segments" pour activer le mode nœuds (isNodeEditMode)

## Éditeur de segments simplifié (session 2026-03-06 après-midi)
- [x] Supprimer le bouton "Éditer les segments" et le mode isNodeEditMode
- [x] Clic direct sur un côté d'une forme → sélection du segment (surbrillance violette)
- [x] Menu flottant 2 boutons : Arrondir / Supprimer (positionné près du segment cliqué)
- [x] Clic ailleurs → désélectionne le segment
- [x] Bug : clic sur un côté désélectionne tout — corrigé : SVG overlay passe à pointerEvents:all + onMouseDown/onClick stopPropagation sur le SVG et les <g>. useEffect ne réinitialise selectedSegmentIndex que si l'élément change.
- [x] UX : trait de surbrillance réduit à 1.5px, couleur indigo-400 (#818cf8), tirets discrets

## Éditeur de segments — Refonte logique (session 2026-03-06 soir)
- [x] Étape 1 : menu flottant Arrondir/Supprimer sur clic d'un segment de ligne tracé manuellement (positionné au milieu du segment, visible quand isSelected)
- [x] Étape 2 : rétablir comportement normal des formes (overlay conditionné à isNodeEditMode)
- [x] Étape 2 suite : bouton "Éditer les segments" dans le panneau active isNodeEditMode (Échap pour quitter, réinitialise selectedSegmentIndex)

## Corrections urgentes (session 2026-03-06 fin)
- [x] Bug : menu flottant Arrondir/Supprimer invisible sur les lignes tracées — corrigé : menu déplacé hors du SVG (foreignObject supprimé), rendu comme div HTML absolu positionné au milieu du segment
- [x] UX : bouton "Éditer les segments" supprimé du panneau Assemblage (déjà fait en session précédente)

## Corrections session 2026-03-06 (suite utilisateur)
- [x] Bug : bouton "Éditer les segments" supprimé définitivement de AssemblagePanel.tsx (+ synchronisation avec creations/AssemblagePanel.tsx)
- [x] Bug : menu flottant Arrondir/Supprimer corrigé — pointer-events-none retiré du SVG parent de la ligne (bloquait les enfants dans Chrome), pointerEvents:'none' ajouté sur les éléments visuels uniquement (halo blanc, trait principal)

## Corrections session 2026-03-07
- [x] Bug : bouton "Ligne" reste orange après tracé — isLineDrawMode désactivé automatiquement après chaque segment tracé
- [x] UX : épaisseur par défaut réduite de 1 px à 0.5 px (slider min=0.5, valeur initiale=0.5)
- [x] UX : menu flottant Arrondir/Supprimer rendu plus discret — fond blanc semi-transparent, bordure grise, texte gris clair, taille réduite

## Corrections session 2026-03-07 (suite)
- [x] Bug : bouton Supprimer corrigé — data-canvas-element ajouté sur le div du menu, suppression garantie avant désélection, texte rouge visible dès le départ
- [x] UX : bouton "Arrondir la ligne" supprimé du panneau gauche (doublon avec le menu flottant)
- [x] UX : bouton OK centré ajouté sous le menu flottant — désélectionne la ligne et ferme le menu

## Corrections session 2026-03-07 (suite 2)
- [x] Bug : grande ligne non sélectionnable — onClick stopPropagation ajouté sur le SVG et la hit area, hit area agrandie 16→ 20px
- [x] Bug : menu flottant disparaît au relâchement — même cause que ci-dessus (click remontait au pageRef), corrigé par onClick stopPropagation sur le SVG

## Corrections session 2026-03-07 (suite 3)
- [x] Bug : sélection inter-lignes corrigée — SVG parent repasse à pointer-events:none (les éléments SVG internes gardent pointer-events:stroke/all selon la spec SVG)
- [x] UX : menu flottant sans fond blanc — textes seuls avec text-shadow blanc pour lisibilité sur fond clair ou foncé

## Fonctionnalité : édition de segments sur les formes géométriques
- [x] Implémenter la détection de clic sur un segment de Rectangle/Carré → menu flottant Arrondir/Supprimer/OK
- [x] Étendre la détection de segments aux formes polygonales (Losange, Hexagone, Arche) — Étoile exclue (courbe continue)
- [x] Formes courbes (Rond, Ovale, Cœur) maintenues en exclusion — contours non-polygonaux, édition par segment non applicable

## Corrections session 2026-03-07 (suite 2)
- [x] UX : slider d'intensité d'arrondi ajouté — boutons − / valeur% / + (5–80%), mise à jour en temps réel de la courbe de Bézier
- [x] Bug : bouton OK corrigé — data-canvas-element présent, onClick stopPropagation + setSelectedSegmentIndex(null) fonctionnel
