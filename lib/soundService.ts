// Pure Voice Assistant Service (Ajax-style clean voice announcement for iOS/Android)
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

// Pre-warm and unlock audio context and SpeechSynthesis on user touch
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

export function stopAllAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {}
}

// Pure clean voice announcement (No synthetic sirens - Ajax style voice)
export function speakUkrainian(text: string, onStart?: () => void, onEnd?: () => void): boolean {
  if (typeof window === 'undefined') return false;

  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis not supported on this browser');
    if (onEnd) onEnd();
    return false;
  }

  try {
    stopAllAudio();

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
      v.name.toLowerCase().includes('milena') ||
      v.name.toLowerCase().includes('polina')
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
      console.warn('Speech synthesis error:', e);
      if (onEnd) onEnd();
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speak trigger error:', e);
      }
    }, 100);

    return true;
  } catch (e) {
    console.warn('speakUkrainian error:', e);
    if (onEnd) onEnd();
    return false;
  }
}
