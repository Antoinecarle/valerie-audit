import { Loader2 } from 'lucide-react';

type Status = 'draft' | 'generating' | 'done' | 'error' | 'pending';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
}

const config: Record<Status, { label: string; className: string; spin?: boolean }> = {
  draft: {
    label: 'Brouillon',
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
  },
  pending: {
    label: 'En attente',
    className: 'bg-gray-100 text-gray-500 border border-gray-200',
  },
  generating: {
    label: 'Génération...',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
    spin: true,
  },
  done: {
    label: 'Terminé',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  error: {
    label: 'Erreur',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { label, className, spin } = config[status] ?? config.draft;
  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${className}`}>
      {spin && <Loader2 className="w-3 h-3 animate-spin" />}
      {!spin && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'done' ? 'bg-emerald-500' :
            status === 'error' ? 'bg-red-500' :
            status === 'generating' ? 'bg-blue-500' :
            'bg-gray-400'
          }`}
        />
      )}
      {label}
    </span>
  );
}
