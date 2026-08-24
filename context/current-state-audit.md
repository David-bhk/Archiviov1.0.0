# Audit de l'état actuel

## Objet et date de référence

Cet audit compare l'implémentation observée d'Archivio à la cible définie dans les fichiers de contexte. Il constitue une photographie de référence au 3 août 2026. Il ne remplace pas une vérification après modification : chaque constat doit être réévalué lorsque le code concerné change.

## Méthode et limites

L'audit repose sur :

- l'inspection du frontend, du serveur, des contrats partagés, du schéma Prisma, de la migration initiale et du seed ;
- l'inventaire des routes API et des appels frontend ;
- `npm run check` ;
- `npm test -- --run` ;
- `npm run build`.

Limites :

- aucun test applicatif n'existe actuellement ;
- aucun scénario manuel complet n'a été exécuté dans un navigateur ;
- aucune archive réelle ne doit être utilisée pour vérifier le système ;
- le répertoire fourni ne contient pas de métadonnées Git exploitables dans cet environnement ;
- l'audit ne constitue pas un test d'intrusion complet.

## Baseline technique

| Contrôle | Résultat | Interprétation |
| --- | --- | --- |
| TypeScript — `npm run check` | Échec | 14 erreurs, principalement dues aux rôles minuscules/majuscules |
| Tests — `npm test -- --run` | Échec | L'exécutable local `vitest` est absent malgré sa déclaration dans `package.json` |
| Build — `npm run build` | Réussite | Vite et esbuild construisent l'application malgré les erreurs TypeScript |
| Tests applicatifs présents | Aucun | Les règles métier et autorisations ne sont pas protégées contre les régressions |
| Données navigateur | Non vérifié | Aucun parcours manuel complet exécuté pendant cet audit statique |

Le build réussi ne signifie donc pas que l'application est correcte : il n'exécute ni le contrôle TypeScript complet ni les tests métier.

## Mise à jour après la première unité de stabilisation

La baseline a été améliorée après l'audit initial :

| Contrôle | Nouveau résultat | Détail |
| --- | --- | --- |
| TypeScript — `npm run check` | Réussite | Les 14 erreurs de rôles ont été supprimées |
| Tests — `npm test -- --run` | Réussite contrôlée | 9 tests exécutés dans 2 fichiers |
| Build — `npm run build` | Réussite | Frontend et serveur construits |
| Rôles | Stabilisés | `SUPERUSER`, `ADMIN`, `USER` sont canoniques de Prisma au frontend |
| Fichiers de fiabilité | Stabilisés | Migrations, middlewares et tests ne sont plus ignorés |

Parmi les 9 tests, 5 sont volontairement déclarés avec `it.fails`. Ils documentent des comportements dangereux encore présents et passent uniquement parce que l'échec sécurisé attendu n'est pas encore satisfait :

- jeton forgé avec le secret JWT public de repli ;
- téléchargement d'un document étranger par un utilisateur simple ;
- suppression d'un document étranger par un utilisateur simple ;
- statistiques obtenues sans authentification en fournissant un `userId` ;
- création d'un superutilisateur par un administrateur.

Ces cinq vulnérabilités ont ensuite été corrigées dans l'unité P0 et les marqueurs `it.fails` ont été retirés. La baseline actuelle est de 18 tests normaux répartis dans 3 fichiers, avec TypeScript et build réussis.

L'installation des outils de test a signalé 24 vulnérabilités de dépendances (`3 low`, `6 moderate`, `13 high`, `2 critical`). Elles doivent être analysées séparément avec `npm audit` avant toute mise à jour automatique. Ne pas lancer `npm audit fix --force` sans étude des changements majeurs.

## Résumé exécutif

L'application possède une base démontrable : authentification, utilisateurs, départements, liste de fichiers, recherche, statistiques, téléversement, téléchargement, suppression logique en base et composants d'administration. Cependant, plusieurs routes critiques n'appliquent pas les règles d'autorisation décrites pour Archivio. Les niveaux de classification et demandes d'accès sont absents. Le flux `pending → archived/rejected` n'est pas réellement implémenté, car un téléversement est créé comme approuvé. Le téléchargement existe techniquement mais contourne entièrement le périmètre documentaire.

La première priorité n'est pas d'ajouter l'interface des demandes d'accès. Il faut d'abord stabiliser les contrats de rôle, fermer les accès serveur non autorisés, créer une base de tests et rendre le stockage fiable. Construire de nouvelles fonctions sur les règles actuelles augmenterait le risque et le coût de correction.

## Criticité utilisée

- `P0 — Critique` : exposition, destruction ou élévation de privilège possible ; bloque toute démonstration avec des documents sensibles.
- `P1 — Élevée` : flux essentiel absent ou fondation incohérente ; bloque la première version fiable.
- `P2 — Moyenne` : comportement partiel, dette importante ou mauvaise expérience qui ne crée pas seule une exposition critique.
- `P3 — Faible` : amélioration utile mais non bloquante pour la démonstration initiale.

## Constats P0 — Critiques

### A01 — Téléchargement sans autorisation documentaire

**État : résolu pour le modèle actuel.** `GET /api/files/:id/download` recharge le compte actif et applique le service d'autorisation centralisé. Un utilisateur simple est limité à ses documents ou à ceux de son département et seulement après approbation ; un admin est limité à son département ; le superutilisateur possède l'accès global. Les niveaux et demandes temporaires seront intégrés lors de leurs unités dédiées.

**Cible :** décision d'autorisation centralisée côté serveur immédiatement avant l'envoi ; refus des documents supprimés ou non archivés ; audit du téléchargement.

### A02 — Suppression de document sans autorisation

**État : résolu.** La suppression est réservée au superutilisateur ou à l'admin du même département. Elle est désormais uniquement logique et conserve le fichier physique jusqu'à la définition d'une politique de rétention.

**Cible :** politique d'autorisation explicite, suppression logique avant toute purge physique, journal d'audit et politique de conservation.

### A03 — Statistiques avec usurpation d'identité

**État : résolu.** `GET /api/stats` exige l'authentification, recharge le compte actif et utilise exclusivement l'identité du JWT. Les appels frontend ne transmettent plus de `userId`.

**Cible :** authentification obligatoire et identité exclusivement issue du jeton validé.

### A04 — Clé JWT de repli connue

**État : résolu.** `JWT_SECRET` est obligatoire au chargement du serveur. Une valeur dédiée est injectée uniquement dans l'environnement Vitest et `.env.example` documente la configuration sans fournir de secret utilisable.

**Cible :** secret obligatoire, validation au démarrage et refus de démarrer en production s'il manque.

### A05 — Gestion des utilisateurs trop permissive pour les administrateurs

**État : résolu dans le périmètre actuel.** Un admin crée ou supprime uniquement des utilisateurs simples de son département. Il ne peut pas créer d'admin ou de superutilisateur. L'auto-suppression et la suppression d'un superutilisateur sont interdites. Le superutilisateur conserve la création de tous les rôles. La désactivation normale des comptes reste une amélioration P2 distincte.

**Cible :** seul un superutilisateur attribue les rôles privilégiés ; limites départementales explicites pour les admins ; impossibilité de supprimer son propre compte ou le dernier superutilisateur sans procédure contrôlée.

### A06 — Secrets et mots de passe potentiellement journalisés

**État : résolu.** Les corps de création ne sont plus journalisés et le middleware HTTP ne capture plus les réponses JSON. Les logs conservent uniquement méthode, chemin, statut et durée. La réponse de l'historique projette désormais explicitement les seuls champs publics de l'utilisateur et du document ; aucun hash de mot de passe ni chemin physique n'est renvoyé.

**Cible :** supprimer les logs de corps sensibles, appliquer une journalisation structurée avec redaction et ne jamais journaliser jetons ou mots de passe.

## Constats P1 — Élevés

### A07 — Contrat des rôles incohérent

**État : résolu dans la première unité de stabilisation.** Prisma, les contrats partagés, le stockage, le jeton, les middlewares et le frontend utilisent maintenant `SUPERUSER`, `ADMIN`, `USER`. Le middleware refuse un jeton contenant un rôle non canonique et TypeScript réussit.

**Conséquences observées :** affichage ou activation incorrects, pages d'approbation inaccessibles, branches de téléversement incohérentes et risque de règles différentes entre client et serveur.

**Cible :** représentation canonique partagée de bout en bout, sans transformations dispersées.

### A08 — Cycle de validation non implémenté

**État : résolu dans le périmètre défini.** Tout téléversement est créé `pending`. Un admin de même département ou un superutilisateur peut le transformer une seule fois en `archived` ou `rejected`. La décision conserve décideur, date et justification dans la même transaction que l'événement d'audit. Le traitement ultérieur d'un document refusé reste une décision produit ouverte.

**Cible :** transitions `pending → archived/rejected`, preuve de décision et périmètre d'approbation testé.

### A09 — Page d'approbation non raccordée et appels sans JWT

**État : résolu fonctionnellement et migré visuellement, vérification interactive restante.** Les routes frontend existent, la file pending utilise le client API authentifié et le contrat paginé. L'écran reprend le shell institutionnel responsive, affiche le périmètre réel du rôle, gère chargement, vide, erreur et pagination, puis isole l'archivage et le refus dans des confirmations accessibles. Chaque décision impose une justification de 3 à 1 000 caractères et invalide les données documentaires, statistiques et d'audit concernées. Aucun navigateur contrôlable n'était disponible pour la vérification interactive de cette unité.

**Cible :** routes frontend accessibles seulement aux rôles autorisés, client API commun et contrat paginé cohérent.

### A10 — Hiérarchie de niveaux non activée

**État : fondation de données introduite, comportement absent.** `Department.accessLevel` et `File.classificationLevel` acceptent uniquement les niveaux 1 à 4 lorsqu'ils sont renseignés. Ils restent nullable pendant la transition afin de ne pas inventer la classification des départements existants. Aucun contrôle d'autorisation ne s'appuie encore sur ces champs.

**Cible :** `departmentId` stable, niveau 1 à 4, niveau documentaire et service d'autorisation centralisé.

### A11 — Demandes d'accès absentes

**État : absent.** Aucun modèle, service, route ou écran ne représente la demande, la décision, l'expiration de 24 heures ou la consultation protégée en lecture seule. La route actuelle sert uniquement le téléchargement direct et aucun visualiseur temporaire n'existe.

**Cible :** implémentation par tranches après stabilisation de l'autorisation documentaire.

### A12 — Gestion du fichier et chemin non fiables

**État : partiellement résolu.** La racine de stockage est configurée, les nouveaux chemins sont relatifs, les noms physiques utilisent un UUID et toute résolution hors racine est refusée. Les tests couvrent la traversée et les chemins absolus externes. Les contraintes techniques actuellement appliquées par Multer — extensions autorisées et taille maximale de 10 Mio — sont désormais centralisées et partagées avec l'interface de téléversement, sans les présenter comme une décision produit définitive. La détection du type réel, les limites définitives et les anciennes métadonnées pointant vers des fichiers absents restent ouvertes.

**Cible :** racine configurée, chemins relatifs contrôlés, résolution anti-traversée, validation du type réel, fixtures de test et cohérence base/fichier.

### A13 — Base de tests initiale créée

**État : partiellement résolu.** Vitest, jsdom et la couverture V8 sont installés et verrouillés. Deux fichiers exécutent 9 tests sur l'authentification, les rôles et les routes P0. La couverture reste initiale et ne protège pas encore l'ensemble des flux documentaires.

**Cible :** environnement isolé et premiers tests centrés sur authentification, autorisation, upload, validation et téléchargement.

### A14 — `.gitignore` exclut les éléments de fiabilité

**État : résolu dans la première unité de stabilisation.** `.gitignore` n'exclut plus `prisma/migrations/`, `server/middleware/`, les tests TypeScript ni `client/src/test/`.

**Cible :** ignorer les secrets, bases locales, uploads et sorties de build, mais versionner le code de sécurité, les migrations et tests.

### A15 — Relations départementales instables

**État : fondation migrée, contrats historiques encore actifs.** Une migration non destructive ajoute et rétromigre `User.departmentId` et `File.departmentId` vers `Department.id`, avec clés étrangères et index. Les colonnes textuelles sont conservées pendant la migration des contrats, routes et filtres ; le département envoyé au téléversement peut encore provenir du client pour les rôles privilégiés.

**Cible :** clés étrangères `departmentId` et attribution serveur selon les règles métier.

## Constats P2 — Moyens

### A16 — Autorisations dupliquées dans l'interface

`RoleContext`, `useRoleAccess` et `Sidebar` implémentent des variantes de `hasAccess`. Cette duplication a déjà produit des comparaisons incompatibles. Le client doit utiliser une représentation cohérente pour l'expérience, tandis que le serveur reste l'autorité.

### A17 — Pagination et réponses API incohérentes

Le type frontend `PaginatedResponse` exige `hasNextPage` et `hasPrevPage`, mais le serveur ne les renvoie pas. Certaines pages attendent un tableau, d'autres un objet paginé. Plusieurs limites artificielles à `10000` chargent les données en mémoire avant filtrage.

### A18 — Problèmes de validation des routes

Plusieurs identifiants et paramètres de pagination utilisent `parseInt` sans validation complète. La mise à jour d'un département accepte directement `req.body` sans schéma. Certaines erreurs Zod ou Prisma sont exposées au client dans les détails.

### A19 — Requêtes N+1 et calculs non extensibles

La liste des fichiers charge séparément chaque uploader. Les statistiques de département chargent jusqu'à 10 000 utilisateurs et fichiers puis comptent en mémoire. Acceptable pour une petite démonstration, mais à corriger avant volume réel.

### A20 — Suppression des utilisateurs au lieu de désactivation

Le schéma possède `isActive`, mais la route supprime physiquement les comptes. Pour l'audit, la traçabilité et la sécurité, désactiver un compte devrait être l'action normale ; une purge doit être exceptionnelle.

### A21 — Déconnexion uniquement locale

La route logout ne révoque rien. Avec un JWT autonome valable sept jours, supprimer le jeton du navigateur ne l'invalide pas s'il a été copié. Une stratégie de révocation ou sessions courtes devra être évaluée selon le niveau de risque.

### A22 — CORS et adresses réseau codés en dur

Les origines CORS et l'adresse affichée au démarrage contiennent `192.168.0.103`. Le déploiement dans une autre organisation exigera une modification du code.

### A23 — Seed non sûr et non idempotent pour les fichiers

Tous les comptes de démonstration utilisent `password123`. Les fichiers sont recréés à chaque exécution et pointent vers des contenus susceptibles de ne pas exister. Le seed doit être explicitement réservé au développement et utiliser une stratégie reproductible.

### A24 — Journal d'activité incomplet

**État : partiellement résolu.** Les uploads, approbations et refus créent maintenant des événements. Les téléchargements, suppressions et futurs changements d'autorisation doivent encore être couverts de manière transactionnelle.

### A25 — Contrats partagés imparfaits

`shared/schema.ts` contient des interfaces manuelles qui divergent de Prisma : `uploadedBy` est obligatoire dans l'interface mais nullable dans Prisma, les rôles sont de simples chaînes côté serveur, et les statuts cibles diffèrent. Le client duplique encore d'autres interfaces.

### A26 — UI partiellement factice ou inaccessible

**État : migration visuelle engagée.** Le shell authentifié, le tableau de bord principal, la bibliothèque, la recherche documentaire, la file de validation, l'historique, les statistiques, les départements et le centre de configuration utilisent désormais les jetons sémantiques et une navigation institutionnelle responsive. La bibliothèque et la recherche partagent le même navigateur paginé, n'affichent que les filtres acceptés par l'API, privilégient le tableau sur ordinateur et fournissent une présentation en cartes sur mobile. La validation reprend cette présentation responsive, n'affiche pas de recherche que son API ne saurait honorer et sépare clairement les décisions justifiées. L'historique affiche les 50 événements fournis par son contrat, avec une table sur ordinateur, des cartes mobiles, une actualisation explicite et un repli lisible pour les anciens types d'activité. Les statistiques présentent seulement les sept indicateurs de l'API et leurs ratios dérivés ; le faux quota de stockage à 25 %, le panneau latéral historique et la recherche sans effet ont été retirés. Configuration est désormais un centre en lecture seule qui documente l'état confirmé et ouvre les parcours réellement raccordés ; les champs locaux et le bouton d'enregistrement sans API ont été supprimés. La gestion des utilisateurs utilise la pagination réelle de l'API, affiche une table sur ordinateur et des cartes sur mobile, charge correctement le tableau de départements et ne présente plus d'action de modification sans route serveur. La modale de téléversement reprend les jetons sémantiques, les contraintes techniques partagées avec le serveur, une progression par fichier et des états d'erreur relançables. Elle n'envoie plus l'identité de l'auteur depuis le client, n'autorise le choix d'un autre département qu'au superutilisateur et ne présente plus une taxonomie de catégories fictivement obligatoire. L'écran de connexion utilise maintenant les mêmes jetons et la même identité institutionnelle dans une disposition responsive. Les faux contrôles de mémorisation et de récupération de mot de passe ont été retirés, les erreurs sont placées près des champs et une panne du serveur local n'est plus présentée comme un refus d'identifiants. La page 404 active est désormais française, responsive et reliée au tableau de bord ; les notifications destructrices et la barre de défilement globale utilisent les jetons sémantiques. Les actions visibles suivent les capacités du rôle affiché, tandis que le serveur reste l'autorité. L'aperçu sans comportement, le tri ignoré par le serveur, le filtrage secondaire en mémoire, les traces de débogage et les anciennes variantes de cartes ont été retirés. Les modales, confirmations et panneaux mobiles actifs partagent désormais un jeton de superposition compatible avec les thèmes clair et sombre. Le panneau droit, la carte responsive et les helpers globaux historiques sans consommateur ont été supprimés ; les dernières couleurs directes relevées se trouvent uniquement dans des primitives génériques non importées, conservées en attente d'un audit de dépendances séparé.

## Constats P3 — Faibles

### A27 — Build volumineux

Le bundle JavaScript principal produit environ 492 kB avant gzip. Une séparation par routes pourra être envisagée après stabilisation des flux essentiels.

### A28 — Données Browserslist anciennes

Le build avertit que `caniuse-lite` date d'environ 22 mois. Mettre à jour lors d'une unité de maintenance des dépendances, pas au milieu d'une correction métier.

### A29 — README incorrect

Le README demande d'installer les dépendances séparément dans `client` et `server`, alors que le projet possède un seul `package.json` à la racine. Les variables d'environnement et procédures réelles ne sont pas documentées.

## Matrice des capacités

| Capacité cible | État actuel | Niveau de confiance |
| --- | --- | --- |
| Connexion avec mot de passe haché | Présente mais configuration JWT dangereuse | Élevé |
| Gestion des utilisateurs | Partielle et trop permissive | Élevé |
| Gestion des rôles | Incohérente | Élevé |
| Gestion des départements | Basique, sans niveau | Élevé |
| Upload | Présent mais validation et statut incohérents | Élevé |
| Approbation | Ébauche non raccordée et sans audit | Élevé |
| Refus | Absent | Élevé |
| Archivage | Statut cible absent | Élevé |
| Recherche et filtres | Présents, autorisation simplifiée | Moyen |
| Download | Présent mais sans autorisation documentaire | Élevé |
| Suppression contrôlée | Non conforme et destructrice | Élevé |
| Niveaux 1 à 4 | Absents | Élevé |
| Demandes d'accès | Absentes | Élevé |
| Audit métier | Modèle partiel, couverture absente | Élevé |
| Statistiques | Présentes mais route vulnérable | Élevé |
| Tests | Absents | Élevé |
| Interface sobre cible | À migrer progressivement | Moyen |

## Plan priorisé recommandé

### Phase 0 — Sécuriser la base de travail

1. Corriger `.gitignore` afin de versionner migrations, middlewares et tests.
2. Établir la configuration d'environnement validée, notamment `JWT_SECRET`, stockage, port et CORS.
3. Canoniser les rôles dans Prisma, contrats, jeton, API et frontend.
4. Faire réussir `npm run check` sans contournement.
5. Créer l'infrastructure minimale de tests API avec base et stockage isolés.
6. Restaurer une installation reproductible des dépendances et vérifier que Vitest s'exécute.
7. Ajouter des tests qui démontrent les vulnérabilités P0 avant de les corriger.

### Phase 1 — Fermer les accès critiques

1. Centraliser l'identité authentifiée et vérifier les comptes actifs.
2. Protéger les statistiques et supprimer le `userId` contrôlé par le client.
3. Définir une première politique documentaire serveur compatible avec l'existant.
4. Sécuriser téléchargement et suppression par des tests négatifs.
5. Restreindre la création/suppression d'utilisateurs selon les rôles.
6. Supprimer la journalisation des mots de passe, jetons et réponses sensibles.

### Phase 2 — Stabiliser les documents

1. Configurer une racine de stockage sûre et tester les chemins.
2. Harmoniser le contrat upload et les erreurs.
3. Implémenter les statuts `pending`, `archived`, `rejected` avec décision auditée.
4. Raccorder les pages pending et historique avec un client API authentifié.
5. Remplacer la suppression physique immédiate par la politique logique validée.

### Phase 3 — Introduire la hiérarchie

1. Migrer les départements vers `departmentId` et ajouter leur niveau.
2. Ajouter le niveau documentaire et sa classification initiale côté serveur.
3. Implémenter un service central d'autorisation et sa matrice de tests.
4. Appliquer ce service aux listes, recherches, détails et téléchargements.

### Phase 4 — Demandes d'accès

1. Ajouter `AccessRequest` et sa migration.
2. Implémenter création, décision justifiée et règles d'escalade.
3. Implémenter l'expiration à 24 heures et la consultation temporaire en lecture seule.
4. Ajouter une route de visualisation protégée qui ne confère jamais la route de téléchargement et réévalue l'autorisation à chaque requête.
5. Ajouter les interfaces sobres du demandeur et de l'approbateur.

### Phase 5 — Démonstration et durcissement

1. Finaliser les parcours UI et les états d'erreur.
2. Ajouter les tests de bout en bout essentiels.
3. Définir sauvegarde et restauration de la base et des fichiers.
4. Documenter l'installation locale réelle et préparer des données de démonstration sûres.
5. Vérifier la première version contre tous les critères de réussite de `project-overview.md`.

## Première unité recommandée

La première unité d'implémentation doit être **« Canoniser les rôles et établir la base de tests de sécurité »**. Elle inclut :

- correction de `.gitignore` ;
- choix d'une représentation canonique des rôles ;
- alignement minimal Prisma/types/token/client sans refonte sans rapport ;
- correction des 14 erreurs TypeScript ;
- création d'une infrastructure de test API isolée ;
- tests de caractérisation pour authentification, rôles et routes P0.

Cette unité doit précéder l'ajout des niveaux et demandes d'accès, car ces fonctionnalités dépendent entièrement d'une identité et de rôles fiables.

**État : terminée.** TypeScript, 9 tests et le build réussissaient à la sortie de cette première unité. Les vulnérabilités P0 étaient alors reproductibles avant leur correction dans l'unité suivante.

## Unité P0 — Fermeture des accès critiques

**État : terminée.** Les six constats P0 sont fermés dans le périmètre du modèle actuel. Le service `server/services/authorization.ts` centralise les règles temporaires de document et de gestion des utilisateurs. Les cinq tests auparavant marqués `it.fails` sont devenus des tests de non-régression normaux.

Baseline après l'unité :

- `npm run check` : réussite ;
- `npm test -- --run` : 18 tests réussis dans 3 fichiers ;
- `npm run build` : réussite ;
- avertissement non bloquant : données Browserslist anciennes.

## Critère de sortie de l'audit

L'audit est considéré comme exploitable lorsque chaque constat critique possède une unité de correction, une preuve de vérification prévue et un ordre cohérent. Il ne sera considéré comme résolu que lorsque les modifications correspondantes auront été implémentées, testées et reportées dans ce document et dans `progress-tracker.md`.

## Unité stockage et cycle documentaire

**État : terminée pour le backend et l'intégration frontend statique.** Une sauvegarde vérifiée de `prisma/dev.db` a précédé la migration. Les 31 documents ont été conservés et sont restés `pending`. Les migrations reconstruisent également correctement le schéma depuis une base vide, y compris `status`, les champs de revue et `Activity`.

Baseline : TypeScript réussi, 24 tests réussis dans 4 fichiers, schéma Prisma valide, build réussi. La vérification visuelle reste non exécutée faute de navigateur disponible.
