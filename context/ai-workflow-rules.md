# Règles de travail de l'agent IA

## Mission

L'agent travaille comme un ingénieur responsable de la fiabilité d'Archivio. Il utilise les fichiers de contexte comme spécification durable, inspecte le code et les tests avant de conclure, et avance par petites unités vérifiables. Son objectif n'est pas de produire rapidement beaucoup de code, mais de livrer des changements exacts, sûrs, compréhensibles et traçables.

L'implémentation existante décrit ce qui est actuellement présent. Les fichiers de contexte décrivent ce qui est voulu. Une différence entre les deux est un écart à analyser, pas une permission de modifier silencieusement l'un pour correspondre à l'autre.

## Ordre de lecture obligatoire

Avant toute analyse importante, planification, revue ou implémentation :

1. lire `AGENTS.md` ;
2. lire `context/project-overview.md` ;
3. lire `context/architecture.md` ;
4. lire `context/current-state-audit.md` afin de connaître les écarts et risques déjà vérifiés ;
5. lire `context/ui-context.md` pour toute modification visible ou de composant ;
6. lire `context/code-standards.md` ;
7. lire le présent fichier ;
8. lire `context/progress-tracker.md` ;
9. inspecter les fichiers de code, tests, migrations et configuration concernés.

L'agent ne doit pas charger tout le dépôt sans raison. Après le contexte obligatoire, il cible les fichiers qui peuvent prouver ou contredire son hypothèse.

## Hiérarchie des sources

En cas de contradiction, utiliser cet ordre de priorité :

1. instruction explicite et actuelle de l'utilisateur ;
2. décisions validées dans les fichiers de contexte ;
3. tests qui représentent clairement le comportement voulu ;
4. contrats partagés et migrations de base de données ;
5. implémentation actuelle ;
6. README, commentaires anciens, données factices ou noms historiques.

Une source de priorité inférieure ne doit pas écraser silencieusement une source supérieure. Si l'instruction de l'utilisateur modifie durablement le produit, l'architecture ou les standards, mettre à jour le contexte concerné dans la même unité de travail.

## Discipline contre les suppositions

- Ne jamais inventer une règle métier, une autorisation, un statut, une relation de données ou une exigence de sécurité.
- Distinguer explicitement dans l'analyse : `confirmé par le contexte`, `observé dans le code`, `inférence` et `question ouverte`.
- Vérifier les appels et leurs consommateurs avant de changer un contrat, un type ou une réponse API.
- Rechercher les tests, migrations et usages avant de renommer ou supprimer un élément.
- Ne pas interpréter une interface masquée comme preuve que le serveur interdit l'action.
- Ne pas considérer une route existante comme fonctionnelle sans vérifier le flux complet et les erreurs.
- Ne pas choisir arbitrairement entre deux comportements plausibles ayant des conséquences métier ou de sécurité.
- Une supposition réversible et sans effet métier peut être utilisée pour avancer si elle est annoncée. Toute supposition affectant les données, autorisations, utilisateurs ou architecture exige une clarification ou une décision documentée.

## Cycle de travail obligatoire

### 1. Comprendre la demande

- Reformuler le résultat attendu de manière vérifiable.
- Déterminer si l'utilisateur demande une analyse, un diagnostic, une correction ou une nouvelle fonctionnalité.
- Ne pas implémenter une correction lorsqu'un diagnostic seulement a été demandé.
- Identifier les rôles, données et flux de documents touchés.

### 2. Établir l'état réel

- Inspecter le code concerné, ses appels, les types partagés, le schéma Prisma et les tests applicables.
- Reproduire le problème ou établir une preuve statique suffisamment précise.
- Vérifier l'état du répertoire avant modification et préserver les changements de l'utilisateur.
- Relever les problèmes préexistants séparément du périmètre demandé.

### 3. Comparer à la spécification

- Identifier la règle de contexte applicable.
- Décrire l'écart exact entre le comportement observé et le comportement voulu.
- Ajouter une question dans `progress-tracker.md` si la spécification nécessaire manque.
- Résoudre la question dans le contexte approprié avant d'implémenter une décision irréversible ou sensible.

### 4. Définir une unité de travail

- Choisir le plus petit changement qui produit un résultat utile et vérifiable de bout en bout.
- Énumérer les fichiers et frontières susceptibles d'être modifiés.
- Définir les contrôles à exécuter avant de commencer à coder.
- Pour une modification complexe, conserver un plan court avec une seule étape active à la fois.

### 5. Implémenter

- Modifier uniquement les fichiers nécessaires à l'unité.
- Suivre `architecture.md`, `ui-context.md` et `code-standards.md`.
- Ajouter ou adapter les tests en même temps que le comportement.
- Ne pas mélanger des nettoyages sans rapport avec la fonctionnalité.
- Préserver la compatibilité lorsque nécessaire ou documenter explicitement la migration.

### 6. Vérifier

- Relire le diff ou les fichiers modifiés pour détecter les changements accidentels.
- Exécuter d'abord les tests ciblés, puis les vérifications plus larges proportionnées au risque.
- Pour une fonctionnalité critique, tester les chemins autorisé, interdit, invalide, absent et erreur serveur.
- Vérifier visuellement les interfaces modifiées dans les tailles pertinentes lorsque les outils le permettent.
- Ne jamais annoncer qu'une vérification a réussi si elle n'a pas été exécutée.

### 7. Documenter et livrer

- Mettre à jour `progress-tracker.md` après toute modification significative.
- Mettre à jour le contexte concerné si le comportement validé change la spécification.
- Résumer le résultat livré, pas seulement les fichiers touchés.
- Indiquer les commandes de vérification exécutées et leurs résultats.
- Signaler clairement ce qui reste ouvert, non vérifié ou hors périmètre.

## Règles de périmètre

- Travailler sur une seule unité fonctionnelle principale à la fois.
- Préférer une tranche verticale complète à plusieurs changements partiels dispersés.
- Ne pas combiner plusieurs routes sans relation directe uniquement parce qu'elles se trouvent dans le même fichier.
- Ne pas entreprendre une refonte globale pendant une correction locale.
- Ne pas renommer massivement les modèles, routes et composants dans la même étape qu'une nouvelle fonctionnalité métier, sauf nécessité démontrée.
- Ne pas ajouter une fonctionnalité future simplement parce que l'architecture la permet.
- Une modification de sécurité peut inclure les appels directement concernés afin de fermer réellement la faille, mais son périmètre doit rester explicite.

## Quand diviser le travail

Diviser une unité lorsqu'elle combine au moins deux éléments pouvant être livrés et vérifiés indépendamment, notamment :

- migration de données et refonte complète de l'interface ;
- authentification et nouvelle fonctionnalité documentaire sans dépendance directe ;
- plusieurs domaines API indépendants ;
- ajout d'un modèle Prisma et réorganisation générale du serveur ;
- correction fonctionnelle et remplacement global des styles ;
- décisions produit encore non définies ;
- changement impossible à vérifier rapidement de bout en bout.

Exemple pour les demandes d'accès :

1. ajouter et migrer le modèle de données ;
2. implémenter et tester le service d'autorisation ;
3. exposer les routes de création et de décision ;
4. sécuriser la consultation temporaire sans accorder la route de téléchargement ;
5. construire l'interface utilisateur et administrative.

## Gestion des exigences manquantes

- Rechercher d'abord la réponse dans les fichiers de contexte, puis dans les contrats, migrations, tests et code concernés.
- Si plusieurs interprétations restent possibles, expliquer brièvement leurs conséquences.
- Ajouter la question à `progress-tracker.md` avant de suspendre une unité qui en dépend.
- Demander une décision à l'utilisateur lorsque le choix affecte les droits, données, utilisateurs, coûts, sécurité ou portée du produit.
- Après réponse, mettre à jour le fichier de contexte approprié avant ou avec l'implémentation.
- Continuer les analyses et tâches indépendantes qui ne dépendent pas de la question.

## Traitement des contradictions

- Ne pas corriger la documentation pour la faire correspondre au code sans établir que le code représente la décision voulue.
- Ne pas modifier le code pour suivre un texte manifestement ancien sans confirmer la décision actuelle.
- Décrire la contradiction avec les fichiers et comportements concernés.
- Proposer une résolution fondée sur la vision, la sécurité et le coût de migration.
- Une fois la décision prise, corriger dans la même unité les sources de vérité qui doivent rester synchronisées.

## Fichiers et zones protégés

Ne pas modifier les éléments suivants sans nécessité explicite dans l'unité de travail :

- `prisma/dev.db` — base binaire locale ; utiliser Prisma, les migrations ou les scripts prévus.
- `prisma/migrations/` existantes — ne pas réécrire l'historique appliqué ; créer une nouvelle migration.
- `package-lock.json` — uniquement lors d'une modification volontaire des dépendances.
- `client/src/components/ui/` — primitives shadcn/ui ; privilégier la composition et limiter les changements aux besoins génériques confirmés.
- fichiers binaires téléversés, archives réelles et sauvegardes — ne jamais les modifier pendant un test ou un diagnostic.
- secrets, fichiers d'environnement et identifiants réels — ne pas les afficher, journaliser ou remplacer.
- code généré par Prisma ou une dépendance — régénérer avec l'outil approprié au lieu de l'éditer.
- fichiers de sauvegarde ou changements non liés appartenant à l'utilisateur — les préserver.

Une opération destructive exige la validation précise de sa cible et une autorisation claire lorsqu'elle n'est pas explicitement demandée.

## Modifications de base de données

Avant une migration :

1. décrire le changement de modèle et ses invariants ;
2. inspecter les données existantes pertinentes ;
3. définir les valeurs par défaut ou la conversion des anciennes lignes ;
4. créer une migration versionnée ;
5. vérifier la migration sur une base isolée ou une copie sûre ;
6. vérifier le retour arrière ou documenter pourquoi il nécessite une restauration ;
7. mettre à jour les types, validations, services et tests concernés.

Ne jamais supprimer une colonne, relation ou donnée existante sans stratégie de conservation et approbation adaptée au risque.

## Modifications de sécurité et d'autorisation

- Traiter les autorisations comme une règle métier serveur, pas comme une condition d'affichage.
- Cartographier les rôles et niveaux touchés avant la modification.
- Tester au moins un cas autorisé et un cas refusé pour chaque frontière concernée.
- Vérifier les accès par identifiant direct afin de prévenir les contournements de l'interface.
- Ne pas élargir un droit pour réparer un flux bloqué ; corriger la décision d'autorisation exacte.
- Journaliser les décisions sensibles sans exposer le document ou les secrets.
- Une faille critique découverte hors périmètre est signalée immédiatement ; la corriger seulement si l'utilisateur a demandé une correction ou si elle empêche directement et sûrement la fonctionnalité demandée.

## Modifications d'interface

- Vérifier les états chargement, vide, erreur, interdit et succès.
- Vérifier les rôles concernés, pas uniquement le superutilisateur.
- Respecter le thème sobre : aucune couleur en dégradé et aucune multiplication décorative des icônes.
- Utiliser un texte explicite pour les niveaux, statuts et actions sensibles.
- Tester le clavier, le focus et une largeur mobile pertinente.
- Une modification visuelle ne doit pas masquer un problème d'autorisation ou une erreur serveur.
- Ne pas considérer une maquette visuelle comme terminée si ses actions principales ne sont pas connectées au comportement réel demandé.

## Commandes de validation

Sélectionner les commandes selon la modification :

- `npm run check` — vérification TypeScript.
- `npm test -- --run` — suite Vitest sans mode interactif.
- `npm run test:api` — tests API ciblés, lorsqu'ils existent.
- `npm run test:frontend` — tests frontend ciblés, lorsqu'ils existent.
- `npm run build` — construction frontend et serveur.
- `npm run db:generate` — régénération du client Prisma après modification du schéma.

Une commande absente, défectueuse ou sans tests correspondants n'est pas une réussite silencieuse. La consigner comme dette ou obstacle vérifiable.

## Définition d'une unité terminée

Une unité est terminée seulement lorsque :

1. son résultat correspond à une règle de contexte ou à une décision utilisateur documentée ;
2. le flux principal fonctionne dans son périmètre ;
3. les entrées invalides et accès interdits concernés sont traités ;
4. aucun invariant de `architecture.md` n'est violé ;
5. les tests pertinents ont été ajoutés ou la raison de leur absence est explicitement consignée ;
6. les vérifications applicables réussissent, ou les échecs préexistants sont identifiés précisément ;
7. aucun secret, fichier réel ou changement utilisateur non lié n'a été altéré ;
8. les fichiers de contexte concernés sont synchronisés ;
9. `progress-tracker.md` décrit le résultat, les questions restantes et la prochaine unité ;
10. le compte rendu distingue clairement ce qui est livré de ce qui reste à faire.

## Mise à jour du suivi

Après une modification significative, mettre à jour les rubriques pertinentes de `progress-tracker.md` :

- phase actuelle ;
- objectif actuel ;
- terminé ;
- en cours ;
- prochaines étapes ;
- questions ouvertes ;
- décisions d'architecture ;
- notes de session.

Ne pas transformer le suivi en journal détaillé de chaque commande. Conserver les informations nécessaires pour reprendre le projet sans deviner.

## Format du compte rendu

À la fin d'une unité d'implémentation, communiquer de façon concise :

1. le résultat obtenu ;
2. les décisions importantes ou écarts résolus ;
3. les vérifications exécutées et leur résultat ;
4. les limites, risques ou questions restantes ;
5. la prochaine unité logique, si elle est connue.

Ne pas affirmer qu'une fonctionnalité est complète, sécurisée, prête pour la production ou testée de bout en bout sans preuve correspondante.
