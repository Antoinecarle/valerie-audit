const API_BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Audit {
  id: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  status: 'draft' | 'generating' | 'done' | 'error';
  error: string | null;
  created_at: string;
  updated_at: string;
  sections_done?: number;
  sections_total?: number;
  sections?: AuditSection[];
}

export interface AuditSection {
  id: string;
  audit_id: string;
  section_type: 'localisation' | 'enseignement' | 'concurrence' | 'court_sejour';
  status: 'pending' | 'generating' | 'done' | 'error';
  content: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export const api = {
  getAudits: () => req<Audit[]>('/audits'),
  getAudit: (id: string) => req<Audit>(`/audits/${id}`),
  createAudit: (data: { address: string; city?: string; postalCode?: string }) =>
    req<Audit>('/audits', { method: 'POST', body: JSON.stringify(data) }),
  deleteAudit: (id: string) => req<{ ok: boolean }>(`/audits/${id}`, { method: 'DELETE' }),
  updateSection: (auditId: string, type: string, content: unknown) =>
    req<AuditSection>(`/audits/${auditId}/sections/${type}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
};
