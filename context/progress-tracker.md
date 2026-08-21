# Suivi du projet

Mettre ce fichier à jour après chaque modification significative de l'implémentation ou des décisions produit.

## Phase actuelle

- Stockage et cycle documentaire stabilisés ; hiérarchie des départements à préparer.

## Objectif actuel

- Migrer les départements vers des identifiants stables et introduire les niveaux 1 à 4.

## Terminé

- Analyse initiale de la structure du projet et de la pile technique existante.
- Première définition de la vision, des utilisateurs, du cycle de vie documentaire, du périmètre et des critères de réussite dans `project-overview.md`.
- Adoption provisoire d'une hiérarchie croissante de quatre niveaux d'accès.
- Première documentation de l'architecture existante, de l'architecture cible, des flux de fichiers et des invariants de sécurité dans `architecture.md`.
- Définition du circuit d'approbation des demandes d'accès, limité à un téléchargement pendant 24 heures.
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

## En cours

- Préparation de la migration des départements et niveaux d'accès.

## Prochaines étapes

- Définir la migration `departmentId` sans perdre les associations textuelles existantes.
- Ajouter le niveau 1 à 4 aux départements et documents.
- Étendre le service d'autorisation avec la hiérarchie validée.
- Ajouter les tests de matrice rôle, département et niveau.
- Vérifier visuellement l'écran de validation dès qu'un navigateur contrôlable est disponible.
- Décider ultérieurement du traitement d'un document refusé avant d'ajouter correction ou resoumission.
- Auditer séparément les 24 vulnérabilités signalées dans les dépendances.

## Questions ouvertes

- Tous les documents d'un même département sont-ils visibles par ses membres autorisés ?
- Que devient un document refusé ?
- Quelle politique de suppression, restauration et conservation faut-il appliquer ?
- Quels types et tailles de fichiers faut-il accepter ?
- Quelles sauvegardes et quel chiffrement sont requis pour la première version ?

## Décisions d'architecture

- Le réseau local constitue la cible de déploiement prioritaire.
- Un déploiement en ligne reste possible mais exigera une configuration et une étude de sécurité adaptées.
- Les autorisations doivent être appliquées côté serveur, indépendamment des restrictions de l'interface.
- Les départements et documents utilisent provisoirement une échelle croissante de niveaux 1 à 4.
- Un utilisateur accède directement aux niveaux inférieurs ou égaux au sien et demande une autorisation pour un niveau supérieur.
- Le niveau initial d'un document est hérité du département de l'auteur et peut être corrigé pendant la validation.
- Un administrateur peut approuver une demande lorsque son niveau couvre le document ; au-delà, la décision appartient au superutilisateur.
- Une demande approuvée autorise un téléchargement unique pendant 24 heures.
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
- Plusieurs métadonnées existantes pointent vers des fichiers absents ; aucune suppression ou fabrication de fichier n'a été effectuée.
- La vérification visuelle de l'écran de validation n'a pas pu être exécutée car aucun navigateur contrôlable n'était disponible.
- L'installation des outils de test signale 24 vulnérabilités de dépendances à auditer séparément ; ne pas appliquer de correction forcée sans analyse.
- Ne pas commencer l'interface des demandes d'accès avant la stabilisation des rôles, autorisations serveur et tests.
