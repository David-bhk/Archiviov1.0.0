# Contexte d'architecture

## Statut du document

Ce document décrit à la fois l'architecture actuellement observée et l'architecture cible de la première version. Une fonctionnalité décrite comme cible ne doit pas être considérée comme déjà implémentée. Avant toute modification, vérifier l'écart entre la cible et le code existant.

## Pile technique

| Couche | Technologie | Rôle |
| --- | --- | --- |
| Interface | React 18 + TypeScript | Pages, composants et interactions utilisateur |
| Construction frontend | Vite 5 | Serveur de développement et génération des fichiers statiques |
| Routage frontend | Wouter | Navigation côté client |
| Données frontend | TanStack Query | Requêtes API, cache et synchronisation des données serveur |
| Interface visuelle | Tailwind CSS + shadcn/ui + Radix UI | Styles, composants accessibles et primitives d'interface |
| API | Express 4 + TypeScript | Routes HTTP, validation, autorisation et orchestration métier |
| Validation | Zod | Validation des entrées aux frontières du système |
| ORM | Prisma 6 | Accès typé aux données et migrations |
| Base de données initiale | SQLite | Métadonnées locales pour la première version |
| Stockage documentaire | Système de fichiers local + Multer | Conservation des fichiers téléversés sur le serveur local |
| Authentification | JWT + bcrypt | Sessions par jeton et hachage des mots de passe |
| Tests | Vitest | Tests unitaires et d'intégration |

## Mode de déploiement

- La première cible est un serveur contrôlé par l'organisation et accessible sur son réseau local.
- Le serveur Express expose l'API et sert l'application frontend construite en production.
- SQLite et les fichiers archivés résident sur le serveur local dans la première version.
- Un déploiement en ligne est une cible possible, mais pas un simple changement d'adresse : il exige HTTPS, gestion sécurisée des secrets, stockage durable, sauvegardes, durcissement réseau et réévaluation de SQLite et du stockage local.
- Les adresses réseau et secrets ne doivent jamais être codés en dur ; ils proviennent de la configuration d'environnement.

## Frontières du système

- `client/src/pages/` — compose les écrans et orchestre les cas d'utilisation visibles par l'utilisateur.
- `client/src/components/` — contient les composants métier, de mise en page et d'interface réutilisables.
- `client/src/contexts/` — porte l'état d'authentification et les capacités d'affichage liées au rôle ; il ne constitue pas une frontière de sécurité.
- `client/src/lib/` et `client/src/hooks/` — contiennent le client API, les utilitaires et comportements React réutilisables.
- `server/routes.ts` — expose actuellement les routes HTTP ; sa taille devra être réduite progressivement en séparant routes, services métier et validation.
- `server/middleware/` — authentifie les requêtes et applique les contrôles transversaux.
- `server/storage.ts` — encapsule actuellement l'accès Prisma ; les règles métier et d'autorisation ne doivent pas y être enfouies.
- `shared/` — contient les contrats, schémas de validation et types partagés entre client et serveur.
- `prisma/` — définit le schéma persistant, les migrations et les données initiales contrôlées.
- Le répertoire de stockage documentaire, à définir par configuration — contient les fichiers binaires ; il ne doit pas être exposé directement comme répertoire statique public.

## Modèle de stockage observé

### Base de données

Le schéma actuel contient les entités `User`, `Department`, `File` et `Activity`. Il stocke les comptes, rôles, métadonnées documentaires et événements. Une migration de transition ajoute `departmentId` aux utilisateurs et documents, `accessLevel` aux départements et `classificationLevel` aux documents. Les identifiants sont rétromigrés depuis les noms existants sans supprimer les colonnes textuelles historiques. Les niveaux restent nullable tant que leur attribution initiale n'a pas été décidée ; ils ne participent donc pas encore aux autorisations. Les demandes d'accès et autorisations temporaires ne sont pas encore modélisées.

### Système de fichiers

Le fichier binaire est conservé localement et son chemin est enregistré dans la base. Le nom physique doit être généré par le serveur et ne doit jamais provenir directement d'un chemin fourni par l'utilisateur.

La racine est résolue depuis `UPLOADS_DIR`, avec `uploads/` comme valeur locale par défaut. Les nouveaux documents enregistrent uniquement leur nom physique relatif. Toute lecture ou suppression résout ce nom dans la racine configurée et refuse un chemin qui en sort. Les anciens chemins absolus situés à l'intérieur de cette même racine restent lisibles pendant la transition.

### Séparation obligatoire

- Les métadonnées, relations, statuts et autorisations appartiennent à la base de données.
- Les contenus binaires appartiennent au stockage documentaire.
- Une écriture ne doit pas laisser durablement un fichier sans métadonnées ni des métadonnées pointant vers un fichier absent.
- La suppression logique d'un document ne supprime pas immédiatement son fichier physique.

## Modèle métier cible

Les noms exacts pourront évoluer lors de la modification du schéma, mais les concepts suivants sont requis :

- `User` — identité, rôle, état actif et département.
- `Department` — identité du département et niveau d'accès compris entre 1 et 4.
- `Document` — fichier archivé, métadonnées, auteur, département propriétaire, niveau de classification et état du cycle de validation.
- `DocumentReview` ou champs d'audit équivalents — décision d'approbation ou de refus, auteur, date et justification.
- `AccessRequest` — demande d'accès à un document restreint, demandeur, décision, décideur, justification et portée de l'autorisation.
- `Activity` — journal d'audit des opérations sensibles.

Les relations durables utilisent les clés étrangères `departmentId`. Les colonnes textuelles historiques sont conservées temporairement pour la compatibilité des contrats existants ; elles ne doivent plus devenir la source d'une nouvelle relation et seront retirées uniquement après migration des consommateurs et vérification des données.

## États d'un document

- `pending` — téléversement reçu, en attente de contrôle ; pas encore archivé définitivement.
- `archived` — document approuvé et disponible selon les règles d'accès.
- `rejected` — document refusé avec une justification enregistrée.
- `deleted` n'est pas un état de validation : la suppression logique est représentée séparément afin de conserver l'historique.

Les transitions autorisées de la première version sont :

- création vers `pending` ;
- `pending` vers `archived` après approbation ;
- `pending` vers `rejected` après refus ;
- aucune modification silencieuse d'un document `archived` sans règle métier et trace d'audit.

Le statut historique `approved` n'est plus accepté. Les contrats et nouvelles décisions utilisent exclusivement `pending`, `archived` et `rejected`.

## Authentification et contrôle d'accès

### Authentification

- Toutes les routes métier exigent un utilisateur authentifié, y compris les statistiques et l'historique.
- Le secret JWT est obligatoire et provient de l'environnement. Le serveur doit refuser de démarrer en production s'il est absent.
- Le mot de passe n'est jamais renvoyé au client, journalisé ou incorporé dans le jeton.
- La validation d'une requête doit confirmer que l'utilisateur existe encore et que son compte est actif lorsque l'opération est sensible.

### Autorisation

Une décision d'accès à un document est calculée côté serveur à partir de plusieurs dimensions :

1. rôle de l'utilisateur ;
2. état actif du compte ;
3. département et niveau de l'utilisateur ;
4. état et niveau du document ;
5. propriété ou périmètre départemental lorsque cette restriction s'applique ;
6. éventuelle demande d'accès approuvée et encore valide.

Le client peut masquer une action interdite pour améliorer l'expérience, mais le serveur répète toujours le contrôle. Un identifiant transmis dans l'URL ou le corps d'une requête n'accorde aucun droit.

### Règle hiérarchique provisoire

- Les niveaux sont des entiers de 1 à 4 : `ordinaire`, `interne`, `confidentiel`, `très sensible`.
- Le document hérite initialement du niveau du département de son auteur.
- Un approbateur autorisé peut corriger ce niveau avant l'archivage.
- Hors privilège global du superutilisateur, l'accès direct exige `niveauUtilisateur >= niveauDocument` ainsi que le respect des autres restrictions.
- Si `niveauUtilisateur < niveauDocument`, une demande approuvée est obligatoire.
- Une modification de niveau est une opération sensible et doit être auditée.

### Règle des demandes d'accès

- Une demande est liée à un demandeur et à un document précis.
- L'administrateur du demandeur peut approuver ou refuser la demande si `niveauAdministrateur >= niveauDocument`.
- Lorsque `niveauAdministrateur < niveauDocument`, seul un superutilisateur peut prendre la décision.
- L'approbateur ne peut jamais déléguer un niveau qu'il ne possède pas lui-même, à l'exception du superutilisateur qui possède le privilège global.
- Toute décision contient une justification non vide, l'identité du décideur et la date de décision.
- Une approbation produit une autorisation de consultation protégée en lecture seule valable jusqu'à 24 heures après la décision.
- Cette autorisation n'accorde jamais la route de téléchargement et doit être vérifiée par le serveur à chaque requête du visualiseur.
- Une autorisation expirée, refusée ou annulée n'accorde aucun accès.
- Une nouvelle demande est nécessaire pour consulter de nouveau le document après expiration si l'utilisateur ne possède toujours pas d'accès direct.
- Un filigrane identifiant l'utilisateur autorisé et la période d'accès est ajouté lorsque le format et le mode de rendu le permettent. Il complète l'autorisation et l'audit sans être considéré comme une protection absolue contre la capture.
- Les dates sont stockées en UTC et interprétées dans le fuseau de l'utilisateur uniquement pour l'affichage.

## Flux de téléversement cible

1. Authentifier l'utilisateur et vérifier qu'il est actif et autorisé à téléverser.
2. Recevoir le fichier dans une zone temporaire non publique avec des limites strictes.
3. Valider le type réel, l'extension, la taille et les métadonnées.
4. Générer un nom physique non prévisible et sûr.
5. Déterminer le département et le niveau à partir de l'identité authentifiée, jamais uniquement à partir du client.
6. Enregistrer le fichier et les métadonnées avec le statut `pending`.
7. Enregistrer l'activité de téléversement.
8. Nettoyer le fichier temporaire si une étape échoue.

## Flux de téléchargement cible

1. Authentifier l'utilisateur et charger le document depuis la base.
2. Refuser les documents supprimés ou indisponibles.
3. Évaluer l'autorisation directe côté serveur ; une demande temporaire approuvée ne confère pas le droit de télécharger.
4. Résoudre et vérifier le chemin physique dans la racine de stockage configurée.
5. Envoyer le fichier avec un nom de téléchargement sûr et un type de contenu contrôlé.
6. Journaliser le téléchargement ou la récupération du document.

## Flux de consultation temporaire cible

1. Authentifier l'utilisateur et charger le document ainsi que sa demande approuvée.
2. Vérifier côté serveur que la demande appartient à cet utilisateur, concerne ce document, n'est ni refusée ni annulée et n'a pas expiré.
3. Refuser un document supprimé, non archivé ou dont le format ne dispose pas encore d'un rendu protégé pris en charge.
4. Servir la représentation par une route authentifiée dédiée au visualiseur, sans exposer le stockage ni accorder la route de téléchargement.
5. Appliquer les en-têtes empêchant la mise en cache lorsque le client et le format les respectent, puis ajouter un filigrane nominatif et daté lorsque le rendu le permet.
6. Journaliser les ouvertures et refus de consultation utiles à la traçabilité.

## Invariants

1. Aucun document ne peut être consulté ou téléchargé sans autorisation calculée côté serveur.
2. Le superutilisateur possède un accès global, mais ses actions sensibles restent journalisées.
3. Un administrateur n'approuve que les documents inclus dans son périmètre explicitement autorisé.
4. Le niveau initial d'un document est déterminé par le serveur à partir du département de l'auteur.
5. Un document de niveau supérieur au niveau de l'utilisateur exige une autorisation approuvée et valide.
6. Un document n'est `archived` qu'après une décision d'approbation identifiable et datée.
7. Une suppression est logique par défaut et ne détruit ni le fichier ni l'audit sans politique de conservation explicite.
8. Aucun mot de passe, secret JWT ou chemin physique interne n'est exposé dans une réponse API.
9. Chaque opération sensible produit une entrée d'audit associée à son auteur lorsque celui-ci est connu.
10. Les migrations de schéma sont versionnées ; une modification manuelle de la base de production n'est pas une procédure normale.
11. Les fichiers archivés et la base de données doivent être sauvegardés ensemble de façon cohérente.
12. Le client ne constitue jamais l'unique mécanisme de sécurité.
13. Une autorisation issue d'une demande d'accès ne peut servir qu'au document et au demandeur auxquels elle est liée.
14. Une autorisation temporaire expire au plus tard 24 heures après son approbation, permet uniquement une consultation protégée et n'accorde aucun téléchargement.
15. Un administrateur ne peut accorder aucun accès dépassant son propre niveau.

## Écarts connus entre l'existant et la cible

- `Department.accessLevel` et `File.classificationLevel` existent comme champs de transition nullable, mais les niveaux initiaux ne sont pas encore attribués et la hiérarchie n'est pas appliquée aux autorisations.
- `User` et `File` possèdent une relation stable `departmentId` rétromigrée depuis le nom historique ; les contrats et règles d'exécution utilisent encore temporairement le nom et doivent être migrés avant le retrait des anciennes colonnes.
- Les demandes d'accès et leurs décisions ne sont pas modélisées.
- Le statut actuel utilise `approved`, tandis que la cible produit emploie `archived`.
- Les preuves d'approbation ou de refus ne sont pas modélisées de manière complète.
- Certaines autorisations sont dupliquées ou exprimées différemment entre client, middleware et routes.
- Le secret JWT possède actuellement une valeur de repli non sécurisée.
- Certaines routes, notamment les statistiques, ne sont pas toutes protégées de manière uniforme.
- Le téléversement et le téléchargement doivent être vérifiés de bout en bout avant d'être considérés comme fonctionnels.
- La stratégie de sauvegarde et de restauration reste à définir.

## Questions d'architecture encore ouvertes

- Restriction supplémentaire par catégorie ou propriétaire à l'intérieur d'un même niveau.
- Formats, tailles maximales et méthode fiable de détection du type de fichier.
- Durées de conservation, restauration et destruction définitive.
- Chiffrement requis au repos pour les fichiers et les sauvegardes.
- Stratégie, fréquence et emplacement des sauvegardes locales.
