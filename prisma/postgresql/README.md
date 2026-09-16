# Transition PostgreSQL

Ce dossier porte le schéma PostgreSQL désormais actif dans l'environnement local. La base SQLite et son historique restent conservés comme point de retour figé.

- `schema.prisma` décrit le modèle cible PostgreSQL et génère un client séparé dans `node_modules`.
- `migrations/` contient un historique PostgreSQL indépendant, destiné uniquement à une base Archivio vide.
- Les migrations SQLite de `prisma/migrations/` restent la référence de la copie SQLite figée et ne sont jamais appliquées à PostgreSQL.
- Toute commande Prisma visant PostgreSQL doit fournir `--schema prisma/postgresql/schema.prisma` et une `DATABASE_URL` explicite vers la base Archivio.
- Cette baseline ne doit jamais être appliquée à un conteneur ou une base d'un autre projet.

## Copie contrôlée des données

Conserver `ARCHIVIO_DB_PASSWORD` uniquement dans le fichier local `.env`. La commande de copie construit l'URL de connexion en mémoire et ne l'affiche jamais.

Exécuter d'abord le contrôle en lecture seule :

```powershell
npm run db:postgres:copy
```

Ce contrôle vérifie les relations, l'unicité, les niveaux et les statuts documentaires de la source. Il refuse aussi une cible PostgreSQL contenant déjà des lignes applicatives.

Après un contrôle réussi, lancer explicitement la copie transactionnelle :

```powershell
npm run db:postgres:copy -- --apply
```

La copie conserve les identifiants, horodatages, empreintes de mots de passe et métadonnées, puis réaligne les séquences PostgreSQL et compare toutes les lignes à la source. SQLite reste intacte. Depuis la bascule locale du 16 septembre 2026, elle est figée et ne doit plus recevoir d'écriture applicative ; ne pas supprimer sa base ni ses migrations.

Une fois la cible remplie, revérifier l'égalité exacte des lignes et l'alignement des quatre séquences avec :

```powershell
npm run db:postgres:copy -- --verify
```

Puisque SQLite reste active, toute écriture ultérieure peut rendre la copie PostgreSQL obsolète. La vérification exacte doit donc réussir juste avant les essais de bascule.

## Rafraîchissement contrôlé avant bascule

Le rafraîchissement d'une cible déjà remplie remplace les quatre tables applicatives dans une seule transaction, réinitialise leurs séquences puis compare la cible à SQLite. Sans cette option explicite, une cible non vide reste refusée. Le nom confirmé après `--refresh=` doit correspondre exactement à `ARCHIVIO_DB_NAME`, et les bases PostgreSQL système sont toujours interdites.

Avant ce rafraîchissement final, arrêter toutes les instances Archivio susceptibles d'écrire dans SQLite ou PostgreSQL et suspendre les opérations utilisateur. Pour la base locale par défaut :

```powershell
npm run db:postgres:copy -- --refresh=archivio
npm run db:postgres:copy -- --verify
```

En cas d'échec pendant la transaction de remplacement, son contenu antérieur est conservé. SQLite et les fichiers archivés ne sont ni supprimés ni modifiés par cette commande.

Une fois la comparaison exacte réussie, démarrer Archivio avec `ARCHIVIO_DB_PROVIDER=postgresql`, puis exécuter le smoke test avant de rouvrir les accès utilisateurs. Le retour immédiat consiste à arrêter cette instance et redémarrer sans le sélecteur, ou avec `ARCHIVIO_DB_PROVIDER=sqlite`.

Ce retour arrière n'est sans perte que tant qu'aucune écriture métier n'a été acceptée exclusivement dans PostgreSQL. Après ouverture des écritures PostgreSQL, revenir à SQLite nécessitera une migration inverse qui n'est pas encore implémentée ; la décision de mise en service définitive reste donc une étape séparée.

## Sélection réversible du moteur

Le code conserve SQLite par défaut lorsque `ARCHIVIO_DB_PROVIDER` est absent ou vaut `sqlite`. PostgreSQL n'est utilisé que lorsque cette variable vaut exactement `postgresql`; toute autre valeur bloque le démarrage. L'environnement local actif définit désormais explicitement cette variable à `postgresql` dans le fichier `.env` non versionné.

Dans l'environnement local basculé, la commande habituelle charge `.env` et démarre PostgreSQL sur le port 5000 :

```powershell
npm run dev
```

Pour démarrer temporairement une autre instance PostgreSQL sur PowerShell :

```powershell
$env:PORT='5001'
npm run dev:postgres
```

Dans un autre terminal, vérifier les parcours locaux en lecture seule. Le smoke test cible le port 5001 par défaut ; pour l'instance active du port 5000 :

```powershell
node_modules\.bin\cross-env.cmd ARCHIVIO_SMOKE_BASE_URL=http://127.0.0.1:5000 npm.cmd run db:postgres:smoke
```

Le smoke test refuse toute adresse autre que `localhost`, garde son jeton temporaire en mémoire et ne modifie aucune ligne. Le moteur sélectionné est également annoncé au démarrage sans afficher l'URL ni le mot de passe.

## Validation isolée des écritures

La validation des écritures crée une base PostgreSQL jetable portant un nom généré et un dossier d'uploads dans le répertoire temporaire du système. Elle applique les migrations, copie les métadonnées SQLite dans cette base isolée, injecte une ligne obsolète puis vérifie que le rafraîchissement confirmé rétablit une copie exacte. Elle utilise ensuite des données synthétiques pour vérifier la connexion, le téléversement, les audits de téléversement et d'approbation, le rollback transactionnel d'une décision incomplète et la suppression logique. La base et le dossier temporaires sont supprimés même si un contrôle échoue.

```powershell
npm run db:postgres:validate-writes
```

Cette commande refuse de supprimer une base ou un dossier ne respectant pas son format temporaire strict. Elle ne vise jamais la base contrôlée `archivio`, la base SQLite, les archives existantes ou les ressources Docker d'un autre projet. Après son exécution, vérifier que la copie contrôlée n'a pas changé :

```powershell
npm run db:postgres:copy -- --verify
```
