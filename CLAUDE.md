# CLAUDE.md

## Règles critiques

**Ne jamais supprimer ou recréer la base de données sans confirmation explicite de l'utilisateur.**

Cela inclut :
- `DROP TABLE` / `DROP DATABASE`
- `DELETE FROM` sans `WHERE`
- Suppression du fichier `data.db`
- Migrations destructives qui effacent des données

Avant toute opération destructive sur la BDD : demander confirmation claire. Attendre réponse. Ne pas procéder sans accord.
