# Exploitation des sauvegardes locales Archivio

## Politique locale approuvée

- Créer un instantané local cohérent chaque jour où Archivio contient des données à conserver.
- Conserver les instantanés locaux pendant au moins 30 jours.
- Vérifier chaque nouvel instantané par une restauration isolée avant de le considérer comme exploitable.
- Arrêter l’application pendant la création afin que PostgreSQL et les fichiers documentaires représentent le même état.
- Conserver les sauvegardes dans `ARCHIVIO_BACKUP_DIR`, hors de la racine documentaire et hors de Git.

Cette politique prépare l’exploitation locale. Elle n’installe aucune tâche planifiée et n’effectue aucune suppression automatique. Les sauvegardes locales ne sont actuellement ni chiffrées ni copiées hors machine ; elles ne suffisent donc pas encore à protéger Archivio contre la perte ou le vol de l’ordinateur.

## Procédure quotidienne manuelle

1. Arrêter le serveur Archivio et vérifier qu’aucune écriture applicative n’est en cours.
2. Vérifier que le conteneur PostgreSQL Archivio est sain :

   ```powershell
   docker compose -f compose.database.yaml -p archivio ps
   ```

3. Créer l’instantané en confirmant le nom exact de la base arrêtée :

   ```powershell
   npm run db:backup:create -- --confirm-stopped=archivio
   ```

4. Noter le dossier affiché par la commande, puis vérifier sa restauration isolée :

   ```powershell
   npm run db:backup:verify -- --snapshot=.archivio-backups/<dossier-affiché>
   ```

5. Contrôler la fenêtre de rétention :

   ```powershell
   npm run db:backup:inventory
   ```

6. Redémarrer Archivio uniquement après la fin de la création et de la vérification.

## Rétention et limites de sécurité

La commande d’inventaire classe les instantanés de la base active en sauvegardes courantes ou âgées de plus de 30 jours. Elle signale séparément les dossiers invalides et les sauvegardes appartenant à une autre base. Elle ne crée, ne modifie et ne supprime aucun fichier.

Une éventuelle purge devra être conçue comme une unité séparée : confirmation explicite, restriction stricte à `ARCHIVIO_BACKUP_DIR`, refus des liens symboliques et conservation d’au moins une sauvegarde récente vérifiée. En attendant cette unité, les instantanés de plus de 30 jours peuvent être conservés ; ils ne doivent pas être supprimés automatiquement.

Le chiffrement, la copie hors machine et la fréquence de test de restauration en exploitation restent à décider avant un déploiement avec des documents réels sensibles.
