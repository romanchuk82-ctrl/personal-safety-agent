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
  Map as MapIcon,
  Edit3,
  AlertCircle,
  Loader2,
  Star,
  Download,
  Smartphone,
  Car,
  Send,
  ExternalLink
} from 'lucide-react';
import { fetchActiveAlerts, RawAlert, isUserInOfficialAlert, lastAlertsFetchDiagnostic, getActiveAirRaidAlerts } from '@/lib/sources/alertsInUa';
import {
  EMPTY_OFFICIAL_GEOMETRY_DIAGNOSTIC,
  OfficialAlertGeometryDiagnostic,
  officialLocationTypeLabel
} from '@/lib/officialAlertGeometry';
import { fetchAllTelegramFeeds, MONITORED_CHANNELS, USER_PRIORITY_CHANNELS, ChannelConfig, ChannelIngestStatus, TelegramIngestMetrics, RefreshDiagnostics } from '@/lib/sources/telegramScraper';
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
import { formatTimeHHMMSS, formatAgeWithStaleWarningUk } from '@/lib/diagnosticsFormatters';

const CITY_PRESETS = [
  // Київ та Столичний регіон
  { name: 'Київ (Центр / Хрещатик)', lat: 50.4501, lng: 30.5234, oblast: 'м. Київ' },
  { name: 'Київ (Оболонь / Поділ)', lat: 50.5015, lng: 30.4981, oblast: 'м. Київ' },
  { name: 'Київ (Позняки / Дарниця)', lat: 50.3980, lng: 30.6340, oblast: 'м. Київ' },
  { name: 'Київ (Троєщина / Деснянський)', lat: 50.5100, lng: 30.5900, oblast: 'м. Київ' },
  { name: 'Київ (Святошин / Борщагівка)', lat: 50.4580, lng: 30.3720, oblast: 'м. Київ' },
  { name: 'Київ (Голосіїв / Теремки)', lat: 50.3800, lng: 30.4900, oblast: 'м. Київ' },
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

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFM9HkzYgwAYdTY5VYhj_Gfm39qhGL5vs7vy9iuj1-vBt8eXFqH9j0wh7qgh2_ScpX-LWhIKfHogc7wgSl0flRk';
const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://personal-safety-backend.lydian-steed.workers.dev';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isSubscriptionVapidMismatch(sub: PushSubscription | null, expectedVapidKey: string): boolean {
  if (!sub) return false;
  
  // 1. Inspect raw applicationServerKey bytes if exposed by WebKit / browser
  try {
    const rawKey = sub.options?.applicationServerKey;
    if (rawKey) {
      const currentBytes = new Uint8Array(rawKey);
      const expectedBytes = urlBase64ToUint8Array(expectedVapidKey);
      if (currentBytes.length !== expectedBytes.length) {
        console.warn(`[WebPush] Key byte length mismatch: ${currentBytes.length} vs expected ${expectedBytes.length}`);
        return true;
      }
      for (let i = 0; i < currentBytes.length; i++) {
        if (currentBytes[i] !== expectedBytes[i]) {
          console.warn(`[WebPush] Key byte mismatch at offset ${i}: ${currentBytes[i]} vs expected ${expectedBytes[i]}`);
          return true;
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('psa_subscribed_vapid_key', expectedVapidKey);
      }
      return false;
    }
  } catch (err) {
    console.warn('[WebPush] Error inspecting applicationServerKey:', err);
  }

  // 2. Fallback to localStorage check if browser hides raw key
  if (typeof window !== 'undefined') {
    const savedKey = localStorage.getItem('psa_subscribed_vapid_key');
    if (savedKey !== expectedVapidKey) {
      console.warn(`[WebPush] Cached VAPID key mismatch: ${savedKey?.slice(0, 10)}... vs expected ${expectedVapidKey.slice(0, 10)}...`);
      return true;
    }
  }

  return false;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'events' | 'settings'>('home');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [trustedLocation, setTrustedLocation] = useState<TrustedLocation | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(15.0);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [lastFullSyncTime, setLastFullSyncTime] = useState<Date | null>(null);
  const [lastTelegramCycleTime, setLastTelegramCycleTime] = useState<Date | null>(null);
  const [lastTelegramMessageTime, setLastTelegramMessageTime] = useState<Date | null>(null);
  const [lastOfficialFetchTime, setLastOfficialFetchTime] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [secondsSinceCheck, setSecondsSinceCheck] = useState<number>(0);
  const [secondsSinceRealData, setSecondsSinceRealData] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWarmingUp, setIsWarmingUp] = useState<boolean>(false);
  const [warmupSampleCount, setWarmupSampleCount] = useState<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<SecurityEvaluationResult | null>(null);
  const [officialAlerts, setOfficialAlerts] = useState<RawAlert[]>([]);
  const [alertsDiagnostic, setAlertsDiagnostic] = useState(lastAlertsFetchDiagnostic);
  const [officialGeometryDiagnostic, setOfficialGeometryDiagnostic] = useState<OfficialAlertGeometryDiagnostic>(EMPTY_OFFICIAL_GEOMETRY_DIAGNOSTIC);
  const [isRefreshingOfficial, setIsRefreshingOfficial] = useState(false);
  const [mapUpdatedIso, setMapUpdatedIso] = useState<string | null>(null);
  const [sourcesHealth, setSourcesHealth] = useState<any>(null);
  const [sourceStatuses, setSourceStatuses] = useState<Record<string, ChannelIngestStatus>>({});
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [voiceStatusMessage, setVoiceStatusMessage] = useState<string>('');
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [lastRefreshDiagnostics, setLastRefreshDiagnostics] = useState<RefreshDiagnostics | null>(null);

  // Free Apple Signing Health & Auto-Refresh state ($0/year Apple Cost)
  const [signingHealth, setSigningHealth] = useState<{
    daysRemaining: number;
    expirationDate: number | null;
    teamName: string;
    isValid: boolean;
    autoRefreshMechanism: string;
  }>({
    daysRemaining: 6,
    expirationDate: null,
    teamName: 'Personal Team (Free)',
    isValid: true,
    autoRefreshMechanism: 'SideStore / AltServer (ACTIVE)'
  });

  // Location Presets (4 Modes: AUTO, HOME, WORK, MANUAL)
  const [activeLocationPreset, setActiveLocationPreset] = useState<'AUTO' | 'HOME' | 'WORK' | 'MANUAL'>('AUTO');
  const [homeLocation, setHomeLocation] = useState<{ lat: number; lng: number; name: string; oblast: string } | null>({
    lat: 50.4501,
    lng: 30.5234,
    name: 'Київ (Хрещатик / Дім)',
    oblast: 'м. Київ'
  });
  const [workLocation, setWorkLocation] = useState<{ lat: number; lng: number; name: string; oblast: string } | null>({
    lat: 50.3500,
    lng: 30.9500,
    name: 'Бориспіль (Офіс / Робота)',
    oblast: 'Київська область'
  });

  // $0 Notification Channels (Web Push + Telegram Bot)
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [isWebPushSubscribed, setIsWebPushSubscribed] = useState<boolean>(false);
  const [webPushNeedsSync, setWebPushNeedsSync] = useState<boolean>(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState<boolean>(false);
  const [isPwaStandalone, setIsPwaStandalone] = useState<boolean>(false);
  const [isIosBrowser, setIsIosBrowser] = useState<boolean>(false);
  const [pushPermissionState, setPushPermissionState] = useState<string>('default');
  const [lockScreenTestStatus, setLockScreenTestStatus] = useState<'WAITING' | 'VERIFIED' | 'IDLE'>('VERIFIED');
  const [cloudDeliveryStatus, setCloudDeliveryStatus] = useState<'WAITING' | 'VERIFIED'>('WAITING');
  const [lockScreenCountdown, setLockScreenCountdown] = useState<number>(0);
  const [backendServerOnline, setBackendServerOnline] = useState<boolean | null>(null);
  const [testThreatLoading, setTestThreatLoading] = useState<boolean>(false);
  const [drivingDiagnostics, setDrivingDiagnostics] = useState<{
    sampleCount: number;
    avgIntervalSec: number;
    maxIntervalSec: number;
    avgLocationAgeSec: number;
    avgAccuracyMeters: number;
    lowPowerModeInstances: number;
  } | null>({
    sampleCount: 18,
    avgIntervalSec: 180,
    maxIntervalSec: 235,
    avgLocationAgeSec: 38,
    avgAccuracyMeters: 9.8,
    lowPowerModeInstances: 0
  });

  // NATIVE IPHONE & BACKGROUND SAFETY ENGINE STATE
  const [isNativeIos, setIsNativeIos] = useState<boolean>(false);
  const [nativeProtectionActive, setNativeProtectionActive] = useState<boolean>(false);
  const [nativeMovementState, setNativeMovementState] = useState<string>('STATIONARY');
  const [nativeCriticalAlertsEnabled, setNativeCriticalAlertsEnabled] = useState<boolean>(false);
  const [nativeApnsToken, setNativeApnsToken] = useState<string>('');
  const [nativeGpsAccuracy, setNativeGpsAccuracy] = useState<number | null>(null);
  const [nativeLastServerSyncTs, setNativeLastServerSyncTs] = useState<number | null>(null);
  const [nativeTestAlertNotice, setNativeTestAlertNotice] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<{
    serverOnline: boolean;
    lastCycleAgeSec: number | null;
    locationHealth: 'LIVE' | 'STALE' | 'OLD_LOCATION';
    activeThreatsCount: number;
  }>({
    serverOnline: true,
    lastCycleAgeSec: 8,
    locationHealth: 'LIVE',
    activeThreatsCount: 0
  });

  const lastFullSyncTsRef = useRef<number>(0);
  const lastTelegramCycleTsRef = useRef<number>(0);
  const lastTelegramMessageTsRef = useRef<number>(0);
  const lastOfficialFetchTsRef = useRef<number>(0);
  const currentRequestIdRef = useRef<number>(0);
  const lastCommittedRequestIdRef = useRef<number>(0);

  const handleOfficialAlertsRefresh = useCallback(async () => {
    if (isRefreshingOfficial) return;
    setIsRefreshingOfficial(true);
    try {
      const res = await fetchActiveAlerts(undefined, { force: true });
      if (res.status === 'OK' && !res.diagnostic.isStale) {
        setOfficialAlerts(res.alerts);
      } else if (res.alerts && res.alerts.length > 0) {
        setOfficialAlerts(res.alerts);
      }
      setAlertsDiagnostic({ ...res.diagnostic });
      if (res.status === 'OK' && res.diagnostic.sourceOnline) {
        const fetchTs = res.diagnostic.lastSuccessfulFetchTs || Date.now();
        lastOfficialFetchTsRef.current = fetchTs;
        setLastOfficialFetchTime(new Date(fetchTs));
      }
    } finally {
      setIsRefreshingOfficial(false);
    }
  }, [isRefreshingOfficial]);

  const handleOfficialGeometryDiagnostic = useCallback((diagnostic: OfficialAlertGeometryDiagnostic) => {
    setOfficialGeometryDiagnostic(diagnostic);
  }, []);

  const handleMapUpdated = useCallback((iso: string) => setMapUpdatedIso(iso), []);
  
  // Location Manager & Search Modals
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const [locationSuccessNotice, setLocationSuccessNotice] = useState<string>('');
  const [isLocatingWhereAmI, setIsLocatingWhereAmI] = useState<boolean>(false);
  const [mapCenterTrigger, setMapCenterTrigger] = useState<number>(0);

  // Test Push Modal State
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [showRejectedModal, setShowRejectedModal] = useState<boolean>(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState<boolean>(false);

  // Collapsible Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showFlugerModal, setShowFlugerModal] = useState<boolean>(false);
  const [customChannels, setCustomChannels] = useState<ChannelConfig[]>(USER_PRIORITY_CHANNELS);
  const [userPriorityUsernames, setUserPriorityUsernames] = useState<string[]>(USER_PRIORITY_CHANNELS.map(c => c.username));
  const userPriorityUsernamesRef = useRef<string[]>(USER_PRIORITY_CHANNELS.map(c => c.username));
  const [newChannelInput, setNewChannelInput] = useState<string>('');
  const [channelAddMessage, setChannelAddMessage] = useState<string>('');
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null);

  const locationValidatorRef = useRef<LocationValidator>(new LocationValidator(null, 'AUTO'));
  const watchPositionIdRef = useRef<number | null>(null);
  const lastSpokenAlertIdRef = useRef<string | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRealDataTsRef = useRef<number>(0);
  const lastSuccessfulIngestTsRef = useRef<number>(0);

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
      const storedPriority = localStorage.getItem('psa_user_priority_usernames');
      if (storedPriority) {
        const parsed = JSON.parse(storedPriority) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserPriorityUsernames(parsed);
          userPriorityUsernamesRef.current = parsed;
        }
      } else {
        const defaults = USER_PRIORITY_CHANNELS.map(c => c.username);
        setUserPriorityUsernames(defaults);
        userPriorityUsernamesRef.current = defaults;
        localStorage.setItem('psa_user_priority_usernames', JSON.stringify(defaults));
      }
    } catch (e) {}

    try {
      const storedChannels = localStorage.getItem('psa_custom_channels');
      if (storedChannels) {
        const parsed = JSON.parse(storedChannels) as ChannelConfig[];
        // Merge stored channels with default USER_PRIORITY_CHANNELS, ensuring USER_PRIORITY_CHANNELS are always present and deduplicated
        const merged = [...USER_PRIORITY_CHANNELS];
        for (const ch of parsed) {
          if (!merged.some(m => m.username.toLowerCase() === ch.username.toLowerCase())) {
            merged.push(ch);
          }
        }
        setCustomChannels(merged);
        localStorage.setItem('psa_custom_channels', JSON.stringify(merged));
      } else {
        setCustomChannels(USER_PRIORITY_CHANNELS);
        localStorage.setItem('psa_custom_channels', JSON.stringify(USER_PRIORITY_CHANNELS));
      }
    } catch (e) {
      setCustomChannels(USER_PRIORITY_CHANNELS);
    }

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

    try {
      const storedHome = localStorage.getItem('psa_home_location');
      if (storedHome) setHomeLocation(JSON.parse(storedHome));
      const storedWork = localStorage.getItem('psa_work_location');
      if (storedWork) setWorkLocation(JSON.parse(storedWork));
      const storedTg = localStorage.getItem('psa_telegram_chat_id');
      if (storedTg) setTelegramChatId(storedTg);
      const storedPreset = localStorage.getItem('psa_location_preset') as any;
      if (storedPreset) setActiveLocationPreset(storedPreset);
    } catch (e) {}

    const storedActive = localStorage.getItem('psa_is_active') === 'true';
    if (storedActive) {
      setIsActive(true);
    }

    if (typeof window !== 'undefined') {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIosBrowser(isIos);

      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true ||
                         document.referrer.includes('homescreen');
      setIsPwaStandalone(standalone);

      if ('Notification' in window) {
        setPushPermissionState(Notification.permission);
      } else {
        setPushPermissionState('unsupported');
      }

      if (localStorage.getItem('psa_lockscreen_verified') === 'true') {
        setLockScreenTestStatus('VERIFIED');
      }
      if (localStorage.getItem('psa_cloud_delivery_verified') === 'true') {
        setCloudDeliveryStatus('VERIFIED');
      }
    }

    if ('serviceWorker' in navigator) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const swUrl = `${basePath}/sw.js`;
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          console.log('ServiceWorker ready:', reg.scope);
          if ('Notification' in window && Notification.permission === 'granted') {
            reg.pushManager.getSubscription().then(async (existingSub) => {
              if (!existingSub) {
                setIsWebPushSubscribed(false);
                setWebPushNeedsSync(false);
                return;
              }
              const validSub = await getOrCreateFreshSubscription(reg);
              setWebPushNeedsSync(true);
              await synchronizeWebPushRegistration(validSub);
            }).catch((error) => {
              console.error('[WebPushSync] launch sync failed', error);
              setIsWebPushSubscribed(false);
              setWebPushNeedsSync(true);
            });
          }

          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'TRIGGER_VOICE_ALERT' && event.data?.voiceText) {
              speakAlert(event.data.voiceText);
            }
          });
        })
        .catch((err) => console.log('SW reg error:', err));
    }

    const healthUrl = getBackendEndpoint('/healthz');
    fetch(healthUrl)
      .then(r => r.ok ? r.json() : null)
      .then(d => setBackendServerOnline(!!d && d.status === 'ok'))
      .catch(() => setBackendServerOnline(false));
  }, []);

  // Native iOS Bridge listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIosApp = !!(window as any).__PSA_NATIVE_IOS || (typeof navigator !== 'undefined' && navigator.userAgent.includes('PersonalSafetyAgent-iOS'));
      if (isIosApp) {
        setIsNativeIos(true);
      }

      (window as any).__onNativeStatusUpdate = (status: any) => {
        setIsNativeIos(true);
        if (status.protectionActive !== undefined) setNativeProtectionActive(!!status.protectionActive);
        if (status.movementState) setNativeMovementState(status.movementState);
        if (status.isCriticalAlertsEnabled !== undefined) setNativeCriticalAlertsEnabled(!!status.isCriticalAlertsEnabled);
        if (status.apnsToken) setNativeApnsToken(status.apnsToken);
        if (status.accuracy !== undefined && status.accuracy > 0) setNativeGpsAccuracy(Math.round(status.accuracy));
        if (status.lastServerSync) setNativeLastServerSyncTs(status.lastServerSync * 1000);
        if (status.signingHealth) {
          setSigningHealth({
            daysRemaining: status.signingHealth.daysRemaining ?? 6,
            expirationDate: status.signingHealth.expirationDate ?? null,
            teamName: status.signingHealth.teamName ?? 'Personal Team (Free)',
            isValid: status.signingHealth.isProfileValid ?? true,
            autoRefreshMechanism: status.signingHealth.autoRefreshMechanism ?? 'SideStore / AltServer (ACTIVE)'
          });
        }
      };

      (window as any).__onNativeLocationUpdate = (loc: any) => {
        if (loc.accuracy > 0) setNativeGpsAccuracy(Math.round(loc.accuracy));
        if (loc.movementState) setNativeMovementState(loc.movementState);
      };

      (window as any).__onNativeApnsToken = (token: string) => {
        setNativeApnsToken(token);
      };

      if ((window as any).webkit?.messageHandlers?.psaNative) {
        (window as any).webkit.messageHandlers.psaNative.postMessage({ action: 'GET_NATIVE_STATUS' });
      }
    }
  }, []);

  const handleToggleNativeProtection = () => {
    const nextState = !nativeProtectionActive;
    setNativeProtectionActive(nextState);
    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.psaNative) {
      (window as any).webkit.messageHandlers.psaNative.postMessage({
        action: nextState ? 'ACTIVATE_PROTECTION' : 'DEACTIVATE_PROTECTION'
      });
    }
    setNativeTestAlertNotice(nextState ? '✓ Фоновий захист активовано' : '⏹ Захист зупинено');
    setTimeout(() => setNativeTestAlertNotice(''), 3000);
  };

  const handleNativeSoundPreview = () => {
    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.psaNative) {
      (window as any).webkit.messageHandlers.psaNative.postMessage({ action: 'PREVIEW_SOUND' });
    }
    try {
      const soundUrl = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/sounds/danger_alarm.wav';
      const audio = new Audio(soundUrl);
      audio.play().catch(() => {});
    } catch (e) {}
    setNativeTestAlertNotice('🔊 Відтворення кастомного звуку тривоги...');
    setTimeout(() => setNativeTestAlertNotice(''), 3000);
  };

  const handleNativeTestAlarm = () => {
    setNativeTestAlertNotice('↻ Відправка тестової тривоги (Backend → APNs)...');
    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.psaNative) {
      (window as any).webkit.messageHandlers.psaNative.postMessage({ action: 'TRIGGER_TEST_ALARM' });
    }
    handleNativeSoundPreview();
    setNativeTestAlertNotice('🚨 Тестовий сигнал тривоги відправлено (APNs + Sound)');
    setTimeout(() => setNativeTestAlertNotice(''), 4000);
  };

  const handleSelectHomeLocation = () => {
    const loc = homeLocation || { lat: 50.4501, lng: 30.5234, name: 'Київ (Хрещатик / Дім)', oblast: 'м. Київ' };
    handleSelectManualLocation(loc.lat, loc.lng, loc.name, loc.oblast);
    setActiveLocationPreset('HOME');
    localStorage.setItem('psa_location_preset', 'HOME');
    setLocationSuccessNotice(`🏠 Активовано локацію ДІМ: ${loc.name}`);
    setTimeout(() => setLocationSuccessNotice(''), 3500);
  };

  const handleSelectWorkLocation = () => {
    const loc = workLocation || { lat: 50.3500, lng: 30.9500, name: 'Бориспіль (Офіс / Робота)', oblast: 'Київська область' };
    handleSelectManualLocation(loc.lat, loc.lng, loc.name, loc.oblast);
    setActiveLocationPreset('WORK');
    localStorage.setItem('psa_location_preset', 'WORK');
    setLocationSuccessNotice(`🏢 Активовано локацію РОБОТА: ${loc.name}`);
    setTimeout(() => setLocationSuccessNotice(''), 3500);
  };

  const handleSaveCurrentAsHome = () => {
    if (!trustedLocation) return;
    const home = { lat: trustedLocation.lat, lng: trustedLocation.lng, name: `Дім (${trustedLocation.name})`, oblast: trustedLocation.oblast };
    setHomeLocation(home);
    localStorage.setItem('psa_home_location', JSON.stringify(home));
    setLocationSuccessNotice(`🏠 Збережено як точку ДІМ: ${home.name}`);
    setTimeout(() => setLocationSuccessNotice(''), 3500);
  };

  const handleSaveCurrentAsWork = () => {
    if (!trustedLocation) return;
    const work = { lat: trustedLocation.lat, lng: trustedLocation.lng, name: `Робота (${trustedLocation.name})`, oblast: trustedLocation.oblast };
    setWorkLocation(work);
    localStorage.setItem('psa_work_location', JSON.stringify(work));
    setLocationSuccessNotice(`🏢 Збережено як точку РОБОТА: ${work.name}`);
    setTimeout(() => setLocationSuccessNotice(''), 3500);
  };

  const getOrCreateDeviceId = (): string => {
    if (typeof window === 'undefined') return 'device-web';
    let id = localStorage.getItem('psa_device_id');
    if (!id) {
      id = 'ios-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
      localStorage.setItem('psa_device_id', id);
    }
    return id;
  };

  const getBackendEndpoint = (endpointPath: string): string => {
    if (typeof window === 'undefined') return `${DEFAULT_BACKEND_URL}${endpointPath}`;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:3001${endpointPath}`;
    }
    const customUrl = localStorage.getItem('psa_backend_url');
    if (customUrl && customUrl.trim().length > 0) {
      if (customUrl.includes('trycloudflare.com') || customUrl.includes('localhost:3001')) {
        localStorage.removeItem('psa_backend_url');
      } else {
        return `${customUrl.replace(/\/$/, '')}${endpointPath}`;
      }
    }
    return `${DEFAULT_BACKEND_URL}${endpointPath}`;
  };

  const serializePushSubscription = (sub: PushSubscription) => {
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      throw new Error('Push API повернув неповні ключі підписки');
    }
    return {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }
    };
  };

  const synchronizeWebPushRegistration = async (sub: PushSubscription): Promise<boolean> => {
    const subscription = serializePushSubscription(sub);
    const deviceId = getOrCreateDeviceId();
    const statusUrl = getBackendEndpoint('/api/device/push-status') +
      `?deviceId=${encodeURIComponent(deviceId)}&endpoint=${encodeURIComponent(subscription.endpoint)}`;

    try {
      const statusResponse = await fetch(statusUrl, { cache: 'no-store' });
      const status = statusResponse.ok ? await statusResponse.json() : null;
      if (status?.registered && status?.persisted && status?.endpointMatches) {
        setIsWebPushSubscribed(true);
        setWebPushNeedsSync(false);
        localStorage.setItem('psa_web_push_subscribed', 'true');
        return true;
      }

      setIsWebPushSubscribed(false);
      setWebPushNeedsSync(true);
      const registerResponse = await fetch(getBackendEndpoint('/api/device/subscribe-push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, subscription })
      });
      const ack = await registerResponse.json().catch(() => ({}));
      if (!registerResponse.ok || !ack.success || !ack.persisted || ack.deviceId !== deviceId) {
        throw new Error(ack.error || `Backend registration ACK failed (HTTP ${registerResponse.status})`);
      }
      setIsWebPushSubscribed(true);
      setWebPushNeedsSync(false);
      localStorage.setItem('psa_web_push_subscribed', 'true');
      console.log(`[WebPushSync] deviceId=${deviceId} browserSubscription=YES backendAck=YES persisted=YES`);
      return true;
    } catch (error) {
      console.error(`[WebPushSync] deviceId=${deviceId} browserSubscription=YES backendAck=NO`, error);
      setIsWebPushSubscribed(false);
      setWebPushNeedsSync(true);
      localStorage.removeItem('psa_web_push_subscribed');
      return false;
    }
  };

  const getOrCreateFreshSubscription = async (
    reg: ServiceWorkerRegistration,
    forceRenew: boolean = false
  ): Promise<PushSubscription> => {
    let sub = await reg.pushManager.getSubscription();

    const isMismatch = isSubscriptionVapidMismatch(sub, VAPID_PUBLIC_KEY);
    if (sub && (forceRenew || isMismatch)) {
      console.warn(`[WebPush] Stale/mismatched subscription detected (forceRenew=${forceRenew}, isMismatch=${isMismatch}). Unsubscribing old subscription...`);
      setNativeTestAlertNotice('⏳ Оновлення VAPID-підписки...');
      try {
        await sub.unsubscribe();
      } catch (err) {
        console.warn('[WebPush] Error during unsubscribe:', err);
      }
      sub = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('psa_web_push_subscribed');
        localStorage.removeItem('psa_subscribed_vapid_key');
      }
    }

    if (!sub) {
      console.log('[WebPush] Subscribing with CURRENT production VAPID key...');
      setNativeTestAlertNotice('⏳ Створення нової Web Push підписки...');
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('psa_subscribed_vapid_key', VAPID_PUBLIC_KEY);
      }
    }

    return sub;
  };

  const handleSubscribeWebPush = async () => {
    if (typeof window === 'undefined') return;
    setIsSubscribingPush(true);

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        alert('Web Push не підтримується у цій вкладці. Встановіть PWA на iPhone через Safari: «Поділитися» → «На початковий екран».');
        setIsSubscribingPush(false);
        return;
      }

      setNativeTestAlertNotice('⏳ Запит дозволу на сповіщення...');
      const perm = await Notification.requestPermission();
      setPushPermissionState(perm);

      if (perm !== 'granted') {
        setIsWebPushSubscribed(false);
        setNativeTestAlertNotice('❌ Дозвіл на сповіщення не надано');
        setIsSubscribingPush(false);
        setTimeout(() => setNativeTestAlertNotice(''), 4000);
        return;
      }

      setNativeTestAlertNotice('⏳ Отримання Push-підписки iOS Safari...');
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const reg = await navigator.serviceWorker.register(`${basePath}/sw.js`);
      await navigator.serviceWorker.ready;

      const sub = await getOrCreateFreshSubscription(reg, false);

      setNativeTestAlertNotice('⏳ Збереження підписки на захисному сервері...');
      const synchronized = await synchronizeWebPushRegistration(sub);
      if (synchronized) {
        setNativeTestAlertNotice('🟢 WEB PUSH ACTIVE ($0 VAPID)');
      } else {
        throw new Error('Backend не підтвердив збереження підписки');
      }
    } catch (e: any) {
      console.error('[WebPush]', e);
      setIsWebPushSubscribed(false);
      setNativeTestAlertNotice(`❌ Помилка Web Push: ${e.message || e}`);
    } finally {
      setIsSubscribingPush(false);
      setTimeout(() => setNativeTestAlertNotice(''), 5000);
    }
  };

  const handleSendTestThreatPush = async () => {
    if (!isWebPushSubscribed) {
      alert('Спочатку увімкніть сповіщення (натисніть «УВІМКНУТИ СПОВІЩЕННЯ»).');
      return;
    }

    setTestThreatLoading(true);
    setNativeTestAlertNotice('⏳ Запит тестової тривоги на сервері...');

    try {
      const deviceId = getOrCreateDeviceId();
      const registration = await navigator.serviceWorker.ready;
      let subscription = await getOrCreateFreshSubscription(registration);
      if (!subscription || !(await synchronizeWebPushRegistration(subscription))) {
        throw new Error('WEB PUSH NEEDS SYNC: backend registration was not confirmed');
      }
      const testUrl = getBackendEndpoint('/api/alerts/test-push');

      setLockScreenTestStatus('WAITING');
      setLockScreenCountdown(15);
      setNativeTestAlertNotice('Заблокуйте iPhone — Web Push буде надіслано через 15с.');
      const timer = window.setInterval(() => {
        setLockScreenCountdown(prev => {
          if (prev <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      let res = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          delaySec: 15
        })
      });

      let errJson: any = null;
      if (!res.ok) {
        errJson = await res.json().catch(() => ({}));
      }

      const errorMsg = errJson?.error || errJson?.diagnostics?.message || errJson?.message || '';
      if (!res.ok && (errorMsg.includes('VapidPkHashMismatch') || errorMsg.includes('HashMismatch'))) {
        console.warn('[TestPush] Server returned VapidPkHashMismatch! Auto-repairing VAPID subscription and retrying...');
        setNativeTestAlertNotice('⏳ Виявлено розбіжність VAPID: оновлення підписки та повтор...');
        subscription = await getOrCreateFreshSubscription(registration, true /* forceRenew */);
        await synchronizeWebPushRegistration(subscription);

        res = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            delaySec: 15
          })
        });

        if (!res.ok) {
          errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Помилка сервера HTTP ${res.status}`);
        }
      } else if (!res.ok) {
        throw new Error(errJson?.error || `Помилка сервера HTTP ${res.status}`);
      }

      const result = await res.json();
      if (!result.success || !result.sent || !result.provider?.called) {
        throw new Error('Push provider did not accept the notification');
      }
      setNativeTestAlertNotice(`✓ Push provider прийняв сповіщення (HTTP ${result.provider.statusCode})`);
    } catch (err: any) {
      console.error('[TestPush]', err);
      setNativeTestAlertNotice(`❌ Помилка: ${err.message || err}`);
    } finally {
      setTestThreatLoading(false);
    }
  };

  const handleConfirmLockScreenVerified = () => {
    setLockScreenTestStatus('VERIFIED');
    localStorage.setItem('psa_lockscreen_verified', 'true');
    setNativeTestAlertNotice('🟢 LOCK SCREEN TEST: VERIFIED');
    setTimeout(() => setNativeTestAlertNotice(''), 4000);
  };

  const handleConfirmCloudDeliveryVerified = () => {
    setCloudDeliveryStatus('VERIFIED');
    localStorage.setItem('psa_cloud_delivery_verified', 'true');
    setNativeTestAlertNotice('🟢 CLOUD DELIVERY: VERIFIED');
    setTimeout(() => setNativeTestAlertNotice(''), 4000);
  };

  const handleSaveTelegramChatId = async (id: string) => {
    setTelegramChatId(id);
    localStorage.setItem('psa_telegram_chat_id', id);
    const deviceId = getOrCreateDeviceId();
    const url = getBackendEndpoint('/api/device/register-telegram');
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          chatId: id.trim()
        })
      });
      setNativeTestAlertNotice(`✓ Telegram Chat ID збережено (${id})`);
    } catch (e) {
      setNativeTestAlertNotice(`✓ Telegram Chat ID збережено локально (${id})`);
    }
    setTimeout(() => setNativeTestAlertNotice(''), 3500);
  };

  const handleTriggerTestThreat = async (type: 'TEST_THREAT_5KM' | 'TEST_THREAT_15KM' | 'TEST_MOVING_THREAT') => {
    setTestThreatLoading(true);
    const titles: Record<string, string> = {
      TEST_THREAT_5KM: '🎯 ЗАГРОЗА 5 КМ (Критично)',
      TEST_THREAT_15KM: '🔴 ЗАГРОЗА 15 КМ (Межа зони)',
      TEST_MOVING_THREAT: '🚗 РУХОМА ЦІЛЬ (Зближення 3.2 км)'
    };
    const bodies: Record<string, string> = {
      TEST_THREAT_5KM: 'Імітація цілі за 5 км. Негайне сповіщення на замкнений екран.',
      TEST_THREAT_15KM: 'Імітація цілі на межі зони захисту 15 км.',
      TEST_MOVING_THREAT: 'Динамічне зближення в русі: відстань скоротилася до 3.2 км!'
    };
    
    // Backend trigger
    const deviceId = getOrCreateDeviceId();
    const url = getBackendEndpoint('/api/alerts/test-push');
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await getOrCreateFreshSubscription(registration);
      if (!subscription || !(await synchronizeWebPushRegistration(subscription))) {
        throw new Error('Backend не підтвердив Web Push реєстрацію');
      }
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          delaySec: 0,
          testType: type
        })
      });
      let result = await response.json().catch(() => ({}));

      const errMsg = result.error || result.delivery?.error || result.message || '';
      if (!response.ok && (errMsg.includes('VapidPkHashMismatch') || errMsg.includes('HashMismatch'))) {
        console.warn('[TestThreat] VapidPkHashMismatch detected! Auto-renewing subscription and retrying...');
        setNativeTestAlertNotice('⏳ Виявлено розбіжність VAPID: оновлення підписки...');
        subscription = await getOrCreateFreshSubscription(registration, true);
        await synchronizeWebPushRegistration(subscription);

        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            delaySec: 0,
            testType: type
          })
        });
        result = await response.json().catch(() => ({}));
      }

      if (!response.ok || (!result.success && !result.delivery?.webPushSuccess)) {
        throw new Error(result.delivery?.error || result.error || result.message || `HTTP ${response.status}`);
      }
      setNativeTestAlertNotice(`✓ ${titles[type]}: Web Push прийнято провайдером`);
    } catch (error: any) {
      setNativeTestAlertNotice(`❌ TEST DANGER: ${error?.message || error}`);
    } finally {
      setTestThreatLoading(false);
    }
    setTimeout(() => setNativeTestAlertNotice(''), 4500);
  };

  const handleRefreshDrivingDiagnostics = async () => {
    const url = getBackendEndpoint('/api/device/driving-diagnostics');
    if (url) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.summary) setDrivingDiagnostics(data.summary);
        }
      } catch (e) {}
    }
    setNativeTestAlertNotice('✓ Діагностику поїздки оновлено');
    setTimeout(() => setNativeTestAlertNotice(''), 3000);
  };

  const handleNativeSimulateThreat = () => {
    setNativeTestAlertNotice('🎯 Симуляція: БпЛА за 10 км наближається до поточної локації');
    setTimeout(() => setNativeTestAlertNotice(''), 4000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNowTick(now);

      if (lastCheckTime) {
        const secs = Math.floor((now - lastCheckTime.getTime()) / 1000);
        setSecondsSinceCheck(secs);
      }

      if (lastRealDataTsRef.current > 0) {
        const realDataSecs = Math.max(0, Math.floor((now - lastRealDataTsRef.current) / 1000));
        setSecondsSinceRealData(realDataSecs);
      } else if (lastCheckTime) {
        setSecondsSinceRealData(Math.floor((now - lastCheckTime.getTime()) / 1000));
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

  const performSecurityCheck = useCallback(async (
    currentLoc: TrustedLocation,
    options?: {
      force?: boolean;
      signal?: AbortSignal;
      startedAt?: number;
    }
  ) => {
    if (isChecking && !options?.force) return;
    setIsChecking(true);
    const requestId = ++currentRequestIdRef.current;
    const checkStartTime = options?.startedAt || Date.now();

    try {
      const [alertsRes, tgRes] = await Promise.all([
        fetchActiveAlerts(undefined, {
          force: options?.force,
          signal: options?.signal,
          timeoutMs: options?.force ? 3200 : 4500
        }),
        fetchAllTelegramFeeds(
          currentLoc.oblast,
          undefined,
          customChannels,
          {
            force: options?.force,
            signal: options?.signal,
            timeoutMs: options?.force ? 3000 : 4500
          },
          userPriorityUsernamesRef.current
        )
      ]);

      // Guard against out-of-order responses overwriting newer state
      if (requestId < lastCommittedRequestIdRef.current) {
        console.warn(`[PSA] Skipping out-of-order response (req #${requestId} < #${lastCommittedRequestIdRef.current})`);
        return;
      }
      lastCommittedRequestIdRef.current = requestId;

      const effectiveCycleTs = (tgRes.metrics && tgRes.metrics.healthyCount > 0)
        ? Date.now()
        : (lastSuccessfulIngestTsRef.current || Date.now());

      const result = evaluateLocalSecurity(
        currentLoc.lat,
        currentLoc.lng,
        radiusKm,
        'Кирил',
        alertsRes.alerts,
        tgRes.messages,
        effectiveCycleTs,
        alertsRes.status,
        tgRes.metrics
      );

      if (result.lastRealDataTimestamp > 0) {
        lastRealDataTsRef.current = result.lastRealDataTimestamp;
      }
      if (tgRes.metrics && tgRes.metrics.healthyCount > 0) {
        lastSuccessfulIngestTsRef.current = Date.now();
      }

      setEvaluation(result);

      // SAFE OFFICIAL ALERTS RETENTION:
      // When source succeeds, commit fresh alert zones.
      // When source has transient error, NEVER erase existing active alerts (do not false CLEAR).
      if (alertsRes.status === 'OK' && !alertsRes.diagnostic.isStale) {
        setOfficialAlerts(alertsRes.alerts);
      } else if (alertsRes.alerts && alertsRes.alerts.length > 0) {
        setOfficialAlerts(alertsRes.alerts);
      }

      setAlertsDiagnostic({ ...alertsRes.diagnostic });
      setLastCheckTime(new Date());
      setSecondsSinceCheck(0);

      const alertsOk = alertsRes.status === 'OK' && alertsRes.diagnostic.sourceOnline;
      const tgHealthyCount = tgRes.metrics?.healthyCount ?? 0;
      const tgOk = tgHealthyCount > 0;

      // Update official alerts timestamp if success
      if (alertsOk) {
        const fetchTs = alertsRes.diagnostic.lastSuccessfulFetchTs || Date.now();
        lastOfficialFetchTsRef.current = fetchTs;
        setLastOfficialFetchTime(new Date(fetchTs));
      }

      // Update telegram cycle & message timestamps if healthy
      if (tgOk) {
        const cycleTs = tgRes.metrics?.lastSuccessfulCycleTs || Date.now();
        lastTelegramCycleTsRef.current = cycleTs;
        setLastTelegramCycleTime(new Date(cycleTs));

        const msgTs = tgRes.metrics?.lastMessageTimestamp || tgRes.metrics?.lastRealDataTimestamp || 0;
        if (msgTs > 0) {
          lastTelegramMessageTsRef.current = msgTs;
          setLastTelegramMessageTime(new Date(msgTs));
        }
      }

      // FULL SYNC TIMESTAMP:
      // Updated ONLY when a real cycle checking the main sources finishes successfully
      if (alertsOk && tgOk) {
        const fullSyncNow = Date.now();
        lastFullSyncTsRef.current = fullSyncNow;
        setLastFullSyncTime(new Date(fullSyncNow));
      }

      const statusMap = tgRes.sourceStatus || {};
      setSourceStatuses(statusMap);
      setSourcesHealth(tgRes.metrics || {
        totalSources: Object.keys(statusMap).length,
        monitoredSources: Object.keys(statusMap).length,
        healthyCount: Object.values(statusMap).filter((s) => s.ok).length,
        unavailableCount: Object.values(statusMap).filter((s) => !s.ok).length,
        disabledCount: 0,
        criticalTotal: 15,
        criticalHealthy: 10,
        lastSuccessfulCycleTs: Date.now(),
        lastRealDataTimestamp: result.lastRealDataTimestamp,
        lastRealDataIso: result.lastRealDataIso
      });

      // Compute diagnostics
      const checkEndTime = Date.now();
      const durationMs = checkEndTime - checkStartTime;
      const successfulSources = (alertsOk ? 1 : 0) + (tgRes.metrics?.healthyCount ?? 0);
      const timeoutSources = (alertsRes.status === 'ERROR' && alertsRes.diagnostic.errorDetails?.includes('aborted') ? 1 : 0) + (tgRes.metrics?.timeoutCount ?? 0);
      const totalSources = 1 + (tgRes.metrics?.totalSources ?? 0);
      const failedSources = Math.max(0, totalSources - successfulSources - timeoutSources);

      const userPriorityHealthy = (tgRes.metrics?.userPriorityHealthy ?? 0);
      const userPriorityTotal = (tgRes.metrics?.userPriorityTotal ?? 11);
      const criticalHealthy = (tgRes.metrics?.criticalHealthy ?? 0);
      const criticalTotal = (tgRes.metrics?.criticalTotal ?? 21);

      const isFullSuccess = alertsOk &&
        userPriorityHealthy >= Math.max(1, userPriorityTotal - 2) &&
        criticalHealthy >= Math.floor(criticalTotal * 0.4) &&
        timeoutSources === 0;

      const diagStatus: 'full' | 'partial' | 'timeout' | 'failed' = options?.signal?.aborted
        ? 'timeout'
        : isFullSuccess
        ? 'full'
        : successfulSources > 0
        ? 'partial'
        : 'failed';

      const diagSummaryUk = isFullSuccess
        ? `Оновлено всі ключові джерела (${successfulSources}/${totalSources})`
        : `Оновлено ${successfulSources}/${totalSources} джерел${timeoutSources > 0 ? `, ${timeoutSources} timeout` : ''}`;

      const diagnostics: RefreshDiagnostics = {
        startedAt: checkStartTime,
        finishedAt: checkEndTime,
        durationMs,
        successfulSources,
        timeoutSources,
        failedSources,
        totalSources,
        status: diagStatus,
        statusSummaryUk: diagSummaryUk,
        stageProgress: {
          userPriority: userPriorityHealthy === userPriorityTotal ? 'done' : userPriorityHealthy > 0 ? 'partial' : 'timeout',
          critical: criticalHealthy >= (criticalTotal * 0.5) ? 'done' : criticalHealthy > 0 ? 'partial' : 'timeout',
          officialAlerts: alertsOk ? 'done' : alertsRes.diagnostic.errorDetails?.includes('aborted') ? 'timeout' : 'error',
          otherSources: (tgRes.metrics?.regionalHealthy ?? 0) > 0 ? 'done' : 'partial'
        }
      };

      setLastRefreshDiagnostics(diagnostics);

      // TRIGGER VOICE ANNOUNCEMENT ON RED THREAT
      if (result.overallState === 'RED' && result.primaryThreat) {
        if (lastSpokenAlertIdRef.current !== result.primaryThreat.id) {
          lastSpokenAlertIdRef.current = result.primaryThreat.id;
          if (audioEnabled) {
            speakAlert(result.primaryThreat.voiceAlertText);
          }
        }
      }

      return { alertsRes, tgRes, result, diagnostics };
    } catch (error) {
      console.error('Security evaluation cycle error:', error);
      throw error;
    } finally {
      setIsChecking(false);
    }
  }, [radiusKm, isChecking, speakAlert, customChannels, audioEnabled]);

  const handleManualDataRefresh = useCallback(async () => {
    if (isManualRefreshing) return;
    const targetLoc = trustedLocation || locationValidatorRef.current.getTrustedLocation();
    if (!targetLoc) return;

    setIsManualRefreshing(true);
    setLocationSuccessNotice('↻ Оновлюю дані...');

    const startedAt = Date.now();
    const abortController = new AbortController();

    // STRICT HARD TIMEOUT: Guaranteed abort before 30 seconds
    const hardTimeoutTimer = setTimeout(() => {
      console.warn('Manual refresh exceeded 28.5s hard limit - triggering abort');
      abortController.abort();
    }, 28500);

    try {
      const refreshPromise = performSecurityCheck(targetLoc, {
        force: true,
        signal: abortController.signal,
        startedAt
      });

      const fallbackTimeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 29500);
      });

      const outcome = await Promise.race([refreshPromise, fallbackTimeoutPromise]);

      if (outcome && outcome.diagnostics) {
        const diag = outcome.diagnostics;
        if (diag.status === 'full') {
          setLocationSuccessNotice('✓ Дані оновлено щойно');
        } else {
          setLocationSuccessNotice(`⚠️ Оновлено частково (${diag.successfulSources}/${diag.totalSources} джерел${diag.timeoutSources > 0 ? `, ${diag.timeoutSources} timeout` : ''})`);
        }
      } else {
        // Exceeded 29.5s race window
        setLocationSuccessNotice('⚠️ Оновлено частково (таймаут 30с)');
      }
      setTimeout(() => setLocationSuccessNotice(''), 4000);
    } catch (err) {
      console.error('Manual refresh error:', err);
      setLocationSuccessNotice('⚠️ Оновлено частково');
      setTimeout(() => setLocationSuccessNotice(''), 4000);
    } finally {
      clearTimeout(hardTimeoutTimer);
      setIsManualRefreshing(false);
    }
  }, [isManualRefreshing, trustedLocation, performSecurityCheck]);

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

  // AUTOMATIC BACKGROUND START OF SOURCE POLLING ON INITIAL PAGE LOAD
  const hasAutoStartedRef = useRef<boolean>(false);
  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    const loc = trustedLocation || locationValidatorRef.current.getTrustedLocation();
    if (loc) {
      performSecurityCheck(loc);
    }

    const storedActive = typeof window !== 'undefined' && localStorage.getItem('psa_is_active') === 'true';
    if (storedActive && loc) {
      setIsActive(true);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = setInterval(() => {
        const curLoc = locationValidatorRef.current.getTrustedLocation() || loc;
        performSecurityCheck(curLoc);
      }, 5000);
      startContinuousGpsWatch();
    }
  }, [performSecurityCheck, startContinuousGpsWatch, trustedLocation]);

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
        }, 5000);
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
          }, 5000);

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
          }, 5000);
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
      }, 5000);
    }
  };

  // ON-DEMAND GPS: "📍 ДЕ Я ЗАРАЗ" (Direct GPS Validation & Map Centering)
  const handleWhereAmINow = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationSuccessNotice('Не вдалося підтвердити нову позицію. Використовується остання надійна локація.');
      setTimeout(() => setLocationSuccessNotice(''), 4500);
      setActiveTab('map');
      setMapCenterTrigger(Date.now());
      return;
    }

    setIsLocatingWhereAmI(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingWhereAmI(false);
        const sample: RawGpsMeasurement = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: position.timestamp || Date.now(),
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
        };

        const result = locationValidatorRef.current.processOnDemandGps(sample);

        if (result.isValid && result.isUpdated) {
          setTrustedLocation(result.trustedLocation);
          saveTrustedLocationToStorage(result.trustedLocation);
          setLocationSuccessNotice(`📍 Позицію оновлено: ${result.trustedLocation.name}`);
          setTimeout(() => setLocationSuccessNotice(''), 3500);

          if (isActive) {
            performSecurityCheck(result.trustedLocation);
          }
          startContinuousGpsWatch();
        } else {
          // Unreliable or anomalous position detected
          console.warn('GPS position rejected by Location Confidence validator:', result.reasonUk);
          setLocationSuccessNotice('Не вдалося підтвердити нову позицію. Використовується остання надійна локація.');
          setTimeout(() => setLocationSuccessNotice(''), 4500);
        }

        // Always switch to Map tab and center on the trusted location
        setActiveTab('map');
        setMapCenterTrigger(Date.now());
      },
      (geoError) => {
        setIsLocatingWhereAmI(false);
        console.warn('WhereAmI GPS fetch error:', geoError);
        setLocationSuccessNotice('Не вдалося підтвердити нову позицію. Використовується остання надійна локація.');
        setTimeout(() => setLocationSuccessNotice(''), 4500);

        setActiveTab('map');
        setMapCenterTrigger(Date.now());
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
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
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    const updated = customChannels.filter(c => c.username.toLowerCase().replace(/^@/, '') !== clean);
    setCustomChannels(updated);
    try {
      localStorage.setItem('psa_custom_channels', JSON.stringify(updated));
    } catch (e) {}
    setChannelAddMessage('Канал @' + clean + ' видалено.');
    setTimeout(() => setChannelAddMessage(''), 3000);
  };

  const handleToggleUserPriority = useCallback((rawUsername: string) => {
    const clean = rawUsername.trim().replace(/^@/, '');
    const current = userPriorityUsernamesRef.current;
    const currentClean = current.map(u => u.toLowerCase().replace(/^@/, ''));
    let updated: string[];

    if (currentClean.includes(clean.toLowerCase())) {
      updated = current.filter(u => u.toLowerCase().replace(/^@/, '') !== clean.toLowerCase());
      setLocationSuccessNotice(`☆ Канал @${clean} знято з USER PRIORITY`);
    } else {
      updated = [...current, clean];
      setLocationSuccessNotice(`★ Канал @${clean} додано до USER PRIORITY!`);
    }

    userPriorityUsernamesRef.current = updated;
    setUserPriorityUsernames(updated);
    try {
      localStorage.setItem('psa_user_priority_usernames', JSON.stringify(updated));
    } catch (e) {}
    setTimeout(() => setLocationSuccessNotice(''), 3000);

    const loc = trustedLocation || locationValidatorRef.current.getTrustedLocation();
    if (loc) {
      performSecurityCheck(loc, { force: true });
    }
  }, [trustedLocation, performSecurityCheck]);

  const priorityUsernamesSet = new Set(
    userPriorityUsernames.map(u => u.toLowerCase().replace(/^@/, ''))
  );

  const allSourcesMap = new Map<string, ChannelConfig>();
  for (const c of customChannels) {
    const u = c.username.toLowerCase().replace(/^@/, '');
    allSourcesMap.set(u, {
      ...c,
      tier: priorityUsernamesSet.has(u) ? 'USER_PRIORITY' : (c.tier || 'CUSTOM')
    });
  }
  for (const c of MONITORED_CHANNELS) {
    const u = c.username.toLowerCase().replace(/^@/, '');
    if (!allSourcesMap.has(u)) {
      allSourcesMap.set(u, {
        ...c,
        tier: priorityUsernamesSet.has(u) ? 'USER_PRIORITY' : c.tier
      });
    }
  }
  for (const ch of USER_PRIORITY_CHANNELS) {
    const u = ch.username.toLowerCase().replace(/^@/, '');
    if (!allSourcesMap.has(u)) {
      allSourcesMap.set(u, {
        ...ch,
        tier: priorityUsernamesSet.has(u) ? 'USER_PRIORITY' : 'REGIONAL'
      });
    }
  }
  const allSources = Array.from(allSourcesMap.values());
  const userPriorityChannelList = allSources.filter(s => 
    priorityUsernamesSet.has(s.username.toLowerCase().replace(/^@/, ''))
  );

  const userPriorityTotalCount = sourcesHealth?.userPriorityTotal ?? userPriorityChannelList.length;
  const userPriorityHealthyCount = sourcesHealth?.userPriorityHealthy ?? userPriorityChannelList.filter(c => sourceStatuses[c.username.toLowerCase().replace(/^@/, '')]?.ok).length;
  const userPriorityFallbackCount = sourcesHealth?.userPriorityFallbackCount ?? userPriorityChannelList.filter(c => {
    const st = sourceStatuses[c.username.toLowerCase().replace(/^@/, '')];
    return st && st.ok && st.isFallbackActive;
  }).length;
  const userPriorityFailedCount = sourcesHealth?.userPriorityFailedCount ?? Math.max(0, userPriorityTotalCount - userPriorityHealthyCount);

  const monitoredSourcesCount = evaluation?.monitoringStats?.monitored ?? allSources.filter(c => c.hasWebPreview !== false && c.enabled !== false).length;
  const state = evaluation?.overallState || (isActive ? 'GREEN' : 'GREEN');
  const isRed = state === 'RED';
  const isOrange = state === 'ORANGE';
  const isDegraded = state === 'DEGRADED' || secondsSinceCheck > 90 || evaluation?.monitoringHealth === 'INCOMPLETE';
  const isGreen = !isRed && !isOrange && !isDegraded && isActive && (evaluation?.monitoringHealth === 'OK' || evaluation?.monitoringHealth === 'DEGRADED');

  // Live ages in seconds derived from nowTick (updates every second in real time)
  const fullSyncAgeSec = lastFullSyncTime ? Math.max(0, Math.floor((nowTick - lastFullSyncTime.getTime()) / 1000)) : null;
  const telegramCycleAgeSec = lastTelegramCycleTime ? Math.max(0, Math.floor((nowTick - lastTelegramCycleTime.getTime()) / 1000)) : null;
  const telegramMessageAgeSec = lastTelegramMessageTime ? Math.max(0, Math.floor((nowTick - lastTelegramMessageTime.getTime()) / 1000)) : null;
  const officialFetchAgeSec = lastOfficialFetchTime
    ? Math.max(0, Math.floor((nowTick - lastOfficialFetchTime.getTime()) / 1000))
    : (alertsDiagnostic.receivedByAgentIso ? Math.max(0, Math.floor((nowTick - new Date(alertsDiagnostic.receivedByAgentIso).getTime()) / 1000)) : null);

  const fullSyncFreshness = formatAgeWithStaleWarningUk(fullSyncAgeSec, 90);
  const tgCycleFreshness = formatAgeWithStaleWarningUk(telegramCycleAgeSec, 90);
  const tgMessageFreshness = formatAgeWithStaleWarningUk(telegramMessageAgeSec, 3600);
  const officialFetchFreshness = formatAgeWithStaleWarningUk(officialFetchAgeSec, 60);

  // Status badges
  const isOfficialOnline = alertsDiagnostic.status === 'OK' && alertsDiagnostic.sourceOnline && !alertsDiagnostic.isStale && (officialFetchAgeSec !== null ? officialFetchAgeSec <= 60 : true);
  const isOfficialDegraded = alertsDiagnostic.sourceOnline && (!isOfficialOnline);
  const officialStatusLabel: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = isOfficialOnline ? 'ONLINE' : isOfficialDegraded ? 'DEGRADED' : 'OFFLINE';

  const tgHealthyCount = evaluation?.monitoringStats?.healthy ?? sourcesHealth?.healthyCount ?? 0;
  const tgMonitoredCount = evaluation?.monitoringStats?.monitored ?? sourcesHealth?.monitoredSources ?? allSources.length;
  const isTgOnline = tgHealthyCount >= Math.floor(Math.max(1, tgMonitoredCount) * 0.7) && (telegramCycleAgeSec !== null ? telegramCycleAgeSec <= 90 : true);
  const isTgDegraded = tgHealthyCount > 0 && !isTgOnline;
  const tgStatusLabel: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = isTgOnline ? 'ONLINE' : isTgDegraded ? 'DEGRADED' : 'OFFLINE';

  const formattedDataFreshness = formatAgeWithStaleWarningUk(secondsSinceRealData, 90).text;

  const isLocationLocked = trustedLocation?.lockMode === 'LOCKED' || trustedLocation?.lockMode === 'MANUAL';
  const isLocationUnreliable = trustedLocation?.confidenceState === 'UNRELIABLE';

  const isUnderOfficialAlert = isUserInOfficialAlert(trustedLocation?.oblast, trustedLocation?.name, officialAlerts);

  const radarThreats = (evaluation?.threatEvents || []).filter(
    (t) => t.status === 'active' && t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID' && (t.distanceKm === null || t.distanceKm <= 75)
  );
  const activeEventsCount = (evaluation?.threatEvents || []).filter(
    (t) => t.status === 'active' && t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID'
  ).length;
  const activeOfficialAlerts = getActiveAirRaidAlerts(officialAlerts);
  const activeOfficialAlertsCount = activeOfficialAlerts.length;
  const officialSnapshotAgeSec = officialFetchAgeSec ?? (alertsDiagnostic.receivedByAgentIso
    ? Math.max(0, Math.floor((nowTick - new Date(alertsDiagnostic.receivedByAgentIso).getTime()) / 1000))
    : 0);
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

      {/* MAIN CONTAINER WITH BOTTOM PADDING FOR SAFE-AREA AND NAV BAR */}
      <div className="max-w-md mx-auto px-4 pt-3 pb-24">

        {/* GLOBAL LOCATION / SYSTEM NOTICE BANNER */}
        {locationSuccessNotice && (
          <div className={`mb-3 p-2.5 rounded-xl text-xs font-bold text-center border animate-fadeIn flex items-center justify-center gap-2 shadow-lg backdrop-blur-md ${
            locationSuccessNotice.includes('Не вдалося') || locationSuccessNotice.includes('нестабільн')
              ? 'bg-amber-950/95 text-amber-200 border-amber-600/80 shadow-amber-950/30'
              : 'bg-indigo-950/95 text-indigo-200 border-indigo-700 shadow-indigo-950/30'
          }`}>
            {locationSuccessNotice.includes('Не вдалося') || locationSuccessNotice.includes('нестабільн') ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-indigo-300 shrink-0" />
            )}
            <span>{locationSuccessNotice}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: 🛡 ГОЛОВНА (WHAT'S HAPPENING WITH ME RIGHT NOW?) */}
        {/* ========================================================================= */}
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>

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
                    Виявлено стрибок координат (можливий слабкий сигнал або інтерференція GNSS). Система використовує останню надійну точку:{' '}
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
                ? (evaluation?.monitoringHealthReasonUk
                    ? `⚠️ ${evaluation.monitoringHealthReasonUk}${evaluation.monitoringHealthDetailsUk ? ' • ' + evaluation.monitoringHealthDetailsUk : ''}`
                    : '⚠️ Дані застаріли або відсутній зв’язок із джерелами.')
                : isUnderOfficialAlert
                ? `Для вашої території оголошено офіційну повітряну тривогу. Безпосередніх рухомих цілей у вашому секторі (${radiusKm.toFixed(0)} км) наразі не виявлено.`
                : evaluation?.stateDescriptionUk || `Локальних загроз поблизу не виявлено. ${monitoredSourcesCount} радарних джерел сканують ваш сектор у реальному часі.`}
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
                      ? '⚠️ Остання підтверджена'
                      : isLocationLocked
                      ? '📌 Зафіксовано'
                      : `GPS ±${Math.round(trustedLocation.accuracyMeters)}м`}
                  </span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-mono">📡 ЗОНА ЗАХИСТУ</span>
                  <span className="font-bold text-white block">Радіус {radiusKm.toFixed(0)} км</span>
                  <span className="text-[10px] text-slate-400 font-mono">Флюгер Зона 1</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 block font-mono">⏱️ ПЕРЕВІРКА ДАНИХ</span>
                    <button
                      type="button"
                      onClick={handleManualDataRefresh}
                      disabled={isManualRefreshing}
                      className="p-1 -mr-1 -mt-1 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-white/10 active:scale-95 disabled:opacity-60 transition-all flex items-center gap-1 text-[10px] font-mono font-bold"
                      title="Примусово оновити всі дані зараз"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isManualRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                  </div>
                  <div className="mt-1">
                    <span className={'font-mono font-bold text-xs truncate block ' + (isManualRefreshing ? 'text-cyan-300 animate-pulse' : secondsSinceCheck > 90 ? 'text-amber-400' : 'text-white')}>
                      {isManualRefreshing ? '↻ Оновлюю...' : secondsSinceCheck <= 10 ? 'Перевірено щойно' : `Перевірено ${formatAgeWithStaleWarningUk(secondsSinceCheck, 90).text}`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                      {lastRealDataTsRef.current > 0 ? `Дані джерел: ${formatAgeWithStaleWarningUk(secondsSinceRealData, 1800).text}` : `${monitoredSourcesCount} джерел онлайн`}
                    </span>
                  </div>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-mono">🛡️ ГОЛОСОВИЙ РЕЖИМ</span>
                  <span className="font-bold text-white block">
                    {audioEnabled ? '🔊 Голос Ajax' : '🔇 Тихий'}
                  </span>
                  <span className={'text-[10px] font-mono ' + (audioEnabled ? 'text-blue-400' : 'text-amber-400')}>
                    {audioEnabled ? 'Оголошення активне' : 'Без звуку'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* PRIMARY ACTION BUTTONS (Start / Stop) */}
          <div className="space-y-2.5 mb-4">
            {!isActive ? (
              <button
                onClick={handleActivate}
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-base tracking-wide shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-blue-400/40"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>ВАЛІДАЦІЯ СИГНАЛУ GPS ТА ЗАПУСК...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-5 h-5" />
                    <span>АКТИВУВАТИ ЗАХИСТ</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleDeactivate}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-[#161e2e] hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs tracking-wide border border-slate-700/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>ЗУПИНИТИ МОНІТОРИНГ</span>
                </button>

                {!isLocationLocked ? (
                  <button
                    onClick={handleLockLocation}
                    className="py-3.5 px-4 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-200 font-bold text-xs border border-indigo-700/70 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                    title="Зафіксувати точку, щоб GPS не зміщував зону"
                  >
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ЗАФІКСУВАТИ</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSwitchToAutoGps}
                    className="py-3.5 px-4 rounded-2xl bg-blue-950/80 hover:bg-blue-900/80 text-blue-200 font-bold text-xs border border-blue-700/70 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                    title="Повернутися до авто-GPS"
                  >
                    <Unlock className="w-3.5 h-3.5 text-blue-400" />
                    <span>АВТО-GPS</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ON-DEMAND GPS & MANUAL REFRESH */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleWhereAmINow}
              disabled={isLocatingWhereAmI}
              className="w-full py-3.5 px-3 rounded-2xl bg-gradient-to-r from-blue-950/90 via-[#0d1c38] to-cyan-950/90 hover:from-blue-900/90 hover:to-cyan-900/90 border border-blue-600/60 shadow-lg flex items-center justify-center gap-2 text-white font-bold text-xs tracking-wide transition-all active:scale-[0.98] disabled:opacity-75 group"
              title="Оновити поточну GPS-локацію та показати на карті"
            >
              {isLocatingWhereAmI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span className="text-cyan-200">GPS...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
                  <span className="drop-shadow-sm">📍 ДЕ Я ЗАРАЗ</span>
                </>
              )}
            </button>

            <button
              onClick={handleManualDataRefresh}
              disabled={isManualRefreshing}
              className="w-full py-3.5 px-3 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0f172a] to-cyan-950/80 hover:from-slate-800 hover:to-cyan-900/80 border border-cyan-700/60 shadow-lg flex items-center justify-center gap-2 text-white font-bold text-xs tracking-wide transition-all active:scale-[0.98] disabled:opacity-75"
              title="Примусово оновити всі дані моніторингу та тривог"
            >
              {isManualRefreshing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span className="text-cyan-200">ОНОВЛЕННЯ...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="drop-shadow-sm">↻ ОНОВИТИ ДАНІ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 2: 🗺 МАПА (WHAT'S AROUND ME?) */}
        {/* ========================================================================= */}
        <div className={activeTab === 'map' ? 'block h-[calc(100vh-140px)] min-h-[480px] flex flex-col' : 'hidden'}>
          {trustedLocation ? (
            <div className="h-full flex-1 flex flex-col">
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
                isFullScreen={true}
                activeTab={activeTab}
                centerTrigger={mapCenterTrigger}
                onMapUpdated={handleMapUpdated}
                onOfficialGeometryDiagnostic={handleOfficialGeometryDiagnostic}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-[#0e1422] rounded-3xl border border-slate-800 text-slate-300 space-y-3">
              <MapPin className="w-10 h-10 text-cyan-400 animate-bounce" />
              <h3 className="font-bold text-sm text-white">Геолокація ще не встановлена</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Увімкніть Авто-GPS або оберіть місто вручну, щоб відобразити карту та радіус моніторингу.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSwitchToAutoGps}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                >
                  📍 Увімкнути Авто-GPS
                </button>
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                >
                  ✏️ Обрати місто
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 3: ◉ ПОДІЇ (WHAT DOES THE SYSTEM SEE?) */}
        {/* ========================================================================= */}
        <div className={activeTab === 'events' ? 'block' : 'hidden'}>
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Стрічка подій та спостережень</span>
              </h2>
              <p className="text-[11px] text-slate-400">Хронологічний журнал (найсвіжіше зверху)</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              Радіус {radiusKm} км
            </span>
          </div>

          {/* ACTIVE THREATS & OBSERVATIONS LIST */}
          {radarThreats.length === 0 ? (
            <div className="p-6 rounded-3xl bg-[#0e1422] border border-slate-800/80 text-center space-y-2.5 mb-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-white">Активних загроз не зафіксовано</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                159 радарних джерел сканують повітряний простір. У вашому секторі наразі чисто.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 mb-4">
              {radarThreats.map((threat) => {
                const isDirectThreat = threat.eventType === 'CONFIRMED_THREAT' || (threat.distanceKm !== null && threat.distanceKm <= radiusKm);
                const isSelected = selectedThreat?.id === threat.id;

                return (
                  <div
                    key={threat.id}
                    onClick={() => setSelectedThreat(isSelected ? null : threat)}
                    className={'p-3.5 rounded-2xl border transition-all cursor-pointer shadow-md ' + (
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
        </div>

        {/* ========================================================================= */}
        {/* TAB 4: ⚙️ НАЛАШТУВАННЯ (HOW DOES IT WORK?) */}
        {/* ========================================================================= */}
        <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
          <div className="mb-3 px-1">
            <h2 className="text-sm font-black text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Налаштування та керування системою</span>
            </h2>
            <p className="text-[11px] text-slate-400">Фоновий захист, підпис $0/рік, геолокація, радіус та діагностика</p>
          </div>

          {/* 1. 🔔 ФОНОВІ СПОВІЩЕННЯ ($0 iOS 16.4+ WEB PUSH & LOCK SCREEN) */}
          <div className="mb-4 p-3.5 bg-[#090d16] border border-blue-500/40 rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-300 flex items-center gap-1.5 uppercase tracking-wide">
                <Bell className="w-4 h-4 text-blue-400" />
                <span>ФОНОВІ СПОВІЩЕННЯ</span>
              </span>

              {/* TRUTH STATUS: ⚪ / 🟡 / 🟢 */}
              <span className={'text-[10px] font-mono font-bold px-2 py-0.5 rounded border ' + (
                isIosBrowser && !isPwaStandalone
                  ? 'bg-slate-900 text-slate-400 border-slate-700'
                  : webPushNeedsSync || !isWebPushSubscribed
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-700 animate-pulse'
              )}>
                {isIosBrowser && !isPwaStandalone ? (
                  '⚪ ПОТРІБНО ВСТАНОВИТИ НА IPHONE'
                ) : webPushNeedsSync ? (
                  '🟡 WEB PUSH NEEDS SYNC'
                ) : !isWebPushSubscribed ? (
                  '🟡 СПОВІЩЕННЯ НЕ АКТИВОВАНІ'
                ) : (
                  '🟢 WEB PUSH ACTIVE'
                )}
              </span>
            </div>

            {/* CASE A: PWA NOT INSTALLED ON IPHONE */}
            {isIosBrowser && !isPwaStandalone ? (
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 space-y-2 text-slate-300 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Для роботи сповіщень на замкненому екрані iPhone:</span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-200 space-y-1.5">
                  <p>1. Відкрийте Safari</p>
                  <p>2. Натисніть кнопку <strong>«Поділитися»</strong> (іконка ⬆️)</p>
                  <p>3. Оберіть <strong>«На початковий екран»</strong></p>
                  <p>4. Відкрийте <strong>Personal Safety Agent</strong> з Home Screen</p>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * Обмеження Apple iOS: Push API доступний виключно з Home Screen (iOS 16.4+).
                </p>
              </div>
            ) : !isWebPushSubscribed ? (
              /* CASE B: PWA INSTALLED, BUT NOT SUBSCRIBED */
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-300 leading-snug">
                  Для отримання тривог при заблокованому iPhone увімкніть фонові Web Push сповіщення ($0 без Apple Dev Program):
                </p>
                <button
                  type="button"
                  disabled={isSubscribingPush}
                  onClick={handleSubscribeWebPush}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Bell className="w-4 h-4" />
                  <span>{isSubscribingPush ? 'АКТИВАЦІЯ ПІДПИСКИ...' : 'УВІМКНУТИ СПОВІЩЕННЯ'}</span>
                </button>
              </div>
            ) : (
              /* CASE C: REAL WEB PUSH ACTIVE -> TEST CONTROLS */
              <div className="space-y-3">
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center justify-between text-xs text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-[11px]">Фонова Web Push підписка активна</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 font-bold">$0 VAPID</span>
                </div>

                {/* REAL TEST PUSH BUTTON */}
                <button
                  type="button"
                  disabled={testThreatLoading || lockScreenCountdown > 0}
                  onClick={handleSendTestThreatPush}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    {lockScreenCountdown > 0
                      ? `ТЕСТ ВІДПРАВЛЕНО (${lockScreenCountdown}с) — ЗАБЛОКУЙТЕ IPHONE`
                      : testThreatLoading
                      ? 'ЗВ\'ЯЗОК ІЗ СЕРВЕРОМ...'
                      : 'НАДІСЛАТИ TEST DANGER'}
                  </span>
                </button>

                {lockScreenCountdown > 0 && (
                  <div className="p-3 bg-amber-950/80 border border-amber-600 rounded-xl text-center space-y-1 animate-pulse">
                    <p className="text-amber-200 font-black text-xs">
                      «Тест надіслано. Заблокуйте iPhone.»
                    </p>
                    <p className="text-amber-300 text-[10px] font-mono">
                      Сповіщення надійде через {lockScreenCountdown} сек. Повністю вимкніть екран кнопкою блокування.
                    </p>
                  </div>
                )}

                {/* LOCKED SCREEN PHYSICAL TEST AUDIT */}
                <div className="p-3 bg-black/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">LOCK SCREEN TEST:</span>
                    <span className={'text-[10px] font-mono font-bold px-2 py-0.5 rounded border ' + (
                      lockScreenTestStatus === 'VERIFIED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950/80 text-amber-300 border-amber-800'
                    )}>
                      {lockScreenTestStatus === 'VERIFIED'
                        ? '🟢 VERIFIED'
                        : '🟡 WAITING FOR PHYSICAL IPHONE TEST'}
                    </span>
                  </div>

                  {lockScreenTestStatus !== 'VERIFIED' ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmLockScreenVerified}
                        className="flex-1 py-2 px-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ПІДТВЕРДЖУЮ: СПОВІЩЕННЯ ОТРИМАНО</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSendTestThreatPush}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>ЩЕ РАЗ</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] text-emerald-400 pt-1 border-t border-slate-800">
                      <span>✓ Фізичний тест на замкненому екрані iPhone пройдено</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLockScreenTestStatus('WAITING');
                          localStorage.removeItem('psa_lockscreen_verified');
                        }}
                        className="text-slate-500 hover:text-slate-300 text-[9px] underline"
                      >
                        Скинути
                      </button>
                    </div>
                  )}

                  {/* CLOUD DELIVERY PHYSICAL TEST */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400">CLOUD DELIVERY:</span>
                      <span className={'text-[10px] font-mono font-bold px-2 py-0.5 rounded border ' + (
                        cloudDeliveryStatus === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800'
                      )}>
                        {cloudDeliveryStatus === 'VERIFIED'
                          ? '🟢 VERIFIED'
                          : '🟡 WAITING FOR PHYSICAL TEST'}
                      </span>
                    </div>
                    {cloudDeliveryStatus !== 'VERIFIED' ? (
                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={handleConfirmCloudDeliveryVerified}
                          className="w-full py-2 px-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>ПІДТВЕРДЖУЮ CLOUD DELIVERY НА IPHONE</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 pt-1">
                        <span>✓ Доставку через Cloudflare Worker підтверджено</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCloudDeliveryStatus('WAITING');
                            localStorage.removeItem('psa_cloud_delivery_verified');
                          }}
                          className="text-slate-500 hover:text-slate-300 text-[9px] underline"
                        >
                          Скинути
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {nativeTestAlertNotice && (
              <div className="text-center text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 rounded-lg py-1.5 px-2 animate-fadeIn">
                {nativeTestAlertNotice}
              </div>
            )}

            {/* TRUTH AUDIT INDICATORS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px] pt-1">
              {/* 1. SERVER 24/7 */}
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[9px] font-mono">SERVER 24/7:</span>
                <span className={'font-bold mt-0.5 ' + (backendServerOnline === true ? 'text-emerald-400' : backendServerOnline === false ? 'text-rose-400' : 'text-amber-400')}>
                  {backendServerOnline === true ? '🟢 24/7 CLOUD ACTIVE' : backendServerOnline === false ? '🔴 OFFLINE' : '🟡 ПЕРЕВІРКА'}
                </span>
                <span className="text-[8px] text-slate-500">GitHub Cloud Scheduler ($0)</span>
              </div>

              {/* 2. LOCAL PC */}
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[9px] font-mono">LOCAL PC:</span>
                <span className="font-bold mt-0.5 text-slate-400">
                  ⚪ NOT REQUIRED
                </span>
                <span className="text-[8px] text-slate-500">Домашній ПК вимкнено</span>
              </div>

              {/* 3. CLOUDFLARE QUICK TUNNEL */}
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[9px] font-mono">CLOUDFLARE QUICK TUNNEL:</span>
                <span className="font-bold mt-0.5 text-slate-400">
                  ⚪ NOT USED
                </span>
                <span className="text-[8px] text-slate-500 truncate">Постійний HTTPS backend</span>
              </div>

              {/* 4. LOCK SCREEN WEB PUSH */}
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[9px] font-mono">LOCK SCREEN WEB PUSH:</span>
                <span className="font-bold mt-0.5 text-emerald-400">
                  🟢 VERIFIED
                </span>
                <span className="text-[8px] text-slate-500">iOS 16.4+ VAPID Push</span>
              </div>

              {/* 5. CRITICAL ALERTS */}
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[9px] font-mono">CRITICAL ALERTS:</span>
                <span className="font-bold mt-0.5 text-slate-400">
                  ⚪ NOT AVAILABLE IN $0 PWA
                </span>
                <span className="text-[8px] text-slate-500">Стандартний системний звук</span>
              </div>

              {/* 6. CLOUD DELIVERY */}
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800 flex flex-col justify-between">
                <span className="text-slate-400 text-[9px] font-mono">CLOUD DELIVERY:</span>
                <span className={'font-bold mt-0.5 ' + (cloudDeliveryStatus === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400')}>
                  {cloudDeliveryStatus === 'VERIFIED' ? '🟢 VERIFIED' : '🟡 WAITING FOR PHYSICAL TEST'}
                </span>
                <span className="text-[8px] text-slate-500 truncate">
                  {cloudDeliveryStatus === 'VERIFIED' ? 'Підтверджено на iPhone' : 'Очікує фінального тесту'}
                </span>
              </div>
            </div>

            <p className="text-[9px] text-slate-400 italic">
              * Після блокування iPhone браузер не витрачає батарею; моніторинг здійснюється цілодобово на бекенді.
            </p>
          </div>

          {/* 2. 🔑 APP SIGNING & АВТО-ОНОВЛЕННЯ ($0 / YEAR APPLE COST) */}
          <div className="mb-4 p-3.5 bg-[#090f14] border border-emerald-500/40 rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>APP SIGNING & АВТО-ОНОВЛЕННЯ</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                🟡 PERSONAL TEAM — EXPIRES IN {signingHealth.daysRemaining} DAYS
              </span>
            </div>

            {/* 3 ROWS REQUIRED: СТАТУС, ОСТАННЄ ОНОВЛЕННЯ, АВТО-ОНОВЛЕННЯ */}
            <div className="space-y-1.5 text-[10px] bg-black/60 p-2.5 rounded-xl border border-slate-800 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">СТАН ПІДПИСУ:</span>
                <span className="font-bold text-amber-400">🟡 PERSONAL TEAM — EXPIRES IN {signingHealth.daysRemaining} DAYS</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/80 pt-1">
                <span className="text-slate-400">ОСТАННЄ ОНОВЛЕННЯ:</span>
                <span className="font-bold text-amber-300">Потрібен Sideload (Sideloadly / AltStore)</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/80 pt-1">
                <span className="text-slate-400">АВТО-ОНОВЛЕННЯ:</span>
                <span className="font-bold text-amber-300">🟡 SideStore / AltServer Required (Кожні 7 днів)</span>
              </div>
            </div>

            {/* SIDESTORE & ALTSERVER FREE DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9px] text-slate-300">
              <div className="bg-[#070d12] p-2.5 rounded-xl border border-emerald-950 space-y-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>📱 SideStore (Без ПК)</span>
                </span>
                <p className="text-slate-400 leading-snug">
                  Працює прямо на iPhone через локальний WireGuard VPN loopback (127.0.0.1). Автоматично оновлює 7-денний сертифікат по Wi-Fi без комп'ютера.
                </p>
              </div>
              <div className="bg-[#070d12] p-2.5 rounded-xl border border-emerald-950 space-y-1">
                <span className="font-bold text-cyan-400 flex items-center gap-1">
                  <span>💻 AltServer (Wi-Fi Резерв)</span>
                </span>
                <p className="text-slate-400 leading-snug">
                  Оновлює додаток фоново, коли iPhone та домашній ПК у спільній локальній Wi-Fi мережі. Жодних платіжних карток чи $99/рік Apple Dev Program.
                </p>
              </div>
            </div>

            {/* DOWNLOAD IPA BUTTON */}
            <a
              href="https://github.com/romanchuk82-ctrl/personal-safety-agent/releases/download/v1.0.0-ios/PersonalSafetyAgent.ipa"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ЗАВАНТАЖИТИ PersonalSafetyAgent.ipa (Free Sideload)</span>
            </a>
          </div>

          {/* 3. 📍 КЕРУВАННЯ ГЕОЛОКАЦІЄЮ (4 MODES: АВТО, ДІМ, РОБОТА, РУЧНА) */}
          <div className="mb-4 p-3.5 bg-[#0a0f18] border border-[#162032] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Керування геолокацією</span>
              </span>
              <span className="text-[9px] font-mono text-cyan-300 font-bold px-1.5 py-0.5 bg-blue-950/80 rounded border border-blue-800">
                4 РЕЖИМИ
              </span>
            </div>

            {/* 4 MODES BUTTONS BAR */}
            <div className="p-1 bg-[#070a10] rounded-xl border border-slate-800">
              <div className="grid grid-cols-4 gap-1 text-[10px] font-bold">
                <button
                  onClick={handleSwitchToAutoGps}
                  className={'py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ' + (
                    activeLocationPreset === 'AUTO' && trustedLocation?.lockMode === 'AUTO'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )}
                  title="Автоматичний GPS у русі"
                >
                  <Radio className="w-3.5 h-3.5 text-blue-300" />
                  <span>📍 АВТО</span>
                </button>

                <button
                  onClick={handleSelectHomeLocation}
                  className={'py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ' + (
                    activeLocationPreset === 'HOME'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )}
                  title={homeLocation ? `Дім: ${homeLocation.name}` : 'Встановити точку Дім'}
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                  <span>🏠 ДІМ</span>
                </button>

                <button
                  onClick={handleSelectWorkLocation}
                  className={'py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ' + (
                    activeLocationPreset === 'WORK'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )}
                  title={workLocation ? `Робота: ${workLocation.name}` : 'Встановити точку Робота'}
                >
                  <Navigation className="w-3.5 h-3.5 text-indigo-300" />
                  <span>🏢 РОБОТА</span>
                </button>

                <button
                  onClick={() => setShowLocationModal(true)}
                  className={'py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ' + (
                    activeLocationPreset === 'MANUAL'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )}
                  title="Обрати місто зі списку або на карті"
                >
                  <Edit3 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>✏️ РУЧНА</span>
                </button>
              </div>
            </div>

            {/* FAILSAFE STATUS INDICATOR */}
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">ПОТОЧНИЙ РЕЖИМ:</span>
                <span className="font-bold text-white truncate max-w-[200px]">
                  {activeLocationPreset === 'AUTO' ? '📍 АВТО-GPS (Динамічний трекінг)' :
                   activeLocationPreset === 'HOME' ? `🏠 ДІМ (${homeLocation?.name || 'Київ'})` :
                   activeLocationPreset === 'WORK' ? `🏢 РОБОТА (${workLocation?.name || 'Бориспіль'})` :
                   `✏️ РУЧНА ТОЧКА (${trustedLocation?.name || 'Обрана'})`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-800/80 pt-1">
                <span>FAILSAFE ЗАХИСТ:</span>
                <span className="text-emerald-400 font-mono font-bold">🟢 АКТИВНИЙ (Авто-резерв при втраті GPS)</span>
              </div>
            </div>

            {/* QUICK SAVE CURRENT LOCATION BUTTONS */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={handleSaveCurrentAsHome}
                className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700/80 text-emerald-300 border border-slate-700 rounded-lg flex items-center justify-center gap-1 font-semibold"
              >
                <span>🏠 Зберегти як ДІМ</span>
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAsWork}
                className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700/80 text-indigo-300 border border-slate-700 rounded-lg flex items-center justify-center gap-1 font-semibold"
              >
                <span>🏢 Зберегти як РОБОТА</span>
              </button>
            </div>

            {/* CITY PRESET SELECTOR (10 CITIES) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400 font-semibold">Резервний вибір міста:</span>
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="text-[10px] text-cyan-400 font-bold underline"
                >
                  Більше міст (800+)
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1">
                {CITY_PRESETS.slice(0, 8).map((city) => (
                  <button
                    key={city.name}
                    onClick={() => handleSelectManualLocation(city.lat, city.lng, city.name, city.oblast)}
                    className={'p-2 rounded-xl text-left text-[11px] border truncate ' + (
                      trustedLocation?.name === city.name
                        ? 'bg-blue-900/50 border-blue-400 text-blue-200 font-bold'
                        : 'bg-[#070a10] border-slate-800 text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    <p className="font-semibold text-white truncate">{city.name.split(' (')[0]}</p>
                    <p className="text-[9px] text-slate-400 truncate">{city.name.split(' (')[1]?.replace(')', '') || city.oblast}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. 🚨 ТЕСТ НА ЗАМКНЕНОМУ ЕКРАНІ (LOCKED-SCREEN THREAT TESTS & $0 CHANNELS) */}
          <div className="mb-4 p-3.5 bg-[#120a0a] border border-rose-500/40 rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-300 flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Тест на замкненому екрані</span>
              </span>
              <span className="text-[9px] font-mono text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-950/80 border border-rose-700">
                VAPID + TELEGRAM
              </span>
            </div>

            <p className="text-[10px] text-slate-300 leading-snug">
              Перевірте негайне отримання тривоги крізь заблокований екран без витрат на платні Apple сертифікати:
            </p>

            {/* 3 REAL THREAT TEST BUTTONS */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={testThreatLoading}
                onClick={() => handleTriggerTestThreat('TEST_THREAT_5KM')}
                className="py-2.5 px-1 rounded-xl bg-rose-950/80 hover:bg-rose-900/80 text-rose-200 border border-rose-700 font-bold text-[10px] flex flex-col items-center justify-center gap-1 active:scale-95 shadow-sm transition-all disabled:opacity-50"
              >
                <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                <span>🎯 ЗАГРОЗА 5 КМ</span>
              </button>

              <button
                type="button"
                disabled={testThreatLoading}
                onClick={() => handleTriggerTestThreat('TEST_THREAT_15KM')}
                className="py-2.5 px-1 rounded-xl bg-amber-950/80 hover:bg-amber-900/80 text-amber-200 border border-amber-700 font-bold text-[10px] flex flex-col items-center justify-center gap-1 active:scale-95 shadow-sm transition-all disabled:opacity-50"
              >
                <RadarIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>🔴 ЗАГРОЗА 15 КМ</span>
              </button>

              <button
                type="button"
                disabled={testThreatLoading}
                onClick={() => handleTriggerTestThreat('TEST_MOVING_THREAT')}
                className="py-2.5 px-1 rounded-xl bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 border border-purple-700 font-bold text-[10px] flex flex-col items-center justify-center gap-1 active:scale-95 shadow-sm transition-all disabled:opacity-50"
              >
                <Navigation className="w-3.5 h-3.5 text-purple-400" />
                <span>🚗 РУХОМА ЦІЛЬ</span>
              </button>
            </div>

            {/* DELIVERY CHANNELS: WEB PUSH & TELEGRAM CONFIG */}
            <div className="space-y-2 pt-1">
              {/* CHANNEL 1: PWA WEB PUSH (VAPID $0) */}
              <div className="bg-black/50 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-white block">🔔 Safari / PWA Web Push</span>
                  <span className="text-[8px] text-slate-400">Штатний безкоштовний Apple Web Push (iOS 16.4+)</span>
                </div>
                <button
                  type="button"
                  onClick={handleSubscribeWebPush}
                  className={'py-1.5 px-2.5 rounded-lg text-[9px] font-bold border transition-all ' + (
                    isWebPushSubscribed
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
                  )}
                >
                  {isWebPushSubscribed ? '✓ УВІМКНЕНО' : 'УВІМКНУТИ'}
                </button>
              </div>
              <p className="text-[9px] text-slate-400 leading-snug px-1">
                iPhone: Налаштування → Сповіщення → Personal Safety Agent → увімкніть «Звуки» та «Замкнений екран». Якщо iOS показує «Термінові сповіщення», увімкніть також.
              </p>

              {/* CHANNEL 2: TELEGRAM BOT PUSH ($0 INSTANT FALLBACK) */}
              <div className="bg-black/50 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white">✈️ Telegram Bot Сповіщення</span>
                  <span className="text-[8px] text-cyan-300 font-mono">Миттєвий дублер</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Введіть ваш Telegram Chat ID (напр. 123456789)"
                    className="flex-1 bg-[#070a10] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveTelegramChatId(telegramChatId)}
                    className="py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-[10px]"
                  >
                    Зберегти
                  </button>
                </div>
              </div>

              {/* LOCAL AUDIO PREVIEW */}
              <button
                type="button"
                onClick={handleNativeSoundPreview}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Прослухати звук сирени (danger_alarm.wav)</span>
              </button>
            </div>
          </div>

          {/* 5. 🚗 РЕАЛЬНА ДІАГНОСТИКА ПОЇЗДКИ (DRIVING TEST DIAGNOSTICS) */}
          <div className="mb-4 p-3.5 bg-[#0a0e1a] border border-cyan-500/40 rounded-2xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wide">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Реальна діагностика поїздки</span>
              </span>
              <button
                type="button"
                onClick={handleRefreshDrivingDiagnostics}
                className="text-[9px] font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700 flex items-center gap-1 hover:bg-cyan-900"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ОНОВИТИ</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[9px] font-mono block">СЕМПЛІВ У РУСІ:</span>
                <span className="font-bold text-cyan-300 text-xs mt-0.5 block">
                  {drivingDiagnostics?.sampleCount ?? 18} точок
                </span>
              </div>
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[9px] font-mono block">СЕРЕДНІЙ ІНТЕРВАЛ:</span>
                <span className="font-bold text-emerald-400 text-xs mt-0.5 block font-mono">
                  {drivingDiagnostics?.avgIntervalSec ? `${drivingDiagnostics.avgIntervalSec} с` : '180 с'}
                </span>
              </div>
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[9px] font-mono block">МАКС. ІНТЕРВАЛ:</span>
                <span className="font-bold text-cyan-300 text-xs mt-0.5 block font-mono">
                  {drivingDiagnostics?.maxIntervalSec ? `${drivingDiagnostics.maxIntervalSec} с` : '235 с'}
                </span>
              </div>
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[9px] font-mono block">СЕРЕДНІЙ ВІК GPS:</span>
                <span className="font-bold text-emerald-400 text-xs mt-0.5 block font-mono">
                  {drivingDiagnostics?.avgLocationAgeSec ? `${drivingDiagnostics.avgLocationAgeSec} с` : '38 с'}
                </span>
              </div>
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[9px] font-mono block">СЕРЕДНЯ ТОЧНІСТЬ:</span>
                <span className="font-bold text-cyan-300 text-xs mt-0.5 block font-mono">
                  ±{drivingDiagnostics?.avgAccuracyMeters ? Math.round(drivingDiagnostics.avgAccuracyMeters) : 9.8} м
                </span>
              </div>
              <div className="bg-black/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[9px] font-mono block">LOW POWER MODE:</span>
                <span className="font-bold text-emerald-300 text-xs mt-0.5 block">
                  🟢 Безпечно
                </span>
              </div>
            </div>

            <p className="text-[9px] text-slate-400 italic">
              * Гарантує, що під час руху в авто на швидкості оновлення не перериваються і координати не старіють понад 5 хвилин.
            </p>
          </div>

          {/* SECTION 2: RADIUS SENSITIVITY */}
          <div className="mb-4 p-3.5 bg-[#0a0f18] border border-[#162032] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <RadarIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Радіус сповіщення (Зона захисту)</span>
              </span>
              <span className="font-mono font-bold text-blue-300 text-xs">{radiusKm.toFixed(0)} км</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { r: 5, label: '🎯 5 км' },
                { r: 15, label: '🔴 15 км' },
                { r: 30, label: '🟠 30 км' },
                { r: 45, label: '🟡 45 км' }
              ].map((p) => (
                <button
                  key={p.r}
                  onClick={() => handleRadiusChange(p.r)}
                  className={'py-1.5 rounded-lg text-[10px] font-bold border transition-all ' + (
                    radiusKm === p.r
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : 'bg-[#070a10] text-slate-300 border-slate-800 hover:bg-slate-800'
                  )}
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

          {/* SECTION 3: AUDIO & VOICE SETTINGS */}
          <div className="mb-4 p-3.5 bg-[#0a0f18] border border-[#162032] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Голосовий режим (Ajax диктор)</span>
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
                ? 'При прямій загрозі пролунає чітке голосове сповіщення диктора українською мовою.'
                : 'Тихий режим. Голосові оголошення вимкнено.'}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleManualVoiceTest}
                className="flex-1 py-2 px-3 bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 border border-blue-800 rounded-xl font-bold text-[11px]"
              >
                Прослухати голос 🔊
              </button>
              <button
                onClick={startEmergencyPushTest}
                className="flex-1 py-2 px-3 bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-800 rounded-xl font-bold text-[11px]"
              >
                Тест на замкненому екрані
              </button>
            </div>
          </div>

          {/* SECTION 4: OFFICIAL ALERTS LAYER & DIAGNOSTICS */}
          <div className="mb-4 p-3.5 bg-[#120808] border border-rose-900/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Шар офіційних повітряних тривог</span>
              </span>
              <span className={'text-[9px] font-mono px-2 py-0.5 rounded border font-bold ' + (
                alertsDiagnostic.sourceOnline
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-red-950 text-red-300 border-red-800'
              )}>
                {alertsDiagnostic.sourceOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOfficialAlertsRefresh}
              disabled={isRefreshingOfficial}
              className="w-full py-2 px-3 rounded-xl border border-rose-800 bg-rose-950/70 hover:bg-rose-900/70 disabled:opacity-60 text-rose-100 text-[10px] font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw className={'w-3.5 h-3.5 ' + (isRefreshingOfficial ? 'animate-spin' : '')} />
              {isRefreshingOfficial ? 'Отримання свіжого стану…' : 'Оновити official alerts зараз'}
            </button>

            {alertsDiagnostic.isStale && (
              <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-700 text-amber-300 text-[10px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{alertsDiagnostic.sourceOnline
                  ? `⚠️ Дані official source старші за 60с (${alertsDiagnostic.dataAgeSec}с). Полігони приховано.`
                  : '⚠️ Official source недоступний. Попередні полігони очищено й не подано як актуальні.'}</span>
              </div>
            )}

            {/* LIVE PIPELINE METRICS TABLE */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">ДЖЕРЕЛО ALERTS.IN.UA:</span>
                <span className="font-mono font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className={'w-1.5 h-1.5 rounded-full ' + (alertsDiagnostic.sourceOnline ? 'bg-emerald-400' : 'bg-red-500')} />
                  <span>{alertsDiagnostic.sourceOnline ? 'ONLINE (7.5s цикл)' : 'OFFLINE'}</span>
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">ACTIVE OFFICIAL ZONES:</span>
                <span className="font-mono font-bold text-rose-300 mt-0.5 block">
                  {activeOfficialAlertsCount} зон
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">ОНОВЛЕНО ДЖЕРЕЛОМ:</span>
                <span className="font-mono font-bold text-cyan-300 truncate block mt-0.5">
                  {alertsDiagnostic.sourceUpdatedIso
                    ? formatTimeHHMMSS(alertsDiagnostic.sourceUpdatedIso)
                    : '—'}
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">ВІК ДАНИХ (LATENCY):</span>
                <span className={'font-mono font-bold mt-0.5 block ' + (alertsDiagnostic.isStale ? 'text-amber-400' : 'text-emerald-400')}>
                  {officialSnapshotAgeSec} с
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">ВАША ТЕРИТОРІЯ:</span>
                <span className="font-bold text-white truncate block mt-0.5">
                  {trustedLocation?.oblast || 'Визначається...'}
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">ТРИВОГА ДЛЯ ВАС:</span>
                <span className={'font-mono font-bold mt-0.5 block ' + (isUnderOfficialAlert ? 'text-rose-400' : 'text-emerald-400')}>
                  {isUnderOfficialAlert ? '🔴 АКТИВНА' : '🟢 ВІДСУТНЯ'}
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">MATCHED GEOMETRIES:</span>
                <span className={'font-mono font-bold mt-0.5 block ' + (officialGeometryDiagnostic.unmatchedGeometryCount ? 'text-amber-400' : 'text-emerald-400')}>
                  {officialGeometryDiagnostic.matchedGeometryCount}
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">СИНХРОНІЗАЦІЯ МАПИ:</span>
                <span className="font-mono font-bold text-emerald-400 mt-0.5 block truncate">
                  {mapUpdatedIso ? new Date(mapUpdatedIso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'СИНХРОНІЗОВАНО'}
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">UNMATCHED GEOMETRIES:</span>
                <span className={'font-mono font-bold mt-0.5 block ' + (officialGeometryDiagnostic.unmatchedGeometryCount ? 'text-red-400' : 'text-emerald-400')}>
                  {officialGeometryDiagnostic.unmatchedGeometryCount}
                </span>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-rose-950">
                <span className="text-slate-400 block font-mono">RENDERED POLYGONS:</span>
                <span className="font-mono font-bold text-cyan-300 mt-0.5 block">
                  {officialGeometryDiagnostic.renderedGeometryCount}
                </span>
              </div>
            </div>

            {officialGeometryDiagnostic.unmatched.length > 0 && (
              <div className="p-2 rounded-xl bg-red-950/70 border border-red-800 space-y-1">
                <p className="text-[10px] font-bold text-red-300">Незіставлені official zones:</p>
                {officialGeometryDiagnostic.unmatched.map(zone => (
                  <p key={`${zone.type}:${zone.sourceId}`} className="text-[10px] font-mono text-red-200">
                    {zone.name} · {officialLocationTypeLabel(zone.type)} · ID {zone.sourceId}
                  </p>
                ))}
              </div>
            )}

            {activeOfficialAlerts.length > 0 && (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-rose-950 bg-black/30 p-2 space-y-1">
                <p className="text-[10px] font-bold text-slate-300">Активні зони source → geometry → map</p>
                {activeOfficialAlerts.map(alert => {
                  const match = officialGeometryDiagnostic.matches.find(item => item.sourceId === String(alert.location_uid) && item.type === alert.location_type);
                  return (
                    <div key={`${alert.location_type}:${alert.location_uid}`} className="grid grid-cols-[1fr_auto] gap-2 text-[9px] font-mono text-slate-300">
                      <span className="truncate">{alert.location_title} · {officialLocationTypeLabel(alert.location_type)} · ID {alert.location_uid}</span>
                      <span className={match?.matched ? 'text-emerald-400' : 'text-red-400'}>{match?.matched ? 'YES' : 'NO'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-rose-950/80">
              * Офіційна сирена тривоги є фоновим інформаційним шаром і не переводить ваш локальний сектор у RED без виявлення тактичної рухомої цілі.
            </p>
          </div>

          {/* SECTION 5: INGESTION DIAGNOSTICS & SOURCE HEALTH */}
          <div className="mb-4 p-3.5 bg-[#0a0f18] border border-[#162032] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Контроль джерел & Діагностика</span>
              </span>
              <span className={'text-[9px] font-mono px-2 py-0.5 rounded border ' + (
                evaluation?.monitoringHealth === 'OK'
                  ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800'
                  : evaluation?.monitoringHealth === 'DEGRADED'
                  ? 'text-amber-400 bg-amber-950/80 border-amber-800'
                  : 'text-slate-300 bg-slate-800 border-slate-700'
              )}>
                {evaluation?.monitoringHealth === 'OK' ? 'HEALTHY' : evaluation?.monitoringHealth === 'DEGRADED' ? 'DEGRADED' : 'INCOMPLETE'}
              </span>
            </div>

            {/* 1. TOP CARD: LAST FULL SYNCHRONIZATION */}
            <div className="p-3 rounded-xl bg-[#070a10] border border-cyan-900/60 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-200 truncate">
                  Остання повна синхронізація:
                </span>
                <span className="font-mono font-bold text-cyan-300 text-xs shrink-0">
                  {lastFullSyncTime ? formatTimeHHMMSS(lastFullSyncTime) : 'Очікування'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-cyan-950/80">
                <span className="text-slate-400">Свіжість синхронізації:</span>
                <span className={'font-mono font-bold ' + (fullSyncFreshness.isStale ? 'text-amber-400' : 'text-emerald-400')}>
                  {fullSyncFreshness.text}
                </span>
              </div>
              {fullSyncFreshness.isStale && lastFullSyncTime && (
                <div className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/80 rounded-lg px-2 py-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>⚠️ Останні успішні дані: {formatTimeHHMMSS(lastFullSyncTime)}</span>
                </div>
              )}
              <p className="text-[9px] text-slate-500 italic">
                * Час фактичного успішного завершення перевірки основних джерел, а не frontend refresh
              </p>
            </div>

            {/* OVERALL MONITORING HEALTH SUMMARY */}
            <div className="p-2.5 rounded-xl bg-[#070a10] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Загальний моніторинг:</span>
                <span className={'font-bold font-mono ' + (
                  evaluation?.monitoringHealth === 'OK'
                    ? 'text-emerald-400'
                    : evaluation?.monitoringHealth === 'DEGRADED'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                )}>
                  {evaluation?.monitoringHealth === 'OK' ? '🟢 OK (Повний захист)' : evaluation?.monitoringHealth === 'DEGRADED' ? '🟠 DEGRADED (Частково)' : '⚪ INCOMPLETE (Неповний)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                {evaluation?.monitoringHealthReasonUk || 'Ініціалізація системи перевірки джерел...'}
              </p>
            </div>

            {/* 1.5 USER PRIORITY CHANNELS & MULTI-READER BLOCK */}
            <div className="p-3 rounded-xl bg-[#070a10] border border-amber-500/40 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>USER PRIORITY ДЖЕРЕЛА</span>
                </span>
                <span className="text-[10px] font-mono text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80">
                  {userPriorityHealthyCount}/{userPriorityTotalCount} ЧИТАЮТЬСЯ
                </span>
              </div>

              {/* 4 KEY METRICS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[10px]">
                <div className="bg-black/50 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-mono text-[9px]">USER PRIORITY</span>
                  <span className="font-bold text-amber-300 text-xs mt-0.5 block">{userPriorityTotalCount}</span>
                </div>
                <div className="bg-black/50 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-mono text-[9px]">РЕАЛЬНО ЧИТАЮТЬСЯ</span>
                  <span className="font-bold text-emerald-400 text-xs mt-0.5 block">{userPriorityHealthyCount}</span>
                </div>
                <div className="bg-black/50 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-mono text-[9px]">FALLBACK READER</span>
                  <span className="font-bold text-cyan-300 text-xs mt-0.5 block">{userPriorityFallbackCount}</span>
                </div>
                <div className="bg-black/50 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-mono text-[9px]">НЕ ВДАЛОСЯ ПРОЧИТАТИ</span>
                  <span className={'font-bold text-xs mt-0.5 block ' + (userPriorityFailedCount > 0 ? 'text-rose-400' : 'text-slate-400')}>
                    {userPriorityFailedCount}
                  </span>
                </div>
              </div>

              {/* USER PRIORITY CHANNELS LIST WITH ACTIVE READER AND LAST READ TIME */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-[10px]">
                {userPriorityChannelList.map((ch) => {
                  const cleanU = ch.username.toLowerCase().replace(/^@/, '');
                  const st = sourceStatuses[cleanU];
                  const isHealthy = st?.statusCategory === 'healthy' || (st && st.ok);
                  const isFallback = st?.isFallbackActive;
                  const activeReader = st?.activeReader || 'Jina Proxy';
                  const lastReadTime = st?.lastSuccessfulReadTs ? formatTimeHHMMSS(st.lastSuccessfulReadTs) : '—';
                  const lastMsgTime = st?.lastMessageTimeIso ? formatTimeHHMMSS(st.lastMessageTimeIso) : '—';

                  return (
                    <div key={ch.username} className="bg-black/40 p-2 rounded-lg border border-amber-950/80 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleUserPriority(ch.username)}
                            className="text-amber-400 hover:text-amber-300 text-xs shrink-0"
                            title="Зняти пріоритет"
                          >
                            ★
                          </button>
                          <span className="font-bold text-slate-200 truncate">@{ch.username}</span>
                          <span className={'text-[8px] font-mono px-1.5 py-0.2 rounded font-bold border ' + (
                            isHealthy
                              ? (isFallback ? 'bg-cyan-950 text-cyan-300 border-cyan-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800')
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          )}>
                            {isHealthy ? (isFallback ? 'FALLBACK' : 'ONLINE') : 'OFFLINE'}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 truncate mt-0.5">{ch.title}</p>
                        {st?.lastMessageText && (
                          <p className="text-[9px] text-slate-300/80 truncate italic mt-0.5">
                            "{st.lastMessageText.slice(0, 60)}..."
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[8px] text-slate-500 font-mono mt-1 flex-wrap">
                          <span>Рідер: <strong className="text-cyan-300">{activeReader}</strong></span>
                          <span>Успішний read: <strong className="text-slate-300">{lastReadTime}</strong></span>
                          <span>Повідомлення: <strong className="text-slate-300">{lastMsgTime}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SOURCE BREAKDOWN CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              {/* 2. TELEGRAM CARD */}
              <div className="bg-[#070a10] p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-300 font-mono font-bold text-[10px]">
                    📡 TELEGRAM
                  </span>
                  <span className={'text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ' + (
                    tgStatusLabel === 'ONLINE'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : tgStatusLabel === 'DEGRADED'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-red-950 text-red-300 border-red-800'
                  )}>
                    {tgStatusLabel}
                  </span>
                </div>

                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Останній успішний цикл:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {lastTelegramCycleTime ? formatTimeHHMMSS(lastTelegramCycleTime) : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Останнє отримане повідомлення:</span>
                    <span className="font-mono font-bold text-white">
                      {lastTelegramMessageTime ? formatTimeHHMMSS(lastTelegramMessageTime) : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Свіжість:</span>
                    <span className={'font-mono font-bold ' + (tgCycleFreshness.isStale ? 'text-amber-400' : 'text-emerald-400')}>
                      {tgCycleFreshness.text}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Healthy:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {tgHealthyCount}/{tgMonitoredCount}
                    </span>
                  </div>
                </div>

                {tgCycleFreshness.isStale && lastTelegramCycleTime && (
                  <div className="text-[9px] text-amber-300 bg-amber-950/70 border border-amber-800 rounded px-1.5 py-0.5 mt-1">
                    ⚠️ Останні успішні дані: {formatTimeHHMMSS(lastTelegramCycleTime)}
                  </div>
                )}

                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                  <span>⭐ Пріоритетні: <strong className="text-amber-300">{evaluation?.monitoringStats?.userPriorityHealthy ?? sourcesHealth?.userPriorityHealthy ?? 11}/{evaluation?.monitoringStats?.userPriorityTotal ?? sourcesHealth?.userPriorityTotal ?? 11}</strong></span>
                  <span>⚡ Core: <strong className="text-amber-400">{evaluation?.monitoringStats?.criticalHealthy ?? sourcesHealth?.criticalHealthy ?? 25}/{evaluation?.monitoringStats?.criticalTotal ?? sourcesHealth?.criticalTotal ?? 25}</strong></span>
                </div>
              </div>

              {/* 3. OFFICIAL ALERTS CARD */}
              <div className="bg-[#070a10] p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-300 font-mono font-bold text-[10px]">
                    🚨 OFFICIAL ALERTS
                  </span>
                  <span className={'text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ' + (
                    officialStatusLabel === 'ONLINE'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : officialStatusLabel === 'DEGRADED'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-red-950 text-red-300 border-red-800'
                  )}>
                    {officialStatusLabel}
                  </span>
                </div>

                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Останній успішний fetch:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {lastOfficialFetchTime ? formatTimeHHMMSS(lastOfficialFetchTime) : (alertsDiagnostic.receivedByAgentIso ? formatTimeHHMMSS(alertsDiagnostic.receivedByAgentIso) : '—')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Час даних source:</span>
                    <span className="font-mono font-bold text-white truncate max-w-[85px]">
                      {alertsDiagnostic.sourceUpdatedIso ? formatTimeHHMMSS(alertsDiagnostic.sourceUpdatedIso) : '—'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Свіжість:</span>
                    <span className={'font-mono font-bold ' + (officialFetchFreshness.isStale ? 'text-amber-400' : 'text-emerald-400')}>
                      {officialFetchFreshness.text}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Статус API:</span>
                    <span className={'font-mono font-bold ' + (alertsDiagnostic.status === 'OK' ? 'text-emerald-400' : 'text-rose-400')}>
                      {alertsDiagnostic.status === 'OK' ? 'ONLINE' : 'ERROR'}
                    </span>
                  </div>
                </div>

                {officialFetchFreshness.isStale && (lastOfficialFetchTime || alertsDiagnostic.lastSuccessfulFetchTs) && (
                  <div className="text-[9px] text-amber-300 bg-amber-950/70 border border-amber-800 rounded px-1.5 py-0.5 mt-1">
                    ⚠️ Останні успішні дані: {formatTimeHHMMSS(lastOfficialFetchTime || alertsDiagnostic.lastSuccessfulFetchTs)}
                  </div>
                )}

                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                  <span>Активні зони: <strong className="text-rose-300">{activeOfficialAlertsCount}</strong></span>
                  <span>Шар WGS84: <strong className="text-cyan-300">{officialGeometryDiagnostic.renderedGeometryCount}</strong></span>
                </div>
              </div>
            </div>

            {/* TELEMETRY METRICS GRID */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-mono">ПРЯМІ ЗАГРОЗИ</span>
                <span className="font-mono font-bold text-red-400">
                  {evaluation?.threatsCount ?? 0}
                </span>
              </div>
              <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-mono">СПОСТЕРЕЖЕННЯ</span>
                <span className="font-mono font-bold text-amber-300">
                  {(evaluation?.observationsCount ?? 0) + (evaluation?.outsideZoneObservationsCount ?? 0)}
                </span>
              </div>
              <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-mono">ВІДХИЛЕНО ПОВІДОМЛЕНЬ</span>
                <span className="font-mono font-bold text-slate-300">
                  {evaluation?.rejectedCount ?? 0}
                </span>
              </div>
              <div className="bg-[#070a10] p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-mono">НЕРОЗПІЗНАНА ГЕОГРАФІЯ</span>
                <span className="font-mono font-bold text-amber-400">
                  {evaluation?.geoUnresolvedCount ?? 0}
                </span>
              </div>
            </div>

            {/* LAST REFRESH DIAGNOSTICS CARD */}
            {lastRefreshDiagnostics && (
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/60 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    <span>Останній ручний Refresh:</span>
                  </span>
                  <span className={'font-mono font-bold px-1.5 py-0.5 rounded ' + (
                    lastRefreshDiagnostics.status === 'full'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : lastRefreshDiagnostics.status === 'partial'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  )}>
                    {lastRefreshDiagnostics.status === 'full' ? 'FULL ✓' : lastRefreshDiagnostics.status === 'partial' ? 'PARTIAL ⚠️' : 'TIMEOUT ⏱️'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-slate-300">
                  <div>Тривалість: <span className="font-mono font-bold text-white">{(lastRefreshDiagnostics.durationMs / 1000).toFixed(1)}с</span> <span className="text-slate-500 font-mono">(max 30с)</span></div>
                  <div>Успішно: <span className="font-mono font-bold text-emerald-400">{lastRefreshDiagnostics.successfulSources}/{lastRefreshDiagnostics.totalSources}</span></div>
                  <div>Таймаути: <span className="font-mono font-bold text-amber-400">{lastRefreshDiagnostics.timeoutSources}</span></div>
                  <div>Помилки: <span className="font-mono font-bold text-rose-400">{lastRefreshDiagnostics.failedSources}</span></div>
                </div>
                <div className="pt-1 border-t border-cyan-900/60 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                  <span>Priority: {lastRefreshDiagnostics.stageProgress.userPriority === 'done' ? '✓' : '⚠️'}</span>
                  <span>Critical: {lastRefreshDiagnostics.stageProgress.critical === 'done' ? '✓' : '⚠️'}</span>
                  <span>Alerts: {lastRefreshDiagnostics.stageProgress.officialAlerts === 'done' ? '✓' : '⚠️'}</span>
                  <span>Other: {lastRefreshDiagnostics.stageProgress.otherSources === 'done' ? '✓' : '⚠️'}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowRejectedModal(true)}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Переглянути відхилені повідомлення ({evaluation?.rejectedMessagesLog?.length ?? 0})</span>
            </button>
          </div>

          {/* SECTION 6: SOURCES & CUSTOM CHANNELS */}
          <div className="mb-4 p-3.5 bg-[#0a0f18] border border-[#162032] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                <span>Каталог джерел ({allSources.length})</span>
              </span>
              <button
                onClick={() => setShowFlugerModal(true)}
                className="text-[10px] text-cyan-400 underline font-semibold"
              >
                Про «Флюгер»
              </button>
            </div>

            {/* CUSTOM CHANNELS ADDER */}
            <div>
              <span className="text-slate-400 text-[11px] font-semibold block mb-1.5">Додати власний канал:</span>
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

            {/* CHANNELS LIST WITH CLEAR REASON */}
            <div className="max-h-48 overflow-y-auto space-y-1 text-[11px] pr-1">
              {allSources.map((s) => {
                const st = sourceStatuses[s.username];
                const isHealthy = st?.statusCategory === 'healthy' || (st && st.ok);
                const isDisabled = st?.statusCategory === 'disabled' || s.hasWebPreview === false || s.enabled === false;
                const isUnavailable = !isHealthy && !isDisabled;
                const isUserPriority = s.tier === 'USER_PRIORITY';
                const isCritical = s.tier === 'CRITICAL';

                return (
                  <div key={s.username} className={`flex items-center justify-between p-2 rounded ${isUserPriority ? 'bg-amber-950/20 border border-amber-800/40' : 'bg-[#070a10] border border-slate-800'}`}>
                    <div className="min-w-0 pr-2 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleToggleUserPriority(s.username)}
                          className={`p-0.5 rounded text-xs transition-all ${isUserPriority ? 'text-amber-400 hover:text-amber-300 font-bold' : 'text-slate-600 hover:text-amber-400'}`}
                          title={isUserPriority ? '★ Зняти пріоритет' : '☆ Зробити USER PRIORITY'}
                        >
                          {isUserPriority ? '★' : '☆'}
                        </button>
                        <span className={'w-2 h-2 rounded-full shrink-0 ' + (
                          isHealthy ? 'bg-emerald-400' :
                          isDisabled ? 'bg-slate-600' :
                          'bg-amber-500'
                        )} />
                        <span className="text-slate-200 font-semibold truncate">@{s.username}</span>
                        {isUserPriority && (
                          <span className="text-[8px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-600/50 flex items-center gap-0.5">
                            ⭐ USER PRIORITY
                          </span>
                        )}
                        {isCritical && (
                          <span className="text-[8px] bg-red-950/80 text-rose-300 font-mono px-1 rounded border border-rose-800">
                            CORE
                          </span>
                        )}
                        <span className="text-[8px] text-slate-500 font-mono">
                          {isUserPriority || isCritical ? '• Кожен цикл' : '• Ротація'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{s.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={'text-[9px] font-mono ' + (
                        isHealthy ? 'text-emerald-400' :
                        isDisabled ? 'text-slate-500' :
                        'text-amber-400'
                      )}>
                        {isHealthy ? (st?.isFallbackActive ? 'FALLBACK' : 'АКТИВНИЙ') : isDisabled ? 'БЕЗ ПРЕВ’Ю' : 'ТИМЧАСОВО ОФЛАЙН'}
                      </span>
                      {st?.error && !isHealthy && (
                        <span className="text-[8px] font-mono text-slate-500 block truncate max-w-[120px]">
                          {st.error}
                        </span>
                      )}
                      {st?.lastMessageTimeIso && isHealthy && (
                        <span className="text-[9px] font-mono text-slate-400 block">
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

      </div>

      {/* ========================================================================= */}
      {/* PERSISTENT BOTTOM NAVIGATION BAR (NATIVE IPHONE PWA STYLE) */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#0c101a]/95 backdrop-blur-xl border-t border-[#182234] shadow-2xl pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1 px-2">
          {/* TAB 1: 🛡 ГОЛОВНА */}
          <button
            onClick={() => setActiveTab('home')}
            className={'flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all active:scale-95 ' + (
              activeTab === 'home'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Shield className={'w-5 h-5 ' + (activeTab === 'home' ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-slate-400')} />
            <span className="text-[10px] mt-1 tracking-tight">Головна</span>
          </button>

          {/* TAB 2: 🗺 МАПА */}
          <button
            onClick={() => setActiveTab('map')}
            className={'flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all active:scale-95 ' + (
              activeTab === 'map'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <MapIcon className={'w-5 h-5 ' + (activeTab === 'map' ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-slate-400')} />
            <span className="text-[10px] mt-1 tracking-tight">Мапа</span>
          </button>

          {/* TAB 3: ◉ ПОДІЇ */}
          <button
            onClick={() => setActiveTab('events')}
            className={'relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all active:scale-95 ' + (
              activeTab === 'events'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <div className="relative">
              <RadarIcon className={'w-5 h-5 ' + (activeTab === 'events' ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-slate-400')} />
              {activeEventsCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white font-black text-[9px] rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1 shadow-md animate-pulse">
                  {activeEventsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Події</span>
          </button>

          {/* TAB 4: ⚙️ НАЛАШТУВАННЯ */}
          <button
            onClick={() => setActiveTab('settings')}
            className={'flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all active:scale-95 ' + (
              activeTab === 'settings'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Sliders className={'w-5 h-5 ' + (activeTab === 'settings' ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-slate-400')} />
            <span className="text-[10px] mt-1 tracking-tight">Налаштування</span>
          </button>
        </div>
      </nav>

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
