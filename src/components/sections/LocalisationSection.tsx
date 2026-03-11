import { MapPin, Train, Bus, Navigation, TrendingUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PointRepere {
  nom: string;
  distance: string;
  type: string;
}

interface LigneTransport {
  type: string;
  numero: string;
}

interface Arret {
  nom: string;
  distance: string;
  lignes: (string | LigneTransport)[];
}

interface Evolution {
  projet: string;
  description: string;
  horizon: string;
}

interface LocalisationContent {
  ville?: {
    nom: string;
    population: number | string;
    populationEtudiante: number | string;
    anneeReference?: string;
    description?: string;
  };
  quartier?: {
    nom: string;
    description: string;
    caracteristiques?: string | string[];
    programmeImmobilier?: string | {
      description?: string;
      logementsTotal?: number;
      logementsSeniors?: number;
      logementsLocatifs?: number;
      logementsEtudiants?: number;
    };
  };
  pointsReperes?: PointRepere[];
  transports?: {
    description?: string;
    arrets?: Arret[];
  };
  evolutionsMetropole?: Evolution[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function TransportLine({ ligne }: { ligne: string | { type: string; numero: string } }) {
  const label = typeof ligne === 'string' ? ligne : `${ligne.type} ${ligne.numero}`;
  const typeStr = typeof ligne === 'string' ? ligne : ligne.type;
  const lower = typeStr.toLowerCase();
  let colorClass = 'bg-blue-100 text-blue-800';
  if (lower.includes('tram')) colorClass = 'bg-green-100 text-green-800';
  else if (lower.includes('métro') || lower.includes('metro') || lower === 'm') colorClass = 'bg-purple-100 text-purple-800';
  else if (lower.includes('train') || lower.includes('ter') || lower.includes('rer')) colorClass = 'bg-orange-100 text-orange-800';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${colorClass}`}>
      {typeof ligne === 'string' ? label : `${ligne.type} ${ligne.numero}`}
    </span>
  );
}

function POITypeIcon({ type }: { type: string }) {
  const lower = type.toLowerCase();
  if (lower.includes('transport') || lower.includes('gare') || lower.includes('train')) {
    return <Train className="w-3.5 h-3.5 text-orange-500" />;
  }
  if (lower.includes('bus') || lower.includes('arrêt')) {
    return <Bus className="w-3.5 h-3.5 text-blue-500" />;
  }
  return <Navigation className="w-3.5 h-3.5 text-gray-400" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LocalisationSectionProps {
  content: Record<string, unknown>;
}

export default function LocalisationSection({ content }: LocalisationSectionProps) {
  const data = content as LocalisationContent;

  return (
    <div className="space-y-6">
      {/* Ville stats */}
      {data.ville && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              {data.ville.nom}
              {data.ville.anneeReference && (
                <span className="ml-2 text-xs text-gray-400 font-normal">({data.ville.anneeReference})</span>
              )}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <StatCard label="Population" value={data.ville.population} sub="habitants" />
            <StatCard label="Population étudiante" value={data.ville.populationEtudiante} sub="étudiants" />
          </div>
          {data.ville.description && (
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-200">
              {data.ville.description}
            </p>
          )}
        </section>
      )}

      {/* Quartier */}
      {data.quartier && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Quartier : {data.quartier.nom}</h3>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
            <p className="text-sm text-gray-600 leading-relaxed">{data.quartier.description}</p>
            {data.quartier.caracteristiques && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Caractéristiques</p>
                {Array.isArray(data.quartier.caracteristiques) ? (
                  <ul className="text-sm text-gray-600 space-y-0.5 list-disc list-inside">
                    {data.quartier.caracteristiques.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">{data.quartier.caracteristiques}</p>
                )}
              </div>
            )}
            {data.quartier.programmeImmobilier && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Programme immobilier</p>
                {typeof data.quartier.programmeImmobilier === 'string' ? (
                  <p className="text-sm text-gray-600">{data.quartier.programmeImmobilier}</p>
                ) : (
                  <div className="text-sm text-gray-600 space-y-1">
                    {data.quartier.programmeImmobilier.description && (
                      <p>{data.quartier.programmeImmobilier.description}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {data.quartier.programmeImmobilier.logementsTotal != null && (
                        <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
                          <p className="text-xs text-gray-400">Total</p>
                          <p className="font-semibold text-gray-900">{data.quartier.programmeImmobilier.logementsTotal}</p>
                        </div>
                      )}
                      {data.quartier.programmeImmobilier.logementsEtudiants != null && (
                        <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
                          <p className="text-xs text-gray-400">Étudiants</p>
                          <p className="font-semibold text-primary-600">{data.quartier.programmeImmobilier.logementsEtudiants}</p>
                        </div>
                      )}
                      {data.quartier.programmeImmobilier.logementsSeniors != null && (
                        <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
                          <p className="text-xs text-gray-400">Seniors</p>
                          <p className="font-semibold text-gray-900">{data.quartier.programmeImmobilier.logementsSeniors}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Points de repères */}
      {data.pointsReperes && data.pointsReperes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Points de repère</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lieu</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.pointsReperes.map((poi, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <POITypeIcon type={poi.type} />
                        <span className="font-medium text-gray-900">{poi.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{poi.type}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs tabular-nums">{poi.distance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Transports */}
      {data.transports && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Transports</h3>
          {data.transports.description && (
            <p className="text-sm text-gray-600 mb-3 bg-gray-50 rounded-xl p-4 border border-gray-200 leading-relaxed">
              {data.transports.description}
            </p>
          )}
          {data.transports.arrets && data.transports.arrets.length > 0 && (
            <div className="space-y-2">
              {data.transports.arrets.map((arret, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Bus className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{arret.nom}</p>
                      <p className="text-xs text-gray-400">{arret.distance}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end ml-3">
                    {arret.lignes.map((ligne, j) => (
                      <TransportLine key={j} ligne={ligne} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Évolutions métropole */}
      {data.evolutionsMetropole && data.evolutionsMetropole.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900">Évolutions de la métropole</h3>
          </div>
          <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
            {data.evolutionsMetropole.map((evo, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-primary-400 border-2 border-white" />
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-semibold text-gray-900">{evo.projet}</h4>
                    <span className="shrink-0 text-[10px] font-medium text-primary-700 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-full">
                      {evo.horizon}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{evo.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
