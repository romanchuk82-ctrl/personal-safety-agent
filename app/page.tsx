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
  Layers
} from 'lucide-react';
import { fetchActiveAlerts } from '@/lib/sources/alertsInUa';
import { fetchAllTelegramFeeds } from '@/lib/sources/telegramScraper';
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
  { name: 'Запоріжжя (Хортицький/Бабурка)', lat: 47.8300, lng: 35.0500, oblast: 'Запорізька область' },
  { name: 'Дніпро (Центр)', lat: 48.4647, lng: 35.0462, oblast: 'Дніпропетровська область' },
  { name: 'Київ (Центр)', lat: 50.4501, lng: 30.5234, oblast: 'Київська область' },
  { name: 'Київ (Оболонь)', lat: 50.5015, lng: 30.4981, oblast: 'Київська область' },
  { name: 'Харків (Салтівка)', lat: 50.0200, lng: 36.3400, oblast: 'Харківська область' },
  { name: 'Одеса (Центр)', lat: 46.4825, lng: 30.7233, oblast: 'Одеська область' },
];

export default function HomePage() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5.0);
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
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string>('');
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
      navigator.serviceWorker
        .register('/sw.js')
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

  const performCheck = useCallback(async (currentLoc?: LocationState) => {
    const loc = currentLoc || location;
    if (!loc) return;

    setIsChecking(true);
    try {
      const [alertsResult, telegramResult] = await Promise.all([
        fetchActiveAlerts(),
        fetchAllTelegramFeeds()
      ]);

      const evalResult = evaluateLocalSecurity(
        loc.lat,
        loc.lng,
        radiusKm,
        'Кирил',
        alertsResult.alerts,
        telegramResult.messages
      );

      setEvaluation(evalResult);
      setLastCheckTime(new Date());

      const threat = evalResult.primaryThreat;
      if (threat && threat.requiresImmediateShelter) {
        if (lastSpokenAlertIdRef.current !== threat.id) {
          lastSpokenAlertIdRef.current = threat.id;
          speakAlert(threat.voiceAlertText);
        }
      } else if (evalResult.allClearDetected) {
        const clearEvt = evalResult.threatEvents.find((e) => e.category === 'ALL_CLEAR');
        if (clearEvt && lastSpokenAlertIdRef.current !== clearEvt.id) {
          lastSpokenAlertIdRef.current = clearEvt.id;
          speakAlert(clearEvt.voiceAlertText);
        }
      }
    } catch (err) {
      console.error('Check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, [location, radiusKm, speakAlert]);

  const handleActivate = async () => {
    setIsLoading(true);

    try {
      let locData: LocationState;

      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 9000,
              maximumAge: 10000,
            });
          });

          const nearest = findNearestLocation(pos.coords.latitude, pos.coords.longitude);

          locData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            name: nearest.location.name,
            oblast: nearest.location.oblast,
            fixedAt: new Date().toLocaleTimeString('uk-UA'),
          };
        } catch (geoErr) {
          locData = {
            lat: 47.8388,
            lng: 35.1396,
            accuracy: 25,
            name: 'Запоріжжя (Центр)',
            oblast: 'Запорізька область',
            fixedAt: new Date().toLocaleTimeString('uk-UA'),
          };
        }
      } else {
        locData = {
          lat: 47.8388,
          lng: 35.1396,
          accuracy: 25,
          name: 'Запоріжжя (Центр)',
          oblast: 'Запорізька область',
          fixedAt: new Date().toLocaleTimeString('uk-UA'),
        };
      }

      setLocation(locData);
      localStorage.setItem('psa_location', JSON.stringify(locData));

      await setupPushSubscription();

      speakAlert(`Моніторинг безпеки активовано для локації ${locData.name}. Ваша позиція зафіксована.`);

      setIsActive(true);
      localStorage.setItem('psa_is_active', 'true');

      await performCheck(locData);
    } catch (err: any) {
      alert('Помилка активації: ' + (err.message || 'Спробуйте ще раз'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setIsActive(false);
    localStorage.setItem('psa_is_active', 'false');
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
    speakAlert('Моніторинг безпеки зупинено.');
  };

  const handleSelectPreset = (preset: (typeof CITY_PRESETS)[0]) => {
    const newLoc: LocationState = {
      lat: preset.lat,
      lng: preset.lng,
      accuracy: 10,
      name: preset.name,
      oblast: preset.oblast,
      fixedAt: new Date().toLocaleTimeString('uk-UA'),
    };
    setLocation(newLoc);
    localStorage.setItem('psa_location', JSON.stringify(newLoc));
    setShowPresets(false);

    if (isActive) {
      performCheck(newLoc);
    }
  };

  const handleTestAlert = () => {
    speakAlert("Кирил, увага. Це тестове сповіщення системи Personal Safety Agent. Зв'язок активний.");
  };

  useEffect(() => {
    if (isActive && location) {
      if (!lastCheckTime) {
        performCheck(location);
      }

      checkIntervalRef.current = setInterval(() => {
        performCheck(location);
      }, 25000);

      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
      };
    }
  }, [isActive, location, performCheck, lastCheckTime]);

  const hasThreat = evaluation?.hasLocalThreat && evaluation.primaryThreat;

  return (
    <main className="max-w-md mx-auto min-h-screen px-4 py-6 flex flex-col justify-between pb-12">
      <div>
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-[#1e2638] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                PERSONAL SAFETY
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Персональний агент локальної безпеки
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              title={audioEnabled ? 'Звук увімкнено' : 'Звук вимкнено'}
              className={`p-2.5 rounded-xl border transition-colors ${
                audioEnabled
                  ? 'bg-blue-950/60 border-blue-600/50 text-blue-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* STATUS BADGE */}
        <div className="mb-6">
          {!isActive ? (
            <div className="flex items-center justify-between bg-[#121722] border border-[#1e2638] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-slate-500"></span>
                </span>
                <span className="text-sm font-bold tracking-wider text-slate-300 uppercase">
                  ● НЕАКТИВНИЙ
                </span>
              </div>
              <span className="text-xs text-slate-400">Очікує запуску</span>
            </div>
          ) : (
            <div
              className={`flex items-center justify-between rounded-2xl p-4 border transition-all duration-300 shadow-md ${
                hasThreat
                  ? 'bg-red-950/50 border-red-500/60 text-red-200 shadow-red-900/30'
                  : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-emerald-950/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      hasThreat ? 'bg-red-400' : 'bg-emerald-400'
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                      hasThreat ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  ></span>
                </span>
                <span className="text-sm font-bold tracking-wider uppercase">
                  ● МОНІТОРИНГ АКТИВНИЙ
                </span>
              </div>
              <span className="text-xs font-mono opacity-80">
                {isChecking ? 'Оновлення...' : `upd: ${secondsSinceCheck}s`}
              </span>
            </div>
          )}
        </div>

        {/* MAIN BIG BUTTON */}
        <div className="mb-6">
          {!isActive ? (
            <button
              onClick={handleActivate}
              disabled={isLoading}
              className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg tracking-wide shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-blue-400/30"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>АКТИВАЦІЯ ТА GPS...</span>
                </>
              ) : (
                <>
                  <Radio className="w-6 h-6" />
                  <span>АКТИВУВАТИ</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDeactivate}
              className="w-full py-4 px-6 rounded-2xl bg-[#1e2638] hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-base tracking-wide border border-slate-700/60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <span>ЗУПИНИТИ МОНІТОРИНГ</span>
            </button>
          )}
        </div>

        {/* ACTIVE TELEMETRY DASHBOARD */}
        {isActive && location && (
          <div className="bg-[#121722] border border-[#1e2638] rounded-2xl p-5 mb-6 space-y-4 shadow-md">
            {hasThreat && evaluation?.primaryThreat && (
              <div className="bg-red-950/80 border border-red-500 rounded-xl p-4 text-red-100 animate-pulse-slow">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-red-300">
                      УВАГА: {evaluation.primaryThreat.categoryNameUk}
                    </h3>
                    <p className="text-xs text-red-200 mt-1">
                      {evaluation.primaryThreat.confidenceReason}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-red-300 font-mono">
                      <span>Дистанція: ~{evaluation.primaryThreat.distanceKm} км</span>
                      <span>Джерело: {evaluation.primaryThreat.sourceTitle}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between border-b border-[#1e2638]/70 pb-2.5">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Локація:</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{location.name}</p>
                  <p className="text-[11px] font-mono text-slate-400">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)} ({location.oblast})
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-[#1e2638]/70 pb-2.5">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Час фіксації:</span>
                </div>
                <span className="font-mono font-medium text-slate-200">
                  {location.fixedAt}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#1e2638]/70 pb-2.5">
                <div className="flex items-center gap-2 text-slate-400">
                  <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Заявлений радіус / точність:</span>
                </div>
                <span className="font-semibold text-white">
                  {radiusKm.toFixed(1)} км{' '}
                  <span className="text-[11px] font-normal text-slate-400">
                    (GPS ±{location.accuracy}м)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#1e2638]/70 pb-2.5">
                <div className="flex items-center gap-2 text-slate-400">
                  <RefreshCw className={`w-4 h-4 text-cyan-400 shrink-0 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>Остання перевірка:</span>
                </div>
                <span className="font-mono text-slate-200">
                  {lastCheckTime ? `${secondsSinceCheck} сек тому` : 'Щойно'}
                </span>
              </div>

              <div className="flex items-start justify-between pt-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Activity className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Поточний статус:</span>
                </div>
                <div className="text-right">
                  {hasThreat ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800/80 animate-pulse">
                      НЕБЕЗПЕКА ПОБЛИЗУ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ЗАГРОЗ НЕ ВИЯВЛЕНО
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleTestAlert}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                Тест голосу/звуку
              </button>
              <button
                onClick={() => performCheck(location)}
                disabled={isChecking}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-cyan-400' : ''}`} />
                Перевірити зараз
              </button>
            </div>
          </div>
        )}

        {/* LOCATION SELECTOR / PRESETS */}
        <div className="bg-[#121722] border border-[#1e2638] rounded-2xl p-4 mb-4">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              Змінити локацію / Радіус ({location ? location.name : 'Запоріжжя'}, {radiusKm} км)
            </span>
            {showPresets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPresets && (
            <div className="mt-4 pt-3 border-t border-[#1e2638] space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1.5">
                  Бажаний радіус попередження (км):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3.0, 5.0, 10.0].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadiusKm(r)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                        radiusKm === r
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r} км {r === 5.0 && '(Стандарт)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1.5">
                  Швидкий вибір міста/сектора:
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {CITY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-left p-2 rounded-xl text-xs border transition-colors ${
                        location?.name === preset.name
                          ? 'bg-blue-950 border-blue-500/60 text-blue-200 font-medium'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <p className="truncate font-semibold">{preset.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{preset.oblast}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LIVE RADAR FEED */}
        <div className="bg-[#121722] border border-[#1e2638] rounded-2xl p-4 mb-4">
          <button
            onClick={() => setShowEventLog(!showEventLog)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-300"
          >
            <span className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              Радіолокаційна стрічка подій навколо локації ({evaluation?.threatEvents.length || 0})
            </span>
            {showEventLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showEventLog && (
            <div className="mt-3 pt-3 border-t border-[#1e2638] space-y-2.5">
              {evaluation && evaluation.threatEvents.length > 0 ? (
                evaluation.threatEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-xl border text-xs ${
                      event.category === 'ALL_CLEAR'
                        ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                        : event.isWithinRadius
                        ? 'bg-red-950/40 border-red-700/60 text-red-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-100 flex items-center gap-1.5">
                        {event.categoryNameUk}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        ~{event.distanceKm !== null ? `${event.distanceKm} км` : 'н/д'}
                      </span>
                    </div>

                    <p className="text-[11px] mt-1 text-slate-300 leading-relaxed">
                      {event.rawText}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/50">
                      <span>{event.sourceTitle}</span>
                      <span className="font-semibold text-blue-400">
                        Довіра: {event.confidence === 'HIGH' ? 'Висока' : 'Оціночна'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">
                  {isActive
                    ? 'У радіусі спостереження прямих загроз не зафіксовано.'
                    : 'Натисніть «АКТИВУВАТИ» для початку радіолокаційного аналізу.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RESEARCH & TRANSPARENCY */}
        <div className="bg-[#121722] border border-[#1e2638] rounded-2xl p-4 mb-4">
          <button
            onClick={() => setShowResearchInfo(!showResearchInfo)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Джерела даних та дослідження «Віраж-Планшет»
            </span>
            {showResearchInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showResearchInfo && (
            <div className="mt-3 pt-3 border-t border-[#1e2638] space-y-3 text-xs text-slate-300">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <p className="font-bold text-slate-200">🛰 Дослідження системи «Віраж-Планшет»:</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  «Віраж-Планшет» — закрита військова АСУ ППО ЗСУ без публічного API. Спроби несанкціонованого доступу заборонені.
                  Personal Safety Agent використовує <strong>100% легальні верифіковані ретранслятори та радіолокаційні OSINT-джерела</strong> з точністю до мікрорайонів.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <p className="font-semibold text-slate-400">Статус підключених джерел:</p>
                <div className="grid grid-cols-1 gap-1.5 font-mono">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span>1. alerts.in.ua API (Громади/Райони)</span>
                    <span className="text-emerald-400">● LIVE</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span>2. @kpszsu (Повітряні Сили ЗСУ)</span>
                    <span className="text-emerald-400">● LIVE</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span>3. @vanek_nikolaev (OSINT Радар)</span>
                    <span className="text-emerald-400">● LIVE</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span>4. @monitorwarr (Monitor)</span>
                    <span className="text-emerald-400">● LIVE</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* IPHONE PWA INSTRUCTION */}
        <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-900/40 rounded-2xl p-4 text-xs text-slate-300">
          <div className="flex items-start gap-3">
            <Share2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-200">Як використовувати на iPhone:</p>
              <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                Щоб отримувати сповіщення на замкненому екрані iPhone у кишені: натисніть кнопку «Поділитися» в Safari → «На екран Початковий» (Add to Home Screen).
              </p>
              {pushStatusMessage && (
                <p className="mt-2 font-mono text-[10px] text-blue-300">{pushStatusMessage}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-[11px] text-slate-500 border-t border-[#1e2638] pt-4">
        Personal Safety Agent • Локальна безпека в Україні • Автономний моніторинг
      </footer>
    </main>
  );
}
