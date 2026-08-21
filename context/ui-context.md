# Contexte de l'interface utilisateur

## Principes visuels

Archivio utilise une interface institutionnelle, sobre et rassurante, adaptée à la gestion quotidienne de documents sensibles. La priorité va à la lisibilité, à la compréhension des autorisations et des statuts, ainsi qu'à l'efficacité des tâches fréquentes. L'interface ne doit pas chercher à paraître décorative ou spectaculaire.

- Éviter toute surcharge visuelle.
- Ne jamais utiliser de dégradé de couleurs.
- Utiliser les icônes avec parcimonie et seulement lorsqu'elles clarifient une action ou un type d'information.
- Préférer un libellé textuel clair à une icône ambiguë.
- Ne pas répéter une icône lorsqu'un titre ou un libellé exprime déjà la même information.
- Utiliser l'espacement, la typographie et les séparateurs discrets pour créer la hiérarchie.
- Limiter le nombre de couleurs visibles simultanément.
- Réserver les couleurs fortes aux actions importantes, états et avertissements.
- Conserver des parcours cohérents pour tous les secteurs utilisant Archivio.

## Thèmes

- Le thème clair est le thème principal de la première version.
- Le thème sombre peut être maintenu lorsqu'il est complet et cohérent, mais il ne doit pas retarder les fonctions essentielles.
- Les deux thèmes utilisent les mêmes composants, espacements, niveaux de contraste et significations de couleur.
- Aucun composant ne doit imposer une couleur claire qui rende le thème sombre illisible.

## Couleurs

Toutes les couleurs fonctionnelles doivent provenir de propriétés CSS. Les composants ne doivent pas ajouter de valeurs hexadécimales, HSL ou RGB directement dans leurs classes ou styles.

### Palette du thème clair

| Rôle | Variable CSS | Valeur |
| --- | --- | --- |
| Arrière-plan principal | `--background` | `hsl(210 20% 98%)` |
| Texte principal | `--foreground` | `hsl(222 47% 11%)` |
| Surface / carte | `--card` | `hsl(0 0% 100%)` |
| Texte de surface | `--card-foreground` | `hsl(222 47% 11%)` |
| Surface secondaire | `--muted` | `hsl(210 20% 96%)` |
| Texte secondaire | `--muted-foreground` | `hsl(215 16% 40%)` |
| Action principale | `--primary` | `hsl(217 71% 37%)` |
| Texte sur action principale | `--primary-foreground` | `hsl(0 0% 100%)` |
| Bordure | `--border` | `hsl(214 20% 88%)` |
| Champ de saisie | `--input` | `hsl(214 20% 88%)` |
| Focus | `--ring` | `hsl(217 71% 37%)` |
| Erreur / danger | `--destructive` | `hsl(0 65% 45%)` |
| Succès | `--success` | `hsl(145 60% 32%)` |
| Avertissement | `--warning` | `hsl(32 90% 40%)` |
| Information | `--info` | `hsl(202 75% 38%)` |

### Classification documentaire

La couleur complète toujours un texte explicite tel que `Niveau 3 — Confidentiel`. Elle ne constitue jamais le seul moyen de reconnaître un niveau.

| Niveau | Signification | Variable CSS | Usage visuel |
| --- | --- | --- | --- |
| 1 | Ordinaire | `--classification-1` | Gris bleu discret |
| 2 | Interne | `--classification-2` | Bleu |
| 3 | Confidentiel | `--classification-3` | Orange |
| 4 | Très sensible | `--classification-4` | Rouge |

Les valeurs exactes de ces quatre variables doivent respecter un contraste accessible dans les deux thèmes. Les couleurs de niveaux servent aux badges, bordures ou petits indicateurs ; elles ne remplissent pas de grandes surfaces.

## Typographie

| Rôle | Police | Variable |
| --- | --- | --- |
| Interface et contenu | `Inter`, avec repli sur une police système sans-serif | `--font-sans` |
| Identifiants techniques ou valeurs monospaces | `ui-monospace`, avec replis système | `--font-mono` |

- Le texte courant utilise au minimum `14px` sur ordinateur et mobile.
- Les titres de page sont courts, visibles et cohérents entre les écrans.
- Les graisses `500`, `600` et `700` établissent la hiérarchie ; ne pas multiplier les tailles décoratives.
- Les textes importants utilisent une formulation explicite, pas uniquement une couleur ou une mise en majuscules.
- L'interface utilisateur est en français dans la première version ; éviter le mélange français-anglais visible par l'utilisateur.

## Rayons, bordures et ombres

| Contexte | Convention |
| --- | --- |
| Petits contrôles et badges | `rounded-sm` |
| Boutons et champs | `rounded-md` |
| Cartes et panneaux | `rounded-lg` |
| Modales et feuilles | `rounded-lg` |

- La valeur racine `--radius` est `0.5rem`.
- Utiliser des bordures fines pour séparer les surfaces.
- Employer les ombres avec retenue, principalement pour les modales, menus flottants et surfaces superposées.
- Éviter les cartes excessivement flottantes et les effets de surélévation décoratifs.
- Aucun effet de verre, de néon ou de dégradé.

## Bibliothèque de composants

- Utiliser shadcn/ui construit sur Radix UI et Tailwind CSS.
- Les composants génériques résident dans `client/src/components/ui/`.
- Réutiliser et composer les composants existants avant d'en créer de nouveaux.
- Ne pas modifier massivement un composant générique pour répondre au besoin d'une seule page ; créer plutôt un composant métier dans le dossier approprié.
- Préserver les comportements accessibles de Radix : clavier, focus, libellés et attributs ARIA.
- Centraliser les variantes de boutons, badges et alertes au lieu de dupliquer des classes sur chaque page.

## Mise en page

### Structure principale

- Barre latérale à gauche pour la navigation principale sur grand écran.
- Barre supérieure pour le titre de page, le contexte utilisateur et les actions réellement globales.
- Zone centrale réservée au contenu principal.
- Panneau droit uniquement lorsqu'il présente une information secondaire utile ; il ne doit pas réduire inutilement l'espace documentaire.
- Navigation mobile dans un panneau escamotable ou une feuille adaptée au clavier.

### Pages documentaires

- Barre d'actions courte et stable au-dessus du contenu.
- Recherche et filtres regroupés, avec les filtres avancés repliables lorsque l'espace est limité.
- Vue tableau privilégiée pour la gestion détaillée et vue grille facultative pour la consultation visuelle.
- Nom du document, statut, niveau, département, date et auteur restent faciles à repérer.
- Les actions rares ou dangereuses sont regroupées dans un menu secondaire.
- Une page vide explique la situation et propose une seule prochaine action pertinente.

### Formulaires et modales

- Une modale traite un objectif unique et possède un titre explicite.
- Les libellés restent visibles ; le placeholder ne remplace pas un libellé.
- Les erreurs sont placées près du champ concerné et résumées si nécessaire.
- Les actions sont ordonnées de manière stable : annulation secondaire, confirmation principale, destruction séparée.
- Les longs processus ou formulaires complexes utilisent une page dédiée plutôt qu'une modale surchargée.

## Icônes

- Utiliser Lucide React lorsque la présence d'une icône est justifiée.
- Taille habituelle : `h-4 w-4` dans un bouton avec texte et `h-5 w-5` pour un contrôle autonome.
- Une icône seule exige un nom accessible et, lorsque nécessaire, une infobulle.
- Les actions importantes ou peu familières utilisent du texte, éventuellement accompagné d'une icône.
- Les icônes sont adaptées à la navigation, aux types de fichiers, à la recherche et à quelques actions universelles comme fermer ou développer.
- Ne pas ajouter d'icône à chaque titre, carte, statistique, champ, notification ou élément de menu.
- Ne pas utiliser plusieurs bibliothèques d'icônes pour le même langage visuel.

## Statuts et retours utilisateur

- Chaque statut combine texte clair et traitement visuel discret.
- Les statuts documentaires utilisent les libellés français `En attente`, `Archivé` et `Refusé`.
- Une action réussie affiche une confirmation concise.
- Une erreur explique ce qui s'est passé et, lorsque possible, comment continuer.
- Une opération longue montre un état de chargement sans bloquer inutilement toute la page.
- Les actions destructrices demandent une confirmation décrivant précisément la conséquence.
- Les demandes d'accès affichent leur état, l'expiration éventuelle et le décideur lorsque l'utilisateur est autorisé à voir ces informations.

## Accessibilité et ergonomie

- Contraste conforme au minimum à WCAG AA pour le texte et les contrôles essentiels.
- Focus clavier toujours visible.
- Zone interactive d'au moins `40px` lorsque possible, particulièrement sur mobile.
- Toutes les actions sont accessibles au clavier.
- Les tableaux conservent des en-têtes associés et offrent une présentation mobile utilisable.
- Les couleurs de classification, succès, avertissement et erreur sont toujours accompagnées d'un texte ou symbole compréhensible.
- Respecter la réduction des animations demandée par le système.
- Ne pas ajouter d'animation décorative continue.

## Responsive

- Concevoir d'abord les tâches essentielles pour les écrans étroits, puis enrichir la disposition sur grand écran.
- Ne jamais cacher une action indispensable uniquement parce que l'écran est petit.
- Éviter le défilement horizontal de la page ; autoriser celui d'un tableau lorsque aucune représentation plus claire n'est possible.
- Les panneaux latéraux deviennent escamotables sur mobile.
- Les actions principales restent visibles sans multiplier les boutons dans chaque ligne ou carte.

## Règles de migration de l'interface existante

- Remplacer progressivement les couleurs Tailwind codées directement, telles que `text-slate-*` ou `bg-blue-*`, par les jetons sémantiques lorsque le composant est modifié.
- Ne pas entreprendre une réécriture visuelle globale pendant la correction d'une fonctionnalité métier sans périmètre explicitement approuvé.
- Corriger en priorité les incohérences qui nuisent à la lisibilité, au thème sombre, à l'accessibilité ou à la compréhension des autorisations.
- Toute nouvelle interface respecte immédiatement les jetons et conventions de ce document.
