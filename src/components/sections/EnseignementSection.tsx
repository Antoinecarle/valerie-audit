import { useState } from 'react';
import { GraduationCap, ExternalLink, Users, TrendingUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Universite {
  nom: string;
  poles?: string | string[];
  adresse?: string;
  distanceKm?: number | string;
  lien?: string;
  nombreEtudiants?: number | string;
}

interface EcoleSuperieure {
  nom: string;
  type?: string;
  adresse?: string;
  distanceKm?: number | string;
  lien?: string;
}

interface LyceeSuperieur {
  nom: string;
  filiere?: string;
  adresse?: string;
  distanceKm?: number | string;
  lien?: string;
}

interface EvolutionFuture {
  etablissement: string;
  type?: string;
  horizon?: string;
  description?: string;
}

interface EnseignementContent {
  universites?: Universite[];
  ecolesSuperieures?: EcoleSuperieure[];
  lyceesSuperieurs?: LyceeSuperieur[];
  evolutionsFutures?: EvolutionFuture[];
  totalEtudiantsZone?: number | string;
  resume?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type TabKey = 'universites' | 'ecoles' | 'lycees';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'universites', label: 'Universités' },
  { key: 'ecoles', label: 'Écoles sup.' },
  { key: 'lycees', label: 'Lycées sup.' },
];

function DistanceBadge({ km }: { km: number | string | undefined }) {
  if (!km && km !== 0) return null;
  return (
    <span className="text-xs text-gray-500 tabular-nums">
      {typeof km === 'number' ? `${km} km` : km}
    </span>
  );
}

function LinkCell({ href, label }: { href?: string; label: string }) {
  if (!href) return <span className="text-sm text-gray-700">{label}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center gap-1 group"
    >
      {label}
      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function UniversitesTab({ data }: { data: Universite[] }) {
  if (data.length === 0) {
    return <EmptyTab message="Aucune université référencée dans cette zone" />;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Établissement</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pôles</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Étudiants</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Distance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((u, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <LinkCell href={u.lien} label={u.nom} />
                {u.adresse && <p className="text-xs text-gray-400 mt-0.5">{u.adresse}</p>}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px]">
                {Array.isArray(u.poles) ? u.poles.join(', ') : (u.poles ?? '—')}
              </td>
              <td className="px-4 py-3">
                {u.nombreEtudiants ? (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-600 tabular-nums">
                      {typeof u.nombreEtudiants === 'number'
                        ? u.nombreEtudiants.toLocaleString('fr-FR')
                        : u.nombreEtudiants}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <DistanceBadge km={u.distanceKm} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EcolesTab({ data }: { data: EcoleSuperieure[] }) {
  if (data.length === 0) {
    return <EmptyTab message="Aucune école supérieure référencée dans cette zone" />;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">École</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Distance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((e, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <LinkCell href={e.lien} label={e.nom} />
                {e.adresse && <p className="text-xs text-gray-400 mt-0.5">{e.adresse}</p>}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{e.type ?? '—'}</td>
              <td className="px-4 py-3">
                <DistanceBadge km={e.distanceKm} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LyceesTab({ data }: { data: LyceeSuperieur[] }) {
  if (data.length === 0) {
    return <EmptyTab message="Aucun lycée supérieur référencé dans cette zone" />;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Établissement</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Filière</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Distance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((l, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <LinkCell href={l.lien} label={l.nom} />
                {l.adresse && <p className="text-xs text-gray-400 mt-0.5">{l.adresse}</p>}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{l.filiere ?? '—'}</td>
              <td className="px-4 py-3">
                <DistanceBadge km={l.distanceKm} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="py-10 text-center rounded-xl border border-dashed border-gray-200">
      <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface EnseignementSectionProps {
  content: Record<string, unknown>;
}

export default function EnseignementSection({ content }: EnseignementSectionProps) {
  const data = content as EnseignementContent;
  const [activeTab, setActiveTab] = useState<TabKey>('universites');

  const tabCounts: Record<TabKey, number> = {
    universites: data.universites?.length ?? 0,
    ecoles: data.ecolesSuperieures?.length ?? 0,
    lycees: data.lyceesSuperieurs?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Total + resume */}
      {(data.totalEtudiantsZone || data.resume) && (
        <div className="grid gap-4" style={{ gridTemplateColumns: data.totalEtudiantsZone && data.resume ? '1fr 2fr' : '1fr' }}>
          {data.totalEtudiantsZone && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-primary-700 font-medium">Étudiants dans la zone</p>
                <p className="text-2xl font-bold text-primary-900 tabular-nums">
                  {typeof data.totalEtudiantsZone === 'number'
                    ? data.totalEtudiantsZone.toLocaleString('fr-FR')
                    : data.totalEtudiantsZone}
                </p>
              </div>
            </div>
          )}
          {data.resume && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Résumé</p>
              <p className="text-sm text-gray-600 leading-relaxed">{data.resume}</p>
            </div>
          )}
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
              {tabCounts[key] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'universites' && <UniversitesTab data={data.universites ?? []} />}
        {activeTab === 'ecoles' && <EcolesTab data={data.ecolesSuperieures ?? []} />}
        {activeTab === 'lycees' && <LyceesTab data={data.lyceesSuperieurs ?? []} />}
      </div>

      {/* Évolutions futures */}
      {data.evolutionsFutures && data.evolutionsFutures.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900">Évolutions futures</h3>
          </div>
          <div className="space-y-2">
            {data.evolutionsFutures.map((ev, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900">{ev.etablissement}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {ev.type && (
                      <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {ev.type}
                      </span>
                    )}
                    {ev.horizon && (
                      <span className="text-[10px] font-medium text-primary-700 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-full">
                        {ev.horizon}
                      </span>
                    )}
                  </div>
                </div>
                {ev.description && (
                  <p className="text-sm text-gray-500 leading-relaxed">{ev.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
