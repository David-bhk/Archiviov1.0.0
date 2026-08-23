# Suivi du projet

Mettre ce fichier à jour après chaque modification significative de l'implémentation ou des décisions produit.

## Phase actuelle

- Fondation de la hiérarchie départementale migrée et migration progressive des parcours documentaires vers l'interface institutionnelle.

## Objectif actuel

- Poursuivre l'harmonisation des parcours documentaires sans simuler de fonctions absentes, pendant que les décisions de niveaux restent ouvertes.

## Terminé

- Analyse initiale de la structure du projet et de la pile technique existante.
- Première définition de la vision, des utilisateurs, du cycle de vie documentaire, du périmètre et des critères de réussite dans `project-overview.md`.
- Adoption provisoire d'une hiérarchie croissante de quatre niveaux d'accès.
- Première documentation de l'architecture existante, de l'architecture cible, des flux de fichiers et des invariants de sécurité dans `architecture.md`.
- Définition du circuit d'approbation des demandes d'accès, limité à une consultation protégée en lecture seule pendant 24 heures, sans téléchargement.
- Définition du langage visuel, des jetons, des mises en page et des règles de sobriété dans `ui-context.md`.
- Définition des conventions TypeScript, React, Express, Prisma, sécurité, stockage et vérification dans `code-standards.md`.
- Définition du protocole d'analyse, de scoping, d'implémentation, de vérification et de livraison dans `ai-workflow-rules.md`.
- Audit statique de l'application, baseline TypeScript/tests/build et plan priorisé consignés dans `current-state-audit.md`.
- Correction de `.gitignore` afin de versionner migrations, middlewares et tests.
- Installation et verrouillage de Vitest, jsdom et la couverture V8.
- Canonisation des rôles `SUPERUSER`, `ADMIN`, `USER` de Prisma jusqu'au frontend.
- Validation stricte du rôle et de l'identité présents dans le JWT.
- Correction des 14 erreurs TypeScript de la baseline.
- Ajout de 9 tests : 4 validations normales et 5 vulnérabilités documentées comme échecs attendus.
- Vérification réussie de TypeScript, des tests et du build après la première unité.
- Ajout d'un service central d'autorisation compatible avec le modèle actuel.
- Suppression du secret JWT public de repli et ajout d'une configuration d'exemple.
- Protection des statistiques par l'identité authentifiée.
- Protection du téléchargement selon le rôle, le département, la propriété et le statut.
- Protection de la suppression documentaire et abandon de la destruction physique immédiate.
- Restriction des admins à la gestion des utilisateurs simples de leur département.
- Suppression des logs contenant corps de requêtes, mots de passe ou réponses avec jetons.
- Conversion des cinq tests `it.fails` en tests normaux et ajout d'une matrice d'autorisation.
- Baseline P0 validée : TypeScript, 18 tests et build réussis.
- Sauvegarde vérifiée de la base avant migration documentaire.
- Migration non destructive des 31 documents avec ajout du décideur, de la date et de la justification.
- Réconciliation de la table d'audit dans l'historique des migrations.
- Vérification qu'une base vide peut être reconstruite avec `status`, revue et activités.
- Configuration d'une racine de stockage et refus des chemins qui en sortent.
- Noms physiques UUID et chemins relatifs pour les nouveaux uploads.
- Téléversements créés en `pending` avec activité enregistrée.
- Décisions `archived` et `rejected` justifiées, autorisées et auditées transactionnellement.
- File de validation limitée au département pour un admin et globale pour le superutilisateur.
- Écrans de validation et d'historique raccordés au client API authentifié.
- Baseline documentaire validée : TypeScript, 24 tests, Prisma et build réussis.
- Ajout non destructif de `departmentId` aux utilisateurs et documents, avec rétromigration exacte depuis les noms historiques, clés étrangères et index.
- Introduction transitoire de `Department.accessLevel` et `File.classificationLevel`, nullable tant que les niveaux initiaux ne sont pas décidés et contraints à l'intervalle 1 à 4 lorsqu'ils sont renseignés.
- Conservation temporaire des colonnes textuelles de département pour préserver les contrats existants pendant leur migration.
- Validation de la migration sur une copie isolée : 6 départements, 9 utilisateurs et 35 documents conservés, tous les identifiants correspondants rétromigrés et aucune erreur de clé étrangère.
- Vérification que l'historique complet des migrations reconstruit exactement le schéma Prisma cible.
- Baseline de la fondation hiérarchique validée : TypeScript, 31 tests, schéma Prisma et build réussis.
- Analyse des huit références visuelles du dossier `UI` par rapport à `ui-context.md`, en retenant uniquement les motifs compatibles avec les fonctionnalités réellement implémentées.
- Refonte du shell authentifié principal : navigation institutionnelle, barre supérieure de recherche, action de téléversement et panneau mobile accessible.
- Remplacement du contenu générique du tableau de bord par des statistiques réelles, le nombre de validations pour les rôles autorisés et une liste responsive des documents récents.
- Ajout des états de chargement, vide et erreur du tableau de bord, sans simuler les rapports, versions, partages, rétentions ou classifications encore absents.
- Alignement des jetons globaux de couleur et de classification sur `ui-context.md` pour les composants nouvellement migrés.
- Baseline de l'interface principale validée : TypeScript, 31 tests et build réussis.
- Migration de la bibliothèque documentaire vers le shell principal responsive, sans panneau droit ni duplication de la recherche.
- Limitation des filtres de bibliothèque aux paramètres réellement acceptés par l'API : type, période et département pour le superutilisateur.
- Ajout d'un tableau documentaire sur ordinateur et de cartes mobiles avec référence, statut, département, auteur, date et taille.
- Alignement des actions visibles de téléchargement et de suppression logique avec le rôle et le département, confirmation accessible de la suppression et conservation de l'autorité serveur.
- Retrait de l'aperçu sans comportement, du tri ignoré par l'API et des composants de vues documentaires devenus inutilisés.
- Baseline de la bibliothèque validée : TypeScript, 31 tests et build réussis.
- Migration de la recherche avancée vers le shell principal et le navigateur documentaire partagé, avec recherche différée, filtres serveur et pagination cohérente.
- Suppression du filtrage secondaire en mémoire, des réponses API ambiguës, du typage `any` et des traces de débogage de l'ancienne page de recherche.
- Ajout d'un état initial qui n'interroge pas l'API avant la saisie d'un mot ou d'un filtre, ainsi que des états sans résultat et erreur cohérents.
- Retrait des anciennes cartes documentaires et de l'utilitaire de téléchargement devenus sans consommateur après la mutualisation.
- Baseline de la recherche validée : TypeScript, 31 tests, build et recherches HTTP authentifiées réussis.
- Migration de la file de validation vers le shell institutionnel responsive, avec tableau sur ordinateur, cartes sur mobile et périmètre explicite selon le rôle.
- Remplacement des justifications saisies directement dans chaque carte par des confirmations accessibles et distinctes pour l'archivage et le refus, sans modifier les routes ni les règles de décision.
- Ajout des états chargement, vide et erreur, de la pagination serveur réelle, des notifications de résultat et de l'invalidation cohérente des données documentaires, statistiques et d'audit.
- Baseline de la file de validation validée : TypeScript, 31 tests et build réussis.
- Sécurisation du contrat de l'historique : projection publique explicite des acteurs et documents, sans mot de passe ni chemin physique, avec limite de requête bornée.
- Migration de l'historique des activités vers le shell institutionnel responsive, avec tableau sur ordinateur, cartes mobiles et états chargement, vide, erreur et interdit.
- Présentation explicite des téléversements, archivages, refus et créations historiques d'utilisateurs, tout en conservant un repli lisible pour les types d'événements inconnus.
- Baseline de l'historique validée : TypeScript, 32 tests et build réussis.
- Migration des statistiques vers le shell institutionnel responsive, avec indicateurs de périmètre, répartition par type de fichier et états chargement, vide et erreur.
- Suppression du faux quota de stockage à 25 %, de la recherche sans effet et du panneau droit historique ; seuls les sept indicateurs de l'API et leurs ratios dérivés sont affichés.
- Baseline des statistiques validée : TypeScript, 32 tests et build réussis.
- Remplacement de la fausse page de réglages par un centre de configuration superutilisateur en lecture seule, aligné sur le shell institutionnel.
- Retrait des champs non persistés de taille, formats, sauvegardes, notifications, maintenance, sessions et quotas, ainsi que du bouton d'enregistrement sans API.
- Ajout d'accès directs aux parcours réellement opérationnels de gestion des utilisateurs, départements et historique.
- Baseline du centre de configuration validée : TypeScript, 32 tests et build réussis.
- Migration de l'écran Départements vers le shell institutionnel responsive, avec synthèse des rattachements, cartes de structure et états chargement, vide et erreur.
- Conservation stricte du contrat d'autorisation actuel : lecture pour tout utilisateur authentifié et actions de création, modification ou suppression uniquement pour `ADMIN` et `SUPERUSER`, sans exposer les niveaux encore indécis.
- Ajout d'un formulaire ciblé et d'une confirmation accessible signalant qu'un département encore rattaché peut ne pas être supprimable, sans modifier les contraintes serveur.
- Baseline de l'écran Départements validée : TypeScript, 32 tests et build réussis.
- Migration de la gestion des utilisateurs vers une modale institutionnelle responsive, avec table sur ordinateur, cartes mobiles, états chargement, vide et erreur, et pagination serveur réelle.
- Correction du contrat de chargement des départements dans le formulaire de création ; les administrateurs utilisent leur département imposé et seuls les superutilisateurs choisissent un autre département et un rôle privilégié.
- Retrait de la recherche et du filtre limités silencieusement à dix comptes, ainsi que de l'action de modification sans route serveur ; la suppression physique actuelle est désormais confirmée explicitement.
- Alignement de l'action de suppression visible avec la règle serveur : aucun compte ne peut s'auto-supprimer, un superutilisateur est protégé et un administrateur reste limité aux utilisateurs simples de son département.
- Baseline de la gestion des utilisateurs validée : TypeScript, 32 tests et build réussis.
- Migration de la modale de téléversement vers une interface institutionnelle responsive, avec sélection multiple, glisser-déposer, progression par fichier, synthèse du lot et erreurs relançables.
- Centralisation des extensions et de la taille maximale actuellement appliquées par le serveur afin de les afficher sans créer une politique documentaire supplémentaire ; les limites produit définitives restent ouvertes.
- Alignement du département de destination sur le contrat serveur : seul le superutilisateur peut en choisir un autre, tandis que l'identité de l'auteur reste déterminée par la session authentifiée.
- Remplacement de la catégorie fictivement obligatoire par une métadonnée libre et facultative, partagée avec la description par l'ensemble des fichiers sélectionnés.
- Baseline du téléversement validée : TypeScript, 32 tests et build réussis.
- Migration de la connexion vers une page institutionnelle responsive, alignée sur le shell principal et entièrement fondée sur les jetons sémantiques.
- Retrait des contrôles sans comportement de mémorisation et de récupération de mot de passe ; aucun parcours d'authentification absent n'a été simulé.
- Conservation de la page pendant la soumission, ajout d'erreurs accessibles près des champs et distinction entre identifiants refusés, serveur local inaccessible et erreur inattendue.
- Ajout de quatre tests de classification des erreurs de connexion ; baseline validée avec TypeScript, 36 tests et build réussis.
- Remplacement de la future autorisation temporaire de téléchargement par une consultation protégée pendant 24 heures, sans modifier le code actuel puisque les demandes d'accès ne sont pas encore implémentées.
- Adoption d'un filigrane nominatif et daté lorsque le format le permet, accompagné d'une formation recommandant les documents non modifiables ; cette mesure complète la traçabilité sans promettre l'impossibilité absolue d'une capture.

## En cours

- Validation visuelle interactive du shell principal dès qu'un navigateur contrôlable est disponible ; les décisions de hiérarchie départementale restent ouvertes en parallèle.

## Prochaines étapes

- Décider les niveaux initiaux des départements existants avant toute application de la hiérarchie.
- Clarifier les opérations qu'un administrateur peut effectuer sur son propre département avant de modifier les routes de gestion.
- Migrer les contrats, filtres et décisions serveur de département vers `departmentId` en conservant une compatibilité contrôlée.
- Attribuer le niveau documentaire initial côté serveur à partir du département authentifié.
- Étendre le service d'autorisation avec la hiérarchie validée.
- Ajouter les tests de matrice rôle, département et niveau.
- Vérifier visuellement l'écran de validation dès qu'un navigateur contrôlable est disponible.
- Auditer ensuite les composants frontend encore actifs qui conservent les anciennes couleurs directes, puis les migrer par petites unités sans refonte fonctionnelle.
- Décider ultérieurement du traitement d'un document refusé avant d'ajouter correction ou resoumission.
- Auditer séparément les 24 vulnérabilités signalées dans les dépendances.

## Questions ouvertes

- Quels niveaux 1 à 4 faut-il attribuer aux six départements existants : Administration, IT, Marketing, Ressources Humaines, Comptabilité et Test Department ?
- Un administrateur peut-il uniquement modifier les informations de son département, ou peut-il aussi créer, renommer et supprimer des départements ?
- Tous les documents d'un même département sont-ils visibles par ses membres autorisés ?
- Que devient un document refusé ?
- Quelle politique de suppression, restauration et conservation faut-il appliquer ?
- Quels types et tailles de fichiers faut-il accepter ?
- Quels formats doivent être pris en charge par le premier visualiseur protégé et quelle conversion utiliser pour les documents bureautiques modifiables ?
- Qui décide qu'un document peut recevoir des demandes d'accès : l'auteur comme proposition, ou uniquement l'approbateur autorisé lors de l'archivage ?
- Quelles sauvegardes et quel chiffrement sont requis pour la première version ?

## Décisions d'architecture

- Le réseau local constitue la cible de déploiement prioritaire.
- Un déploiement en ligne reste possible mais exigera une configuration et une étude de sécurité adaptées.
- Les autorisations doivent être appliquées côté serveur, indépendamment des restrictions de l'interface.
- Les départements et documents utilisent provisoirement une échelle croissante de niveaux 1 à 4.
- Un utilisateur accède directement aux niveaux inférieurs ou égaux au sien et demande une autorisation pour un niveau supérieur.
- Le niveau initial d'un document est hérité du département de l'auteur et peut être corrigé pendant la validation.
- Un administrateur peut approuver une demande lorsque son niveau couvre le document ; au-delà, la décision appartient au superutilisateur.
- Une demande approuvée autorise uniquement une consultation protégée en lecture seule pendant 24 heures et ne confère aucun téléchargement.
- Toute décision de demande d'accès exige une justification et une trace d'audit.
- L'interface reste sobre, sans dégradés et sans multiplication décorative des icônes.
- Le thème clair est prioritaire ; le thème sombre doit rester cohérent s'il est proposé.

## Notes de session

- L'implémentation existante ne constitue pas automatiquement la spécification : les contradictions doivent être signalées et résolues à partir du contexte validé.
- Les faiblesses déjà observées concernent notamment la cohérence des rôles, le téléversement, le téléchargement et l'application uniforme des autorisations.
- Baseline initiale du 3 août 2026 : `npm run check` échouait avec 14 erreurs, aucun test applicatif n'existait et `npm run build` réussissait.
- Baseline après stabilisation : TypeScript réussit, 9 tests s'exécutent et le build réussit.
- Les risques P0 confirmés concernent le téléchargement, la suppression, les statistiques, le secret JWT, la gestion des utilisateurs et la journalisation de données sensibles.
- Les cinq tests P0 sont désormais des tests normaux ; aucun `it.fails` ne subsiste.
- Baseline après fermeture P0 : TypeScript réussit, 18 tests réussissent et le build réussit.
- Le statut historique `approved` a été retiré ; seuls `pending`, `archived` et `rejected` sont canoniques.
- Les 31 documents existants étaient tous `pending` et le sont restés après migration ; aucune promotion automatique n'a été effectuée.
- La copie de validation du 21 août 2026 contenait 6 départements, 9 utilisateurs et 35 documents ; la migration `departmentId` a conservé toutes les lignes et rétromigré toutes les associations connues.
- La migration hiérarchique a d'abord été validée sur une copie isolée sans toucher `prisma/dev.db`, puis a été appliquée à la base locale lors de la reprise de l'application afin de rétablir la connexion avec le client Prisma courant.
- Le dossier `UI` sert uniquement de référence : les éléments sans comportement produit validé ne sont pas copiés dans l'application.
- La validation navigateur du nouveau tableau de bord n'a pas pu être exécutée le 21 août 2026, car aucune instance de navigateur contrôlable n'était disponible ; TypeScript, tests et build ont néanmoins réussi.
- Plusieurs métadonnées existantes pointent vers des fichiers absents ; aucune suppression ou fabrication de fichier n'a été effectuée.
- La vérification visuelle de l'écran de validation n'a pas pu être exécutée car aucun navigateur contrôlable n'était disponible.
- L'installation des outils de test signale 24 vulnérabilités de dépendances à auditer séparément ; ne pas appliquer de correction forcée sans analyse.
- Ne pas commencer l'interface des demandes d'accès avant la stabilisation des rôles, autorisations serveur et tests.
- Décision du 23 août 2026 : les accès exceptionnels seront des consultations temporaires en lecture seule ; les téléchargements restent réservés aux utilisateurs disposant d'un accès direct.
