import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  PlayCircle,
  MapPin,
  GraduationCap,
  Building2,
  Sun,
  ChevronRight,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Audit, AuditSection } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import LocalisationSection from '../components/sections/LocalisationSection';
import EnseignementSection from '../components/sections/EnseignementSection';
import ConcurrenceSection from '../components/sections/ConcurrenceSection';
import CourtSejourSection from '../components/sections/CourtSejourSection';

// ─── Section config ───────────────────────────────────────────────────────────

type SectionType = 'localisation' | 'enseignement' | 'concurrence' | 'court_sejour';

const SECTION_CONFIG: Record<SectionType, { label: string; icon: React.ElementType; shortLabel: string }> = {
  localisation: { label: 'Localisation', icon: MapPin, shortLabel: 'Localisation' },
  enseignement: { label: 'Enseignement supérieur', icon: GraduationCap, shortLabel: 'Enseignement' },
  concurrence: { label: 'Concurrence', icon: Building2, shortLabel: 'Concurrence' },
  court_sejour: { label: 'Court séjour', icon: Sun, shortLabel: 'Court séjour' },
};

const SECTION_ORDER: SectionType[] = ['localisation', 'enseignement', 'concurrence', 'court_sejour'];

// ─── Markdown export ──────────────────────────────────────────────────────────

function buildMarkdown(audit: Audit): string {
  const sections = audit.sections ?? [];
  const lines: string[] = [];

  lines.push(`# Audit de résidence — ${audit.address}`);
  if (audit.city || audit.postal_code) {
    lines.push(`**${[audit.city, audit.postal_code].filter(Boolean).join(' ')}**`);
  }
  lines.push(`\n_Généré le ${new Date(audit.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}_\n`);
  lines.push('---\n');

  for (const type of SECTION_ORDER) {
    const section = sections.find((s) => s.section_type === type);
    const config = SECTION_CONFIG[type];
    lines.push(`## ${config.label}\n`);

    if (!section || section.status === 'pending') {
      lines.push('_Section non générée._\n');
    } else if (section.status === 'generating') {
      lines.push('_Génération en cours..._\n');
    } else if (section.status === 'error') {
      lines.push(`_Erreur lors de la génération : ${section.error ?? 'inconnue'}_\n`);
    } else if (section.content) {
      lines.push('```json');
      lines.push(JSON.stringify(section.content, null, 2));
      lines.push('```\n');
    }
  }

  return lines.join('\n');
}

function downloadMarkdown(audit: Audit) {
  const md = buildMarkdown(audit);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const slug = audit.address.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  a.download = `audit_${slug}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Section skeleton ─────────────────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
          <div className="h-3 bg-gray-100 rounded w-3/5" />
        </div>
      ))}
      <div className="flex items-center gap-2 mt-4 text-sm text-blue-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Recherche en cours avec l'IA...</span>
      </div>
    </div>
  );
}

// ─── Section content renderer ─────────────────────────────────────────────────

function SectionContent({
  section,
  onGenerate,
  isGenerating,
}: {
  section: AuditSection | undefined;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  if (!section || section.status === 'pending') {
    return (
      <div className="py-16 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">Section non générée</p>
        <p className="text-xs text-gray-400 mb-5">Cliquez sur Générer pour lancer l'analyse IA</p>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-60"
        >
          <PlayCircle className="w-4 h-4" />
          Générer
        </button>
      </div>
    );
  }

  if (section.status === 'generating') {
    return <SectionSkeleton />;
  }

  if (section.status === 'error') {
    return (
      <div className="py-12 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-sm font-medium text-red-700 mb-1">Erreur lors de la génération</p>
        {section.error && <p className="text-xs text-red-500 mb-5 max-w-sm">{section.error}</p>}
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      </div>
    );
  }

  if (!section.content) {
    return <p className="text-sm text-gray-400 py-8 text-center">Aucun contenu disponible</p>;
  }

  const type = section.section_type;
  if (type === 'localisation') return <LocalisationSection content={section.content} />;
  if (type === 'enseignement') return <EnseignementSection content={section.content} />;
  if (type === 'concurrence') return <ConcurrenceSection content={section.content} />;
  if (type === 'court_sejour') return <CourtSejourSection content={section.content} />;
  return <pre className="text-xs text-gray-500 overflow-auto">{JSON.stringify(section.content, null, 2)}</pre>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AuditReport() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<SectionType>('localisation');
  const [generatingSection, setGeneratingSection] = useState<SectionType | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const autoGenerateTriggered = useRef(false);

  const { data: audit, isLoading, isError } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => api.getAudit(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as Audit | undefined;
      if (!data) return false;
      const hasGenerating = data.sections?.some((s) => s.status === 'generating');
      return hasGenerating ? 2000 : false;
    },
  });

  // Auto-generate on redirect from new audit page
  useEffect(() => {
    if (audit && location.state?.autoGenerate && !autoGenerateTriggered.current) {
      autoGenerateTriggered.current = true;
      handleGenerateAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audit?.id]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  function startSSE(url: string, onSectionDone: (type: SectionType) => void, onComplete: () => void) {
    eventSourceRef.current?.close();
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('section_start', (e) => {
      const data = JSON.parse(e.data) as { type: SectionType };
      setGeneratingSection(data.type);
      queryClient.setQueryData<Audit>(['audit', id], (old) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections?.map((s) =>
            s.section_type === data.type ? { ...s, status: 'generating' } : s
          ),
        };
      });
    });

    es.addEventListener('section_done', (e) => {
      const data = JSON.parse(e.data) as { type: SectionType; content: Record<string, unknown> };
      onSectionDone(data.type);
      queryClient.setQueryData<Audit>(['audit', id], (old) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections?.map((s) =>
            s.section_type === data.type
              ? { ...s, status: 'done', content: data.content }
              : s
          ),
        };
      });
    });

    es.addEventListener('section_error', (e) => {
      const data = JSON.parse(e.data) as { type: SectionType; error: string };
      queryClient.setQueryData<Audit>(['audit', id], (old) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections?.map((s) =>
            s.section_type === data.type
              ? { ...s, status: 'error', error: data.error }
              : s
          ),
        };
      });
    });

    es.addEventListener('complete', () => {
      es.close();
      setGeneratingSection(null);
      setIsGeneratingAll(false);
      onComplete();
      queryClient.invalidateQueries({ queryKey: ['audit', id] });
    });

    es.onerror = () => {
      es.close();
      setGeneratingSection(null);
      setIsGeneratingAll(false);
      queryClient.invalidateQueries({ queryKey: ['audit', id] });
    };
  }

  function handleGenerateAll() {
    if (!id) return;
    setIsGeneratingAll(true);
    startSSE(
      `/api/audits/${id}/generate`,
      (type) => setActiveSection(type),
      () => {
        setIsGeneratingAll(false);
      }
    );
  }

  async function handleExportPptx() {
    if (!id) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/audits/${id}/export?format=pptx`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disp = res.headers.get('Content-Disposition') || '';
      const match = disp.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `audit_${id}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Erreur export PPTX : ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsExporting(false);
    }
  }

  function handleRegenerateSection(type: SectionType) {
    if (!id) return;
    setGeneratingSection(type);
    setActiveSection(type);
    startSSE(
      `/api/audits/${id}/regenerate/${type}`,
      () => {},
      () => setGeneratingSection(null)
    );
  }

  const sections = audit?.sections ?? [];

  function getSection(type: SectionType): AuditSection | undefined {
    return sections.find((s) => s.section_type === type);
  }

  const activeIsGenerating = generatingSection === activeSection || (isGeneratingAll && generatingSection === activeSection);
  const anyGenerating = isGeneratingAll || generatingSection !== null;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement de l'audit...</p>
        </div>
      </div>
    );
  }

  if (isError || !audit) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">Audit introuvable</p>
          <Link to="/" className="text-sm text-primary-600 hover:underline">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  const doneSections = sections.filter((s) => s.status === 'done').length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-gray-900 truncate">{audit.address}</h1>
                <StatusBadge status={audit.status} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {audit.city && <span className="text-xs text-gray-500">{audit.city}</span>}
                {audit.postal_code && <span className="text-xs text-gray-500">{audit.postal_code}</span>}
                <span className="text-gray-300 text-xs">·</span>
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">
                  {new Date(audit.created_at).toLocaleDateString('fr-FR')}
                </span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs text-gray-500">{doneSections}/4 sections</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportPptx}
              disabled={isExporting || anyGenerating}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-primary-500 border border-primary-600 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isExporting ? 'Export...' : 'PPTX'}
            </button>
            <button
              onClick={() => downloadMarkdown(audit)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Markdown
            </button>
            <button
              onClick={handleGenerateAll}
              disabled={anyGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-60 shadow-sm"
            >
              {anyGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Générer tout
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Section sidebar */}
        <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col py-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 mb-3">
            Sections
          </p>
          <nav className="flex-1 space-y-0.5 px-2">
            {SECTION_ORDER.map((type) => {
              const section = getSection(type);
              const config = SECTION_CONFIG[type];
              const Icon = config.icon;
              const isActive = activeSection === type;
              const status = section?.status ?? 'pending';
              const isThisGenerating = generatingSection === type;

              return (
                <button
                  key={type}
                  onClick={() => setActiveSection(type)}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all duration-150
                    ${isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium flex-1 truncate">{config.shortLabel}</span>
                  {isThisGenerating ? (
                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin shrink-0" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      status === 'done' ? 'bg-emerald-400' :
                      status === 'error' ? 'bg-red-400' :
                      status === 'generating' ? 'bg-blue-400 animate-pulse' :
                      'bg-gray-200'
                    }`} />
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-primary-400 shrink-0" />}
                </button>
              );
            })}
          </nav>

          {/* Progress */}
          <div className="px-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">Progression</span>
              <span className="text-xs font-semibold text-gray-700 tabular-nums">{doneSections}/4</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-700"
                style={{ width: `${(doneSections / 4) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-6">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = SECTION_CONFIG[activeSection].icon;
                  return (
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-primary-500" />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {SECTION_CONFIG[activeSection].label}
                  </h2>
                  {getSection(activeSection) && (
                    <div className="mt-0.5">
                      <StatusBadge status={getSection(activeSection)!.status} />
                    </div>
                  )}
                </div>
              </div>

              {getSection(activeSection)?.status !== 'pending' && (
                <button
                  onClick={() => handleRegenerateSection(activeSection)}
                  disabled={anyGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${activeIsGenerating ? 'animate-spin' : ''}`} />
                  Régénérer
                </button>
              )}
            </div>

            {/* Section content card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <SectionContent
                section={getSection(activeSection)}
                onGenerate={() => handleRegenerateSection(activeSection)}
                isGenerating={anyGenerating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
