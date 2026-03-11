import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Hash, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import AddressAutocomplete, { type Prediction } from '../components/AddressAutocomplete';

// ---------------------------------------------------------------------------
// Helper: extract city and postalCode from secondary_text
// Format is typically: "City, Department, Country" or "PostalCode City, Department, Country"
// ---------------------------------------------------------------------------

function parseSecondaryText(secondaryText: string): {
  city: string;
  postalCode: string;
} {
  const parts = secondaryText.split(',').map((s) => s.trim());
  const firstPart = parts[0] ?? '';

  // Check if the first part starts with a 5-digit postal code (French)
  const postalMatch = firstPart.match(/^(\d{5})\s+(.+)$/);
  if (postalMatch) {
    return {
      postalCode: postalMatch[1],
      city: postalMatch[2],
    };
  }

  // Otherwise, the first part is the city name
  return {
    city: firstPart,
    postalCode: '',
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function NewAudit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.createAudit({
        address,
        ...(city ? { city } : {}),
        ...(postalCode ? { postalCode } : {}),
      }),
    onSuccess: (audit) => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      navigate(`/audit/${audit.id}`, { state: { autoGenerate: true } });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    mutation.mutate();
  };

  // When the user selects a prediction from the autocomplete dropdown
  function handlePredictionSelect(prediction: Prediction) {
    const { secondary_text } = prediction.structured_formatting;

    // First try to parse city/postal from the structured secondary text
    if (secondary_text) {
      const parsed = parseSecondaryText(secondary_text);
      if (parsed.city) setCity(parsed.city);
      if (parsed.postalCode) setPostalCode(parsed.postalCode);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouvel audit</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Renseignez l'adresse de la résidence à auditer
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-8 py-12">
        <div className="w-full max-w-lg">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            {/* Icon header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Informations de la résidence</h2>
                <p className="text-sm text-gray-500">L'IA analysera automatiquement la zone</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Address autocomplete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adresse complète
                  <span className="text-red-500 ml-0.5">*</span>
                </label>

                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={handlePredictionSelect}
                  placeholder="ex: 15 rue des Fleurs, Cagnes-sur-Mer"
                  autoFocus
                />

                <p className="mt-1.5 text-xs text-gray-400">
                  Commencez à taper pour voir les suggestions d'adresse
                </p>
              </div>

              {/* City + Postal code row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ville
                    <span className="ml-1 text-xs text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="ex: Nice"
                      className="
                        w-full h-11 pl-9 pr-3 rounded-lg border border-gray-200 text-sm text-gray-900
                        placeholder:text-gray-400 bg-white
                        focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-100
                        transition-all duration-150
                      "
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Code postal
                    <span className="ml-1 text-xs text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="ex: 06000"
                      maxLength={5}
                      className="
                        w-full h-11 pl-9 pr-3 rounded-lg border border-gray-200 text-sm text-gray-900
                        placeholder:text-gray-400 bg-white
                        focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-100
                        transition-all duration-150
                      "
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {mutation.isError && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : "Erreur lors de la création de l'audit"}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-100 pt-5">
                {/* Info note */}
                <div className="flex items-start gap-2.5 p-3 bg-primary-50 rounded-lg mb-5">
                  <div className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-[9px] font-bold">i</span>
                  </div>
                  <p className="text-xs text-primary-800 leading-relaxed">
                    L'audit analysera automatiquement la localisation, les établissements d'enseignement,
                    la concurrence, et le potentiel de court séjour grâce à l'IA.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!address.trim() || mutation.isPending}
                  className="
                    w-full h-11 flex items-center justify-center gap-2
                    bg-primary-500 text-white text-sm font-semibold rounded-lg
                    hover:bg-primary-600 active:bg-primary-700
                    transition-all duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-sm
                  "
                >
                  {mutation.isPending ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Création en cours...
                    </>
                  ) : (
                    "Créer l'audit"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Steps preview */}
          <div className="mt-6 grid grid-cols-4 gap-3">
            {[
              { label: 'Localisation', desc: 'Zone et transports' },
              { label: 'Enseignement', desc: 'Écoles et universités' },
              { label: 'Concurrence', desc: 'Résidences proches' },
              { label: 'Court séjour', desc: 'Potentiel saisonnier' },
            ].map((step, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center mx-auto mb-2">
                  {i + 1}
                </div>
                <p className="text-xs font-medium text-gray-700">{step.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
