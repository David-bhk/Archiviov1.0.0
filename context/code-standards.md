# Standards de code

## Principes généraux

- Corriger la cause d'un problème au lieu d'ajouter un contournement local.
- Garder chaque module centré sur une responsabilité identifiable.
- Ne pas mélanger dans une même modification une refonte visuelle, une migration de données et une fonctionnalité métier sans plan explicitement approuvé.
- Réutiliser une abstraction seulement lorsqu'elle représente une règle réellement commune ; ne pas généraliser prématurément.
- Préférer un code explicite et lisible à une solution compacte mais difficile à vérifier.
- Ne pas copier une règle métier dans plusieurs couches. Définir une source de vérité et l'appeler depuis les points d'entrée concernés.
- Ne pas considérer le code existant comme correct uniquement parce qu'il fonctionne dans un cas manuel.
- Ne pas laisser de code mort, fichier de sauvegarde, console de débogage ou commentaire devenu faux après une modification.
- Les commentaires expliquent une contrainte ou une raison non évidente ; ils ne répètent pas le code.
- Le français est utilisé dans l'interface et les messages destinés à l'utilisateur. Le code, les identifiants et les noms techniques restent en anglais pour conserver les conventions de l'écosystème.

## TypeScript

- Le mode `strict` reste activé dans tout le projet.
- Ne pas introduire `any`. Utiliser des types explicites, `unknown` avec narrowing, des génériques ou les types générés par Prisma.
- Une exception temporaire à cette règle doit être étroitement limitée, commentée avec sa raison et suivie dans le `progress-tracker.md`.
- Éviter les assertions de type `as` lorsqu'une validation ou un narrowing peut établir le type.
- Ne pas utiliser `as any` pour contourner une incompatibilité entre Prisma, Zod et les types partagés ; corriger leurs contrats.
- Définir les unions ou enums métier une seule fois lorsque possible, notamment les rôles, statuts et niveaux.
- Traiter toute donnée externe comme `unknown` jusqu'à sa validation : corps, paramètres, requêtes, variables d'environnement, jetons et contenu de stockage.
- Utiliser `import type` lorsque l'import n'est nécessaire qu'au typage.
- Éviter `React.FC` lorsqu'il n'apporte rien ; typer explicitement les propriétés des composants.
- Une fonction exportée et toute frontière de module doivent avoir un contrat compréhensible sans lire leur implémentation complète.

## Nommage

- Composants React et types : `PascalCase`.
- Fonctions, variables et propriétés : `camelCase`.
- Constantes globales immuables : `UPPER_SNAKE_CASE` lorsque cela améliore leur identification.
- Hooks React : préfixe `use` et fichier cohérent avec le nom du hook.
- Routes et ressources API : noms anglais, pluriels et stables.
- Noms de fichiers de composants : `PascalCase.tsx` ; utilitaires et modules non React : `camelCase.ts`.
- Utiliser `document` dans les nouveaux concepts métier. Le modèle Prisma existant `File` peut être migré séparément ; ne pas effectuer un renommage incomplet.
- Employer les statuts canoniques `pending`, `archived` et `rejected` dans la cible. Toute compatibilité temporaire avec `approved` doit être localisée et documentée.

## React

- Les pages orchestrent les cas d'utilisation ; elles ne contiennent pas directement toutes les règles de données et d'autorisation.
- Extraire un composant lorsqu'il représente un élément métier réutilisable ou réduit réellement la complexité d'une page.
- Ne pas extraire des composants minuscules sans bénéfice de lecture, de test ou de réutilisation.
- Les données serveur sont gérées avec TanStack Query ; éviter de dupliquer ces données dans un état global ou local sans nécessité.
- Les clés de requête sont stables, structurées et incluent les paramètres qui influencent le résultat.
- Toute mutation invalide ou met à jour explicitement les requêtes affectées.
- Les effets React servent à synchroniser un système externe, pas à recalculer des valeurs dérivables pendant le rendu.
- Les dépendances d'un effet restent complètes ; ne pas désactiver une règle de lint pour masquer un cycle mal conçu.
- Les listes utilisent une clé stable issue des données, jamais leur index lorsque l'ordre peut changer.
- Tout formulaire affiche ses erreurs et empêche les soumissions multiples pendant une mutation.
- Les capacités affichées par le client améliorent l'expérience, mais ne remplacent jamais l'autorisation du serveur.
- Respecter les composants, jetons et règles d'icônes définis dans `ui-context.md`.

## Express et organisation du serveur

- Une route HTTP reste mince : validation, authentification, appel du service, transformation de la réponse.
- Les règles métier vivent dans des services ou modules de domaine testables indépendamment d'Express.
- Les accès Prisma passent par un module de données ou dépôt clairement défini ; les routes n'éparpillent pas de requêtes Prisma directes.
- Les middlewares transversaux gèrent l'authentification, les erreurs, les limites et les préoccupations HTTP communes.
- Fractionner progressivement `server/routes.ts` par ressource ou domaine lorsqu'une fonctionnalité concernée est modifiée.
- Ne pas réécrire tout le serveur uniquement pour obtenir cette structure ; migrer par unités cohérentes et vérifiables.
- Une fonction asynchrone de route transmet correctement ses erreurs au gestionnaire central.
- Le gestionnaire d'erreurs ne relance pas une erreur après avoir envoyé une réponse, sauf mécanisme explicitement prévu et testé.
- Les messages d'erreur internes, traces et objets bruts d'exception ne sont jamais envoyés au client.
- Les ports, origines autorisées, secrets, chemins de stockage et adresses réseau proviennent de la configuration.

## Routes API

- Valider avec Zod le corps, les paramètres et les valeurs de requête avant toute logique métier.
- Refuser les champs inconnus lorsqu'ils pourraient modifier une ressource ou une autorisation.
- Authentifier toutes les routes métier et appliquer l'autorisation avant de lire ou modifier une ressource sensible.
- Ne jamais accepter depuis le client une identité, un rôle, un département ou un niveau qui peut être obtenu depuis l'utilisateur authentifié.
- Les identifiants sont convertis et validés explicitement ; `NaN`, zéro et valeurs négatives sont refusés lorsqu'ils ne sont pas valides.
- Utiliser des codes HTTP cohérents : `200` lecture ou mise à jour, `201` création, `204` succès sans corps, `400` entrée invalide, `401` non authentifié, `403` interdit, `404` absent, `409` conflit, `500` erreur inattendue.
- Standardiser les réponses d'erreur sous une forme prévisible, par exemple `{ "error": { "code": "...", "message": "...", "details": ... } }`.
- Les listes paginées renvoient systématiquement les données et les métadonnées de pagination.
- Ne jamais inclure un mot de passe, hash, secret, jeton ou chemin physique interne dans une réponse.
- Une route de téléchargement vérifie l'autorisation immédiatement avant l'envoi du fichier.
- Les opérations sensibles produisent un événement d'audit dans le même cas d'utilisation.

## Authentification et autorisation

- Le secret JWT est obligatoire ; aucune valeur de repli connue n'est autorisée en production.
- Les mots de passe sont hachés avec bcrypt avant persistance et ne sont jamais journalisés.
- Les comparaisons de rôles utilisent la représentation canonique partagée, sans conversions répétées et divergentes dans chaque fichier.
- Centraliser les décisions documentaires dans une fonction ou un service d'autorisation testable.
- Une décision d'accès tient compte du rôle, de l'état actif, du département, du niveau, du document et de toute demande temporaire valide.
- Le superutilisateur possède un accès global, mais chaque opération sensible reste auditée.
- Un administrateur n'accorde jamais un niveau supérieur au sien.
- La consommation d'une autorisation temporaire survient uniquement après un téléchargement réussi.
- Les contrôles côté client ne sont jamais cités comme preuve de sécurité.
- Les erreurs d'authentification ne révèlent pas si un compte précis existe, sauf dans une interface administrative autorisée.

## Prisma et base de données

- Toute modification de schéma passe par `prisma/schema.prisma` et une migration versionnée.
- Ne pas modifier manuellement la structure d'une base partagée ou de production.
- Utiliser des clés étrangères basées sur des identifiants stables ; ne pas représenter une relation durable uniquement par un nom modifiable.
- Définir explicitement les comportements `onDelete` importants et vérifier leurs conséquences métier.
- Utiliser une transaction lorsque plusieurs écritures doivent réussir ou échouer ensemble.
- Ajouter un index pour les champs fréquemment utilisés dans les recherches, tris, relations et contrôles d'accès, après justification par les usages.
- Les dates sont stockées en UTC et converties pour l'affichage uniquement.
- Les statuts et rôles utilisent des enums ou contraintes équivalentes plutôt que des chaînes arbitraires.
- Les scripts de seed ne contiennent aucun mot de passe de production et sont sûrs à exécuter dans l'environnement prévu.
- Une migration destructive exige une stratégie explicite de sauvegarde, conversion et retour arrière.

## Fichiers et stockage

- Les fichiers binaires ne sont pas stockés directement dans SQLite.
- La racine de stockage provient d'une configuration validée et n'est jamais exposée au client.
- Le serveur génère le nom physique ; le nom original est conservé uniquement comme métadonnée nettoyée.
- Résoudre et vérifier tout chemin avant lecture, écriture ou suppression afin d'empêcher la traversée de répertoires.
- Valider l'extension, le type déclaré et, lorsque possible, la signature réelle du fichier.
- Appliquer des limites configurées de taille et de quantité avant de charger un contenu important en mémoire.
- Nettoyer les fichiers temporaires après succès ou échec.
- Éviter les incohérences entre stockage et base grâce à une orchestration compensatoire ou transactionnelle clairement testée.
- Une suppression logique ne détruit pas immédiatement le contenu physique.
- Les téléchargements utilisent des en-têtes sûrs et un nom nettoyé.
- La base et les fichiers sont inclus dans une stratégie de sauvegarde cohérente.

## Journalisation et audit

- Les journaux techniques ne contiennent jamais de mot de passe, jeton complet, contenu documentaire ou données personnelles inutiles.
- Ne pas journaliser automatiquement le corps complet des réponses API.
- Utiliser des événements d'audit structurés pour les connexions, téléversements, validations, refus, téléchargements, demandes d'accès, décisions, changements de niveau et suppressions.
- Un événement d'audit enregistre au minimum le type, l'auteur, la cible et la date, avec une description ou des métadonnées limitées lorsque nécessaire.
- L'audit métier ne dépend pas uniquement des logs de console du serveur.

## Styles

- Utiliser les variables et variantes sémantiques définies dans `ui-context.md`.
- Ne pas ajouter de couleurs codées directement dans un composant.
- Ne jamais utiliser de dégradé.
- Ne pas ajouter une icône sans fonction claire.
- Respecter l'échelle de rayons et les conventions d'espacement existantes.
- Préférer une variante de composant partagée à la répétition de longues listes de classes.
- Toute nouvelle interface fonctionne au clavier et conserve un focus visible.
- Tester les états chargement, vide, erreur, interdit et succès, pas uniquement le cas nominal.

## Tests et vérification

- Chaque correction de bug ajoute si possible un test qui échouait avant la correction.
- Toute règle d'autorisation possède des tests positifs et négatifs pour les rôles et niveaux concernés.
- Les services métier sont testés sans dépendre obligatoirement du navigateur.
- Les routes sensibles ont des tests d'intégration couvrant authentification, validation, autorisation et réponse.
- Les flux critiques de téléversement, approbation, demande d'accès et téléchargement sont vérifiés de bout en bout.
- Les tests utilisent des fichiers temporaires et une base isolée ; ils ne modifient jamais les archives réelles.
- Ne pas affaiblir, ignorer ou supprimer un test uniquement pour faire passer la suite.
- Avant de déclarer une unité terminée, exécuter au minimum les vérifications pertinentes parmi :
  - `npm run check` pour TypeScript ;
  - `npm test -- --run` pour la suite Vitest ;
  - `npm run build` pour la construction complète ;
  - les tests ciblés du domaine modifié.
- Si une vérification ne peut pas être exécutée ou échoue pour une raison préexistante, le signaler précisément dans le compte rendu et dans le suivi si cela affecte la suite.

## Dépendances

- Réutiliser une dépendance déjà présente lorsqu'elle répond correctement au besoin.
- Ne pas ajouter une dépendance de production sans vérifier son utilité, sa maintenance, sa sécurité et son impact sur le déploiement local.
- Demander confirmation avant d'ajouter une dépendance de production qui modifie sensiblement l'architecture ou le risque de sécurité.
- Ne pas maintenir deux bibliothèques remplissant le même rôle sans justification documentée.
- Mettre à jour le verrouillage `package-lock.json` avec toute modification de dépendance.

## Organisation des fichiers

- `client/src/pages/` — écrans associés aux routes frontend.
- `client/src/components/ui/` — primitives génériques shadcn/ui ; éviter les modifications spécifiques à une seule fonctionnalité.
- `client/src/components/` — composants métier regroupés par domaine.
- `client/src/contexts/` — contextes React globaux réellement nécessaires.
- `client/src/hooks/` — hooks réutilisables sans rendu de page.
- `client/src/lib/` — client API, configuration et utilitaires partagés du frontend.
- `client/src/types/` — types propres au frontend qui ne représentent pas un contrat serveur partagé.
- `server/middleware/` — préoccupations HTTP transversales.
- `server/routes/` — cible pour les routeurs Express séparés par domaine.
- `server/services/` — cible pour les règles et cas d'utilisation métier.
- `server/repositories/` — cible optionnelle pour les accès aux données lorsque la séparation apporte un bénéfice réel.
- `shared/` — contrats et schémas réellement partagés par client et serveur.
- `prisma/` — schéma, migrations et seed contrôlé.
- `context/` — vérité documentaire sur le produit, l'architecture, l'interface, les standards et l'avancement.

Les dossiers cibles ne doivent être créés qu'au moment où une unité de travail les utilise. Ne pas déplacer mécaniquement tous les fichiers sans tests et sans amélioration fonctionnelle associée.
