
import { Mp3Encoder } from '@breezystack/lamejs';

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodePCMToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // Use byteOffset and byteLength to ensure we only read the relevant part of the buffer
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert 16-bit PCM to float [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Creates an empty silent AudioBuffer with the specified duration in seconds.
 */
export function createSilenceBuffer(
  durationSec: number,
  ctx: AudioContext,
  sampleRate: number = 24000
): AudioBuffer {
  const frameCount = Math.max(1, Math.round(durationSec * sampleRate));
  return ctx.createBuffer(1, frameCount, sampleRate);
}

/**
 * Concatenates multiple AudioBuffers into a single continuous AudioBuffer.
 */
export function concatenateAudioBuffers(
  buffers: AudioBuffer[],
  ctx: AudioContext
): AudioBuffer {
  if (buffers.length === 0) {
    return ctx.createBuffer(1, 1, 24000);
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  const sampleRate = buffers[0].sampleRate;
  const numChannels = Math.max(...buffers.map(b => b.numberOfChannels));
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);

  const result = ctx.createBuffer(numChannels, totalLength, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = result.getChannelData(channel);
    let offset = 0;
    for (const buf of buffers) {
      // If the buffer has fewer channels, duplicate the first channel
      const srcChannel = channel < buf.numberOfChannels ? channel : 0;
      channelData.set(buf.getChannelData(srcChannel), offset);
      offset += buf.length;
    }
  }

  return result;
}

/**
 * Mixes a voice AudioBuffer with a background music AudioBuffer.
 * The BGM will loop if needed and fade out smoothly at the end of the voice.
 */
export function mixAudioBuffers(
  voiceBuffer: AudioBuffer,
  bgmBuffer: AudioBuffer,
  bgmVolume: number = 0.18,
  ctx: AudioContext,
  voiceVolume: number = 1.0
): AudioBuffer {
  const sampleRate = voiceBuffer.sampleRate;
  // Let the output linger slightly (0.8s tail) so the speech doesn't end abruptly
  const extraTailSeconds = 0.8;
  const extraTailFrames = Math.round(extraTailSeconds * sampleRate);
  const totalFrames = voiceBuffer.length + extraTailFrames;
  const numChannels = Math.max(voiceBuffer.numberOfChannels, bgmBuffer.numberOfChannels, 2);

  const mixedBuffer = ctx.createBuffer(numChannels, totalFrames, sampleRate);

  // Fade-in duration: 0.5s; Fade-out duration: 1.2s at the end
  const fadeInFrames = Math.min(Math.round(0.5 * sampleRate), totalFrames / 4);
  const fadeOutFrames = Math.min(Math.round(1.2 * sampleRate), totalFrames / 2);
  const fadeOutStart = totalFrames - fadeOutFrames;

  for (let channel = 0; channel < numChannels; channel++) {
    const mixedData = mixedBuffer.getChannelData(channel);

    // Voice data
    const voiceChannel = channel < voiceBuffer.numberOfChannels ? channel : 0;
    const voiceData = voiceBuffer.getChannelData(voiceChannel);

    // BGM data
    const bgmChannel = channel < bgmBuffer.numberOfChannels ? channel : 0;
    const bgmData = bgmBuffer.getChannelData(bgmChannel);
    const bgmLength = bgmData.length;

    for (let i = 0; i < totalFrames; i++) {
      // Voice sample
      let vSample = i < voiceBuffer.length ? voiceData[i] * voiceVolume : 0;

      // BGM sample with loop
      let bSample = bgmLength > 0 ? bgmData[i % bgmLength] : 0;

      // Apply BGM envelope (fade-in & fade-out)
      let bgmGain = bgmVolume;
      if (i < fadeInFrames) {
        bgmGain *= i / fadeInFrames;
      } else if (i >= fadeOutStart) {
        bgmGain *= Math.max(0, (totalFrames - i) / fadeOutFrames);
      }

      // Mix and soft-clip to avoid harsh distortion
      const sum = vSample + bSample * bgmGain;
      mixedData[i] = Math.max(-1, Math.min(1, sum));
    }
  }

  return mixedBuffer;
}

/**
 * Encodes an AudioBuffer into a WAV file Blob.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const buffer_out = new ArrayBuffer(length);
  const view = new DataView(buffer_out);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  const totalSamples = buffer.length;
  while (offset < totalSamples) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true); // write 16-bit sample
      pos += 2;
    }
    offset++; // next source sample
  }

  return new Blob([buffer_out], { type: "audio/wav" });
}

/**
 * Encodes an AudioBuffer into an MP3 file Blob using @breezystack/lamejs.
 */
export function audioBufferToMp3(buffer: AudioBuffer, kbps: number = 192): Blob {
  const channels = buffer.numberOfChannels >= 2 ? 2 : 1;
  const sampleRate = buffer.sampleRate;
  const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const left = buffer.getChannelData(0);
  const right = channels === 2 ? buffer.getChannelData(1) : left;
  const sampleLength = left.length;

  // Convert float32 [-1.0, 1.0] to int16
  const leftInt16 = new Int16Array(sampleLength);
  const rightInt16 = channels === 2 ? new Int16Array(sampleLength) : leftInt16;

  for (let i = 0; i < sampleLength; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    leftInt16[i] = sL < 0 ? sL * 32768 : sL * 32767;

    if (channels === 2) {
      const sR = Math.max(-1, Math.min(1, right[i]));
      rightInt16[i] = sR < 0 ? sR * 32768 : sR * 32767;
    }
  }

  const sampleBlockSize = 1152;
  for (let i = 0; i < sampleLength; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    let mp3buf: any;
    if (channels === 1) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }
    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const mp3flush: any = mp3encoder.flush();
  if (mp3flush && mp3flush.length > 0) {
    mp3Data.push(new Uint8Array(mp3flush));
  }

  return new Blob(mp3Data, { type: "audio/mp3" });
}

