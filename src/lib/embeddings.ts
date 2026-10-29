/**
 * EmbeddingGemma 300M pipeline via @huggingface/transformers
 * Runs entirely in-browser via WebAssembly/WebGPU.
 * Same approach proven in cubby Week 3 — Matryoshka truncation to 256 dims.
 */

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

const MODEL_ID = 'nickmuchi/EmbeddingGemma-300M-e5-onnx';
const EMBED_DIM = 256; // Matryoshka truncation from 768

let extractor: FeatureExtractionPipeline | null = null;
let loadingPromise: Promise<FeatureExtractionPipeline> | null = null;

export type ModelProgressCallback = (progress: {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}) => void;

/** Load the model (cached after first call). */
export async function loadModel(
  onProgress?: ModelProgressCallback,
): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;
  if (loadingPromise) return loadingPromise;

  loadingPromise = pipeline('feature-extraction', MODEL_ID, {
    dtype: 'q8' as never, // quantized for speed
    progress_callback: onProgress as never,
  }).then((pipe) => {
    extractor = pipe;
    return pipe;
  });

  return loadingPromise;
}

/** Check if model is already loaded */
export function isModelLoaded(): boolean {
  return extractor !== null;
}

/** Embed a single text. Returns Float32Array of length EMBED_DIM. */
export async function embed(text: string, prefix = ''): Promise<Float32Array> {
  const pipe = await loadModel();
  const input = prefix ? `${prefix}${text}` : text;
  const output = await pipe(input, { pooling: 'mean', normalize: true });
  // Matryoshka truncation: take first EMBED_DIM dimensions
  const full = output.data as Float32Array;
  const truncated = new Float32Array(EMBED_DIM);
  truncated.set(full.subarray(0, EMBED_DIM));
  // Re-normalize after truncation
  let norm = 0;
  for (let i = 0; i < EMBED_DIM; i++) norm += truncated[i] * truncated[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < EMBED_DIM; i++) truncated[i] /= norm;
  return truncated;
}

/** Embed multiple texts with a shared prefix. */
export async function embedBatch(
  texts: string[],
  prefix = '',
  onProgress?: (done: number, total: number) => void,
): Promise<Float32Array[]> {
  // Process one at a time to avoid OOM on large batches
  const results: Float32Array[] = [];
  for (let i = 0; i < texts.length; i++) {
    results.push(await embed(texts[i], prefix));
    onProgress?.(i + 1, texts.length);
  }
  return results;
}

/** Cosine similarity between two normalized vectors. */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot; // Already normalized, so dot = cosine
}
