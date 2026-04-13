import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.5'

// Skip local checks for weights (always download/cache from HF)
env.allowLocalModels = false;

let transcriber = null;

async function getInstance(progress_callback) {
  if (transcriber === null) {
    transcriber = await pipeline('automatic-speech-recognition', 'openai/whisper-tiny', {
      device: 'webgpu',
      dtype: 'fp32', // webgpu currently prefers fp32
    });
  }
  return transcriber;
}

self.onmessage = async (event) => {
  const { audio } = event.data;

  try {
    const instance = await getInstance();
    
    // Process audio
    const result = await instance(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      force_full_sequences: false,
    });

    self.postMessage({ status: 'complete', result });
  } catch (error) {
    console.error('Inference error:', error);
    self.postMessage({ status: 'error', error: error.message });
  }
};
