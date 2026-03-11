import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Link } from 'react-router-dom';
import { MapPin, ExternalLink, Building2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Audit } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['audits'],
    queryFn: () => api.getAudits(),
  });

  const withCoords = audits.filter((a) => a.lat != null && a.lng != null);
  const withoutCoords = audits.filter((a) => a.lat == null || a.lng == null);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [2.35, 46.5],
      zoom: 5.5,
      attributionControl: false,
    });

    mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Add markers whenever audits change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous markers
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
          background: ${audit.status === 'done' ? '#10b981' : audit.status === 'error' ? '#ef4444' : audit.status === 'generating' ? '#f59e0b' : '#6b7280'};
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
          ${audit.city ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${audit.city}${audit.postal_code ? ` · ${audit.postal_code}` : ''}</div>` : ''}
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
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Chargement de la carte…</p>
              </div>
            </div>
          )}
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Empty state overlay */}
          {!isLoading && withCoords.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg px-8 py-6 text-center max-w-xs pointer-events-auto">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-primary-400" />
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
                      <span className={`w-2.5 h-2.5 rounded-full inline-block ${statusColor(audit.status)}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate leading-snug">
                        {audit.address}
                      </p>
                      {audit.city && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{audit.city}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-400">{formatDate(audit.created_at)}</span>
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
                <span className="text-amber-600">
                  {withoutCoords.length} sans coords
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
