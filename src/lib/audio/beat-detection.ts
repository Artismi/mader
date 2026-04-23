/**
 * beat-detection.ts
 * 
 * Automatic BPM extraction from Audio Buffers using peak detection.
 * Strategy: Low-pass filter -> Amplitude Thresholding -> Tempo Estimation.
 */

export async function extractBPM(audioBuffer: AudioBuffer): Promise<number | null> {
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  // 1. Source -> Low Pass Filter (Kick drum isolation)
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const lowpass = offlineCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(150, 0); // Focus on sub/kick frequencies

  source.connect(lowpass);
  lowpass.connect(offlineCtx.destination);
  source.start(0);

  // 2. Render the filtered buffer
  const renderedBuffer = await offlineCtx.startRendering();
  const data = renderedBuffer.getChannelData(0);

  // 3. Peak Detection
  const threshold = 0.8; // Normalized amplitude threshold
  const peaks: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i] > threshold) {
      peaks.push(i);
      // Skip ahead by 0.25s (minimum interval for ~240BPM) to avoid double peaks
      i += Math.floor(audioBuffer.sampleRate * 0.25);
    }
  }

  if (peaks.length < 2) return null;

  // 4. Interval Analysis (Tempo Estimation)
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  // Find most frequent interval
  const counts: Record<number, number> = {};
  intervals.forEach(int => {
    const rounded = Math.round(int / 100) * 100; // Binning
    counts[rounded] = (counts[rounded] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const bestInterval = parseInt(sorted[0][0]);
  
  if (!bestInterval) return null;

  const bpm = Math.round((audioBuffer.sampleRate / bestInterval) * 60);

  // Sanity check (usually 40-220 BPM)
  if (bpm > 220) return bpm / 2;
  if (bpm < 40) return bpm * 2;

  return bpm;
}
