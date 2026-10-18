// Transcription Whisper hors du fil de l'interface : la fenêtre reste fluide et la progression est réelle.
// transformers.js v3 : carte graphique (WebGPU) quand elle est disponible, sinon processeur (WASM).
import { pipeline, env, Tensor } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

env.allowLocalModels = false;
if (!self.caches) env.useBrowserCache = false;

// réglages par modèle : le gros modèle « turbo » n'est raisonnable que sur carte graphique
const MODELS = {
  'onnx-community/whisper-base': { webgpu: { dtype: 'fp32' }, wasm: { dtype: 'q8' } },
  'onnx-community/whisper-small': { webgpu: { dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } }, wasm: { dtype: 'q8' } },
  'onnx-community/whisper-large-v3-turbo': { webgpu: { dtype: { encoder_model: 'fp16', decoder_model_merged: 'q4' } }, wasm: { dtype: 'q8' } },
};
const CHUNK = 30, STRIDE = 5;
let pipe = null, pipeKey = '';

async function hasWebGPU() {
  try { return !!(self.navigator?.gpu && await self.navigator.gpu.requestAdapter()); } catch (e) { return false; }
}

// Sans langue imposée, Whisper (transformers.js) traduit en anglais au lieu de détecter la langue.
// On la détecte donc nous-mêmes : premier jeton du décodeur (<|fr|>, <|en|>…) sur les 30 s les plus sonores.
async function detectLanguage(audio) {
  const W = 16000 * 30;
  let best = 0;
  if (audio.length > W) {
    let bestE = -1;
    for (let s = 0; s + W <= audio.length; s += 16000 * 5) {
      let e = 0; for (let i = s; i < s + W; i += 64) e += audio[i] * audio[i];
      if (e > bestE) { bestE = e; best = s; }
    }
  }
  const inputs = await pipe.processor(audio.subarray(best, best + W));
  const sot = pipe.tokenizer.model.tokens_to_ids.get('<|startoftranscript|>');
  const out = await pipe.model.generate({ ...inputs, decoder_input_ids: new Tensor('int64', BigInt64Array.from([BigInt(sot)]), [1, 1]), max_new_tokens: 1 });
  const seq = out.sequences ?? out, tok = pipe.tokenizer.decode([Number(seq.data[seq.data.length - 1])]);
  const m = /^<\|([a-z]{2,3}(?:-[a-z]+)?)\|>$/.exec(tok);
  return m ? m[1] : null;
}

self.onmessage = async ({ data }) => {
  if (data.type !== 'run') return;
  try {
    const device = (await hasWebGPU()) ? 'webgpu' : 'wasm';
    const key = data.model + '|' + device;
    if (!pipe || pipeKey !== key) {
      // le modèle est fait de plusieurs fichiers : on additionne leurs octets pour une seule barre qui ne recule jamais
      const files = {}; let shown = 0, lastPost = 0;
      const opts = MODELS[data.model]?.[device] || {};
      pipe = await pipeline('automatic-speech-recognition', data.model, {
        device, ...opts,
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
      pipeKey = key;
    }
    let lang = data.lang;
    if (!lang) {
      try { lang = await detectLanguage(data.audio); } catch (e) { lang = null; }
      self.postMessage({ type: 'lang', lang });
    }
    const dur = data.audio.length / 16000;
    const total = Math.max(1, Math.ceil(Math.max(0, dur - CHUNK) / (CHUNK - 2 * STRIDE)) + 1);
    self.postMessage({ type: 'start', total, device });
    let done = 0;
    const opts = { task: 'transcribe', return_timestamps: true, chunk_callback: () => { done++; self.postMessage({ type: 'chunk', done: Math.min(done, total) }); } };
    if (lang) opts.language = lang;
    if (dur > CHUNK) { opts.chunk_length_s = CHUNK; opts.stride_length_s = STRIDE; }
    const out = await pipe(data.audio, opts);
    self.postMessage({ type: 'done', out: { text: out.text, chunks: out.chunks, lang }, device });
  } catch (e) {
    self.postMessage({ type: 'error', message: String(e?.message || e) });
  }
};
