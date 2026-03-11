import { useState } from 'react';
import { Building2, AlertTriangle, CheckCircle2, TrendingUp, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Residence {
  nom: string;
  adresse?: string;
  nbLogements?: number | string;
  typesLogements?: string | string[];
  loyer?: string | number;
  distanceKm?: number | string;
  gestionnaire?: string;
  lien?: string;
  caracteristiques?: string;
}

interface GroupResidences {
  residences: Residence[];
  resume?: string;
}

type NiveauConcurrence = 'faible' | 'modéré' | 'élevé' | string;

interface AnalyseConcurrentielle {
  niveauConcurrence?: NiveauConcurrence;
  points_forts?: string | string[];
  points_attention?: string | string[];
  resume?: string;
}

interface ConcurrenceContent {
  crous?: GroupResidences;
  conventionnees?: GroupResidences;
  privees?: GroupResidences;
  analyseConcurrentielle?: AnalyseConcurrentielle;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type TabKey = 'crous' | 'conventionnees' | 'privees';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'crous', label: 'CROUS' },
  { key: 'conventionnees', label: 'Conventionnées' },
  { key: 'privees', label: 'Privées' },
];

function NiveauBadge({ niveau }: { niveau: NiveauConcurrence }) {
  const lower = niveau.toLowerCase();
  if (lower === 'faible') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Faible
      </span>
    );
  }
  if (lower === 'élevé' || lower === 'eleve') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Élevé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      Modéré
    </span>
  );
}

function PointsList({ items, type }: { items: string | string[]; type: 'fort' | 'attention' }) {
  const list = Array.isArray(items) ? items : [items];
  const isStrong = type === 'fort';
  return (
    <ul className="space-y-1.5">
      {list.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          {isStrong ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          )}
          <span className="text-gray-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ResidencesTable({ data, resume }: { data: Residence[]; resume?: string }) {
  if (data.length === 0) {
    return (
      <div className="py-10 text-center rounded-xl border border-dashed border-gray-200">
        <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Aucune résidence référencée dans cette catégorie</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {resume && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 leading-relaxed">{resume}</p>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Résidence</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Logements</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Loyer</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Distance</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gestionnaire</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  {r.lien ? (
                    <a
                      href={r.lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                    >
                      {r.nom}
                    </a>
                  ) : (
                    <span className="font-medium text-gray-900">{r.nom}</span>
                  )}
                  {r.adresse && <p className="text-xs text-gray-400 mt-0.5">{r.adresse}</p>}
                  {r.caracteristiques && <p className="text-xs text-gray-500 mt-0.5 italic">{r.caracteristiques}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs tabular-nums">
                  {r.nbLogements ? (
                    <span>
                      {typeof r.nbLogements === 'number' ? r.nbLogements.toLocaleString('fr-FR') : r.nbLogements}
                      {r.typesLogements && (
                        <p className="text-gray-400 mt-0.5">
                          {Array.isArray(r.typesLogements) ? r.typesLogements.join(', ') : r.typesLogements}
                        </p>
                      )}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs tabular-nums">
                  {r.loyer ? (typeof r.loyer === 'number' ? `${r.loyer} €` : r.loyer) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">
                  {r.distanceKm != null ? (typeof r.distanceKm === 'number' ? `${r.distanceKm} km` : r.distanceKm) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.gestionnaire ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ConcurrenceSectionProps {
  content: Record<string, unknown>;
}

export default function ConcurrenceSection({ content }: ConcurrenceSectionProps) {
  const data = content as ConcurrenceContent;
  const [activeTab, setActiveTab] = useState<TabKey>('crous');

  const counts: Record<TabKey, number> = {
    crous: data.crous?.residences?.length ?? 0,
    conventionnees: data.conventionnees?.residences?.length ?? 0,
    privees: data.privees?.residences?.length ?? 0,
  };

  const analyse = data.analyseConcurrentielle;

  return (
    <div className="space-y-6">
      {/* Analyse concurrentielle */}
      {analyse && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-900">Analyse concurrentielle</h3>
            </div>
            {analyse.niveauConcurrence && (
              <NiveauBadge niveau={analyse.niveauConcurrence} />
            )}
          </div>

          {analyse.resume && (
            <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
              {analyse.resume}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            {analyse.points_forts && (
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-2">Points forts</p>
                <PointsList items={analyse.points_forts} type="fort" />
              </div>
            )}
            {analyse.points_attention && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">Points d'attention</p>
                <PointsList items={analyse.points_attention} type="attention" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-4">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                ${activeTab === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'crous' && (
          <ResidencesTable
            data={data.crous?.residences ?? []}
            resume={data.crous?.resume}
          />
        )}
        {activeTab === 'conventionnees' && (
          <ResidencesTable
            data={data.conventionnees?.residences ?? []}
            resume={data.conventionnees?.resume}
          />
        )}
        {activeTab === 'privees' && (
          <ResidencesTable
            data={data.privees?.residences ?? []}
            resume={data.privees?.resume}
          />
        )}
      </div>
    </div>
  );
}
