// Dedicated Sound & Voice Assistant Service for iOS / Safari / Android / Desktop
let globalAudioCtx: AudioContext | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  return globalAudioCtx;
}

// Pre-warm and unlock audio context and SpeechSynthesis on direct user interaction
export function unlockAudioAndSpeech(): void {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Play micro-silent buffer to unlock Web Audio on iOS Safari
    if (ctx) {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }

    // Pre-warm SpeechSynthesis on iOS
    if ('speechSynthesis' in window) {
      const dummy = new SpeechSynthesisUtterance('');
      dummy.volume = 0;
      dummy.rate = 2.0;
      window.speechSynthesis.speak(dummy);
      loadVoices();
    }
  } catch (e) {
    console.warn('Audio unlock error:', e);
  }
}

export function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (cachedVoices.length > 0) return cachedVoices;
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

// Play multi-tone tactical alarm siren
export function playTacticalSiren(durationSec: number = 1.2, volume: number = 0.5): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Modulating alarm frequency: 700Hz -> 1200Hz -> 750Hz -> 1300Hz
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
    osc.frequency.linearRampToValueAtTime(750, now + 0.6);
    osc.frequency.linearRampToValueAtTime(1300, now + 0.9);
    osc.frequency.linearRampToValueAtTime(800, now + durationSec);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec);
  } catch (err) {
    console.warn('Siren play error:', err);
  }
}

// High-reliability Ukrainian speech announcement with siren preamble
export function speakUkrainian(text: string, onStart?: () => void, onEnd?: () => void): boolean {
  if (typeof window === 'undefined') return false;

  // Always play audible siren
  playTacticalSiren(0.8, 0.45);

  if (!('speechSynthesis' in window)) {
    // If browser doesn't have TTS, play full alarm siren
    playTacticalSiren(2.0, 0.6);
    if (onEnd) onEnd();
    return false;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'uk-UA';

    const voices = loadVoices();
    const ukVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith('uk') || 
      v.lang.toLowerCase().includes('ua') || 
      v.name.toLowerCase().includes('ukrainian') || 
      v.name.toLowerCase().includes('lesya') || 
      v.name.toLowerCase().includes('milena')
    );

    if (ukVoice) {
      utterance.voice = ukVoice;
      utterance.lang = ukVoice.lang;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error, falling back to siren tone:', e);
      playTacticalSiren(1.5, 0.6);
      if (onEnd) onEnd();
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speak trigger failed:', e);
        playTacticalSiren(1.5, 0.6);
      }
    }, 250);

    return true;
  } catch (e) {
    console.warn('speakUkrainian exception:', e);
    playTacticalSiren(1.5, 0.6);
    if (onEnd) onEnd();
    return false;
  }
}


export function stopAllAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {}
}
