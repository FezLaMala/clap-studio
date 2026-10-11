# Clap Studio

Clap Studio est un éditeur de sous-titres pour Windows. Il réunit les deux anciens outils **Clap Studio** et **Clap Sync** dans une seule application.

- **Accueil** : nouveau projet, ouverture d'un projet `.clap`, import direct d'une vidéo, démonstration et projets récents.
- **Projets** : enregistrement en `.clap` (Ctrl+S). La vidéo est retrouvée à la réouverture. Un avertissement apparaît si tu fermes avec des modifications non enregistrées.
- **Timeline à pistes** : sous-titres, textes libres et images placés librement sur plusieurs pistes et superposables. Les pistes du dessus s'affichent par-dessus.
- **Sous-titres automatiques** : transcription Whisper exécutée sur l'ordinateur (dans un worker, avec une vraie progression), détection de la parole ou répartition d'un texte collé.
- **Import** : vidéo, image, `.srt`, `.vtt`, `.json` ou `.clap` (fichier, glisser-déposer ou Ctrl+V).
- **Calage** : décaler tous les sous-titres, ou caler le premier sur la tête de lecture.
- **Édition** : coupe et retrait de parties, éléments déplaçables et redimensionnables, styles prédéfinis, police, couleurs, forme, animations, annuler/rétablir.
- **Export** : SRT, WebVTT, ou **vidéo avec tous les éléments incrustés** (MP4 ou WebM selon le système).
- **Paramètres** : effet verre (activable, intensité du flou), fond (halos, dégradé, uni, image), couleur du thème, taille de l'interface, animations, langue, mises à jour automatiques.
- **Mises à jour** : au lancement, l'application vérifie les nouvelles versions publiées sur GitHub, les télécharge puis propose de redémarrer.

## Développement

```bash
npm install
npm start
```

L'interface se trouve dans `src/renderer/` (HTML, CSS et JS sans framework, transcription dans `asr-worker.js`). Le processus principal Electron est dans `src/main.js`.

## Créer l'installateur

```bash
npm run dist
```

L'installateur est créé dans `dist/` sous le nom `Clap-Studio-Setup-<version>.exe`.

## Publier une version (et la mise à jour automatique)

1. Augmenter `version` dans `package.json` (ex. `1.0.2`).
2. Committer, puis créer et pousser le tag correspondant :

   ```bash
   git tag v1.0.2
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
| T | Nouveau texte à la tête de lecture |
| Suppr | Retirer la partie sélectionnée ou supprimer l'élément |
| ← / → | Image précédente / suivante (Maj : 1 s) |
| Ctrl+Z / Ctrl+Maj+Z | Annuler / rétablir |
| Ctrl+S / Ctrl+Maj+S | Enregistrer / enregistrer sous |
| Ctrl+O | Ouvrir un projet |
| Ctrl+N | Nouveau projet |
| Ctrl+I | Importer des fichiers |
| Ctrl+E | Exporter |
| Ctrl+, | Paramètres |
