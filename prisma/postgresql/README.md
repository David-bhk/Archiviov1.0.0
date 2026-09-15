# Transition PostgreSQL

Ce dossier prépare PostgreSQL sans modifier la base SQLite active ni son historique de migrations.

- `schema.prisma` décrit le modèle cible PostgreSQL et génère un client séparé dans `node_modules`.
- `migrations/` contient un historique PostgreSQL indépendant, destiné uniquement à une base Archivio vide.
- Les migrations SQLite de `prisma/migrations/` restent la référence de la base locale actuelle jusqu'à la bascule validée.
- Toute commande Prisma visant PostgreSQL doit fournir `--schema prisma/postgresql/schema.prisma` et une `DATABASE_URL` explicite vers la base Archivio.
- Cette baseline ne doit jamais être appliquée à un conteneur ou une base d'un autre projet.

La copie des données SQLite, la vérification des séquences et la bascule de l'application seront livrées dans des unités séparées.
