# Archivio

## Vue d'ensemble

Archivio est un système moderne d'archivage destiné aux organisations qui doivent conserver, organiser et retrouver des documents sensibles, notamment les écoles, hôpitaux, postes de police, entreprises et administrations. Il centralise les documents, contrôle leur accès selon les responsabilités de chaque utilisateur et réduit les risques de perte, de divulgation ou de mauvaise manipulation. Archivio est conçu en priorité pour fonctionner sur le réseau local d'une organisation, avec la possibilité d'un déploiement en ligne lorsque les besoins et les exigences de sécurité de l'organisation le permettent.

## Objectifs

1. Centraliser les documents institutionnels et assurer leur conservation durable dans un système structuré.
2. Réduire les risques de perte, d'accès non autorisé, de suppression accidentelle et de mauvaise classification des documents sensibles.
3. Appliquer un contrôle d'accès fondé sur le rôle de l'utilisateur, son département et le niveau d'accès de ce département.
4. Assurer la traçabilité des opérations importantes : téléversement, validation, consultation, téléchargement, demande d'accès et suppression.
5. Fournir une première version démontrable dans laquelle l'authentification, les rôles, le téléversement, la validation, l'archivage, la recherche et la récupération des documents fonctionnent de bout en bout.

## Utilisateurs et responsabilités

### Superutilisateur

- Accède à l'ensemble du système et à sa configuration.
- Crée les utilisateurs et leur attribue un rôle et un département.
- Crée et organise les départements ainsi que leurs niveaux d'accès.
- Consulte, crée, valide, archive et supprime les documents selon les règles de conservation applicables.
- Approuve ou refuse les demandes d'accès aux documents restreints.
- Supervise les activités et la sécurité globales du système.

### Administrateur

- Gère son département et les utilisateurs qui relèvent de son périmètre, dans les limites des autorisations qui lui sont accordées.
- Vérifie les documents téléversés par les utilisateurs de son département.
- Approuve ou refuse les documents relevant de sa compétence.
- Accède aux documents autorisés pour le niveau de son département.
- Soumet des demandes d'accès aux documents appartenant à un niveau supérieur ou à un périmètre auquel son département n'a pas accès.
- Ne dispose pas automatiquement des privilèges globaux du superutilisateur.

### Utilisateur

- Téléverse les documents relevant de son travail ou de son département.
- Consulte le statut des documents qu'il a téléversés.
- Accède aux documents appartenant à son périmètre autorisé.
- Recherche et récupère les documents auxquels il a accès.
- Soumet une demande d'accès lorsqu'un document se trouve hors de son périmètre.
- Ne peut pas supprimer un document déjà approuvé sans une autorisation appropriée.

## Flux principal d'un document

1. Un utilisateur authentifié téléverse un document et renseigne les métadonnées requises.
2. Le système associe automatiquement le document à l'utilisateur, à son département et au niveau d'accès applicable.
3. Le document reçoit le statut `pending` et n'est pas encore considéré comme archivé définitivement.
4. Un administrateur autorisé ou un superutilisateur contrôle le document et ses métadonnées.
5. Le document est approuvé ou refusé. Un refus doit conserver une justification exploitable par l'utilisateur.
6. Après approbation, le document reçoit le statut `archived` et devient accessible selon les règles de rôle, de département et de niveau.
7. Un utilisateur autorisé peut rechercher, consulter ou télécharger le document.
8. Un utilisateur non autorisé peut soumettre une demande d'accès. L'accès n'est accordé qu'après approbation par l'autorité compétente.
9. Les opérations sensibles sont enregistrées dans l'historique d'activité.

## Fonctionnalités

### Identité et contrôle d'accès

- Authentification sécurisée des utilisateurs.
- Gestion des rôles `SUPERUSER`, `ADMIN` et `USER`.
- Activation et désactivation des comptes.
- Attribution de chaque utilisateur à un département.
- Autorisations appliquées par le serveur, et pas uniquement par l'interface.

### Départements et niveaux d'accès

- Création et gestion des départements.
- Attribution à chaque département d'un niveau d'accès numérique compris entre 1 et 4.
- Interprétation provisoire des niveaux : niveau 1 `ordinaire`, niveau 2 `interne`, niveau 3 `confidentiel` et niveau 4 `très sensible`.
- Classification initiale automatique d'un document au niveau du département de son auteur.
- Possibilité pour l'approbateur autorisé de corriger le niveau proposé avant l'archivage.
- Accès automatique d'un utilisateur aux documents dont le niveau est inférieur ou égal à celui de son département, sous réserve des autres restrictions applicables.
- Blocage automatique de l'accès direct aux documents situés au-dessus du niveau de son département.
- Demande d'accès obligatoire pour consulter ou télécharger un document d'un niveau supérieur.

### Archivage des documents

- Téléversement contrôlé des formats de fichiers autorisés.
- Validation de la taille, du type et des métadonnées du fichier.
- Stockage du fichier et de ses métadonnées.
- Circuit de validation `pending` vers `archived` ou `rejected`.
- Recherche, filtrage, consultation et téléchargement des documents autorisés.
- Suppression contrôlée avec conservation de la traçabilité.

### Demandes d'accès

- Création d'une demande pour un document inaccessible.
- Approbation possible par l'administrateur du demandeur lorsque le niveau du document est inférieur ou égal au niveau d'accès de cet administrateur.
- Approbation réservée au superutilisateur lorsque le niveau du document dépasse celui de l'administrateur du demandeur.
- Justification obligatoire pour toute décision d'approbation ou de refus.
- Autorisation limitée à un seul téléchargement et valable pendant 24 heures après son approbation.
- Expiration de l'autorisation après son utilisation ou à la fin des 24 heures, selon la première éventualité.
- Nouvelle demande obligatoire pour tout téléchargement ultérieur en l'absence d'un accès direct.
- Historique des demandes et de leurs décisions.

### Administration et audit

- Gestion des utilisateurs, rôles, départements et paramètres autorisés.
- Tableau de bord et statistiques utiles au suivi des archives.
- Journal des activités sensibles et des décisions d'approbation.

## Périmètre

### Inclus dans la première version démontrable

- Déploiement et utilisation sur un réseau local.
- Authentification et gestion fiable des sessions.
- Gestion cohérente des trois rôles.
- Gestion des utilisateurs et des départements.
- Définition et application des niveaux d'accès des départements.
- Téléversement et téléchargement fonctionnels des documents.
- Validation ou refus des documents téléversés.
- Archivage, recherche, filtrage et récupération des documents autorisés.
- Demandes d'accès aux documents restreints et traitement de ces demandes.
- Historique des opérations sensibles.

### Hors périmètre initial

- Déploiement public sur Internet sans étude de sécurité et configuration adaptées.
- Application mobile native.
- Intelligence artificielle pour classer ou résumer automatiquement les documents.
- Signature électronique avancée et valeur probante légale.
- Intégrations spécifiques avec les systèmes métiers propres à chaque organisation.
- Fonctionnalités avancées ajoutées uniquement pour un secteur particulier.

## Critères de réussite de la première version

1. Un superutilisateur peut créer un département, définir son niveau d'accès, créer un utilisateur et lui attribuer un rôle et un département.
2. Un utilisateur peut téléverser un document valide et suivre son passage de `pending` à `archived` ou `rejected`.
3. Un administrateur ne peut approuver que les documents inclus dans son périmètre d'autorisation.
4. Un document archivé ne peut être consulté ou téléchargé que par un utilisateur autorisé.
5. Un utilisateur sans accès direct peut soumettre une demande, et l'accès reste bloqué jusqu'à son approbation.
6. Les téléversements et téléchargements fonctionnent de bout en bout sur le réseau local.
7. Les actions sensibles et les décisions d'approbation sont enregistrées et consultables.
8. Les contrôles d'accès sont vérifiés côté serveur et couverts par des tests pour chaque rôle.

## Règles à préciser

- Possibilité pour un utilisateur d'accéder à tous les documents de son département ou seulement à certaines catégories.
- Traitement d'un document refusé : correction et nouvelle soumission, conservation, ou suppression.
- Politique de suppression et de restauration des documents archivés.
- Formats et tailles maximales des fichiers acceptés.
- Exigences de conservation, de sauvegarde et de chiffrement propres à l'organisation.

## Décisions produit provisoires

- Les niveaux de classification utilisent une échelle croissante de 1 à 4.
- Un niveau élevé représente une sensibilité et une autorité d'accès plus élevées.
- Un utilisateur peut accéder aux documents de son niveau et des niveaux inférieurs lorsque les autres règles d'accès l'autorisent.
- L'accès à un niveau supérieur exige une demande approuvée.
- Le niveau initial d'un document est hérité du département de son auteur, puis peut être corrigé pendant la validation.
- L'administrateur du demandeur peut traiter une demande seulement lorsque son propre niveau couvre celui du document demandé.
- Une demande dépassant le niveau de cet administrateur relève obligatoirement d'un superutilisateur.
- Une demande approuvée autorise un téléchargement unique pendant une fenêtre maximale de 24 heures.
- Toute approbation ou tout refus exige une justification et une trace d'audit.
- Cette politique constitue la règle de la première version et pourra évoluer à travers une décision produit et une migration documentées.
