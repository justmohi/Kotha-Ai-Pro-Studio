import { BGMTrack } from '../types';

// In-memory cache for rendered BGM tracks
const bgmCache = new Map<string, AudioBuffer>();

/**
 * Procedurally generates high-quality, studio-grade ambient background music
 * using the Web Audio API (OfflineAudioContext).
 * 100% offline, zero network requests, zero licensing issues.
 */
export async function getBGMBuffer(
  track: BGMTrack,
  targetDuration: number = 30,
  sampleRate: number = 24000
): Promise<AudioBuffer | null> {
  if (track === 'none') return null;

  const cacheKey = `${track}_${sampleRate}`;
  if (bgmCache.has(cacheKey)) {
    return bgmCache.get(cacheKey)!;
  }

  // Generate loopable ambient track of 32 seconds
  const loopDuration = 32;
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    2,
    Math.round(loopDuration * sampleRate),
    sampleRate
  );

  switch (track) {
    case 'acoustic':
      renderAcousticTrack(offlineCtx, loopDuration);
      break;
    case 'lofi':
      renderLofiTrack(offlineCtx, loopDuration);
      break;
    case 'cinematic':
      renderCinematicTrack(offlineCtx, loopDuration);
      break;
    case 'zen':
      renderZenTrack(offlineCtx, loopDuration);
      break;
    default:
      return null;
  }

  const renderedBuffer = await offlineCtx.startRendering();
  bgmCache.set(cacheKey, renderedBuffer);
  return renderedBuffer;
}

// ---------------- Helper Synthesizers ---------------- //

function noteToFreq(noteName: string): number {
  const notes: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11
  };
  const match = noteName.match(/^([A-G][b#]?)(-?\d+)$/);
  if (!match) return 440;
  const key = match[1];
  const octave = parseInt(match[2], 10);
  const semitonesFromA4 = notes[key] - 9 + (octave - 4) * 12;
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

/**
 * Soft Acoustic: Arpeggiated warm piano/nylon guitar chords (Cmaj7 -> Gadd9 -> Am7 -> Fmaj7)
 */
function renderAcousticTrack(ctx: OfflineAudioContext, duration: number) {
  const chords = [
    // Cmaj7
    ['C3', 'G3', 'B3', 'E4', 'G4'],
    // G / B
    ['B2', 'G3', 'D4', 'G4', 'B4'],
    // Am7
    ['A2', 'E3', 'G3', 'C4', 'E4'],
    // Fmaj7
    ['F2', 'C3', 'E3', 'A3', 'C4'],
  ];

  const chordDuration = 8; // 8 seconds per chord, 4 chords = 32s

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.4, 0);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400, 0);
  filter.Q.setValueAtTime(0.8, 0);

  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  chords.forEach((chord, chordIdx) => {
    const chordStart = chordIdx * chordDuration;

    // Arpeggiate notes in chord
    chord.forEach((note, noteIdx) => {
      const noteFreq = noteToFreq(note);

      // Play note multiple times across the 8s chord
      const repeatOffsets = [0, 1.8, 3.6, 5.4];
      repeatOffsets.forEach((repeatOffset) => {
        const noteTime = chordStart + repeatOffset + noteIdx * 0.18;
        if (noteTime + 0.5 > duration) return;

        // Dual oscillator for rich warm acoustic bell/nylon tone
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(noteFreq, noteTime);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(noteFreq * 2, noteTime); // Harmonic overtone

        // Gentle envelope: quick attack, natural exponential decay
        const isBass = noteIdx === 0;
        const noteVol = isBass ? 0.35 : 0.22;
        const decayTime = isBass ? 3.0 : 2.2;

        noteGain.gain.setValueAtTime(0.0001, noteTime);
        noteGain.gain.exponentialRampToValueAtTime(noteVol, noteTime + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, Math.min(duration, noteTime + decayTime));

        osc1.connect(noteGain);
        osc2.connect(noteGain);
        noteGain.connect(filter);

        osc1.start(noteTime);
        osc2.start(noteTime);
        osc1.stop(Math.min(duration, noteTime + decayTime));
        osc2.stop(Math.min(duration, noteTime + decayTime));
      });
    });
  });
}

/**
 * Chill Lo-Fi: Mellow Rhodes-like electric piano chords (Dm9 -> G13 -> Cmaj9 -> A7#9)
 * with soft tape warmth
 */
function renderLofiTrack(ctx: OfflineAudioContext, duration: number) {
  const chords = [
    // Dm9
    { root: 'D3', notes: ['F3', 'A3', 'C4', 'E4'] },
    // G13
    { root: 'G2', notes: ['F3', 'B3', 'E4', 'G4'] },
    // Cmaj9
    { root: 'C3', notes: ['E3', 'G3', 'B3', 'D4'] },
    // A7alt
    { root: 'A2', notes: ['G3', 'C#4', 'F4', 'A4'] }
  ];

  const chordDuration = 8;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.38, 0);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(950, 0); // Mellow vintage cut
  filter.Q.setValueAtTime(1.2, 0);

  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  chords.forEach((chord, chordIdx) => {
    const chordStart = chordIdx * chordDuration;

    // Soft syncopated chord hits at 0s and 3.5s
    const hitOffsets = [0, 3.5];

    hitOffsets.forEach((hitOffset) => {
      const hitTime = chordStart + hitOffset;
      if (hitTime >= duration) return;

      // Bass note
      const bassFreq = noteToFreq(chord.root);
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(bassFreq, hitTime);

      bassGain.gain.setValueAtTime(0.0001, hitTime);
      bassGain.gain.exponentialRampToValueAtTime(0.3, hitTime + 0.08);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, Math.min(duration, hitTime + 3.2));

      bassOsc.connect(bassGain);
      bassGain.connect(filter);
      bassOsc.start(hitTime);
      bassOsc.stop(Math.min(duration, hitTime + 3.2));

      // Chord notes
      chord.notes.forEach((note) => {
        const freq = noteToFreq(note);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, hitTime);

        // Gentle chorus detune
        const oscDetune = ctx.createOscillator();
        const gainDetune = ctx.createGain();
        oscDetune.type = 'triangle';
        oscDetune.frequency.setValueAtTime(freq * 1.002, hitTime);

        gain.gain.setValueAtTime(0.0001, hitTime);
        gain.gain.exponentialRampToValueAtTime(0.16, hitTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(duration, hitTime + 3.0));

        gainDetune.gain.setValueAtTime(0.0001, hitTime);
        gainDetune.gain.exponentialRampToValueAtTime(0.08, hitTime + 0.06);
        gainDetune.gain.exponentialRampToValueAtTime(0.0001, Math.min(duration, hitTime + 3.0));

        osc.connect(gain);
        gain.connect(filter);
        oscDetune.connect(gainDetune);
        gainDetune.connect(filter);

        osc.start(hitTime);
        osc.stop(Math.min(duration, hitTime + 3.0));
        oscDetune.start(hitTime);
        oscDetune.stop(Math.min(duration, hitTime + 3.0));
      });
    });
  });
}

/**
 * Cinematic Ambient: Deep lush strings & slow resonant filter sweep (Am -> F -> C -> G)
 */
function renderCinematicTrack(ctx: OfflineAudioContext, duration: number) {
  const chords = [
    // Am
    ['A2', 'E3', 'A3', 'C4', 'E4'],
    // F
    ['F2', 'C3', 'F3', 'A3', 'C4'],
    // C
    ['C2', 'G2', 'E3', 'G3', 'C4'],
    // G
    ['G2', 'D3', 'G3', 'B3', 'D4']
  ];

  const chordDuration = 8;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.35, 0);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, 0);
  // Slow cinematic sweep
  filter.frequency.exponentialRampToValueAtTime(1600, duration * 0.5);
  filter.frequency.exponentialRampToValueAtTime(700, duration);
  filter.Q.setValueAtTime(2.0, 0);

  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  chords.forEach((chord, chordIdx) => {
    const chordStart = chordIdx * chordDuration;
    const chordEnd = chordStart + chordDuration;

    chord.forEach((note) => {
      const freq = noteToFreq(note);

      // Multiple detuned sawtooths for rich cinematic string pad
      [-4, 0, 4].forEach((detuneCents) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, chordStart);
        osc.detune.setValueAtTime(detuneCents, chordStart);

        // Smooth pad fade in and fade out
        gain.gain.setValueAtTime(0.0001, chordStart);
        gain.gain.exponentialRampToValueAtTime(0.06, chordStart + 2.0);
        gain.gain.setValueAtTime(0.06, chordEnd - 1.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(duration, chordEnd + 0.8));

        osc.connect(gain);
        gain.connect(filter);

        osc.start(chordStart);
        osc.stop(Math.min(duration, chordEnd + 1.0));
      });
    });
  });
}

/**
 * Peaceful Zen: Tibetan meditation singing bowls & pure harmonic frequencies
 */
function renderZenTrack(ctx: OfflineAudioContext, duration: number) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.38, 0);
  masterGain.connect(ctx.destination);

  // Meditation frequencies (F# 432Hz harmonic scale)
  const bowlFrequencies = [216, 324, 432, 648, 864];
  const strikeTimes = [0, 6, 13, 20, 26];

  strikeTimes.forEach((time, idx) => {
    const baseFreq = bowlFrequencies[idx % bowlFrequencies.length];

    // Fundamental + pure harmonics
    [1, 2.76, 5.4].forEach((harmonicRatio, hIdx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * harmonicRatio, time);

      // Long serene bell decay
      const amp = hIdx === 0 ? 0.28 : 0.09 / (hIdx + 1);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(amp, time + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(duration, time + 7.5));

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(Math.min(duration, time + 8.0));
    });
  });

  // Low gentle warm drone underneath
  const droneOsc = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneOsc.type = 'sine';
  droneOsc.frequency.setValueAtTime(108, 0); // F#2
  droneGain.gain.setValueAtTime(0.12, 0);

  droneOsc.connect(droneGain);
  droneGain.connect(masterGain);
  droneOsc.start(0);
  droneOsc.stop(duration);
}
