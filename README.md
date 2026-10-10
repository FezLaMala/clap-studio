# Clap Studio

Clap Studio est un éditeur de sous-titres pour Windows. Il réunit les deux anciens outils **Clap Studio** et **Clap Sync** dans une seule application.

- **Sous-titres automatiques** : transcription Whisper exécutée sur l'ordinateur, détection de la parole ou répartition d'un texte collé.
- **Import** : vidéo, `.srt`, `.vtt` ou `.json` (fichier, glisser-déposer ou Ctrl+V). Les projets Clap exportés en JSON gardent leurs styles et leurs coupes.
- **Calage** : décaler tous les sous-titres, ou caler le premier sur la tête de lecture.
- **Édition** : timeline avec coupe et retrait de parties, sous-titres déplaçables et redimensionnables, styles prédéfinis, police, couleurs, forme, animations, annuler/rétablir.
- **Export** : SRT, WebVTT, projet JSON, ou **vidéo avec sous-titres incrustés** (MP4 ou WebM selon le système).
- **Mises à jour** : au lancement, l'application vérifie les nouvelles versions publiées sur GitHub, les télécharge puis propose de redémarrer.

## Développement

```bash
npm install
npm start
```

L'interface se trouve dans `src/renderer/` (HTML, CSS et JS sans framework). Le processus principal Electron est dans `src/main.js`.

## Créer l'installateur

```bash
npm run dist
```

L'installateur est créé dans `dist/` sous le nom `Clap-Studio-Setup-<version>.exe`.

## Publier une version (et la mise à jour automatique)

1. Augmenter `version` dans `package.json` (ex. `1.0.1`).
2. Committer, puis créer et pousser le tag correspondant :

   ```bash
   git tag v1.0.1
   git push origin main --tags
   ```

3. Le workflow `.github/workflows/release.yml` construit l'installateur et le publie dans une GitHub Release, avec `latest.yml`. Les installations existantes trouvent cette version au prochain lancement.

Le dépôt doit être **public** pour que les installations puissent lire les releases sans jeton.

## Raccourcis

| Touche | Action |
| --- | --- |
| Espace | Lecture / pause |
| S | Couper la vidéo à la tête de lecture |
| N | Nouveau sous-titre à la tête de lecture |
| Suppr | Retirer la partie sélectionnée ou supprimer le sous-titre |
| ← / → | Image précédente / suivante (Maj : 1 s) |
| Ctrl+Z / Ctrl+Maj+Z | Annuler / rétablir |
| Ctrl+O | Importer des fichiers |
| Ctrl+E | Exporter |
