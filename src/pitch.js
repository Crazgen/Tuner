/**
 * YIN pitch detection (de Cheveigné & Kawahara, 2002).
 * Returns frequency in Hz, or 0 when no stable pitch is found.
 */
export function detectPitchYIN(float32Array, sampleRate, options = {}) {
  const {
    threshold = 0.12,
    probabilityThreshold = 0.85,
    minFreq = 55,   // ~A1, below low E
    maxFreq = 1400, // high frets on e string
  } = options;

  const buffer = float32Array;
  const size = buffer.length;
  if (size < 2) return 0;

  // Half buffer is enough for lag search up to size/2
  const half = size >> 1;
  const yinBuffer = new Float32Array(half);

  // --- 1. Cumulative mean normalized difference function ---
  // Must fill the full buffer before walking to a local minimum —
  // early-exit would read uncomputed slots (still 0) and stop too soon.
  let runningSum = 0;
  yinBuffer[0] = 1;

  for (let tau = 1; tau < half; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    runningSum += sum;
    yinBuffer[tau] = sum === 0 ? 1 : (sum * tau) / runningSum;
  }

  // --- 2. Absolute threshold: first dip below threshold, then walk to its local min ---
  let tauEstimate = -1;
  for (let tau = 2; tau < half; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < half && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  // If never dipped, take global minimum (quiet / noisy signal)
  if (tauEstimate === -1) {
    let minVal = Infinity;
    let minTau = -1;
    for (let tau = 2; tau < half; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        minTau = tau;
      }
    }
    if (minTau === -1 || minVal > 0.45) return 0;
    tauEstimate = minTau;
  }

  // --- 2. Parabolic interpolation for sub-sample precision ---
  const betterTau = parabolicInterpolation(yinBuffer, tauEstimate);
  const freq = sampleRate / betterTau;

  if (freq < minFreq || freq > maxFreq) return 0;

  // --- 3. Confidence: value at the chosen tau (lower = better) ---
  const confidence = 1 - yinBuffer[tauEstimate];
  if (confidence < probabilityThreshold && yinBuffer[tauEstimate] > 0.25) {
    return 0;
  }

  return freq;
}

function parabolicInterpolation(arr, tau) {
  if (tau <= 0 || tau >= arr.length - 1) return tau;

  const s0 = arr[tau - 1];
  const s1 = arr[tau];
  const s2 = arr[tau + 1];

  const denom = 2 * (2 * s1 - s2 - s0);
  if (denom === 0) return tau;

  return tau + (s2 - s0) / denom;
}

/**
 * Convert frequency to nearest MIDI note + cents offset.
 * Returns { midi, name, octave, frequency, cents }
 */
export function frequencyToNote(freq, a4 = 440) {
  if (!freq || freq <= 0) return null;

  const midiFloat = 69 + 12 * Math.log2(freq / a4);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);

  return {
    midi,
    name: midiName(midi),
    octave: Math.floor(midi / 12) - 1,
    frequency: freq,
    targetFrequency: midiToFrequency(midi, a4),
    cents,
  };
}

export function midiToFrequency(midi, a4 = 440) {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function midiName(midi) {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return names[((midi % 12) + 12) % 12];
}

/**
 * Pitch smoother — keeps a short history so the needle doesn't jitter.
 */
export class PitchSmoother {
  constructor({ windowSize = 5, maxJumpSemitones = 2.5 } = {}) {
    this.windowSize = windowSize;
    this.maxJump = maxJumpSemitones;
    this.history = [];
    this.lastStable = 0;
  }

  push(freq) {
    if (!freq || freq <= 0) {
      // Fade history on silence so a new pluck isn't averaged with the old one
      if (this.history.length > 0) this.history.pop();
      if (this.history.length === 0) this.lastStable = 0;
      return this.current();
    }

    // Reject wild jumps (double-stops, noise spikes)
    if (this.lastStable > 0) {
      const semis = Math.abs(12 * Math.log2(freq / this.lastStable));
      if (semis > this.maxJump) {
        this.history.length = 0;
      }
    }

    this.history.push(freq);
    if (this.history.length > this.windowSize) this.history.shift();

    this.lastStable = this.current();
    return this.lastStable;
  }

  current() {
    if (this.history.length === 0) return 0;
    // Median is more robust than mean against single-frame outliers
    const sorted = [...this.history].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  reset() {
    this.history.length = 0;
    this.lastStable = 0;
  }
}
