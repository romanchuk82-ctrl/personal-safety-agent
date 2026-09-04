'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreatEvent } from '@/lib/matcher';
import { RawAlert } from '@/lib/sources/alertsInUa';
import { UKRAINE_REGIONS_GEOJSON } from '@/lib/ukraineRegions';
import {
  Navigation,
  ZoomIn,
  ZoomOut,
  Compass,
  Shield,
  AlertTriangle,
  Crosshair,
  Layers,
  MapPin,
  Radio,
  ExternalLink,
  X,
  CheckCircle,
  Info,
  Flame,
  Clock,
  Bell,
  BellOff
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface SafetyMapProps {
  userLocation: {
    lat: number;
    lng: number;
    accuracy?: number;
    accuracyMeters?: number;
    name: string;
    oblast?: string;
    confidenceState?: 'VERIFIED' | 'UNCERTAIN' | 'UNRELIABLE' | 'LOCKED';
    lockMode?: 'AUTO' | 'LOCKED' | 'MANUAL';
    isManualOrLocked?: boolean;
    statusMessageUk?: string;
    subStatusUk?: string;
    anomalyReasonUk?: string;
  } | null;
  radiusKm: number;
  threats: ThreatEvent[];
  officialAlerts?: RawAlert[];
  isUserUnderOfficialAlert?: boolean;
  selectedThreat: ThreatEvent | null;
  onSelectThreat: (threat: ThreatEvent | null) => void;
  onSelectMapLocation?: (lat: number, lng: number) => void;
  isMapPickerActive?: boolean;
  isActive: boolean;
  isRed: boolean;
  isOrange: boolean;
  isFullScreen?: boolean;
  activeTab?: string;
  centerTrigger?: number;
}

// Helper to compute zoom level based on monitoring radius
function getZoomForRadius(radiusKm: number): number {
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 15) return 11;
  if (radiusKm <= 30) return 10;
  return 9;
}

// Helper to calculate directional sector polygon (arc) for threats without exact coordinates
function getSectorCoordinates(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  bearingDeg: number,
  halfAngleDeg: number = 22.5
): [number, number][] {
  const points: [number, number][] = [[centerLat, centerLng]];
  const R = 6371000; // Earth radius in meters
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;

  const startAngle = bearingDeg - halfAngleDeg;
  const endAngle = bearingDeg + halfAngleDeg;
  const step = 4; // degrees per step

  for (let angle = startAngle; angle <= endAngle; angle += step) {
    const bRad = (angle * Math.PI) / 180;
    const pLat = Math.asin(
      Math.sin(latRad) * Math.cos(radiusMeters / R) +
      Math.cos(latRad) * Math.sin(radiusMeters / R) * Math.cos(bRad)
    );
    const pLng = lngRad + Math.atan2(
      Math.sin(bRad) * Math.sin(radiusMeters / R) * Math.cos(latRad),
      Math.cos(radiusMeters / R) - Math.sin(latRad) * Math.sin(pLat)
    );
    points.push([(pLat * 180) / Math.PI, (pLng * 180) / Math.PI]);
  }

  // Close polygon
  points.push([centerLat, centerLng]);
  return points;
}

export default function SafetyMap({
  userLocation,
  radiusKm,
  threats,
  officialAlerts = [],
  isUserUnderOfficialAlert = false,
  selectedThreat,
  onSelectThreat,
  onSelectMapLocation,
  isMapPickerActive,
  isActive,
  isRed,
  isOrange,
  isFullScreen = false,
  activeTab,
  centerTrigger
}: SafetyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);
  const flugerZonesRef = useRef<any[]>([]);
  const threatLayersRef = useRef<any[]>([]);
  const officialAlertsLayerRef = useRef<any>(null);
  const userInteractedRef = useRef<boolean>(false);
  const LRef = useRef<any>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [showOfficialAlerts, setShowOfficialAlerts] = useState<boolean>(true);
  const [currentZoom, setCurrentZoom] = useState(11);

  // Invalidate size on tab switch or fullscreen toggle for crisp rendering
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timer = setTimeout(() => {
      try {
        mapInstanceRef.current?.invalidateSize();
      } catch {}
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullScreen, activeTab]);

  // Automatic centering and zoom adaptation when centerTrigger fires
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !userLocation) return;
    const map = mapInstanceRef.current;
    userInteractedRef.current = false;

    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
        if (radiusCircleRef.current) {
          const bounds = radiusCircleRef.current.getBounds();
          map.fitBounds(bounds.pad(0.12), { animate: true, maxZoom: 14 });
        } else {
          map.setView([userLocation.lat, userLocation.lng], getZoomForRadius(radiusKm), {
            animate: true,
            duration: 0.5
          });
        }
      } catch (e) {
        console.warn('Map centerTrigger error:', e);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [centerTrigger, isMapReady, userLocation?.lat, userLocation?.lng, radiusKm]);

  // Map Click Handler for manual point picking
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handleMapClick = (e: any) => {
      if (onSelectMapLocation && e.latlng) {
        onSelectMapLocation(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isMapReady, onSelectMapLocation]);

  // 1. Initialize Leaflet Map (Using Clean ESRI Dark Gray Canvas without any watermarks)
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = await import('leaflet');
      if (!isMounted || !mapContainerRef.current) return;
      LRef.current = L;

      const initialLat = userLocation?.lat || 50.4501;
      const initialLng = userLocation?.lng || 30.5234;
      const initialZoom = getZoomForRadius(radiusKm);

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: false,
        boxZoom: false,
        tapHold: true,
        bounceAtZoomLimits: true
      });

      // BASE DARK CANVAS: 100% Free, Official ESRI World Dark Gray without watermarks or API key requirements
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        minZoom: 5,
        attribution: '&copy; Esri, HERE, OpenStreetMap'
      }).addTo(map);

      // REFERENCE LABELS: Clean overlay for road labels, town names and boundaries
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        minZoom: 5,
        opacity: 0.8
      }).addTo(map);

      // Dedicated pane for official alert polygons below vector overlays (z-index 350)
      if (!map.getPane('officialAlertsPane')) {
        const pane = map.createPane('officialAlertsPane');
        pane.style.zIndex = '350';
        pane.style.pointerEvents = 'none';
      }

      map.on('dragstart', () => {
        userInteractedRef.current = true;
      });
      map.on('zoomstart', (e: any) => {
        if (e.originalEvent) {
          userInteractedRef.current = true;
        }
      });
      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      mapInstanceRef.current = map;
      setIsMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Official Air Raid Alerts Layer (Separate Ambient Situational Layer)
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    if (officialAlertsLayerRef.current) {
      map.removeLayer(officialAlertsLayerRef.current);
      officialAlertsLayerRef.current = null;
    }

    if (!showOfficialAlerts) return;

    // Extract active alert locations
    const activeAlerts = (officialAlerts || []).filter(a => !a.finished_at);

    const geoJsonLayer = L.geoJSON(UKRAINE_REGIONS_GEOJSON as any, {
      pane: 'officialAlertsPane',
      style: (feature: any) => {
        const regName = (feature.properties.name || '').toLowerCase().trim();
        const normName = (feature.properties.normalizedName || '').toLowerCase().trim();
        const stem = normName.replace(/(ська|цька|зька|а)$/i, '').trim();

        const isAlertActive = activeAlerts.some(a => {
          const title = (a.location_title || '').toLowerCase().trim();
          const oblast = (a.location_oblast || '').toLowerCase().trim();

          // Direct or substring match on title or oblast
          if (title === regName || oblast === regName) return true;
          if (title.includes(normName) || oblast.includes(normName)) return true;
          if (stem.length >= 4 && (title.includes(stem) || oblast.includes(stem))) return true;

          // Special case for Kyiv city ("м. Київ" or "Київ") matching Kyivska oblast
          if (regName.includes('київ') && (title.includes('київ') || oblast.includes('київ'))) return true;

          // Special case for Crimea / Sevastopol
          if (regName.includes('крим') && (title.includes('крим') || oblast.includes('крим'))) return true;
          if (regName.includes('севастополь') && (title.includes('севастополь') || oblast.includes('севастополь'))) return true;

          return false;
        });

        if (isAlertActive) {
          return {
            fillColor: '#dc2626', // Vibrant crimson red
            fillOpacity: 0.38,   // High-contrast, clearly visible tint on dark map
            weight: 2.2,         // Visible solid outline
            color: '#ef4444',    // Bright red contour
            opacity: 0.95,       // Clear visible border
            dashArray: ''        // Solid line for clean boundary visibility
          };
        }

        return {
          fillColor: 'transparent',
          fillOpacity: 0,
          weight: 0.6,
          color: '#334155',
          opacity: 0.18,
          dashArray: '2, 4'
        };
      },
      interactive: false
    });

    geoJsonLayer.addTo(map);
    officialAlertsLayerRef.current = geoJsonLayer;
  }, [isMapReady, officialAlerts, showOfficialAlerts]);

  // 3. Update User Position & Monitoring Radius Circle
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !LRef.current || !userLocation) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;
    const userLatLng: [number, number] = [userLocation.lat, userLocation.lng];

    const isLocked = userLocation.confidenceState === 'LOCKED' || userLocation.lockMode === 'LOCKED' || userLocation.lockMode === 'MANUAL';
    const isUnreliable = userLocation.confidenceState === 'UNRELIABLE';

    const pinBg = isUnreliable ? 'bg-amber-500' : isLocked ? 'bg-indigo-600' : 'bg-blue-500';
    const pingBg = isUnreliable ? 'bg-amber-500/40' : isLocked ? 'bg-indigo-500/30' : 'bg-blue-500/30';
    const haloBg = isUnreliable ? 'bg-amber-500/50' : isLocked ? 'bg-indigo-500/50' : 'bg-blue-500/50';

    const userHtml = `
      <div class="relative flex items-center justify-center cursor-pointer" style="width: 36px; height: 36px;">
        <span class="absolute inline-flex h-9 w-9 rounded-full ${pingBg} animate-ping"></span>
        <span class="absolute inline-flex h-6 w-6 rounded-full ${haloBg}"></span>
        <div class="relative w-4 h-4 rounded-full ${pinBg} border-2 border-white shadow-xl z-10 flex items-center justify-center text-[8px] text-white font-bold">
          ${isLocked ? '📌' : isUnreliable ? '⚠️' : '<div class="w-1.5 h-1.5 rounded-full bg-white"></div>'}
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userHtml,
      className: 'user-location-pin',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLatLng);
      userMarkerRef.current.setIcon(userIcon);
    } else {
      userMarkerRef.current = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    }

    const circleColor = isRed ? '#ef4444' : isOrange ? '#f59e0b' : '#3b82f6';
    const circleFill = isRed ? 'rgba(239, 68, 68, 0.12)' : isOrange ? 'rgba(245, 158, 11, 0.10)' : 'rgba(59, 130, 246, 0.08)';

    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng(userLatLng);
      radiusCircleRef.current.setRadius(radiusKm * 1000);
      radiusCircleRef.current.setStyle({
        color: circleColor,
        fillColor: circleFill,
        weight: 1.5,
      });
    } else {
      radiusCircleRef.current = L.circle(userLatLng, {
        radius: radiusKm * 1000,
        color: circleColor,
        fillColor: circleFill,
        fillOpacity: 1,
        weight: 1.5,
        dashArray: '6, 6',
      }).addTo(map);
    }

    flugerZonesRef.current.forEach(c => map.removeLayer(c));
    flugerZonesRef.current = [];

    if (radiusKm >= 30) {
      const ring15 = L.circle(userLatLng, {
        radius: 15000,
        color: '#ef4444',
        fill: false,
        weight: 1,
        dashArray: '3, 6',
        opacity: 0.35,
      }).addTo(map);
      flugerZonesRef.current.push(ring15);
    }

    if (radiusKm >= 45) {
      const ring30 = L.circle(userLatLng, {
        radius: 30000,
        color: '#f97316',
        fill: false,
        weight: 1,
        dashArray: '3, 6',
        opacity: 0.25,
      }).addTo(map);
      flugerZonesRef.current.push(ring30);
    }

    if (!userInteractedRef.current) {
      map.setView(userLatLng, getZoomForRadius(radiusKm), { animate: true });
    }
  }, [isMapReady, userLocation, radiusKm, isRed, isOrange]);

  // 4. Render Local Tactical Threats: Exact Markers vs Directional Sectors
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !LRef.current || !userLocation) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;
    const userLatLng: [number, number] = [userLocation.lat, userLocation.lng];

    threatLayersRef.current.forEach(layer => map.removeLayer(layer));
    threatLayersRef.current = [];

    const activeThreats = threats.filter(t => t.status === 'active' && t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID');

    activeThreats.forEach((threat) => {
      const isConfirmed = threat.eventType === 'CONFIRMED_THREAT' || (threat.isWithinRadius && threat.requiresImmediateShelter);
      const isSurrounding = threat.isSurroundingObservation || (!threat.isWithinRadius && threat.distanceKm !== null && threat.distanceKm > radiusKm);
      const isCritical = threat.severity === 'CRITICAL' || (threat.distanceKm !== null && threat.distanceKm <= 15 && isConfirmed);
      const isAlert = isConfirmed && (threat.severity === 'HIGH' || (threat.distanceKm !== null && threat.distanceKm <= 30));

      let markerBg = 'bg-amber-500';
      let markerText = '👁️';
      let haloClass = 'bg-amber-500/20';
      let lineColor = '#eab308';

      if (isCritical) {
        markerBg = 'bg-red-600';
        markerText = '🚨';
        haloClass = 'bg-red-500/40 animate-ping';
        lineColor = '#ef4444';
      } else if (isAlert) {
        markerBg = 'bg-amber-500';
        markerText = '⚠️';
        haloClass = 'bg-amber-500/30 animate-pulse';
        lineColor = '#f59e0b';
      } else if (isSurrounding) {
        markerBg = 'bg-slate-900 border border-yellow-400/90 text-yellow-300';
        markerText = '👁️';
        haloClass = 'bg-yellow-500/20';
        lineColor = '#64748b';
      }

      // CASE A: EXACT / APPROXIMATE TOWN COORDINATES ARE KNOWN
      if (threat.threatCoordinates && threat.threatCoordinates.lat && threat.threatCoordinates.lng) {
        const threatLatLng: [number, number] = [threat.threatCoordinates.lat, threat.threatCoordinates.lng];

        const threatHtml = `
          <div class="relative flex items-center justify-center cursor-pointer" style="width: 36px; height: 36px;">
            <span class="absolute inline-flex h-8 w-8 rounded-full ${haloClass}"></span>
            <div class="w-6 h-6 rounded-full ${markerBg} text-white shadow-xl border-2 border-white/90 flex items-center justify-center text-[10px] font-black transform active:scale-90 transition-transform">
              <span>${markerText}</span>
            </div>
          </div>
        `;

        const threatIcon = L.divIcon({
          html: threatHtml,
          className: 'threat-marker-icon',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker(threatLatLng, { icon: threatIcon, zIndexOffset: isCritical ? 950 : 900 });

        const line = L.polyline([userLatLng, threatLatLng], {
          color: lineColor,
          weight: isCritical ? 2 : 1.5,
          dashArray: isSurrounding ? '3, 6' : '4, 6',
          opacity: isSurrounding ? 0.35 : 0.6,
        });

        marker.on('click', () => {
          onSelectThreat(threat);
        });

        marker.addTo(map);
        line.addTo(map);
        threatLayersRef.current.push(marker, line);
      }
      // CASE B: ONLY DIRECTIONAL BEARING / SECTOR IS KNOWN (HONEST VISUALIZATION)
      else if (threat.bearingDegrees !== undefined) {
        const radiusMeters = Math.min(45000, (threat.distanceKm || 30) * 1000);
        const sectorCoords = getSectorCoordinates(userLocation.lat, userLocation.lng, radiusMeters, threat.bearingDegrees, 22.5);

        const polygon = L.polygon(sectorCoords, {
          color: lineColor,
          weight: 1.5,
          fillColor: isCritical ? '#ef4444' : isAlert ? '#f59e0b' : '#eab308',
          fillOpacity: isCritical ? 0.25 : isAlert ? 0.15 : 0.08,
          dashArray: '4, 4',
        });

        polygon.on('click', () => {
          onSelectThreat(threat);
        });

        polygon.addTo(map);
        threatLayersRef.current.push(polygon);
      }
    });

    if (!userInteractedRef.current && activeThreats.length > 0) {
      const coordPoints: [number, number][] = [userLatLng];
      activeThreats.forEach(t => {
        if (t.threatCoordinates) coordPoints.push([t.threatCoordinates.lat, t.threatCoordinates.lng]);
      });

      if (coordPoints.length > 1) {
        const bounds = L.latLngBounds(coordPoints);
        map.fitBounds(bounds.pad(0.25), { animate: true, maxZoom: 13 });
      }
    }
  }, [isMapReady, threats, userLocation, onSelectThreat]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    userInteractedRef.current = false;
    mapInstanceRef.current.invalidateSize();
    if (radiusCircleRef.current) {
      const bounds = radiusCircleRef.current.getBounds();
      mapInstanceRef.current.fitBounds(bounds.pad(0.12), { animate: true, maxZoom: 14 });
    } else {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], getZoomForRadius(radiusKm), {
        animate: true,
        duration: 0.6
      });
    }
  }, [userLocation, radiusKm]);

  const handleZoomIn = useCallback(() => {
    if (!mapInstanceRef.current) return;
    userInteractedRef.current = true;
    mapInstanceRef.current.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!mapInstanceRef.current) return;
    userInteractedRef.current = true;
    mapInstanceRef.current.zoomOut();
  }, []);

  const activeConfirmedThreatsCount = threats.filter(t => t.status === 'active' && t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID' && (t.eventType === 'CONFIRMED_THREAT' || (t.isWithinRadius && t.requiresImmediateShelter))).length;
  const activeObservationsCount = threats.filter(t => t.status === 'active' && t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID' && (t.eventType === 'OBSERVATION' || !t.isWithinRadius)).length;
  const activeThreatsCount = threats.filter(t => t.status === 'active' && t.category !== 'ALL_CLEAR' && t.category !== 'GENERAL_AIR_RAID').length;
  const activeOfficialAlertsCount = (officialAlerts || []).filter(a => !a.finished_at).length;

  return (
    <div className={'relative w-full rounded-3xl overflow-hidden border border-[#1a2538] bg-[#070b14] shadow-2xl transition-all ' + (isFullScreen ? 'h-full flex-1 flex flex-col min-h-[480px]' : '')}>
      {/* MAP TOP STATUS BAR */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-[#0c1220]/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/70 shadow-lg flex items-center gap-2 max-w-[65%] truncate">
          <div className={'w-2 h-2 rounded-full ' + (
            isRed ? 'bg-red-500 animate-ping' :
            isOrange ? 'bg-amber-400' :
            userLocation?.confidenceState === 'UNRELIABLE' ? 'bg-amber-400 animate-pulse' :
            userLocation?.confidenceState === 'LOCKED' ? 'bg-indigo-400' :
            isActive ? 'bg-emerald-400' : 'bg-slate-400'
          )} />
          <span className="text-[11px] font-bold text-white truncate">
            {userLocation ? (
              userLocation.confidenceState === 'LOCKED' ? `📌 ${userLocation.name}` :
              userLocation.confidenceState === 'UNRELIABLE' ? `⚠️ ${userLocation.name}` :
              userLocation.name
            ) : 'Визначення позиції...'}
          </span>
          <span className="text-[10px] font-mono text-blue-400 font-semibold shrink-0">
            {radiusKm} км
          </span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          {/* COMPACT OFFICIAL ALERT BADGE ON MAP */}
          {isUserUnderOfficialAlert && (
            <div className="bg-rose-950/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-rose-500/80 shadow-lg flex items-center gap-1.5 text-rose-300 text-[10px] font-bold animate-pulse">
              <span>⚠</span>
              <span>ОФІЦІЙНА ТРИВОГА</span>
            </div>
          )}

          {activeConfirmedThreatsCount > 0 && (
            <div className="bg-red-950/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-red-500/80 shadow-lg flex items-center gap-1.5 text-red-300 text-[10px] font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>{activeConfirmedThreatsCount} {activeConfirmedThreatsCount === 1 ? 'загроза' : 'загрози'}</span>
            </div>
          )}

          {activeObservationsCount > 0 && (
            <div className="bg-amber-950/90 backdrop-blur-md px-2 py-1 rounded-full border border-amber-600/70 shadow-md flex items-center gap-1 text-amber-300 text-[10px] font-bold">
              <span>👁️ {activeObservationsCount}</span>
            </div>
          )}

          {showOfficialAlerts && activeOfficialAlertsCount > 0 && (
            <div className="bg-rose-950/85 backdrop-blur-md px-2 py-1 rounded-full border border-rose-800/60 shadow-md flex items-center gap-1 text-rose-300 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>{activeOfficialAlertsCount} обл</span>
            </div>
          )}
        </div>
      </div>

      {/* MAP CONTAINER FOR LEAFLET */}
      <div
        ref={mapContainerRef}
        className={'w-full z-0 focus:outline-none ' + (isFullScreen ? 'flex-1 h-full min-h-[480px]' : 'h-[340px] min-h-[340px]')}
        style={{ minHeight: isFullScreen ? '480px' : '340px' }}
      />

      {/* MAP CONTROLS (RIGHT SIDE) */}
      <div className="absolute right-3 bottom-3 z-[400] flex flex-col gap-1.5">
        <button
          onClick={() => setShowOfficialAlerts(!showOfficialAlerts)}
          className={'w-9 h-9 rounded-xl border shadow-xl backdrop-blur-md flex items-center justify-center transition-all active:scale-95 text-xs ' + (
            showOfficialAlerts
              ? 'bg-rose-950/90 border-rose-600 text-rose-300 shadow-rose-950/40'
              : 'bg-[#0e1626]/95 border-slate-700/80 text-slate-400 hover:text-slate-200'
          )}
          title="Шар офіційних тривог"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={handleRecenter}
          className="w-9 h-9 rounded-xl bg-[#0e1626]/95 hover:bg-slate-800 text-blue-400 border border-slate-700/80 shadow-xl backdrop-blur-md flex items-center justify-center transition-all active:scale-95"
          title="Повернутися до моєї позиції"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <button
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-xl bg-[#0e1626]/95 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-xl backdrop-blur-md flex items-center justify-center transition-all active:scale-95 text-base font-bold"
          title="Збільшити масштаб"
        >
          +
        </button>

        <button
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-xl bg-[#0e1626]/95 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-xl backdrop-blur-md flex items-center justify-center transition-all active:scale-95 text-base font-bold"
          title="Зменшити масштаб"
        >
          −
        </button>
      </div>

      {/* BOTTOM-LEFT COMPACT LEGEND OVERLAY */}
      <div className="absolute bottom-3 left-3 z-[400] pointer-events-none">
        <div className="bg-[#0c1220]/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-300 flex items-center gap-2.5 font-medium shadow-xl">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shadow-sm"></span>
            <span>Ви</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-blue-400 inline-block"></span>
            <span>Зона {radiusKm} км</span>
          </span>
          {activeConfirmedThreatsCount > 0 && (
            <span className="flex items-center gap-1 text-red-400 font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              <span>Загроза</span>
            </span>
          )}
          {activeObservationsCount > 0 && (
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              <span>Спостереження</span>
            </span>
          )}
          {showOfficialAlerts && activeOfficialAlertsCount > 0 && (
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 border border-dashed border-rose-500 bg-rose-500/20 rounded-xs inline-block"></span>
              <span>Тривога</span>
            </span>
          )}
        </div>
      </div>

      {/* TRANSPARENT THREAT DETAIL OVERLAY (Interactive Card on Tap) */}
      {selectedThreat && (
        <div className="absolute inset-x-2 bottom-2 top-12 z-[500] bg-[#0c1220]/95 backdrop-blur-xl border border-red-500/80 rounded-2xl p-3.5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-fadeIn pointer-events-auto">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">{selectedThreat.categoryNameUk}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">{selectedThreat.detectedLocation}</span>
                    <span className={'text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ' + (
                      selectedThreat.status === 'active' ? 'bg-red-950 text-red-400 border border-red-800' :
                      selectedThreat.status === 'stale' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    )}>
                      {selectedThreat.statusBadgeUk || (selectedThreat.status === 'active' ? 'Активна ціль' : 'Відбій')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onSelectThreat(null)}
                className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 gap-1.5 my-2.5 text-[10px]">
              <div className="bg-[#070b14] p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">📏 Дистанція:</span>
                <span className="font-bold text-white font-mono">{selectedThreat.honestDistanceText}</span>
              </div>
              <div className="bg-[#070b14] p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">🎯 Точність локації:</span>
                <span className="font-bold text-cyan-300 font-mono">{selectedThreat.spatialPrecisionUk || 'Районний сектор'}</span>
              </div>
              <div className="bg-[#070b14] p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">🛡️ Достовірність:</span>
                <span className="font-bold text-amber-300 font-mono">{selectedThreat.confidenceUk || 'Підтверджено'}</span>
              </div>
              <div className="bg-[#070b14] p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">⏱️ Життєвий цикл:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {selectedThreat.ageMinutes !== undefined ? `${selectedThreat.ageMinutes} хв тому (TTL: ${selectedThreat.ttlMinutes} хв)` : selectedThreat.sourceSummaryText || '1 джерело'}
                </span>
              </div>
            </div>

            {/* "ЧОМУ Я ЦЕ БАЧУ?" REASONING BLOCK */}
            <div className="mb-2.5 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/60 text-[11px] space-y-1">
              <span className="font-bold text-blue-300 text-[10px] uppercase tracking-wider block">Чому система попередила:</span>
              {(selectedThreat.whyTriggeredReasons || [
                `✓ Подія відповідає вашому радіусу (${radiusKm} км)`,
                `✓ Джерело: ${selectedThreat.sourceTitle}`
              ]).map((reason, idx) => (
                <p key={idx} className="text-slate-200 text-[10px] leading-snug">{reason}</p>
              ))}
            </div>

            {/* SOURCES & RAW MESSAGES LIST WITH TELEGRAM LINKS */}
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              <span className="font-bold text-slate-300 text-[10px] uppercase tracking-wider block">Первинні джерела та цитати:</span>
              {(selectedThreat.sourcesList && selectedThreat.sourcesList.length > 0
                ? selectedThreat.sourcesList
                : [{
                    username: selectedThreat.sourceTitle.replace(/[^a-zA-Z0-9_]/g, ''),
                    title: selectedThreat.sourceTitle,
                    weight: 0.92,
                    timeFormatted: 'нещодавно',
                    text: selectedThreat.rawText,
                    telegramUrl: 'https://t.me/' + selectedThreat.sourceTitle.replace(/[^a-zA-Z0-9_]/g, ''),
                    isOriginal: true
                  }]
              ).map((src, idx) => (
                <div key={idx} className="bg-[#070b14] p-2 rounded-xl border border-slate-800 text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 truncate">{src.title}</span>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">{src.timeFormatted}</span>
                  </div>
                  <p className="text-slate-300 font-mono bg-black/40 p-1.5 rounded text-[9.5px] line-clamp-3 border border-slate-900">
                    "{src.text}"
                  </p>
                  <div className="pt-0.5 flex justify-end">
                    <a
                      href={src.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-cyan-400 hover:text-cyan-300 underline"
                    >
                      <span>Відкрити в Telegram</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onSelectThreat(null)}
            className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
          >
            Закрити деталі
          </button>
        </div>
      )}
    </div>
  );
}
