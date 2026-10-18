import { pipeline, env } from '@huggingface/transformers';

// Configuration for browser-side execution
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Singleton pattern to ensure the pipeline is only loaded once.
 */
class TranscriptionPipeline {
    static task = 'automatic-speech-recognition' as const;
    static model = 'onnx-community/whisper-tiny'; // Using tiny for speed and low RAM
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static instance: Promise<any> | null = null;

    static async getInstance(progress_callback: ((progress: unknown) => void) | null = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { 
                progress_callback: progress_callback ?? undefined,
                // WebGPU support in Transformers.js v3
                // device: 'webgpu' 
            });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { audio, language, model } = event.data;

    try {
        const transcriber = await TranscriptionPipeline.getInstance((progress: unknown) => {
            // Update main thread on model loading progress
            self.postMessage({ status: 'progress', progress });
        });

        const result = await transcriber(audio, {
            language: language || 'it',
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: true,
            force_full_sequences: false,
            // Subtitle-friendly output
            callback_function: (data: unknown) => {
                self.postMessage({ status: 'update', data });
            }
        });

        self.postMessage({ status: 'complete', result });
    } catch (err) {
        self.postMessage({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
});
