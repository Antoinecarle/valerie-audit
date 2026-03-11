import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  FileText,
  Trash2,
  ExternalLink,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Audit } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums shrink-0">
        {done}/{total}
      </span>
    </div>
  );
}

function DeleteDialog({
  audit,
  onConfirm,
  onCancel,
  loading,
}: {
  audit: Audit;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-[modal-enter_0.2s_ease_forwards]">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Supprimer l'audit</h3>
            <p className="mt-1 text-sm text-gray-500">
              Voulez-vous vraiment supprimer l'audit de{' '}
              <span className="font-medium text-gray-700">{audit.address}</span> ?
              Cette action est irréversible.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Audit | null>(null);

  const { data: audits = [], isLoading, isError } = useQuery({
    queryKey: ['audits'],
    queryFn: () => api.getAudits(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAudit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      setDeleteTarget(null);
    },
  });

  const stats = {
    total: audits.length,
    inProgress: audits.filter((a) => a.status === 'generating').length,
    done: audits.filter((a) => a.status === 'done').length,
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes audits</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Gérez et consultez vos audits de résidences étudiantes
            </p>
          </div>
          <button
            onClick={() => navigate('/nouveau')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouvel audit
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileText className="w-4.5 h-4.5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">En cours</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.inProgress}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Terminés</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.done}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Audit list */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700">Impossible de charger les audits</p>
            <p className="text-xs text-red-500 mt-1">Vérifiez que le serveur est en cours d'exécution</p>
          </div>
        )}

        {!isLoading && !isError && audits.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Aucun audit pour l'instant</h3>
            <p className="mt-1.5 text-sm text-gray-500 max-w-xs mx-auto">
              Créez votre premier audit pour analyser une résidence étudiante avec l'IA.
            </p>
            <button
              onClick={() => navigate('/nouveau')}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Créer un audit
            </button>
          </div>
        )}

        {!isLoading && !isError && audits.length > 0 && (
          <div className="space-y-3">
            {audits.map((audit) => (
              <div
                key={audit.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md transition-all duration-150"
              >
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {audit.address}
                        </h3>
                        <StatusBadge status={audit.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {audit.city && (
                          <span className="text-xs text-gray-500">{audit.city}</span>
                        )}
                        {audit.city && audit.postal_code && (
                          <span className="text-gray-300 text-xs">·</span>
                        )}
                        {audit.postal_code && (
                          <span className="text-xs text-gray-500">{audit.postal_code}</span>
                        )}
                        {(audit.city || audit.postal_code) && (
                          <span className="text-gray-300 text-xs">·</span>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(audit.created_at)}</span>
                      </div>
                      {/* Progress */}
                      <div className="mt-2.5 max-w-xs">
                        <ProgressBar
                          done={audit.sections_done ?? 0}
                          total={audit.sections_total ?? 4}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/audit/${audit.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Voir rapport
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(audit)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Supprimer l'audit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete dialog */}
      {deleteTarget && (
        <DeleteDialog
          audit={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
