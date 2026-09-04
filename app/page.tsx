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
  Target
} from 'lucide-react';
import { fetchActiveAlerts } from '@/lib/sources/alertsInUa';
import { fetchAllTelegramFeeds, MONITORED_CHANNELS, ChannelConfig } from '@/lib/sources/telegramScraper';
import { evaluateLocalSecurity, SecurityEvaluationResult, ThreatEvent } from '@/lib/matcher';
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
  { name: 'Дніпро (Лівий берег / Калинова)', lat: 48.5100, lng: 35.0800, oblast: 'Дніпропетровська область' },
  { name: 'Павлоград (Центр)', lat: 48.5167, lng: 35.8667, oblast: 'Дніпропетровська область' },
  { name: 'Харків (Центр)', lat: 49.9935, lng: 36.2304, oblast: 'Харківська область' },
  { name: 'Харків (Салтівка)', lat: 50.0200, lng: 36.3400, oblast: 'Харківська область' },
  { name: 'Одеса (Центр)', lat: 46.4825, lng: 30.7233, oblast: 'Одеська область' },
  { name: 'Одеса (Посьолок Котовського)', lat: 46.5700, lng: 30.7900, oblast: 'Одеська область' },
  { name: 'Миколаїв (Центр)', lat: 46.9750, lng: 31.9946, oblast: 'Миколаївська область' },
  { name: 'Миколаїв (Корабельний р-н)', lat: 46.8800, lng: 32.0100, oblast: 'Миколаївська область' },
  { name: 'Суми (Центр)', lat: 50.9077, lng: 34.7981, oblast: 'Сумська область' },
  { name: 'Чернігів (Центр)', lat: 51.4982, lng: 31.2893, oblast: 'Чернігівська область' },
  { name: 'Чернігів (Масани / Подусівка)', lat: 51.5200, lng: 31.2600, oblast: 'Чернігівська область' },
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
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [showResearchInfo, setShowResearchInfo] = useState<boolean>(false);
  const [showEventLog, setShowEventLog] = useState<boolean>(true);
  const [showFlugerModal, setShowFlugerModal] = useState<boolean>(false);
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [customChannels, setCustomChannels] = useState<ChannelConfig[]>([]);
  const [newChannelInput, setNewChannelInput] = useState<string>('');
  const [channelAddMessage, setChannelAddMessage] = useState<string>('');
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSpokenAlertIdRef = useRef<string | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let storedId = localStorage.getItem('psa_session_id');
    if (!storedId) {
      storedId = 'psa_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('psa_session_id', storedId);
    }
    setSessionId(storedId);

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
          console.log('ServiceWorker registered:', reg.scope);
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

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio Context error:', e);
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

  const setupPushSubscription = async (): Promise<any> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatusMessage('Web Push активується при додаванні на екран «Початковий» iOS 16.4+');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatusMessage('Дозвіл на сповіщення не надано');
        return null;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const vapidPublicKey = 'BCR9hC4I8CGfY2X5RZmR_CC8-0zi8ITFHDSzhVO4CXiVoZ-1CFrFU7m-ev6EW_FmURjacesDcojC47H6BtZSEII';
        
        function urlBase64ToUint8Array(base64String: string) {
          const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }

        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      setPushSubscribed(true);
      setPushStatusMessage('Web Push сповіщення на замкнений екран активовано');
      return sub;
    } catch (err: any) {
      setPushStatusMessage('Для сповіщень на iPhone додайте сайт на екран «Початковий» (Add to Home Screen)');
      return null;
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
        tgRes.messages
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

      if (result.hasLocalThreat && result.primaryThreat) {
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
  }, [radiusKm, isChecking, speakAlert, customChannels]);

  const handleActivate = async () => {
    setIsLoading(true);

    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      await setupPushSubscription();

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
          }, 30000);
        },
        (geoError) => {
          console.warn('Geolocation failed or denied, using Zaporizhzhia default:', geoError);
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
          }, 30000);
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
    setShowPresets(false);

    if (isActive) {
      performSecurityCheck(newLoc);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = setInterval(() => {
        performSecurityCheck(newLoc);
      }, 30000);
    }
  };

  const handleTestAlert = () => {
    speakAlert('Увага! Тестова перевірка системи. Зафіксовано наближення цілі за 8 кілометрів, напрямок Південний Схід. Пройдіть в укриття.');
  };

  const allSources = [...customChannels, ...MONITORED_CHANNELS];
  const filteredSources = allSources.filter((ch) => {
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'user_custom') return ch.category === 'user_custom';
    if (sourceFilter === 'osint_network') return ch.category === 'osint_network';
    if (sourceFilter === 'military_official') return ch.category === 'military_official';
    if (sourceFilter === 'radar_national') return ch.category === 'radar_national';
    if (sourceFilter === 'tactical_south') return ch.category === 'tactical_south';
    if (sourceFilter === 'tactical_east') return ch.category === 'tactical_east';
    if (sourceFilter === 'tactical_north') return ch.category === 'tactical_north';
    if (sourceFilter === 'tactical_center') return ch.category === 'tactical_center';
    if (sourceFilter === 'strategic_launch') return ch.category === 'strategic_launch';
    return true;
  });

  const hasThreat = evaluation?.hasLocalThreat;
  const radarThreats = (evaluation?.threatEvents || []).filter(
    (t) => t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID' && t.distanceKm !== null && t.distanceKm <= 45
  );

  return (
    <main className="min-h-screen bg-[#0a0d14] text-slate-100 pb-16 selection:bg-blue-500 selection:text-white font-sans antialiased">
      {/* TOP STATUS BAR */}
      <header className="sticky top-0 z-40 bg-[#0d121d]/90 backdrop-blur-md border-b border-[#1e2638] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Shield className={'w-6 h-6 ' + (hasThreat ? 'text-red-500 animate-pulse' : isActive ? 'text-emerald-400' : 'text-slate-500')} />
              {isActive && (
                <span className={'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ' + (hasThreat ? 'bg-red-500' : 'bg-emerald-400')} />
              )}
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>ВАРТОВИЙ БЕЗПЕКИ</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                  v2.8 FLÜGER
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                {location ? location.name : 'Геолокація не обрана'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowFlugerModal(true)}
              className="p-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/60 text-xs font-semibold flex items-center gap-1"
              title="Про технологію «Флюгер»"
            >
              <RadarIcon className="w-3.5 h-3.5" />
              <span>ФЛЮГЕР</span>
            </button>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={'p-2 rounded-lg border text-xs transition-colors ' + (audioEnabled ? 'bg-[#162032] border-blue-500/40 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500')}
              title={audioEnabled ? 'Голосове сповіщення активне' : 'Голос вимкнено'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="max-w-md mx-auto px-4 pt-4">

        {/* HERO STATUS BANNER */}
        <div className={'mb-4 rounded-2xl p-5 border transition-all duration-300 ' + (hasThreat ? 'bg-gradient-to-b from-red-950/90 to-[#180a0a] border-red-600 shadow-2xl shadow-red-950/50 ring-1 ring-red-500' : isActive ? 'bg-gradient-to-b from-[#0e1c2e] to-[#0c1422] border-emerald-500/40 shadow-xl shadow-emerald-950/20' : 'bg-[#101622] border-[#1e2638]')}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400">
                СТАТУС МОНІТОРИНГУ
              </span>
              <h2 className="text-xl font-black tracking-tight mt-0.5 text-white">
                {hasThreat ? '🚨 ПРЯМА ЗАГРОЗА У РАЙОНІ!' : isActive ? '🛡️ СЕКТОР ЧИСТИЙ' : 'ГОТОВИЙ ДО ЗАПУСКУ'}
              </h2>
            </div>
            <div className={'p-2.5 rounded-xl ' + (hasThreat ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-bounce' : isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700')}>
              {hasThreat ? <Flame className="w-6 h-6" /> : isActive ? <ShieldCheck className="w-6 h-6" /> : <Radio className="w-6 h-6" />}
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {hasThreat
              ? evaluation?.primaryThreat?.confidenceReason || 'Виявлено небезпеку в радіусі дії. Рекомендовано негайно пройти в укриття!'
              : isActive
              ? 'Радарний моніторинг активний. 159 тактичних джерел скануються в радіусі 15 / 30 / 45 км.'
              : 'Натисніть кнопку нижче для фіксації вашого GPS або оберіть місто для захисту.'}
          </p>

          {isActive && (
            <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ' + (hasThreat ? 'bg-red-400' : 'bg-emerald-400')}></span>
                  <span className={'relative inline-flex rounded-full h-3 w-3 ' + (hasThreat ? 'bg-red-500' : 'bg-emerald-500')}></span>
                </span>
                <span className="font-mono font-bold text-slate-200">
                  ОНОВЛЕНО {secondsSinceCheck}с ТОМУ
                </span>
              </div>
              <button
                onClick={() => location && performSecurityCheck(location)}
                disabled={isChecking}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className={'w-3 h-3 ' + (isChecking ? 'animate-spin' : '')} />
                <span>Оновити</span>
              </button>
            </div>
          )}
        </div>

        {/* FLÜGER RADAR DISPLAY WIDGET */}
        {isActive && location && (
          <div className="mb-4 bg-[#0d131f] border border-[#1e2a40] rounded-2xl p-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RadarIcon className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  РАДАР «ФЛЮГЕР» (15 / 30 / 45 КМ)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Цілей у зоні: <strong className="text-white">{radarThreats.length}</strong>
              </span>
            </div>

            {/* RADAR SVG / CANVAS SCOPE */}
            <div className="relative w-full aspect-square max-w-[320px] mx-auto bg-[#070b12] rounded-full border border-cyan-500/30 shadow-inner flex items-center justify-center overflow-hidden my-2">
              {/* Radar Rings */}
              {/* 45 km Ring (Outer - Yellow) */}
              <div className="absolute w-[92%] h-[92%] rounded-full border border-yellow-500/30 flex items-start justify-center">
                <span className="text-[9px] font-mono text-yellow-500/70 bg-[#070b12]/80 px-1 rounded -translate-y-2">45 км (Раннє виявлення)</span>
              </div>

              {/* 30 km Ring (Middle - Orange) */}
              <div className="absolute w-[62%] h-[62%] rounded-full border border-orange-500/40 flex items-start justify-center">
                <span className="text-[9px] font-mono text-orange-400/80 bg-[#070b12]/80 px-1 rounded -translate-y-2">30 км (Підвищена готовність)</span>
              </div>

              {/* 15 km Ring (Inner - Red) */}
              <div className="absolute w-[32%] h-[32%] rounded-full border border-red-500/60 bg-red-950/10 flex items-start justify-center">
                <span className="text-[8px] font-mono font-bold text-red-400 bg-[#070b12]/80 px-1 rounded -translate-y-2">15 км (Укриття)</span>
              </div>

              {/* User Selected Radius Circle (Blue dashed) */}
              <div
                className="absolute rounded-full border-2 border-dashed border-blue-400 pointer-events-none transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(10, (radiusKm / 45) * 92))}%`,
                  height: `${Math.min(100, Math.max(10, (radiusKm / 45) * 92))}%`
                }}
              />

              {/* Crosshair Lines */}
              <div className="absolute w-full h-[1px] bg-cyan-500/20" />
              <div className="absolute h-full w-[1px] bg-cyan-500/20" />

              {/* Cardinal Labels */}
              <span className="absolute top-1 text-[9px] font-bold text-cyan-400 font-mono">Пн (N)</span>
              <span className="absolute bottom-1 text-[9px] font-bold text-cyan-400 font-mono">Пд (S)</span>
              <span className="absolute left-1.5 text-[9px] font-bold text-cyan-400 font-mono">Зх (W)</span>
              <span className="absolute right-1.5 text-[9px] font-bold text-cyan-400 font-mono">Сх (E)</span>

              {/* Rotating Sweep Beam */}
              <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none opacity-40 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(6,182,212,0.4)_0deg,transparent_60deg,transparent_360deg)]" />

              {/* Center User Pin */}
              <div className="absolute z-20 flex flex-col items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg shadow-blue-500/80 animate-pulse" />
                <span className="text-[8px] font-bold text-blue-300 font-mono mt-0.5 bg-[#0a0f18] px-1 rounded border border-blue-900">ВИ ТУТ</span>
              </div>

              {/* Threat Blips on Radar */}
              {radarThreats.map((threat, idx) => {
                const dist = threat.distanceKm || 20;
                const bearing = threat.bearingDegrees !== undefined ? threat.bearingDegrees : (idx * 45);
                const visualDistPercent = (Math.min(45, dist) / 45) * 44; // max radius 44% from center
                const rad = ((bearing - 90) * Math.PI) / 180; // 0 deg is North (top)
                const x = 50 + visualDistPercent * Math.cos(rad);
                const y = 50 + visualDistPercent * Math.sin(rad);

                const isDirectShelter = dist <= 15;
                const isAlertZone = dist <= 30;

                return (
                  <button
                    key={threat.id + '_' + idx}
                    onClick={() => setSelectedThreat(threat)}
                    className="absolute z-30 -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    title={`${threat.categoryNameUk} (~ ${dist} км, ${threat.bearingSectorUk})`}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className={'animate-ping absolute inline-flex h-4 w-4 rounded-full opacity-75 ' + (isDirectShelter ? 'bg-red-400' : isAlertZone ? 'bg-orange-400' : 'bg-yellow-400')} />
                      <div className={'w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-black border ' + (isDirectShelter ? 'bg-red-600 border-white text-white' : isAlertZone ? 'bg-orange-500 border-yellow-200 text-black' : 'bg-yellow-400 border-black text-black')}>
                        !
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* RADAR LEGEND & SENSITIVITY CONTROLS */}
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Чутливість сповіщень:</span>
                </span>
                <span className="font-mono font-bold text-blue-300">
                  {radiusKm.toFixed(0)} км {radiusKm <= 15 ? '(Зона 1: Укриття)' : radiusKm <= 30 ? '(Зона 2: Готовність)' : '(Зона 3: Макс)'}
                </span>
              </div>

              {/* PRESET CHIPS */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                <button
                  onClick={() => handleRadiusChange(5)}
                  className={'py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all text-center ' + (radiusKm === 5 ? 'bg-blue-600 text-white border-blue-400 shadow-md' : 'bg-[#151c2c] text-slate-300 border-slate-700 hover:bg-slate-800')}
                >
                  🎯 5 км
                </button>
                <button
                  onClick={() => handleRadiusChange(15)}
                  className={'py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all text-center ' + (radiusKm === 15 ? 'bg-red-700 text-white border-red-400 shadow-md' : 'bg-[#151c2c] text-slate-300 border-slate-700 hover:bg-slate-800')}
                >
                  🔴 15 км
                </button>
                <button
                  onClick={() => handleRadiusChange(30)}
                  className={'py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all text-center ' + (radiusKm === 30 ? 'bg-orange-700 text-white border-orange-400 shadow-md' : 'bg-[#151c2c] text-slate-300 border-slate-700 hover:bg-slate-800')}
                >
                  🟠 30 км
                </button>
                <button
                  onClick={() => handleRadiusChange(45)}
                  className={'py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all text-center ' + (radiusKm === 45 ? 'bg-yellow-700 text-white border-yellow-400 shadow-md' : 'bg-[#151c2c] text-slate-300 border-slate-700 hover:bg-slate-800')}
                >
                  🟡 45 км
                </button>
              </div>

              {/* SLIDER */}
              <input
                type="range"
                min="3"
                max="45"
                step="1"
                value={radiusKm}
                onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* SELECTED THREAT POPOVER / MODAL */}
        {selectedThreat && (
          <div className="mb-4 bg-red-950/90 border border-red-500 rounded-2xl p-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <h3 className="font-bold text-sm text-red-200">
                  {selectedThreat.categoryNameUk}
                </h3>
              </div>
              <button
                onClick={() => setSelectedThreat(null)}
                className="text-red-300 hover:text-white text-xs px-2 py-0.5 rounded bg-red-900 border border-red-700"
              >
                Закрити ×
              </button>
            </div>
            <div className="mt-2 text-xs space-y-1.5 text-red-100">
              <p><strong>Локація:</strong> {selectedThreat.detectedLocation} ({selectedThreat.detectedOblast})</p>
              <p><strong>Дистанція & Напрямок:</strong> ~{selectedThreat.distanceKm} км, {selectedThreat.bearingSectorUk}</p>
              <p><strong>Джерело:</strong> {selectedThreat.sourceTitle}</p>
              <p className="bg-red-900/60 p-2 rounded text-[11px] font-mono mt-1 border border-red-700/60">
                "{selectedThreat.rawText}"
              </p>
            </div>
          </div>
        )}

        {/* MAIN ACTIVATION BUTTON */}
        <div className="mb-5">
          {!isActive ? (
            <button
              onClick={handleActivate}
              disabled={isLoading}
              className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-lg tracking-wide shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-blue-400/40"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>АКТИВАЦІЯ ТА GPS...</span>
                </>
              ) : (
                <>
                  <RadarIcon className="w-6 h-6 animate-spin-slow" />
                  <span>АКТИВУВАТИ ЗАХИСТ</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDeactivate}
              className="w-full py-4 px-6 rounded-2xl bg-[#1a2335] hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-sm tracking-wide border border-slate-700/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>ЗУПИНИТИ МОНІТОРИНГ</span>
            </button>
          )}
        </div>

        {/* CITY PRESET SELECTOR (10 CITIES) */}
        <div className="mb-4 bg-[#101622] border border-[#1e2638] rounded-2xl p-4">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-200"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>ШВИДКИЙ ВИБІР МІСТА (10 МІСТ)</span>
            </div>
            {showPresets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPresets && (
            <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              {CITY_PRESETS.map((city) => (
                <button
                  key={city.name}
                  onClick={() => handleSelectCityPreset(city)}
                  className={'p-2.5 rounded-xl text-left text-xs border transition-all ' + (location?.name === city.name ? 'bg-blue-900/50 border-blue-400 text-blue-200 font-bold' : 'bg-[#151c2c] border-slate-800 text-slate-300 hover:bg-slate-800')}
                >
                  <p className="font-semibold text-white truncate">{city.name.split(' (')[0]}</p>
                  <p className="text-[10px] text-slate-400 truncate">{city.name.split(' (')[1]?.replace(')', '') || city.oblast}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CUSTOM TELEGRAM CHANNEL ADDER */}
        <div className="mb-4 bg-[#101622] border border-[#1e2638] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200">ВАШІ TELEGRAM КАНАЛИ ТА ПАБЛІКИ</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
              +{customChannels.length} кастомних
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Введіть username будь-якого каналу зі свого Telegram для моніторингу:
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">@</span>
              <input
                type="text"
                value={newChannelInput}
                onChange={(e) => setNewChannelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomChannel()}
                placeholder="username (напр. tlknews)"
                className="w-full bg-[#0d131f] border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <button
              onClick={() => handleAddCustomChannel()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0"
            >
              Додати
            </button>
          </div>

          {channelAddMessage && (
            <p className="mt-2 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 p-2 rounded-lg border border-emerald-800">
              {channelAddMessage}
            </p>
          )}

          {/* QUICK SUGGESTION CHIPS */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-400 self-center">Швидко:</span>
            {['tlknews', 'tlk_radar', 'ePPO_app', 'AerisRimor', 'lachentyt', 'truha_ukraine'].map((rec) => (
              <button
                key={rec}
                onClick={() => handleAddCustomChannel(rec)}
                className="text-[10px] font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded-md border border-slate-700/60"
              >
                + @{rec}
              </button>
            ))}
          </div>

          {/* ACTIVE USER CHANNELS TAGS */}
          {customChannels.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-1.5">
              {customChannels.map((c) => (
                <span
                  key={c.username}
                  className="inline-flex items-center gap-1.5 bg-blue-950/80 text-blue-300 text-[11px] font-mono px-2.5 py-1 rounded-lg border border-blue-800"
                >
                  <span>@{c.username}</span>
                  <button
                    onClick={() => handleRemoveCustomChannel(c.username)}
                    className="text-red-400 hover:text-red-200 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* FLÜGER RADAR METHODOLOGY MODAL */}
        {showFlugerModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#101622] border border-cyan-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <RadarIcon className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-sm text-white">Технологія «ФЛЮГЕР» (КБ Технарі)</h3>
                </div>
                <button
                  onClick={() => setShowFlugerModal(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="leading-relaxed">
                <strong>«Флюгер»</strong> — інноваційна методологія персонального радарного захисту від одеського КБ «Технарі» (команди «єППО» на чолі з Геннадієм Сульдіним).
              </p>

              <div className="space-y-2 bg-[#0c121e] p-3 rounded-xl border border-slate-800">
                <div className="flex items-start gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-red-400">Зона 1 (15 км) — Прямий удар:</strong>
                    <p className="text-slate-400 text-[11px]">Критична небезпека, негайний перехід в укриття.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-orange-400">Зона 2 (30 км) — Підвищена готовність:</strong>
                    <p className="text-slate-400 text-[11px]">Ціль рухається у вашому секторі, підліт 2–4 хв.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-yellow-300">Зона 3 (45 км) — Раннє виявлення:</strong>
                    <p className="text-slate-400 text-[11px]">Фіксація векторів підльоту крилатих ракет та БПЛА.</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Наш агент агрегує 159 тактичних джерел, канали єППО / КБ Технарі та локально обчислює точні дистанції й азимути для вашого iPhone без передачі координат на зовнішні сервери.
              </p>

              <button
                onClick={() => setShowFlugerModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
              >
                Зрозуміло
              </button>
            </div>
          </div>
        )}

        {/* SOURCES & RADAR HUB */}
        <div className="mb-4 bg-[#101622] border border-[#1e2638] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200">ДЖЕРЕЛА ТА РАДАРИ ({allSources.length})</h3>
            </div>
            <button
              onClick={handleTestAlert}
              className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/60 px-2 py-1 rounded border border-blue-800/80"
            >
              <Volume2 className="w-3 h-3" />
              <span>Тест звуку</span>
            </button>
          </div>

          {/* CATEGORY TABS */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
            {[
              { id: 'all', label: 'Всі (159)' },
              { id: 'user_custom', label: 'Мої (' + customChannels.length + ')' },
              { id: 'radar_national', label: 'Радари' },
              { id: 'osint_network', label: 'TLK & OSINT' },
              { id: 'military_official', label: 'Військові' },
              { id: 'tactical_south', label: 'Південь' },
              { id: 'tactical_east', label: 'Схід' },
              { id: 'tactical_north', label: 'Північ' },
              { id: 'tactical_center', label: 'Центр' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSourceFilter(tab.id)}
                className={'px-2.5 py-1 rounded-lg shrink-0 border transition-all ' + (sourceFilter === tab.id ? 'bg-blue-600 text-white border-blue-400 font-bold' : 'bg-[#151c2c] text-slate-400 border-slate-800 hover:text-slate-200')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SOURCES LIST */}
          <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
            {filteredSources.slice(0, 30).map((s) => (
              <div
                key={s.username}
                className="flex items-center justify-between p-2 rounded-xl bg-[#0c121e] border border-slate-800/80"
              >
                <div className="truncate pr-2">
                  <p className="font-semibold text-slate-200 truncate">{s.title}</p>
                  <p className="text-[10px] font-mono text-slate-400">@{s.username} • {s.region}</p>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 shrink-0">
                  Активний
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
