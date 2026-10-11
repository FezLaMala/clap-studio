// Transcription Whisper hors du fil de l'interface : la fenêtre reste fluide et la progression est réelle.
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
if (!self.caches) env.useBrowserCache = false;
// on est déjà dans un worker : pas de second worker « proxy » (il serait bloqué de toute façon, origine différente)
try { env.backends.onnx.wasm.numThreads = 1; env.backends.onnx.wasm.proxy = false; } catch (e) {}

const CHUNK = 30, STRIDE = 5;
let pipe = null, pipeModel = '';

self.onmessage = async ({ data }) => {
  if (data.type !== 'run') return;
  try {
    if (!pipe || pipeModel !== data.model) {
      // le modèle est fait de plusieurs fichiers : on additionne leurs octets pour une seule barre
      // seuls les gros fichiers (encodeur, décodeur) comptent, et la barre ne recule jamais
      const files = {}; let shown = 0, lastPost = 0;
      pipe = await pipeline('automatic-speech-recognition', data.model, {
        progress_callback: p => {
          if (p.status !== 'progress' || !p.total || p.total < 1e6) return;
          files[p.file] = [p.loaded, p.total];
          const v = Object.values(files), got = v.reduce((n, f) => n + f[0], 0), all = v.reduce((n, f) => n + f[1], 0);
          const frac = Math.max(shown, all ? got / all : 0), now = Date.now();
          if (frac - shown < .002 && now - lastPost < 200) return;
          shown = frac; lastPost = now;
          self.postMessage({ type: 'load', frac });
        },
      });
      pipeModel = data.model;
    }
    const dur = data.audio.length / 16000;
    const total = Math.max(1, Math.ceil(Math.max(0, dur - CHUNK) / (CHUNK - 2 * STRIDE)) + 1);
    self.postMessage({ type: 'start', total });
    let done = 0;
    const out = await pipe(data.audio, {
      language: data.lang, task: 'transcribe', chunk_length_s: CHUNK, stride_length_s: STRIDE, return_timestamps: true,
      chunk_callback: () => { done++; self.postMessage({ type: 'chunk', done: Math.min(done, total) }); },
    });
    self.postMessage({ type: 'done', out: { text: out.text, chunks: out.chunks } });
  } catch (e) {
    self.postMessage({ type: 'error', message: String(e?.message || e) });
  }
};
