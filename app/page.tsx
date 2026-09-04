'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-3xl bg-[#0a0f18] border border-[#1a2538] flex flex-col items-center justify-center gap-2 text-slate-400">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-mono">Завантаження інтерактивної карти...</span>
    </div>
  ),
});

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
  HelpCircle,
  Megaphone,
  Volume1,
  Lock,
  Unlock,
  Search,
  Map,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { fetchActiveAlerts, RawAlert, isUserInOfficialAlert } from '@/lib/sources/alertsInUa';
import { fetchAllTelegramFeeds, MONITORED_CHANNELS, ChannelConfig, ChannelIngestStatus } from '@/lib/sources/telegramScraper';
import { evaluateLocalSecurity, SecurityEvaluationResult, ThreatEvent, SecurityState, RejectedMessageItem } from '@/lib/matcher';
import { findNearestLocation, UKRAINIAN_GAZETTEER, GeoLocation } from '@/lib/gazetteer';
import { unlockAudioAndSpeech, speakUkrainian, stopAllAudio } from '@/lib/soundService';
import {
  LocationValidator,
  TrustedLocation,
  LocationLockMode,
  LocationConfidenceState,
  RawGpsMeasurement,
  saveTrustedLocationToStorage,
  loadTrustedLocationFromStorage
} from '@/lib/locationValidator';

const CITY_PRESETS = [
  // Київ та Столичний регіон
  { name: 'Київ (Центр / Хрещатик)', lat: 50.4501, lng: 30.5234, oblast: 'Київська область' },
  { name: 'Київ (Оболонь / Поділ)', lat: 50.5015, lng: 30.4981, oblast: 'Київська область' },
  { name: 'Київ (Позняки / Дарниця)', lat: 50.3980, lng: 30.6340, oblast: 'Київська область' },
  { name: 'Київ (Троєщина / Деснянський)', lat: 50.5100, lng: 30.5900, oblast: 'Київська область' },
  { name: 'Київ (Святошин / Борщагівка)', lat: 50.4580, lng: 30.3720, oblast: 'Київська область' },
  { name: 'Київ (Голосіїв / Теремки)', lat: 50.3800, lng: 30.4900, oblast: 'Київська область' },
  { name: 'Бориспіль (Центр / Аеропорт)', lat: 50.3500, lng: 30.9500, oblast: 'Київська область' },
  { name: 'Бровари (Центр)', lat: 50.5114, lng: 30.7903, oblast: 'Київська область' },
  { name: 'Ірпінь / Буча', lat: 50.5200, lng: 30.2400, oblast: 'Київська область' },
  // Фокусні міста України
  { name: 'Чернігів (Центр)', lat: 51.4982, lng: 31.2893, oblast: 'Чернігівська область' },
  { name: 'Суми (Центр)', lat: 50.9077, lng: 34.7981, oblast: 'Сумська область' },
  { name: 'Харків (Центр)', lat: 49.9935, lng: 36.2304, oblast: 'Харківська область' },
  { name: 'Харків (Салтівка)', lat: 50.0200, lng: 36.3400, oblast: 'Харківська область' },
  { name: 'Полтава (Центр)', lat: 49.5883, lng: 34.5514, oblast: 'Полтавська область' },
  { name: 'Дніпро (Центр)', lat: 48.4647, lng: 35.0462, oblast: 'Дніпропетровська область' },
  { name: 'Павлоград (Центр)', lat: 48.5167, lng: 35.8667, oblast: 'Дніпропетровська область' },
  { name: 'Запоріжжя (Центр)', lat: 47.8388, lng: 35.1396, oblast: 'Запорізька область' },
  { name: 'Запоріжжя (Шевченківський)', lat: 47.8500, lng: 35.2000, oblast: 'Запорізька область' },
  { name: 'Запоріжжя (Бабурка / Хортицький)', lat: 47.8300, lng: 35.0500, oblast: 'Запорізька область' },
  { name: 'Одеса (Центр)', lat: 46.4825, lng: 30.7233, oblast: 'Одеська область' },
  { name: 'Миколаїв (Центр)', lat: 46.9750, lng: 31.9946, oblast: 'Миколаївська область' },
];

export default function HomePage() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [trustedLocation, setTrustedLocation] = useState<TrustedLocation | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(15.0);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [secondsSinceCheck, setSecondsSinceCheck] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWarmingUp, setIsWarmingUp] = useState<boolean>(false);
  const [warmupSampleCount, setWarmupSampleCount] = useState<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<SecurityEvaluationResult | null>(null);
  const [officialAlerts, setOfficialAlerts] = useState<RawAlert[]>([]);
  const [sourcesHealth, setSourcesHealth] = useState<any>(null);
  const [sourceStatuses, setSourceStatuses] = useState<Record<string, ChannelIngestStatus>>({});
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [voiceStatusMessage, setVoiceStatusMessage] = useState<string>('');
  
  // Location Manager & Search Modals
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const [locationSuccessNotice, setLocationSuccessNotice] = useState<string>('');

  // Test Push Modal State
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [showRejectedModal, setShowRejectedModal] = useState<boolean>(false);

  // Collapsible Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showFlugerModal, setShowFlugerModal] = useState<boolean>(false);
  const [customChannels, setCustomChannels] = useState<ChannelConfig[]>([]);
  const [newChannelInput, setNewChannelInput] = useState<string>('');
  const [channelAddMessage, setChannelAddMessage] = useState<string>('');
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);

  const locationValidatorRef = useRef<LocationValidator>(new LocationValidator(null, 'AUTO'));
  const watchPositionIdRef = useRef<number | null>(null);
  const lastSpokenAlertIdRef = useRef<string | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto unlock audio and speech on first user touch
  useEffect(() => {
    const handleFirstTouch = () => {
      unlockAudioAndSpeech();
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };
    window.addEventListener('touchstart', handleFirstTouch, { passive: true });
    window.addEventListener('click', handleFirstTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };
  }, []);

  // Initialize Storage State
  useEffect(() => {
    const storedAudio = localStorage.getItem('psa_audio_enabled');
    if (storedAudio !== null) {
      setAudioEnabled(storedAudio === 'true');
    }

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

    // Load saved trusted location & lock mode
    const savedLocation = loadTrustedLocationFromStorage();
    if (savedLocation) {
      locationValidatorRef.current = new LocationValidator(savedLocation, savedLocation.lockMode);
      setTrustedLocation(savedLocation);
    } else {
      // Default to Boryspil / Kyiv as default pre-activation placeholder
      const defaultLoc: TrustedLocation = {
        lat: 50.3500,
        lng: 30.9500,
        accuracyMeters: 10,
        name: 'Бориспіль (Центр / Аеропорт)',
        oblast: 'Київська область',
        confidenceState: 'VERIFIED',
        lockMode: 'AUTO',
        systemConfidenceScore: 95,
        lastVerifiedTimestamp: Date.now(),
        firstAcquiredTimestamp: Date.now(),
        sampleCount: 1,
        statusMessageUk: '📍 Бориспіль (Центр / Аеропорт)',
        subStatusUk: 'Готовий до активації захисту',
        isManualOrLocked: false,
      };
      locationValidatorRef.current = new LocationValidator(defaultLoc, 'AUTO');
      setTrustedLocation(defaultLoc);
    }

    const storedActive = localStorage.getItem('psa_is_active') === 'true';
    if (storedActive) {
      setIsActive(true);
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

      // Automatically expire stale anomaly warning if enough time has elapsed
      if (locationValidatorRef.current) {
        const expired = locationValidatorRef.current.checkAnomalyExpiration();
        if (expired) {
          const fresh = locationValidatorRef.current.getTrustedLocation();
          if (fresh) {
            setTrustedLocation({ ...fresh });
            saveTrustedLocationToStorage(fresh);
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastCheckTime]);

  const handleToggleAudio = (forceState?: boolean) => {
    const nextState = forceState !== undefined ? forceState : !audioEnabled;
    setAudioEnabled(nextState);
    localStorage.setItem('psa_audio_enabled', nextState ? 'true' : 'false');

    if (!nextState) {
      stopAllAudio();
      setVoiceStatusMessage('🔇 Голосові сповіщення ВИМКНЕНО (Тихий режим)');
      setTimeout(() => setVoiceStatusMessage(''), 3000);
    } else {
      unlockAudioAndSpeech();
      setVoiceStatusMessage('🔊 Голосові сповіщення УВІМКНЕНО (Режим Ajax)');
      setTimeout(() => setVoiceStatusMessage(''), 3000);
    }
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    localStorage.setItem('psa_radius_km', newRadius.toString());
  };

  // PURE CLEAN VOICE ALERT (No sirens)
  const speakAlert = useCallback((text: string) => {
    if (!audioEnabled) return;
    unlockAudioAndSpeech();
    speakUkrainian(text);
  }, [audioEnabled]);

  const handleManualVoiceTest = () => {
    unlockAudioAndSpeech();
    if (!audioEnabled) {
      handleToggleAudio(true);
    }
    setVoiceStatusMessage('Вимовляю голосове сповіщення...');
    speakUkrainian(
      'Увага! Тестове сповіщення системи безпеки. Голос диктора працює чітко та надійно.',
      () => setVoiceStatusMessage('Голос активний! 🔊'),
      () => setTimeout(() => setVoiceStatusMessage(''), 4000)
    );
  };

  const performSecurityCheck = useCallback(async (currentLoc: TrustedLocation) => {
    if (isChecking) return;
    setIsChecking(true);

    try {
      const [alertsRes, tgRes] = await Promise.all([
        fetchActiveAlerts(),
        fetchAllTelegramFeeds(currentLoc.oblast, 20, customChannels)
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
      setOfficialAlerts(alertsRes.alerts || []);
      setLastCheckTime(new Date());
      setSecondsSinceCheck(0);

      const statusMap = tgRes.sourceStatus || {};
      setSourceStatuses(statusMap);
      setSourcesHealth({
        telegramSourcesTotal: Object.keys(statusMap).length,
        telegramOkCount: Object.values(statusMap).filter((s) => s.ok).length,
        officialAlertsOk: alertsRes.status === 'OK' || alertsRes.status === 'CACHE',
        lastCheckIso: new Date().toISOString()
      });

      // TRIGGER VOICE ANNOUNCEMENT ON RED THREAT
      if (result.overallState === 'RED' && result.primaryThreat) {
        if (lastSpokenAlertIdRef.current !== result.primaryThreat.id) {
          lastSpokenAlertIdRef.current = result.primaryThreat.id;
          if (audioEnabled) {
            speakAlert(result.primaryThreat.voiceAlertText);
          }
        }
      }
    } catch (error) {
      console.error('Security evaluation cycle error:', error);
    } finally {
      setIsChecking(false);
    }
  }, [radiusKm, isChecking, speakAlert, customChannels, lastCheckTime, audioEnabled]);

  // Continuous background GPS feed to Location Confidence Layer
  const startContinuousGpsWatch = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }

    watchPositionIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const sample: RawGpsMeasurement = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp || Date.now(),
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
        };

        const result = locationValidatorRef.current.processGpsMeasurement(sample);
        setTrustedLocation(result.trustedLocation);
        saveTrustedLocationToStorage(result.trustedLocation);

        if (result.isUpdated && isActive) {
          // Trigger security check for updated position
          performSecurityCheck(result.trustedLocation);
        }
      },
      (err) => {
        console.warn('Continuous GPS watch warning:', err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );
  }, [isActive, performSecurityCheck]);

  // Handle Activation: Multi-sample warmup with EW validation
  const handleActivate = async () => {
    setIsLoading(true);
    setIsWarmingUp(true);
    setWarmupSampleCount(0);

    if (audioEnabled) {
      unlockAudioAndSpeech();
    }

    try {
      if ('Notification' in window && Notification.permission !== 'granted') {
        try {
          await Notification.requestPermission();
        } catch (e) {}
      }

      // If location is already LOCKED or MANUAL, activate immediately from that point
      if (trustedLocation && (trustedLocation.lockMode === 'LOCKED' || trustedLocation.lockMode === 'MANUAL')) {
        setIsActive(true);
        localStorage.setItem('psa_is_active', 'true');
        setIsLoading(false);
        setIsWarmingUp(false);
        await performSecurityCheck(trustedLocation);

        if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = setInterval(() => {
          performSecurityCheck(trustedLocation);
        }, 25000);
        return;
      }

      // AUTO GPS Warmup: Collect initial GPS samples
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const sample: RawGpsMeasurement = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
            timestamp: position.timestamp || Date.now(),
          };

          const valResult = locationValidatorRef.current.processGpsMeasurement(sample);
          setTrustedLocation(valResult.trustedLocation);
          saveTrustedLocationToStorage(valResult.trustedLocation);
          setIsActive(true);
          localStorage.setItem('psa_is_active', 'true');
          setIsLoading(false);
          setIsWarmingUp(false);

          await performSecurityCheck(valResult.trustedLocation);

          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = setInterval(() => {
            if (locationValidatorRef.current.getTrustedLocation()) {
              performSecurityCheck(locationValidatorRef.current.getTrustedLocation()!);
            }
          }, 25000);

          // Start continuous GPS watch in background
          startContinuousGpsWatch();
        },
        (geoError) => {
          console.warn('Geolocation fallback to Boryspil / Kyiv:', geoError);
          const fallbackLoc = locationValidatorRef.current.setManualLocation(
            50.3500,
            30.9500,
            'Бориспіль (Центр / Аеропорт)',
            'Київська область'
          );

          setTrustedLocation(fallbackLoc);
          setIsActive(true);
          localStorage.setItem('psa_is_active', 'true');
          setIsLoading(false);
          setIsWarmingUp(false);

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
      setIsWarmingUp(false);
    }
  };

  const handleDeactivate = () => {
    setIsActive(false);
    localStorage.setItem('psa_is_active', 'false');
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }
  };

  // LOCK LOCATION HANDLER (📌 ЗАФІКСУВАТИ ЛОКАЦІЮ)
  const handleLockLocation = () => {
    if (!trustedLocation) return;
    const locked = locationValidatorRef.current.lockCurrentLocation();
    if (locked) {
      setTrustedLocation({ ...locked });
      saveTrustedLocationToStorage(locked);
      setLocationSuccessNotice(`📌 Локацію зафіксовано: ${locked.name}`);
      setTimeout(() => setLocationSuccessNotice(''), 3500);

      if (isActive) {
        performSecurityCheck(locked);
      }
    }
  };

  // UNLOCK / SWITCH TO AUTO GPS (📍 AUTO)
  const handleSwitchToAutoGps = () => {
    const autoLoc = locationValidatorRef.current.unlockToAutoMode();
    if (autoLoc) {
      setTrustedLocation({ ...autoLoc });
      saveTrustedLocationToStorage(autoLoc);
      setLocationSuccessNotice('📍 Увімкнено Авто-GPS із захистом від аномалій координат');
      setTimeout(() => setLocationSuccessNotice(''), 3500);

      startContinuousGpsWatch();

      if (isActive) {
        performSecurityCheck(autoLoc);
      }
    }
  };

  // MANUAL LOCATION HANDLER (✏️ ВИБРАТИ НА КАРТІ / СПИСОК)
  const handleSelectManualLocation = (lat: number, lng: number, name?: string, oblast?: string) => {
    const manualLoc = locationValidatorRef.current.setManualLocation(lat, lng, name, oblast);
    setTrustedLocation({ ...manualLoc });
    saveTrustedLocationToStorage(manualLoc);
    setShowLocationModal(false);
    setLocationSuccessNotice(`📌 Локацію встановлено: ${manualLoc.name}`);
    setTimeout(() => setLocationSuccessNotice(''), 3500);

    if (isActive) {
      performSecurityCheck(manualLoc);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = setInterval(() => {
        performSecurityCheck(manualLoc);
      }, 25000);
    }
  };

  // EMERGENCY PUSH TEST (Ajax Style)
  const startEmergencyPushTest = async () => {
    if (audioEnabled) {
      unlockAudioAndSpeech();
    }
    setShowTestModal(true);
    setTestCountdown(5);
    setTestCompleted(false);

    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }

    const testVoicePhrase = "Увага! Тестове голосове сповіщення системи безпеки. Канал зв'язку працює у штатному режимі.";

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_TEST_ALERT',
        delayMs: 5000,
        title: '🚨 ТЕСТОВЕ ГОЛОСОВЕ СПОВІЩЕННЯ',
        body: 'Кириле, сповіщення на замкнений екран надійшло успішно!',
        voiceText: audioEnabled ? testVoicePhrase : ''
      });
    }

    let count = 5;
    const timer = setInterval(() => {
      count -= 1;
      setTestCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setTestCompleted(true);
        if (audioEnabled) {
          speakAlert(testVoicePhrase);
        }
      }
    }, 1000);
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
      region: trustedLocation?.oblast || 'Вся Україна',
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

  const isLocationLocked = trustedLocation?.lockMode === 'LOCKED' || trustedLocation?.lockMode === 'MANUAL';
  const isLocationUnreliable = trustedLocation?.confidenceState === 'UNRELIABLE';

  const isUnderOfficialAlert = isUserInOfficialAlert(trustedLocation?.oblast, trustedLocation?.name, officialAlerts);

  const radarThreats = (evaluation?.threatEvents || []).filter(
    (t) => t.status === 'active' && t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID' && (t.distanceKm === null || t.distanceKm <= 75)
  );
  const historyThreats = (evaluation?.historyEvents || []).filter(
    (t) => (t.status === 'stale' || t.status === 'cleared') && t.category !== 'GENERAL_AIR_RAID'
  );

  // Gazetteer search filter for location modal
  const filteredGazetteer = citySearchQuery.trim()
    ? UKRAINIAN_GAZETTEER.filter((g) =>
        g.name.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
        g.oblast.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
        g.aliases.some((a) => a.toLowerCase().includes(citySearchQuery.toLowerCase()))
      ).slice(0, 15)
    : UKRAINIAN_GAZETTEER.slice(0, 10);

  return (
    <main className="min-h-screen bg-[#070a10] text-slate-100 main-safe selection:bg-blue-500 selection:text-white font-sans antialiased">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#0c101a]/95 backdrop-blur-md border-b border-[#182234] header-safe shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className={'w-6 h-6 shrink-0 ' + (isRed ? 'text-red-500 animate-pulse' : isOrange ? 'text-amber-400' : isActive ? 'text-emerald-400' : 'text-slate-500')} />
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 truncate">
                <span className="truncate">ВАРТОВИЙ БЕЗПЕКИ</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950 text-blue-400 border border-blue-800/60 shrink-0">
                  AJAX-VOICE
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                {isLocationLocked ? <Lock className="w-2.5 h-2.5 text-indigo-400 inline shrink-0" /> : null}
                <span>{trustedLocation ? trustedLocation.name : 'Геолокація готова'}</span>
              </p>
            </div>
          </div>

          {/* DEDICATED SOUND TOGGLE */}
          <button
            onClick={() => handleToggleAudio()}
            className={'shrink-0 px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ' + (
              audioEnabled
                ? 'bg-blue-950/80 border-blue-500/50 text-blue-300 hover:bg-blue-900/80'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            )}
            title={audioEnabled ? 'Вимкнути голос (Тихий режим)' : 'Увімкнути голос'}
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>ГОЛОС: УВІМК</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
                <span>ТИХИЙ</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="max-w-md mx-auto px-4 pt-3">

        {/* LOCATION CONFIDENCE CONTROLS BAR (Auto / Lock / Manual) */}
        <div className="mb-3 p-1.5 bg-[#0e1524] rounded-2xl border border-slate-800 shadow-lg">
          <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
            {/* AUTO GPS BUTTON */}
            <button
              onClick={handleSwitchToAutoGps}
              className={'py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ' + (
                trustedLocation?.lockMode === 'AUTO' && !isLocationUnreliable
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
              title="Автоматичний GPS із захистом від аномалій координат"
            >
              <Radio className="w-3.5 h-3.5 text-blue-300" />
              <span>📍 АВТО</span>
            </button>

            {/* LOCK BUTTON */}
            <button
              onClick={handleLockLocation}
              className={'py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ' + (
                isLocationLocked
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
              title="Зафіксувати поточну точку: ігнорувати будь-які стрибки GPS"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-300" />
              <span>📌 ЗАФІКСУВАТИ</span>
            </button>

            {/* MANUAL / MAP PICKER BUTTON */}
            <button
              onClick={() => setShowLocationModal(true)}
              className="py-2 px-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 flex items-center justify-center gap-1.5 transition-all"
              title="Обрати місто з пошуку або поставити точку на карті"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>✏️ ВРУЧНУ</span>
            </button>
          </div>
        </div>

        {/* LOCATION SUCCESS / NOTICE MESSAGE */}
        {locationSuccessNotice && (
          <div className="mb-3 p-2 rounded-xl bg-indigo-950 text-indigo-200 text-xs font-bold text-center border border-indigo-700 animate-fadeIn flex items-center justify-center gap-1.5 shadow-md">
            <Check className="w-3.5 h-3.5 text-indigo-300" />
            <span>{locationSuccessNotice}</span>
          </div>
        )}

        {/* VOICE QUICK CONTROLS */}
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={handleManualVoiceTest}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-950/70 hover:bg-blue-900/70 text-blue-300 font-bold text-xs border border-blue-800/80 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            <span>ТЕСТ ГОЛОСУ ДИКТОРУ 🔊</span>
          </button>
          <button
            onClick={() => handleToggleAudio()}
            className={'py-2 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-all active:scale-95 ' + (
              audioEnabled
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-800/80'
            )}
          >
            {audioEnabled ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
            <span>{audioEnabled ? 'Вимкнути' : 'Увімкнути'}</span>
          </button>
        </div>

        {voiceStatusMessage && (
          <div className="mb-3 p-2 rounded-xl bg-blue-950 text-blue-200 text-xs font-bold text-center border border-blue-700 animate-pulse">
            {voiceStatusMessage}
          </div>
        )}

        {/* GPS ANOMALY WARNING CARD (Appears if suspicious GPS jump detected) */}
        {isLocationUnreliable && (
          <div className="mb-4 bg-amber-950/90 border border-amber-500/80 rounded-2xl p-3.5 shadow-xl animate-fadeIn text-xs text-amber-200 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h3 className="font-bold text-amber-100 text-xs">⚠️ Геолокація нестабільна</h3>
                <p className="text-[11px] text-amber-300/90 mt-0.5 leading-relaxed">
                  Виявлено стрибок координат (можливий слабкий сигнал, multipath, indoor або інтерференція GNSS). Система використовує останню надійну точку:{' '}
                  <strong>{trustedLocation?.name}</strong>. Моніторинг загроз не переривається!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-amber-800/60 text-[11px]">
              <button
                onClick={handleLockLocation}
                className="flex-1 py-1.5 px-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-all"
              >
                📌 Зафіксувати цю точку
              </button>
              <button
                onClick={() => setShowLocationModal(true)}
                className="py-1.5 px-2.5 bg-amber-900/80 hover:bg-amber-800 text-amber-200 font-semibold rounded-lg border border-amber-700 transition-all"
              >
                Вказати місто
              </button>
            </div>
          </div>
        )}

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

              {/* COMPACT OFFICIAL AIR RAID BADGE */}
              {isUnderOfficialAlert && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/80 text-rose-300 text-xs font-bold shadow-lg shadow-rose-950/40 animate-pulse">
                  <span>⚠</span>
                  <span>ОФІЦІЙНА ТРИВОГА</span>
                  <span className="text-[10px] text-rose-400 font-mono">({trustedLocation?.oblast || 'Область'})</span>
                </div>
              )}
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
              ? 'Натисніть кнопку «Активувати захист», заблокуйте iPhone та покладіть у кишеню. Система оголосить небезпеку голосом на замкненому екрані.'
              : isRed
              ? evaluation?.primaryThreat?.confidenceReason || 'Підтверджено пряму загрозу у вашому секторі! Негайно пройдіть в укриття!'
              : isOrange
              ? evaluation?.stateDescriptionUk || 'Ціль спостерігається в області / коридорі підльоту. Загрози для вашого мікрорайону наразі немає.'
              : isDegraded
              ? 'Дані застаріли або відсутній зв’язок із джерелами. Перевірте підключення до інтернету.'
              : isUnderOfficialAlert
              ? `В області оголошено офіційну повітряну тривогу. Безпосередніх рухомих цілей у вашому секторі (${radiusKm.toFixed(0)} км) наразі не виявлено.`
              : evaluation?.stateDescriptionUk || 'Локальних загроз поблизу не виявлено. 159 радарних джерел сканують ваш сектор у реальному часі.'}
          </p>

          {/* TELEMETRY METRICS */}
          {trustedLocation && (
            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono flex items-center justify-between">
                  <span>📍 ВАША ЛОКАЦІЯ</span>
                  {isLocationLocked ? <span className="text-indigo-400 font-bold">LOCKED 📌</span> : null}
                </span>
                <span className="font-bold text-white truncate block">{trustedLocation.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isLocationUnreliable
                    ? '⚠️ Остання підтверджена позиція'
                    : isLocationLocked
                    ? '📌 Зафіксовано користувачем'
                    : `GPS ±${Math.round(trustedLocation.accuracyMeters)}м`}
                </span>
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
                <span className="text-[10px] text-slate-400 block font-mono">🛡️ ГОЛОСОВИЙ РЕЖИМ</span>
                <span className="font-bold text-white block">
                  {audioEnabled ? '🔊 Голос диктора (Ajax)' : '🔇 Тихий режим'}
                </span>
                <span className={'text-[10px] font-mono ' + (audioEnabled ? 'text-blue-400' : 'text-amber-400')}>
                  {audioEnabled ? 'Оголошення активне' : 'Без звуку'}
                </span>
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
                  <span>ВАЛІДАЦІЯ СИГНАЛУ GPS ТА ЗАПУСК...</span>
                </>
              ) : (
                <>
                  <Radio className="w-6 h-6" />
                  <span>АКТИВУВАТИ ЗАХИСТ</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleDeactivate}
                className="flex-1 py-4 px-4 rounded-2xl bg-[#161e2e] hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm tracking-wide border border-slate-700/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>ЗУПИНИТИ МОНІТОРИНГ</span>
              </button>

              {!isLocationLocked ? (
                <button
                  onClick={handleLockLocation}
                  className="py-4 px-4 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-200 font-bold text-xs border border-indigo-700/70 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                  title="Зафіксувати точку, щоб GPS не зміщував зону"
                >
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>ЗАФІКСУВАТИ</span>
                </button>
              ) : (
                <button
                  onClick={handleSwitchToAutoGps}
                  className="py-4 px-4 rounded-2xl bg-blue-950/80 hover:bg-blue-900/80 text-blue-200 font-bold text-xs border border-blue-700/70 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                  title="Повернутися до авто-GPS"
                >
                  <Unlock className="w-4 h-4 text-blue-400" />
                  <span>АВТО-GPS</span>
                </button>
              )}
            </div>
          )}

          {/* REAL PUSH TEST BUTTON */}
          <button
            onClick={startEmergencyPushTest}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#121926] hover:bg-[#1a2436] text-amber-300 hover:text-amber-200 font-bold text-xs tracking-wide border border-amber-500/40 flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>ПЕРЕВІРИТИ ГОЛОС НА ЗАМКНЕНОМУ ЕКРАНІ (5С)</span>
          </button>
        </div>

        {/* INTERACTIVE SAFETY MAP */}
        {trustedLocation && (
          <div className="mb-4">
            <SafetyMap
              userLocation={trustedLocation}
              radiusKm={radiusKm}
              threats={radarThreats}
              officialAlerts={officialAlerts}
              isUserUnderOfficialAlert={isUnderOfficialAlert}
              selectedThreat={selectedThreat}
              onSelectThreat={setSelectedThreat}
              onSelectMapLocation={(lat, lng) => handleSelectManualLocation(lat, lng)}
              isActive={isActive}
              isRed={isRed}
              isOrange={isOrange}
            />
          </div>
        )}

        {/* ACTIVE THREATS & OBSERVATIONS LIST */}
        {radarThreats.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Виявлені цілі та спостереження ({radarThreats.length})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Фільтр: до 75 км</span>
            </div>

            <div className="space-y-2">
              {radarThreats.map((threat) => {
                const isDirectThreat = threat.eventType === 'CONFIRMED_THREAT' || (threat.distanceKm !== null && threat.distanceKm <= radiusKm);
                const isSelected = selectedThreat?.id === threat.id;

                return (
                  <div
                    key={threat.id}
                    onClick={() => setSelectedThreat(isSelected ? null : threat)}
                    className={'p-3 rounded-2xl border transition-all cursor-pointer shadow-md ' + (
                      isSelected
                        ? isDirectThreat
                          ? 'bg-red-950/90 border-red-500 ring-1 ring-red-400'
                          : 'bg-amber-950/90 border-amber-500 ring-1 ring-amber-400'
                        : isDirectThreat
                        ? 'bg-[#180808] hover:bg-[#220c0c] border-red-900/80 text-red-100'
                        : 'bg-[#141208] hover:bg-[#1f1b0c] border-amber-900/60 text-amber-100'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={'text-xs p-1.5 rounded-xl shrink-0 ' + (
                          isDirectThreat ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        )}>
                          {isDirectThreat ? '🔴' : '👁️'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-white truncate">
                              {threat.categoryNameUk}
                            </span>
                            <span className={'text-[9px] font-mono px-1.5 py-0.2 rounded border ' + (
                              isDirectThreat
                                ? 'bg-red-950 text-red-300 border-red-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            )}>
                              {isDirectThreat ? 'ПРЯМА ЗАГРОЗА' : 'СПОСТЕРЕЖЕННЯ'}
                            </span>
                            {threat.bearingSectorUk && (
                              <span className="text-[9px] font-mono text-slate-400">
                                • {threat.bearingSectorUk}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 truncate mt-0.5">
                            📍 <strong>{threat.detectedLocation}</strong> ({threat.honestDistanceText})
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {threat.timestamp ? new Date(threat.timestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <span className="text-[9px] text-slate-500 truncate block max-w-[90px]">
                          {threat.sourceTitle}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] bg-black/40 p-2 rounded-xl text-slate-300 font-mono line-clamp-2 border border-white/5">
                      "{threat.rawText}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTORY THREATS (STALE / CLEARED) */}
        {historyThreats.length > 0 && (
          <details className="mb-4 bg-[#0a0e17] rounded-2xl border border-slate-800 p-3 text-xs">
            <summary className="font-mono text-slate-400 uppercase tracking-wider cursor-pointer flex items-center justify-between select-none">
              <span>📜 Історія цілей (застарілі / відбій) ({historyThreats.length})</span>
              <span className="text-[10px] text-slate-500">розгорнути</span>
            </summary>
            <div className="mt-2.5 space-y-2">
              {historyThreats.map((threat) => (
                <div key={threat.id} className="p-2.5 rounded-xl bg-black/30 border border-slate-800/80 flex items-center justify-between text-slate-300">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-xs block truncate text-slate-200">{threat.categoryNameUk}</span>
                    <span className="text-[10px] text-slate-400 block truncate">📍 {threat.detectedLocation} ({threat.statusBadgeUk})</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">{threat.ageMinutes} хв тому</span>
                </div>
              ))}
            </div>
          </details>
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
              {/* LIVE DIAGNOSTICS & TELEMETRY */}
              <div className="p-3 bg-[#0d1422] rounded-xl border border-blue-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-blue-300 font-bold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Діагностика парсингу та Ingestion</span>
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    LIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-mono">📡 ОСТАННЄ TG ПОВІДОМЛЕННЯ</span>
                    <span className="font-mono font-bold text-white">
                      {evaluation?.lastTelegramMessageIso
                        ? new Date(evaluation.lastTelegramMessageIso).toLocaleTimeString('uk-UA')
                        : 'Очікування даних'}
                    </span>
                  </div>
                  <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-mono">🔴 ПРЯМІ ЗАГРОЗИ В СЕКТОРІ</span>
                    <span className="font-mono font-bold text-red-400">
                      {evaluation?.threatsCount ?? 0}
                    </span>
                  </div>
                  <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-mono">👁️ СПОСТЕРЕЖЕННЯ В РЕГІОНІ</span>
                    <span className="font-mono font-bold text-amber-300">
                      {(evaluation?.observationsCount ?? 0) + (evaluation?.outsideZoneObservationsCount ?? 0)}
                    </span>
                  </div>
                  <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-mono">🚫 ВІДХИЛЕНО ПОВІДОМЛЕНЬ</span>
                    <span className="font-mono font-bold text-slate-300">
                      {evaluation?.rejectedCount ?? 0}
                    </span>
                  </div>
                  <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-mono">❓ НЕРОЗПІЗНАНА ГЕОГРАФІЯ</span>
                    <span className="font-mono font-bold text-amber-400">
                      {evaluation?.geoUnresolvedCount ?? 0}
                    </span>
                  </div>
                  <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block font-mono">📡 АКТИВНІ КАНАЛИ</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {sourcesHealth?.telegramOkCount ?? 0} / {sourcesHealth?.telegramSourcesTotal ?? allSources.length}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowRejectedModal(true)}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Переглянути відхилені повідомлення ({evaluation?.rejectedMessagesLog?.length ?? 0})</span>
                </button>
              </div>

              {/* AUDIO & VOICE DIAGNOSTICS */}
              <div className="p-3 bg-[#101726] rounded-xl border border-blue-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-blue-300 font-bold block flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Голосове сповіщення (Режим Ajax)</span>
                  </span>
                  <button
                    onClick={() => handleToggleAudio()}
                    className={'px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ' + (
                      audioEnabled
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    )}
                  >
                    {audioEnabled ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {audioEnabled
                    ? 'При загрозі пролунає чітке голосове сповіщення диктора українською мовою без штучних сигналів сирен.'
                    : 'Тихий режим. Голосові сповіщення вимкнено.'}
                </p>
                <div className="pt-1">
                  <button
                    onClick={handleManualVoiceTest}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-md"
                  >
                    Прослухати голос диктора 🔊
                  </button>
                </div>
              </div>

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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 font-semibold">Резервний вибір міста:</span>
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="text-[10px] text-cyan-400 font-bold underline"
                  >
                    Більше міст (800+)
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {CITY_PRESETS.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => handleSelectManualLocation(city.lat, city.lng, city.name, city.oblast)}
                      className={'p-2 rounded-xl text-left text-[11px] border truncate ' + (trustedLocation?.name === city.name ? 'bg-blue-900/50 border-blue-400 text-blue-200 font-bold' : 'bg-[#111726] border-slate-800 text-slate-300 hover:bg-slate-800')}
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
                <div className="max-h-48 overflow-y-auto space-y-1 text-[11px] pr-1">
                  {allSources.slice(0, 35).map((s) => {
                    const st = sourceStatuses[s.username];
                    const isOk = st ? st.ok : true;
                    return (
                      <div key={s.username} className="flex items-center justify-between p-2 rounded bg-[#070a10] border border-slate-800">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className={'w-2 h-2 rounded-full shrink-0 ' + (isOk ? 'bg-emerald-400' : 'bg-red-500')} />
                            <span className="text-slate-200 font-semibold truncate">@{s.username}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{s.title}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={'text-[9px] font-mono ' + (isOk ? 'text-emerald-400' : 'text-red-400')}>
                            {isOk ? 'АКТИВНИЙ' : 'ПОМИЛКА'}
                          </span>
                          {st?.lastMessageTimeIso && (
                            <span className="text-[9px] font-mono text-slate-500 block">
                              {new Date(st.lastMessageTimeIso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* LOCATION SELECTION & SEARCH MODAL */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 modal-safe">
          <div className="bg-[#0f1522] border border-cyan-500/50 rounded-3xl max-w-md w-full p-5 text-slate-200 text-xs space-y-3.5 shadow-2xl animate-fadeIn max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Вибір локації для захисту</h3>
              </div>
              <button onClick={() => setShowLocationModal(false)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed shrink-0">
              Оберіть населений пункт зі списку, знайдіть у пошуку або торкніться карти нижче.
            </p>

            {/* SEARCH INPUT */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                placeholder="Пошук (напр. Бориспіль, Оболонь, Полтава...)"
                className="w-full bg-[#070a10] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-sans focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* RESULTS LIST */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[140px]">
              <span className="text-[10px] text-slate-400 font-mono block uppercase">Населені пункти та райони ({filteredGazetteer.length}):</span>
              {filteredGazetteer.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => handleSelectManualLocation(loc.lat, loc.lng, loc.name, loc.oblast)}
                  className="w-full p-2.5 rounded-xl bg-[#080d16] hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between transition-all group"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-white group-hover:text-cyan-300 truncate">{loc.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{loc.oblast} • {loc.type}</p>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-400 shrink-0">Обрати →</span>
                </button>
              ))}
            </div>

            {/* QUICK AUTO GPS OPTION */}
            <div className="pt-2 border-t border-slate-800 shrink-0 flex gap-2">
              <button
                onClick={() => {
                  handleSwitchToAutoGps();
                  setShowLocationModal(false);
                }}
                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Увімкнути Авто-GPS</span>
              </button>
              <button
                onClick={() => setShowLocationModal(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMERGENCY PUSH TEST COUNTDOWN MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 modal-safe">
          <div className="bg-[#0f1522] border border-amber-500/60 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
              <Bell className="w-7 h-7 animate-bounce" />
            </div>

            <div>
              <h3 className="font-black text-lg text-white">ТЕСТУВАННЯ ГОЛОСУ НА ЕКРАНІ БЛОКУВАННЯ</h3>
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
                  Сповіщення з голосом надійде через {testCountdown}с
                </p>
              </div>
            ) : (
              <div className="py-2 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>СПОВІЩЕННЯ НАДІСЛАНО</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {audioEnabled ? 'Голосове сповіщення надіслано на заблокований екран.' : 'Сповіщення надіслано (Тихий режим).'}
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
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 modal-safe">
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

      {/* REJECTED MESSAGES AUDIT MODAL */}
      {showRejectedModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 modal-safe">
          <div className="bg-[#0f1522] border border-slate-700 rounded-3xl max-w-lg w-full p-5 text-slate-200 text-xs space-y-3.5 shadow-2xl animate-fadeIn max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Журнал відхилених повідомлень</h3>
              </div>
              <button onClick={() => setShowRejectedModal(false)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed shrink-0">
              Повідомлення, отримані з Telegram-каналів, які система проаналізувала та прозоро відхилила з вказанням причини.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
              {(!evaluation?.rejectedMessagesLog || evaluation.rejectedMessagesLog.length === 0) ? (
                <div className="text-center py-8 text-slate-500 font-mono text-xs">
                  Відхилених повідомлень наразі немає.
                </div>
              ) : (
                evaluation.rejectedMessagesLog.map((item) => {
                  let reasonBadgeClass = 'bg-slate-900 text-slate-300 border-slate-700';
                  if (item.reason === 'no_geo') reasonBadgeClass = 'bg-amber-950 text-amber-300 border-amber-800';
                  else if (item.reason === 'outside_range') reasonBadgeClass = 'bg-blue-950 text-blue-300 border-blue-800';
                  else if (item.reason === 'duplicate' || item.reason === 'stale') reasonBadgeClass = 'bg-slate-900 text-slate-400 border-slate-800';
                  else if (item.reason === 'all_clear') reasonBadgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-800';

                  return (
                    <div key={item.id} className="p-3 rounded-xl bg-[#080d16] border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-200 text-xs">@{item.channel}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={'text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ' + reasonBadgeClass}>
                            {item.reasonUk}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {item.timeIso ? new Date(item.timeIso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] font-mono text-slate-300 bg-black/50 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                        "{item.text}"
                      </p>

                      <p className="text-[10px] text-slate-400 italic">
                        Причина: {item.detailsUk}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setShowRejectedModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
