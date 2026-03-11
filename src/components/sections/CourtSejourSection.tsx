import { useState, useMemo } from 'react';
import {
  Download,
  Search,
  Phone,
  Globe,
  Building2,
  Briefcase,
  MapPin,
  Sun,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employeur {
  nom: string;
  activite?: string;
  categorie?: string;
  adresse?: string;
  distanceKm?: number | string;
  telephone?: string;
  siteWeb?: string;
  periodeRecrutement?: string;
  profils?: string | string[];
}

interface ActiviteTouristique {
  nom: string;
  type?: string;
  description?: string;
}

// Normalise string | object → ActiviteTouristique
function normalizeActivite(a: unknown): ActiviteTouristique {
  if (typeof a === 'string') return { nom: a };
  if (a && typeof a === 'object') return a as ActiviteTouristique;
  return { nom: String(a) };
}

type PotentielEstival = 'faible' | 'modéré' | 'élevé' | string;

interface CourtSejourContent {
  contexte?: string;
  employeurs?: Employeur[];
  resume?: string;
  potentielEstival?: PotentielEstival;
  activitesTouristiques?: ActiviteTouristique[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PotentielBadge({ niveau }: { niveau: PotentielEstival }) {
  const lower = niveau.toLowerCase();
  if (lower === 'faible') {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        Potentiel faible
      </span>
    );
  }
  if (lower === 'élevé' || lower === 'eleve') {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Sun className="w-4 h-4" />
        Potentiel élevé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      Potentiel modéré
    </span>
  );
}

function CategorieIcon({ categorie }: { categorie?: string }) {
  if (!categorie) return <Building2 className="w-4 h-4 text-gray-400" />;
  const lower = categorie.toLowerCase();
  if (lower.includes('hôtel') || lower.includes('hotel') || lower.includes('restaur') || lower.includes('tourist')) {
    return <Sun className="w-4 h-4 text-amber-500" />;
  }
  if (lower.includes('soin') || lower.includes('santé') || lower.includes('médical')) {
    return <Building2 className="w-4 h-4 text-blue-500" />;
  }
  if (lower.includes('commerce') || lower.includes('retail')) {
    return <Briefcase className="w-4 h-4 text-purple-500" />;
  }
  return <Building2 className="w-4 h-4 text-gray-400" />;
}

const CATEGORIES_ALL = 'Toutes les catégories';

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(employeurs: Employeur[]) {
  const headers = ['Nom', 'Activité', 'Catégorie', 'Adresse', 'Distance (km)', 'Téléphone', 'Site web', 'Période de recrutement', 'Profils'];
  const rows = employeurs.map((e) => [
    e.nom,
    e.activite ?? '',
    e.categorie ?? '',
    e.adresse ?? '',
    e.distanceKm != null ? String(e.distanceKm) : '',
    e.telephone ?? '',
    e.siteWeb ?? '',
    e.periodeRecrutement ?? '',
    Array.isArray(e.profils) ? e.profils.join(' / ') : (e.profils ?? ''),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employeurs_court_sejour.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CourtSejourSectionProps {
  content: Record<string, unknown>;
}

export default function CourtSejourSection({ content }: CourtSejourSectionProps) {
  const data = content as CourtSejourContent;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES_ALL);

  const employeurs = data.employeurs ?? [];

  // Collect all unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    employeurs.forEach((e) => {
      if (e.categorie) cats.add(e.categorie);
    });
    return [CATEGORIES_ALL, ...Array.from(cats).sort()];
  }, [employeurs]);

  // Filtered list
  const filtered = useMemo(() => {
    return employeurs.filter((e) => {
      const matchesSearch =
        !search ||
        e.nom.toLowerCase().includes(search.toLowerCase()) ||
        (e.activite ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.adresse ?? '').toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === CATEGORIES_ALL || e.categorie === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [employeurs, search, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Potentiel + contexte */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {data.potentielEstival && (
            <div className="flex items-center gap-3 mb-3">
              <PotentielBadge niveau={data.potentielEstival} />
            </div>
          )}
          {data.contexte && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Contexte</p>
              <p className="text-sm text-gray-600 leading-relaxed">{data.contexte}</p>
            </div>
          )}
        </div>
      </div>

      {/* Resume */}
      {data.resume && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-800 mb-1.5">Résumé de l'analyse</p>
          <p className="text-sm text-amber-900 leading-relaxed">{data.resume}</p>
        </div>
      )}

      {/* Activités touristiques */}
      {data.activitesTouristiques && data.activitesTouristiques.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Activités touristiques</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {data.activitesTouristiques.map((rawAct, i) => {
              const act = normalizeActivite(rawAct);
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-3.5">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{act.nom}</p>
                      {act.type && <p className="text-xs text-gray-400 mt-0.5">{act.type}</p>}
                      {act.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{act.description}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Employeurs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Employeurs saisonniers
            {employeurs.length > 0 && (
              <span className="ml-2 text-xs text-gray-400 font-normal">({employeurs.length})</span>
            )}
          </h3>
          {employeurs.length > 0 && (
            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter CSV
            </button>
          )}
        </div>

        {employeurs.length === 0 ? (
          <div className="py-10 text-center rounded-xl border border-dashed border-gray-200">
            <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucun employeur saisonnier référencé</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un employeur..."
                  className="w-full h-9 pl-8 pr-8 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Active filters */}
            {(search || selectedCategory !== CATEGORIES_ALL) && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
                {selectedCategory !== CATEGORIES_ALL && (
                  <span className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded-full">
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory(CATEGORIES_ALL)} className="hover:text-primary-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employeur</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Distance</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recrutement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                        Aucun résultat pour cette recherche
                      </td>
                    </tr>
                  ) : (
                    filtered.map((emp, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <CategorieIcon categorie={emp.categorie} />
                            <div>
                              <p className="font-medium text-gray-900">{emp.nom}</p>
                              {emp.activite && <p className="text-xs text-gray-500 mt-0.5">{emp.activite}</p>}
                              {emp.adresse && (
                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {emp.adresse}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {emp.categorie ? (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                              {emp.categorie}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">
                          {emp.distanceKm != null
                            ? (typeof emp.distanceKm === 'number' ? `${emp.distanceKm} km` : emp.distanceKm)
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {emp.telephone && (
                              <a
                                href={`tel:${emp.telephone}`}
                                className="flex items-center gap-1 text-xs text-gray-700 hover:text-primary-600 transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                                {emp.telephone}
                              </a>
                            )}
                            {emp.siteWeb && (
                              <a
                                href={emp.siteWeb.startsWith('http') ? emp.siteWeb : `https://${emp.siteWeb}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                              >
                                <Globe className="w-3 h-3" />
                                Site web
                              </a>
                            )}
                            {!emp.telephone && !emp.siteWeb && <span className="text-gray-300 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            {emp.periodeRecrutement ? (
                              <span className="text-xs text-gray-700">{emp.periodeRecrutement}</span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                            {emp.profils && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {Array.isArray(emp.profils) ? emp.profils.join(', ') : emp.profils}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
