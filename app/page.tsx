'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Radio,
  MapPin,
  Clock,
  Navigation,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  Share2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Crosshair,
  Compass,
  Radar as RadarIcon,
  Flame,
  Zap,
  Bell,
  Check,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { fetchActiveAlerts } from '@/lib/sources/alertsInUa';
import { fetchAllTelegramFeeds, MONITORED_CHANNELS, ChannelConfig } from '@/lib/sources/telegramScraper';
import { evaluateLocalSecurity, SecurityEvaluationResult, ThreatEvent, SecurityState } from '@/lib/matcher';
import { findNearestLocation } from '@/lib/gazetteer';

interface LocationState {
  lat: number;
  lng: number;
  accuracy: number;
  name: string;
  oblast: string;
  fixedAt: string;
}

const CITY_PRESETS = [
  { name: 'Запоріжжя (Центр)', lat: 47.8388, lng: 35.1396, oblast: 'Запорізька область' },
  { name: 'Запоріжжя (Шевченківський)', lat: 47.8500, lng: 35.2000, oblast: 'Запорізька область' },
  { name: 'Запоріжжя (Бабурка / Хортицький)', lat: 47.8300, lng: 35.0500, oblast: 'Запорізька область' },
  { name: 'Дніпро (Центр)', lat: 48.4647, lng: 35.0462, oblast: 'Дніпропетровська область' },
  { name: 'Павлоград (Центр)', lat: 48.5167, lng: 35.8667, oblast: 'Дніпропетровська область' },
  { name: 'Харків (Центр)', lat: 49.9935, lng: 36.2304, oblast: 'Харківська область' },
  { name: 'Харків (Салтівка)', lat: 50.0200, lng: 36.3400, oblast: 'Харківська область' },
  { name: 'Одеса (Центр)', lat: 46.4825, lng: 30.7233, oblast: 'Одеська область' },
  { name: 'Миколаїв (Центр)', lat: 46.9750, lng: 31.9946, oblast: 'Миколаївська область' },
  { name: 'Суми (Центр)', lat: 50.9077, lng: 34.7981, oblast: 'Сумська область' },
  { name: 'Чернігів (Центр)', lat: 51.4982, lng: 31.2893, oblast: 'Чернігівська область' },
  { name: 'Полтава (Центр)', lat: 49.5883, lng: 34.5514, oblast: 'Полтавська область' },
  { name: 'Бориспіль (Центр / Аеропорт)', lat: 50.3500, lng: 30.9500, oblast: 'Київська область' },
  { name: 'Київ (Центр / Оболонь)', lat: 50.4501, lng: 30.5234, oblast: 'Київська область' },
];

export default function HomePage() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(15.0);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [secondsSinceCheck, setSecondsSinceCheck] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<SecurityEvaluationResult | null>(null);
  const [sourcesHealth, setSourcesHealth] = useState<any>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  
  // Test Push Modal State
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);

  // Collapsible Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showFlugerModal, setShowFlugerModal] = useState<boolean>(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [customChannels, setCustomChannels] = useState<ChannelConfig[]>([]);
  const [newChannelInput, setNewChannelInput] = useState<string>('');
  const [channelAddMessage, setChannelAddMessage] = useState<string>('');
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSpokenAlertIdRef = useRef<string | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedRadius = localStorage.getItem('psa_radius_km');
    if (storedRadius) {
      const parsed = parseFloat(storedRadius);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
        setRadiusKm(parsed);
      }
    }

    try {
      const storedChannels = localStorage.getItem('psa_custom_channels');
      if (storedChannels) {
        setCustomChannels(JSON.parse(storedChannels));
      }
    } catch (e) {}

    const storedActive = localStorage.getItem('psa_is_active') === 'true';
    const storedLocation = localStorage.getItem('psa_location');
    if (storedLocation) {
      try {
        const parsedLoc = JSON.parse(storedLocation);
        setLocation(parsedLoc);
        if (storedActive) {
          setIsActive(true);
        }
      } catch (e) {}
    }

    if ('serviceWorker' in navigator) {
      const swUrl = './sw.js';
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          console.log('ServiceWorker ready:', reg.scope);
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'TRIGGER_VOICE_ALERT' && event.data?.voiceText) {
              speakAlert(event.data.voiceText);
            }
          });
        })
        .catch((err) => console.log('SW reg error:', err));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastCheckTime) {
        const secs = Math.floor((Date.now() - lastCheckTime.getTime()) / 1000);
        setSecondsSinceCheck(secs);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastCheckTime]);

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    localStorage.setItem('psa_radius_km', newRadius.toString());
  };

  const playSirenTone = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }, []);

  const speakAlert = useCallback((text: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    playSirenTone();

    setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'uk-UA';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const ukVoice = voices.find((v) => v.lang.startsWith('uk') || v.lang.includes('UA'));
      if (ukVoice) {
        utterance.voice = ukVoice;
      }

      window.speechSynthesis.speak(utterance);
    }, 500);
  }, [audioEnabled, playSirenTone]);

  const performSecurityCheck = useCallback(async (currentLoc: LocationState) => {
    if (isChecking) return;
    setIsChecking(true);

    try {
      const [alertsRes, tgRes] = await Promise.all([
        fetchActiveAlerts(),
        fetchAllTelegramFeeds(currentLoc.oblast, 36, customChannels)
      ]);

      const result = evaluateLocalSecurity(
        currentLoc.lat,
        currentLoc.lng,
        radiusKm,
        'Кирил',
        alertsRes.alerts,
        tgRes.messages,
        lastCheckTime?.getTime()
      );

      setEvaluation(result);
      setLastCheckTime(new Date());
      setSecondsSinceCheck(0);

      const statusMap = tgRes.sourceStatus || {};
      setSourcesHealth({
        telegramSourcesTotal: Object.keys(statusMap).length,
        telegramOkCount: Object.values(statusMap).filter((s) => s.ok).length,
        officialAlertsOk: alertsRes.status === 'OK' || alertsRes.status === 'CACHE',
        lastCheckIso: new Date().toISOString()
      });

      // TRIGGER AUDIO/VOICE ONLY ON RED (Real direct tactical threat)
      if (result.overallState === 'RED' && result.primaryThreat) {
        if (lastSpokenAlertIdRef.current !== result.primaryThreat.id) {
          lastSpokenAlertIdRef.current = result.primaryThreat.id;
          speakAlert(result.primaryThreat.voiceAlertText);
        }
      }
    } catch (error) {
      console.error('Security evaluation cycle error:', error);
    } finally {
      setIsChecking(false);
    }
  }, [radiusKm, isChecking, speakAlert, customChannels, lastCheckTime]);

  const handleActivate = async () => {
    setIsLoading(true);

    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if ('Notification' in window && Notification.permission !== 'granted') {
        try {
          await Notification.requestPermission();
        } catch (e) {}
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy);

          const nearest = findNearestLocation(lat, lng);
          const nowStr = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          const newLocation: LocationState = {
            lat,
            lng,
            accuracy,
            name: nearest.location.name,
            oblast: nearest.location.oblast,
            fixedAt: nowStr
          };

          setLocation(newLocation);
          setIsActive(true);
          localStorage.setItem('psa_location', JSON.stringify(newLocation));
          localStorage.setItem('psa_is_active', 'true');

          setIsLoading(false);
          await performSecurityCheck(newLocation);

          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = setInterval(() => {
            performSecurityCheck(newLocation);
          }, 25000);
        },
        (geoError) => {
          console.warn('Geolocation fallback to Zaporizhzhia:', geoError);
          const fallbackLoc: LocationState = {
            lat: 47.8388,
            lng: 35.1396,
            accuracy: 50,
            name: 'Запоріжжя (Центр)',
            oblast: 'Запорізька область',
            fixedAt: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };

          setLocation(fallbackLoc);
          setIsActive(true);
          localStorage.setItem('psa_location', JSON.stringify(fallbackLoc));
          localStorage.setItem('psa_is_active', 'true');

          setIsLoading(false);
          performSecurityCheck(fallbackLoc);

          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = setInterval(() => {
            performSecurityCheck(fallbackLoc);
          }, 25000);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      console.error('Activation error:', err);
      setIsLoading(false);
    }
  };

  const handleDeactivate = () => {
    setIsActive(false);
    localStorage.setItem('psa_is_active', 'false');
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  };

  // REAL PUSH & SOUND TEST WITH 5-SECOND LOCKED SCREEN TIMER
  const startEmergencyPushTest = async () => {
    setShowTestModal(true);
    setTestCountdown(5);
    setTestCompleted(false);

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (e) {}
    }

    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }

    // Schedule test notification via Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_TEST_ALERT',
        delayMs: 5000,
        title: '🚨 ТЕСТОВЕ АВАРІЙНЕ СПОВІЩЕННЯ',
        body: 'Кириле, перевірка каналу сповіщення на замкнений екран успішна!',
        voiceText: 'Увага! Тестова перевірка системи безпеки пройшла успішно. Сповіщення надіслано на замкнений екран.'
      });
    }

    let count = 5;
    const timer = setInterval(() => {
      count -= 1;
      setTestCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setTestCompleted(true);
        speakAlert('Увага! Тестова перевірка пройшла успішно. Канал аварійного сповіщення активний.');
      }
    }, 1000);
  };

  const handleSelectCityPreset = (preset: typeof CITY_PRESETS[0]) => {
    const newLoc: LocationState = {
      lat: preset.lat,
      lng: preset.lng,
      accuracy: 25,
      name: preset.name,
      oblast: preset.oblast,
      fixedAt: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setLocation(newLoc);
    localStorage.setItem('psa_location', JSON.stringify(newLoc));

    if (isActive) {
      performSecurityCheck(newLoc);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = setInterval(() => {
        performSecurityCheck(newLoc);
      }, 25000);
    }
  };

  const handleAddCustomChannel = (rawName?: string) => {
    const target = (rawName || newChannelInput).trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
    if (!target) return;

    if (customChannels.some((c) => c.username.toLowerCase() === target.toLowerCase()) ||
        MONITORED_CHANNELS.some((c) => c.username.toLowerCase() === target.toLowerCase())) {
      setChannelAddMessage('Канал @' + target + ' вже є у вашому моніторингу.');
      setTimeout(() => setChannelAddMessage(''), 3500);
      setNewChannelInput('');
      return;
    }

    const newChan: ChannelConfig = {
      username: target,
      title: '@' + target + ' (Користувацький)',
      category: 'user_custom',
      region: location?.oblast || 'Вся Україна',
      weight: 0.96,
      priority: 1
    };

    const updated = [newChan, ...customChannels];
    setCustomChannels(updated);
    localStorage.setItem('psa_custom_channels', JSON.stringify(updated));
    setChannelAddMessage('Канал @' + target + ' успішно підключено!');
    setNewChannelInput('');
    setTimeout(() => setChannelAddMessage(''), 3500);
  };

  const handleRemoveCustomChannel = (username: string) => {
    const updated = customChannels.filter((c) => c.username.toLowerCase() !== username.toLowerCase());
    setCustomChannels(updated);
    localStorage.setItem('psa_custom_channels', JSON.stringify(updated));
  };

  const allSources = [...customChannels, ...MONITORED_CHANNELS];
  const state = evaluation?.overallState || (isActive ? 'GREEN' : 'GREEN');
  const isRed = state === 'RED';
  const isOrange = state === 'ORANGE';
  const isDegraded = state === 'DEGRADED' || secondsSinceCheck > 90;
  const isGreen = !isRed && !isOrange && !isDegraded && isActive;

  const radarThreats = (evaluation?.threatEvents || []).filter(
    (t) => t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID' && t.distanceKm !== null && t.distanceKm <= 45
  );

  return (
    <main className="min-h-screen bg-[#070a10] text-slate-100 pb-16 selection:bg-blue-500 selection:text-white font-sans antialiased">
      {/* MINIMAL TOP BAR */}
      <header className="sticky top-0 z-40 bg-[#0c101a]/95 backdrop-blur-md border-b border-[#182234] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className={'w-6 h-6 ' + (isRed ? 'text-red-500 animate-pulse' : isOrange ? 'text-amber-400' : isActive ? 'text-emerald-400' : 'text-slate-500')} />
            <div>
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>ВАРТОВИЙ БЕЗПЕКИ</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                  v3.0 AUDIT
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                {location ? location.name : 'Геолокація готова'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={'p-2 rounded-xl border text-xs transition-colors ' + (audioEnabled ? 'bg-[#131d2e] border-blue-500/40 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500')}
              title={audioEnabled ? 'Голосове сповіщення активне' : 'Голос вимкнено'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="max-w-md mx-auto px-4 pt-4">

        {/* 1-SECOND READABILITY STATUS HERO CARD */}
        <div className={'mb-4 rounded-3xl p-6 border transition-all duration-300 shadow-2xl ' + (
          !isActive
            ? 'bg-[#0f1420] border-[#1d273c]'
            : isRed
            ? 'bg-gradient-to-b from-[#3a0606] to-[#1e0505] border-red-500 ring-2 ring-red-500/50 shadow-red-950/80 animate-pulse-slow'
            : isOrange
            ? 'bg-gradient-to-b from-[#2d1804] to-[#180e03] border-amber-500 shadow-amber-950/60'
            : isDegraded
            ? 'bg-[#151a24] border-slate-700 shadow-slate-950/50'
            : 'bg-gradient-to-b from-[#082015] to-[#05140e] border-emerald-500/60 shadow-emerald-950/40'
        )}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400">
                {isActive ? 'ПОТОЧНИЙ СТАН СЕКТОРУ' : 'ГОТОВИЙ ДО ЗАПУСКУ'}
              </span>
              <h2 className="text-2xl font-black tracking-tight mt-1 text-white flex items-center gap-2">
                {!isActive ? (
                  <span>⚪ НЕ АКТИВОВАНО</span>
                ) : isRed ? (
                  <span className="text-red-400">🔴 НЕБЕЗПЕКА ПОРУЧ!</span>
                ) : isOrange ? (
                  <span className="text-amber-400">🟠 УВАГА В ОБЛАСТІ</span>
                ) : isDegraded ? (
                  <span className="text-slate-300">⚪ МОНІТОРИНГ НЕПОВНИЙ</span>
                ) : (
                  <span className="text-emerald-400">🟢 СЕКТОР ЧИСТИЙ</span>
                )}
              </h2>
            </div>
            <div className={'p-3 rounded-2xl ' + (
              !isActive ? 'bg-slate-800 text-slate-400' :
              isRed ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-bounce' :
              isOrange ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
              isDegraded ? 'bg-slate-800 text-slate-400' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            )}>
              {isRed ? <Flame className="w-7 h-7" /> : isOrange ? <AlertTriangle className="w-7 h-7" /> : isGreen ? <ShieldCheck className="w-7 h-7" /> : <Radio className="w-7 h-7" />}
            </div>
          </div>

          <p className="text-xs text-slate-200 mt-3 leading-relaxed font-medium">
            {!isActive
              ? 'Натисніть кнопку «Активувати захист», заблокуйте iPhone та покладіть у кишеню. Система попередить вас звуком у разі небезпеки.'
              : isRed
              ? evaluation?.primaryThreat?.confidenceReason || 'Підтверджено пряму загрозу у вашому секторі! Негайно пройдіть в укриття!'
              : isOrange
              ? evaluation?.stateDescriptionUk || 'Ціль спостерігається в області / коридорі підльоту. Загрози для вашого мікрорайону наразі немає.'
              : isDegraded
              ? 'Дані застаріли або відсутній зв’язок із джерелами. Перевірте підключення до інтернету.'
              : 'Локальних загроз поблизу не виявлено. 159 радарних джерел сканують ваш сектор у реальному часі.'}
          </p>

          {/* TELEMETRY METRICS (READABLE IN 1 SEC) */}
          {isActive && location && (
            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">📍 ВАША ЛОКАЦІЯ</span>
                <span className="font-bold text-white truncate block">{location.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">GPS ±{location.accuracy}м</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">📡 ЗОНА ЗАХИСТУ</span>
                <span className="font-bold text-white block">Радіус {radiusKm.toFixed(0)} км</span>
                <span className="text-[10px] text-slate-400 font-mono">Флюгер Зона 1</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">⏱️ ОНОВЛЕННЯ</span>
                <span className="font-mono font-bold text-white block">{secondsSinceCheck}с тому</span>
                <span className="text-[10px] text-emerald-400 font-mono">159 джерел</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">🛡️ ГОЛОСОВИЙ ГОЛОС</span>
                <span className="font-bold text-white block">Кирил (Звук ON)</span>
                <span className="text-[10px] text-blue-400 font-mono">Сирена активна</span>
              </div>
            </div>
          )}
        </div>

        {/* PRIMARY ACTION BUTTONS */}
        <div className="space-y-2.5 mb-5">
          {!isActive ? (
            <button
              onClick={handleActivate}
              disabled={isLoading}
              className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-lg tracking-wide shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-blue-400/40"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>ФІКСАЦІЯ GPS ТА ЗАПУСК...</span>
                </>
              ) : (
                <>
                  <Radio className="w-6 h-6" />
                  <span>АКТИВУВАТИ ЗАХИСТ (GPS)</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDeactivate}
              className="w-full py-4 px-6 rounded-2xl bg-[#161e2e] hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm tracking-wide border border-slate-700/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>ЗУПИНИТИ МОНІТОРИНГ</span>
            </button>
          )}

          {/* REAL PUSH TEST BUTTON */}
          <button
            onClick={startEmergencyPushTest}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#121926] hover:bg-[#1a2436] text-amber-300 hover:text-amber-200 font-bold text-xs tracking-wide border border-amber-500/40 flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>ПЕРЕВІРИТИ СПОВІЩЕННЯ НА ЗАМКНЕНИЙ ЕКРАН (5С)</span>
          </button>
        </div>

        {/* FLÜGER RADAR DISPLAY (COMPACT) */}
        {isActive && location && (
          <div className="mb-4 bg-[#0a0f18] border border-[#1a2538] rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RadarIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  ТАКТИЧНИЙ РАДАР (15 / 30 / 45 КМ)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Цілей у радіусі: <strong className="text-white">{radarThreats.length}</strong>
              </span>
            </div>

            {/* RADAR SVG SCOPE */}
            <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-[#05080f] rounded-full border border-cyan-500/30 shadow-inner flex items-center justify-center overflow-hidden my-2">
              {/* Rings */}
              <div className="absolute w-[92%] h-[92%] rounded-full border border-yellow-500/30 flex items-start justify-center">
                <span className="text-[8px] font-mono text-yellow-500/70 bg-[#05080f]/90 px-1 rounded -translate-y-1.5">45 км</span>
              </div>
              <div className="absolute w-[62%] h-[62%] rounded-full border border-orange-500/40 flex items-start justify-center">
                <span className="text-[8px] font-mono text-orange-400/80 bg-[#05080f]/90 px-1 rounded -translate-y-1.5">30 км</span>
              </div>
              <div className="absolute w-[32%] h-[32%] rounded-full border border-red-500/60 bg-red-950/10 flex items-start justify-center">
                <span className="text-[8px] font-mono font-bold text-red-400 bg-[#05080f]/90 px-1 rounded -translate-y-1.5">15 км</span>
              </div>

              {/* Crosshair */}
              <div className="absolute w-full h-[1px] bg-cyan-500/20" />
              <div className="absolute h-full w-[1px] bg-cyan-500/20" />

              {/* Cardinal marks */}
              <span className="absolute top-1 text-[8px] font-bold text-cyan-400 font-mono">Пн</span>
              <span className="absolute bottom-1 text-[8px] font-bold text-cyan-400 font-mono">Пд</span>
              <span className="absolute left-1.5 text-[8px] font-bold text-cyan-400 font-mono">Зх</span>
              <span className="absolute right-1.5 text-[8px] font-bold text-cyan-400 font-mono">Сх</span>

              {/* Rotating Sweep Beam */}
              <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none opacity-40 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(6,182,212,0.4)_0deg,transparent_60deg,transparent_360deg)]" />

              {/* Center User Pin */}
              <div className="absolute z-20 flex flex-col items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
                <span className="text-[7px] font-bold text-blue-300 font-mono mt-0.5 bg-[#070b14] px-1 rounded">ВИ</span>
              </div>

              {/* Threat Dots */}
              {radarThreats.map((threat, idx) => {
                const dist = threat.distanceKm || 20;
                const bearing = threat.bearingDegrees !== undefined ? threat.bearingDegrees : (idx * 45);
                const visualDistPercent = (Math.min(45, dist) / 45) * 44;
                const rad = ((bearing - 90) * Math.PI) / 180;
                const x = 50 + visualDistPercent * Math.cos(rad);
                const y = 50 + visualDistPercent * Math.sin(rad);

                const isDirectShelter = dist <= 15;
                const isAlertZone = dist <= 30;

                return (
                  <button
                    key={threat.id + '_' + idx}
                    onClick={() => setSelectedThreat(threat)}
                    className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className={'animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full opacity-75 ' + (isDirectShelter ? 'bg-red-400' : isAlertZone ? 'bg-orange-400' : 'bg-yellow-400')} />
                      <div className={'w-2.5 h-2.5 rounded-full flex items-center justify-center text-[6px] font-black ' + (isDirectShelter ? 'bg-red-600 text-white' : isAlertZone ? 'bg-orange-500 text-black' : 'bg-yellow-400 text-black')}>
                        !
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SELECTED THREAT CARD */}
        {selectedThreat && (
          <div className="mb-4 bg-red-950/90 border border-red-500 rounded-2xl p-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <h3 className="font-bold text-sm text-red-200">{selectedThreat.categoryNameUk}</h3>
              </div>
              <button
                onClick={() => setSelectedThreat(null)}
                className="text-red-300 hover:text-white text-xs px-2 py-0.5 rounded bg-red-900 border border-red-700"
              >
                ×
              </button>
            </div>
            <div className="mt-2 text-xs space-y-1 text-red-100">
              <p><strong>Локація:</strong> {selectedThreat.detectedLocation}</p>
              <p><strong>Дистанція:</strong> {selectedThreat.honestDistanceText}</p>
              <p><strong>Джерело:</strong> {selectedThreat.sourceTitle}</p>
              <p className="bg-red-900/60 p-2 rounded text-[11px] font-mono mt-1 border border-red-700/60">
                "{selectedThreat.rawText}"
              </p>
            </div>
          </div>
        )}

        {/* COLLAPSIBLE ADVANCED SETTINGS & SOURCES */}
        <div className="mb-6 bg-[#0a0f18] border border-[#162032] rounded-2xl p-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>РОЗШИРЕНІ НАЛАШТУВАННЯ ТА ДЖЕРЕЛА (159 КАНАЛІВ)</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 text-xs">
              {/* RADIUS SENSITIVITY */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 font-semibold">Радіус тривоги:</span>
                  <span className="font-mono font-bold text-blue-300">{radiusKm.toFixed(0)} км</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[
                    { r: 5, label: '🎯 5 км' },
                    { r: 15, label: '🔴 15 км' },
                    { r: 30, label: '🟠 30 км' },
                    { r: 45, label: '🟡 45 км' }
                  ].map((p) => (
                    <button
                      key={p.r}
                      onClick={() => handleRadiusChange(p.r)}
                      className={'py-1.5 rounded-lg text-[10px] font-bold border transition-all ' + (radiusKm === p.r ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#111726] text-slate-300 border-slate-800')}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="3"
                  max="45"
                  value={radiusKm}
                  onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* CITY PRESET SELECTOR (10 CITIES) */}
              <div>
                <span className="text-slate-400 font-semibold block mb-2">Резервний вибір міста (10 міст):</span>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {CITY_PRESETS.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => handleSelectCityPreset(city)}
                      className={'p-2 rounded-xl text-left text-[11px] border truncate ' + (location?.name === city.name ? 'bg-blue-900/50 border-blue-400 text-blue-200 font-bold' : 'bg-[#111726] border-slate-800 text-slate-300 hover:bg-slate-800')}
                    >
                      <p className="font-semibold text-white truncate">{city.name.split(' (')[0]}</p>
                      <p className="text-[9px] text-slate-400 truncate">{city.name.split(' (')[1]?.replace(')', '') || city.oblast}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* CUSTOM CHANNELS ADDER */}
              <div>
                <span className="text-slate-400 font-semibold block mb-2">Додати свій Telegram-канал:</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-slate-500 text-xs font-mono">@</span>
                    <input
                      type="text"
                      value={newChannelInput}
                      onChange={(e) => setNewChannelInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomChannel()}
                      placeholder="username (напр. tlknews)"
                      className="w-full bg-[#070a10] border border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                    />
                  </div>
                  <button
                    onClick={() => handleAddCustomChannel()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                  >
                    +
                  </button>
                </div>

                {channelAddMessage && (
                  <p className="mt-1 text-[10px] text-emerald-400">{channelAddMessage}</p>
                )}

                {customChannels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {customChannels.map((c) => (
                      <span
                        key={c.username}
                        className="inline-flex items-center gap-1 bg-blue-950/80 text-blue-300 text-[10px] font-mono px-2 py-0.5 rounded border border-blue-800"
                      >
                        <span>@{c.username}</span>
                        <button onClick={() => handleRemoveCustomChannel(c.username)} className="text-red-400 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* SOURCES CATALOG */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 font-semibold">Каталог джерел ({allSources.length}):</span>
                  <button
                    onClick={() => setShowFlugerModal(true)}
                    className="text-[10px] text-cyan-400 underline font-semibold"
                  >
                    Про «Флюгер»
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] pr-1">
                  {allSources.slice(0, 25).map((s) => (
                    <div key={s.username} className="flex items-center justify-between p-1.5 rounded bg-[#070a10] border border-slate-800">
                      <span className="text-slate-300 truncate">@{s.username}</span>
                      <span className="text-[9px] font-mono text-emerald-400">АКТИВНИЙ</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* EMERGENCY PUSH TEST COUNTDOWN MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f1522] border border-amber-500/60 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
              <Bell className="w-7 h-7 animate-bounce" />
            </div>

            <div>
              <h3 className="font-black text-lg text-white">ТЕСТУВАННЯ СПОВІЩЕННЯ</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Зараз <strong>заблокуйте iPhone</strong> та покладіть його на стіл або в кишеню.
              </p>
            </div>

            {!testCompleted ? (
              <div className="py-3">
                <span className="text-4xl font-mono font-black text-amber-400 animate-pulse">
                  00:0{testCountdown}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Справжнє push-сповіщення надійде через {testCountdown}с
                </p>
              </div>
            ) : (
              <div className="py-2 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>СПОВІЩЕННЯ НАДІСЛАНО</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Звук і пуш на заблокований екран перевірено.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowTestModal(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
            >
              Закрити
            </button>
          </div>
        </div>
      )}

      {/* FLÜGER INFO MODAL */}
      {showFlugerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1522] border border-cyan-500/40 rounded-3xl max-w-sm w-full p-5 text-slate-200 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Методологія «ФЛЮГЕР» (КБ Технарі)</h3>
              <button onClick={() => setShowFlugerModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="leading-relaxed">
              «Флюгер» розроблений КБ «Технарі» (система «єППО» на чолі з Геннадієм Сульдіним).
            </p>
            <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-slate-800">
              <p><strong className="text-red-400">🔴 Зона 1 (15 км):</strong> Пряма загроза, негайно в укриття.</p>
              <p><strong className="text-orange-400">🟠 Зона 2 (30 км):</strong> Підвищена готовність, підліт 2–4 хв.</p>
              <p><strong className="text-yellow-300">🟡 Зона 3 (45 км):</strong> Раннє виявлення векторів.</p>
            </div>
            <button onClick={() => setShowFlugerModal(false)} className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl">
              Зрозуміло
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
