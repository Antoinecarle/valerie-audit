import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { MapPin, X, Search } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchedSubstring {
  offset: number;
  length: number;
}

export interface StructuredFormatting {
  main_text: string;
  main_text_matched_substrings: MatchedSubstring[];
  secondary_text: string;
}

export interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: StructuredFormatting;
}

interface AutocompleteResponse {
  predictions: Prediction[];
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (prediction: Prediction) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

// ---------------------------------------------------------------------------
// Highlight helper
// ---------------------------------------------------------------------------

function highlightMatches(
  text: string,
  substrings: MatchedSubstring[],
): React.ReactNode[] {
  if (!substrings.length) return [text];

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  // Sort by offset so we process left-to-right
  const sorted = [...substrings].sort((a, b) => a.offset - b.offset);

  sorted.forEach(({ offset, length }, i) => {
    if (cursor < offset) {
      nodes.push(
        <span key={`plain-${i}`}>{text.slice(cursor, offset)}</span>,
      );
    }
    nodes.push(
      <strong
        key={`match-${i}`}
        className="text-primary-600 font-bold"
      >
        {text.slice(offset, offset + length)}
      </strong>,
    );
    cursor = offset + length;
  });

  if (cursor < text.length) {
    nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Skeleton item
// ---------------------------------------------------------------------------

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 px-4 h-16">
      <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-2/3 animate-pulse" />
        <div className="h-2.5 bg-gray-100 rounded-full w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prediction item
// ---------------------------------------------------------------------------

interface PredictionItemProps {
  prediction: Prediction;
  isHighlighted: boolean;
  onMouseEnter: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

function PredictionItem({
  prediction,
  isHighlighted,
  onMouseEnter,
  onMouseDown,
}: PredictionItemProps) {
  const { structured_formatting } = prediction;

  return (
    <div
      role="option"
      aria-selected={isHighlighted}
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
      className={`
        relative flex items-center gap-3 px-4 h-16 cursor-pointer
        border-l-2 transition-all duration-100
        ${
          isHighlighted
            ? 'bg-amber-50/70 border-l-primary-400'
            : 'bg-white border-l-transparent hover:bg-amber-50/50 hover:border-l-primary-300'
        }
      `}
    >
      {/* Icon circle */}
      <div
        className={`
          w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-all duration-100
          ${isHighlighted ? 'bg-amber-100 border-amber-200' : 'bg-amber-50 border-amber-100'}
        `}
      >
        <MapPin className="w-4 h-4 text-primary-500" strokeWidth={2} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-gray-900 leading-tight truncate">
          {highlightMatches(
            structured_formatting.main_text,
            structured_formatting.main_text_matched_substrings,
          )}
        </p>
        <p className="text-[13px] text-gray-400 mt-0.5 truncate">
          {structured_formatting.secondary_text}
        </p>
      </div>

      {/* Arrow hint */}
      <span
        className={`
          text-gray-300 text-sm font-light transition-opacity duration-100 shrink-0
          ${isHighlighted ? 'opacity-100' : 'opacity-0'}
        `}
        aria-hidden="true"
      >
        →
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Rechercher une adresse...',
  className = '',
  autoFocus = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------------
  // Close on outside click
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch predictions
  // ---------------------------------------------------------------------------

  const fetchPredictions = useCallback(async (input: string) => {
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setIsLoading(true);
    setHasSearched(false);

    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`,
        { signal: abortController.current.signal },
      );
      if (!res.ok) throw new Error('API error');
      const data: AutocompleteResponse = await res.json();
      setPredictions(data.predictions ?? []);
      setHasSearched(true);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setPredictions([]);
        setHasSearched(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Debounced input handler
  // ---------------------------------------------------------------------------

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    setHasSearched(false);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.length < 3) {
      setPredictions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimer.current = setTimeout(() => {
      fetchPredictions(val);
    }, 300);
  }

  // ---------------------------------------------------------------------------
  // Select a prediction
  // ---------------------------------------------------------------------------

  function handleSelect(prediction: Prediction) {
    onChange(prediction.description);
    onSelect(prediction);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setPredictions([]);
  }

  // ---------------------------------------------------------------------------
  // Clear
  // ---------------------------------------------------------------------------

  function handleClear() {
    onChange('');
    setPredictions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setHasSearched(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (abortController.current) abortController.current.abort();
    setIsLoading(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : predictions.length - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && predictions[highlightedIndex]) {
          handleSelect(predictions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const showDropdown =
    isOpen && isFocused && (isLoading || predictions.length > 0 || hasSearched);
  const showEmptyState =
    !isLoading && hasSearched && predictions.length === 0 && value.length >= 3;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div
        className={`
          relative flex items-center bg-white rounded-xl border-2 shadow-sm
          transition-all duration-200
          ${
            isFocused
              ? 'border-primary-400'
              : 'border-gray-200 hover:border-gray-300'
          }
        `}
        style={
          isFocused
            ? { boxShadow: '0 0 0 4px rgba(241, 144, 21, 0.15), 0 1px 2px rgba(0,0,0,0.05)' }
            : { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
        }
      >
        {/* Left icon */}
        <div className="flex items-center justify-center pl-4 pr-3 shrink-0">
          <MapPin
            className={`w-5 h-5 transition-colors duration-200 ${
              isFocused ? 'text-primary-500' : 'text-gray-400'
            }`}
            strokeWidth={2}
          />
        </div>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (predictions.length > 0) setIsOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={showDropdown}
          role="combobox"
          className="
            flex-1 h-14 text-base text-gray-900 placeholder:text-gray-400
            bg-transparent outline-none min-w-0
          "
        />

        {/* Right: spinner or clear */}
        <div className="flex items-center pr-4 shrink-0">
          {isLoading ? (
            <svg
              className="w-5 h-5 animate-spin text-primary-400"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : value.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Effacer l'adresse"
              className="
                w-6 h-6 flex items-center justify-center rounded-full
                text-gray-400 hover:text-red-500 hover:bg-red-50
                transition-all duration-150
              "
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          aria-label="Suggestions d'adresse"
          className="
            absolute left-0 right-0 mt-2 bg-white rounded-2xl overflow-hidden
            ring-1 ring-gray-100
            z-50
          "
          style={{
            boxShadow: '0 20px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)',
            animation: 'autocomplete-enter 180ms ease-out both',
          }}
        >
          {/* Loading skeletons */}
          {isLoading && (
            <div className="divide-y divide-gray-50">
              <SkeletonItem />
              <SkeletonItem />
              <SkeletonItem />
            </div>
          )}

          {/* Predictions */}
          {!isLoading && predictions.length > 0 && (
            <div
              className="divide-y divide-gray-50 max-h-96 overflow-y-auto"
            >
              {predictions.slice(0, 6).map((prediction, index) => (
                <PredictionItem
                  key={prediction.place_id}
                  prediction={prediction}
                  isHighlighted={highlightedIndex === index}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(prediction);
                  }}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-8 px-4 gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">Aucune adresse trouvée</p>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Vérifiez l'orthographe ou essayez une adresse différente
              </p>
            </div>
          )}

          {/* Powered by Google footer */}
          <div className="h-8 flex items-center justify-center border-t border-gray-50 px-4">
            <p className="text-[10px] text-gray-300 tracking-wide">
              Powered by Google
            </p>
          </div>
        </div>
      )}

      {/* Animation keyframe injected once */}
      <style>{`
        @keyframes autocomplete-enter {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
