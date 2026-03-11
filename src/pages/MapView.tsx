import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ExternalLink, Building2, Crosshair, X, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import type { Audit } from '../lib/api';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Build a GeoJSON Polygon that approximates a circle.
 * @param center [lng, lat]
 * @param radiusKm radius in kilometres
 * @param steps number of polygon points (higher = smoother)
 */
function buildCircleGeoJSON(
  center: [number, number],
  radiusKm: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center;
  const earthRadiusKm = 6371;
  const coordinates: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusKm / earthRadiusKm) * (180 / Math.PI);
    const dLng =
      (radiusKm / (earthRadiusKm * Math.cos((lat * Math.PI) / 180))) *
      (180 / Math.PI);
    coordinates.push([
      lng + dLng * Math.cos(angle),
      lat + dLat * Math.sin(angle),
    ]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
    properties: {},
  };
}

const EMPTY_GEOJSON: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[]] },
  properties: {},
};

export default function MapView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const selectionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const selectionModeRef = useRef<boolean>(false);
  const mapLoadedRef = useRef<boolean>(false);

  // Selection / creation state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ lng: number; lat: number } | null>(null);
  const [selectionAddress, setSelectionAddress] = useState('');
  const [selectionCity, setSelectionCity] = useState('');
  const [selectionPostalCode, setSelectionPostalCode] = useState('');
  const [selectionRadius, setSelectionRadius] = useState(5);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['audits'],
    queryFn: () => api.getAudits(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createAudit({
        address: selectionAddress,
        city: selectionCity,
        postalCode: selectionPostalCode,
      }),
    onSuccess: (audit) => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      navigate(`/audit/${audit.id}`, { state: { autoGenerate: true } });
    },
  });

  const withCoords = audits.filter((a) => a.lat != null && a.lng != null);
  const withoutCoords = audits.filter((a) => a.lat == null || a.lng == null);

  // Keep selectionModeRef in sync so map click handler never has a stale closure
  useEffect(() => {
    selectionModeRef.current = selectionMode;
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = selectionMode ? 'crosshair' : '';
  }, [selectionMode]);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [2.35, 46.5],
      zoom: 5.5,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      mapLoadedRef.current = true;

      // Add GeoJSON source + layers for selection radius circle
      map.addSource('radius-circle', {
        type: 'geojson',
        data: EMPTY_GEOJSON,
      });

      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: {
          'fill-color': '#f19015',
          'fill-opacity': 0.12,
        },
      });

      map.addLayer({
        id: 'radius-outline',
        type: 'line',
        source: 'radius-circle',
        paint: {
          'line-color': '#f19015',
          'line-width': 2,
          'line-opacity': 0.85,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
  }, []);

  // ── Map click handler — depends on selectionMode ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      if (!selectionModeRef.current) return;

      const { lng, lat } = e.lngLat;

      // Remove previous temp marker
      selectionMarkerRef.current?.remove();

      // Create pulsing orange marker element
      const el = document.createElement('div');
      el.style.cssText = `
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      el.innerHTML = `
        <span style="
          position: absolute;
          width: 36px; height: 36px;
          border-radius: 50%;
          background: #f19015;
          opacity: 0.25;
          animation: pulse-ring 1.4s cubic-bezier(0.215,0.61,0.355,1) infinite;
        "></span>
        <span style="
          position: relative;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #f19015;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(241,144,21,0.5);
          display: flex; align-items: center; justify-content: center;
        ">
          <span style="width:6px;height:6px;border-radius:50%;background:white;"></span>
        </span>
        <style>
          @keyframes pulse-ring {
            0%   { transform: scale(0.6); opacity: 0.4; }
            80%, 100% { transform: scale(1.6); opacity: 0; }
          }
        </style>
      `;

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);
      selectionMarkerRef.current = marker;

      setSelectedPoint({ lng, lat });
      setSelectionRadius(5);

      // Draw initial circle
      if (mapLoadedRef.current) {
        const source = map.getSource('radius-circle') as mapboxgl.GeoJSONSource | undefined;
        source?.setData(buildCircleGeoJSON([lng, lat], 5));
      }

      // Reverse geocode
      setIsGeocoding(true);
      setSelectionAddress('');
      setSelectionCity('');
      setSelectionPostalCode('');

      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
        const url = `https://api.mapbox.com/geocoding/v6/reverse?longitude=${lng}&latitude=${lat}&language=fr&access_token=${token}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const feature = json?.features?.[0];
          if (feature) {
            const props = feature.properties ?? {};
            const fullAddress: string =
              props.full_address ?? props.name ?? props.place_formatted ?? '';
            // Try to split address from city/postal
            const context: Array<{ feature_type?: string; name?: string; short_code?: string }> =
              feature.properties?.context ?? {};

            let address = props.name ?? fullAddress;
            let city = '';
            let postal = '';

            // Mapbox v6 context is an object keyed by feature_type
            if (context && typeof context === 'object' && !Array.isArray(context)) {
              const ctx = context as Record<string, { name?: string; short_code?: string }>;
              city = ctx['place']?.name ?? ctx['locality']?.name ?? '';
              postal = ctx['postcode']?.name ?? '';
            } else if (Array.isArray(context)) {
              for (const c of context as Array<{ feature_type?: string; name?: string; short_code?: string }>) {
                if (c.feature_type === 'place' || c.feature_type === 'locality') city = c.name ?? city;
                if (c.feature_type === 'postcode') postal = c.name ?? postal;
              }
            }

            setSelectionAddress(address);
            setSelectionCity(city);
            setSelectionPostalCode(postal);
          } else {
            setSelectionAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } else {
          setSelectionAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        setSelectionAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } finally {
        setIsGeocoding(false);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, []);

  // ── Redraw circle when radius or point changes ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current || !selectedPoint) return;
    const source = map.getSource('radius-circle') as mapboxgl.GeoJSONSource | undefined;
    source?.setData(buildCircleGeoJSON([selectedPoint.lng, selectedPoint.lat], selectionRadius));
  }, [selectionRadius, selectedPoint]);

  // ── Cancel selection helper ───────────────────────────────────────────────
  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedPoint(null);
    setSelectionAddress('');
    setSelectionCity('');
    setSelectionPostalCode('');
    setSelectionRadius(5);
    selectionMarkerRef.current?.remove();
    selectionMarkerRef.current = null;
    const map = mapRef.current;
    if (map && mapLoadedRef.current) {
      const source = map.getSource('radius-circle') as mapboxgl.GeoJSONSource | undefined;
      source?.setData(EMPTY_GEOJSON);
      map.getCanvas().style.cursor = '';
    }
  };

  // ── Add audit markers whenever audits change ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    withCoords.forEach((audit) => {
      const el = document.createElement('div');
      el.className = 'mapbox-pin';
      el.innerHTML = `
        <div style="
          width: 32px; height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: ${
            audit.status === 'done'
              ? '#10b981'
              : audit.status === 'error'
              ? '#ef4444'
              : audit.status === 'generating'
              ? '#f59e0b'
              : '#6b7280'
          };
          border: 2.5px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        ">
          <div style="
            width: 10px; height: 10px;
            border-radius: 50%;
            background: white;
            transform: rotate(45deg);
          "></div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 16,
        closeButton: false,
        className: 'audit-popup',
        maxWidth: '260px',
      }).setHTML(`
        <div style="padding: 12px; font-family: Inter, sans-serif;">
          <div style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 4px; line-height: 1.3;">
            ${audit.address}
          </div>
          ${
            audit.city
              ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${audit.city}${
                  audit.postal_code ? ` · ${audit.postal_code}` : ''
                }</div>`
              : ''
          }
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
            <span style="font-size: 11px; color: #9ca3af;">${formatDate(audit.created_at)}</span>
            <a href="/audit/${audit.id}" style="
              font-size: 11px; font-weight: 500; color: #f97316;
              text-decoration: none; display: flex; align-items: center; gap: 4px;
            ">Voir rapport →</a>
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([audit.lng!, audit.lat!])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [withCoords]);

  const statusColor = (status: Audit['status']) => {
    if (status === 'done') return 'bg-emerald-500';
    if (status === 'generating') return 'bg-amber-400';
    if (status === 'error') return 'bg-red-500';
    return 'bg-gray-400';
  };

  const isCreationMode = selectedPoint !== null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Carte des audits</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Visualisation géographique de vos résidences auditées
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Legend */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Terminé
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                En cours
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
                Brouillon
              </span>
            </div>

            {/* Zone selection toggle */}
            <button
              onClick={() => {
                if (selectionMode) {
                  cancelSelection();
                } else {
                  setSelectionMode(true);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                selectionMode
                  ? 'bg-[#f19015] text-white border-[#f19015] shadow-md shadow-orange-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#f19015] hover:text-[#f19015]'
              }`}
            >
              <Crosshair className="w-4 h-4" />
              {selectionMode ? 'Annuler' : 'Sélectionner une zone'}
            </button>
          </div>
        </div>

        {/* Selection hint */}
        {selectionMode && !isCreationMode && (
          <div className="mt-3 flex items-center gap-2 text-sm text-[#f19015] bg-orange-50 border border-orange-100 rounded-lg px-4 py-2">
            <Crosshair className="w-4 h-4 shrink-0" />
            <span>Cliquez sur la carte pour sélectionner une zone et créer un audit.</span>
          </div>
        )}
      </div>

      {/* Map + sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#f19015] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Chargement de la carte…</p>
              </div>
            </div>
          )}
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Empty state overlay */}
          {!isLoading && withCoords.length === 0 && !selectionMode && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg px-8 py-6 text-center max-w-xs pointer-events-auto">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-[#f4aa39]" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Aucune localisation</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Les prochains audits créés apparaîtront automatiquement sur la carte.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-72 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">

          {/* ── CREATION MODE ── */}
          {isCreationMode ? (
            <>
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <button
                  onClick={cancelSelection}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Annuler"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <p className="text-sm font-semibold text-gray-800">Nouvelle zone</p>
                <button
                  onClick={cancelSelection}
                  className="ml-auto p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isGeocoding ? (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-4 h-4 border-2 border-[#f19015] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-500">Géocodage en cours…</span>
                  </div>
                ) : null}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={selectionAddress}
                    onChange={(e) => setSelectionAddress(e.target.value)}
                    placeholder="Adresse complète"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f19015]/30 focus:border-[#f19015] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={selectionCity}
                    onChange={(e) => setSelectionCity(e.target.value)}
                    placeholder="Ville"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f19015]/30 focus:border-[#f19015] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={selectionPostalCode}
                    onChange={(e) => setSelectionPostalCode(e.target.value)}
                    placeholder="Code postal"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f19015]/30 focus:border-[#f19015] transition-colors"
                  />
                </div>

                {/* Radius slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Rayon</label>
                    <span className="text-xs font-semibold text-[#f19015]">
                      {selectionRadius} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={selectionRadius}
                    onChange={(e) => setSelectionRadius(Number(e.target.value))}
                    className="w-full accent-[#f19015] cursor-pointer"
                    style={{ accentColor: '#f19015' }}
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>1 km</span>
                    <span>20 km</span>
                  </div>
                </div>

                {/* Coordinates info */}
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-400 font-mono">
                  {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}
                </div>
              </div>

              {/* Launch button */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!selectionAddress || createMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f19015] hover:bg-[#d97c0a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Création…
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      Lancer l&apos;audit
                    </>
                  )}
                </button>
                {createMutation.isError && (
                  <p className="mt-2 text-xs text-red-500 text-center">
                    Erreur lors de la création. Réessayez.
                  </p>
                )}
              </div>
            </>
          ) : (
            /* ── AUDIT LIST MODE ── */
            <>
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {audits.length} audit{audits.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoading && (
                  <div className="space-y-2 p-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                )}

                {!isLoading && audits.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Building2 className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Aucun audit</p>
                  </div>
                )}

                {!isLoading && audits.length > 0 && (
                  <div className="p-2 space-y-1">
                    {audits.map((audit) => (
                      <Link
                        key={audit.id}
                        to={`/audit/${audit.id}`}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        {/* Status dot */}
                        <div className="mt-1 shrink-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full inline-block ${statusColor(audit.status)}`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate leading-snug">
                            {audit.address}
                          </p>
                          {audit.city && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{audit.city}</p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-gray-400">
                              {formatDate(audit.created_at)}
                            </span>
                            {audit.lat == null && (
                              <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                sans coords
                              </span>
                            )}
                          </div>
                        </div>

                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1 transition-colors" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer stats */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    <span className="font-semibold text-gray-700">{withCoords.length}</span> sur carte
                  </span>
                  {withoutCoords.length > 0 && (
                    <span className="text-amber-600">{withoutCoords.length} sans coords</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
