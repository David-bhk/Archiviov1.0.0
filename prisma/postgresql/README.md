# Transition PostgreSQL

Ce dossier prépare PostgreSQL sans modifier la base SQLite active ni son historique de migrations.

- `schema.prisma` décrit le modèle cible PostgreSQL et génère un client séparé dans `node_modules`.
- `migrations/` contient un historique PostgreSQL indépendant, destiné uniquement à une base Archivio vide.
- Les migrations SQLite de `prisma/migrations/` restent la référence de la base locale actuelle jusqu'à la bascule validée.
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

La copie conserve les identifiants, horodatages, empreintes de mots de passe et métadonnées, puis réaligne les séquences PostgreSQL et compare toutes les lignes à la source. SQLite reste intacte et demeure la source de l'application jusqu'à une bascule séparée et validée. En cas d'échec, le retour arrière opérationnel consiste donc à continuer d'utiliser SQLite ; ne pas supprimer sa base ni ses migrations.

Une fois la cible remplie, revérifier l'égalité exacte des lignes et l'alignement des quatre séquences avec :

```powershell
npm run db:postgres:copy -- --verify
```

Puisque SQLite reste active, toute écriture ultérieure peut rendre la copie PostgreSQL obsolète. La vérification exacte doit donc réussir juste avant les essais de bascule ; le rafraîchissement d'une cible déjà remplie nécessitera une procédure explicite séparée.

## Sélection réversible du moteur

L'application conserve SQLite par défaut lorsque `ARCHIVIO_DB_PROVIDER` est absent ou vaut `sqlite`. PostgreSQL n'est utilisé que lorsque cette variable vaut exactement `postgresql`; toute autre valeur bloque le démarrage.

Pour démarrer une instance PostgreSQL parallèle sur PowerShell sans arrêter l'instance SQLite du port 5000 :

```powershell
$env:PORT='5001'
npm run dev:postgres
```

Dans un autre terminal, vérifier les parcours locaux en lecture seule :

```powershell
npm run db:postgres:smoke
```

Le smoke test refuse toute adresse autre que `localhost`, garde son jeton temporaire en mémoire et ne modifie aucune ligne. Le moteur sélectionné est également annoncé au démarrage sans afficher l'URL ni le mot de passe.

## Validation isolée des écritures

La validation des écritures crée une base PostgreSQL jetable portant un nom généré et un dossier d'uploads dans le répertoire temporaire du système. Elle applique les migrations, utilise uniquement des données synthétiques, puis vérifie la connexion, le téléversement, les audits de téléversement et d'approbation, le rollback transactionnel d'une décision incomplète et la suppression logique. La base et le dossier temporaires sont supprimés même si un contrôle échoue.

```powershell
npm run db:postgres:validate-writes
```

Cette commande refuse de supprimer une base ou un dossier ne respectant pas son format temporaire strict. Elle ne vise jamais la base contrôlée `archivio`, la base SQLite, les archives existantes ou les ressources Docker d'un autre projet. Après son exécution, vérifier que la copie contrôlée n'a pas changé :

```powershell
npm run db:postgres:copy -- --verify
```
