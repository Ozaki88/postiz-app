'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';

interface Place {
  id: string;
  name: string;
  where?: string;
}

// The last place picked is remembered in this browser and pre-filled on the
// next post (Facebook and Instagram share it), so one search covers both.
const REMEMBER = 'postpilot-location';
const HINT =
  ' Paste the place’s Facebook Page id instead (on facebook.com open the place’s Page → About → Page transparency → Page ID). New York, New York is 108424279189115.';
const remembered = (): Place | undefined => {
  try {
    const v = JSON.parse(localStorage.getItem(REMEMBER) || 'null');
    return v?.id ? v : undefined;
  } catch {
    return undefined;
  }
};
const remember = (p: Place | undefined) => {
  try {
    if (p) localStorage.setItem(REMEMBER, JSON.stringify(p));
    else localStorage.removeItem(REMEMBER);
  } catch {}
};

export const LocationPicker: FC<{
  name: string;
  label?: string;
  onChange: (event: {
    target: { value: { id: string; name?: string } | undefined; name: string };
  }) => void;
}> = ({ name, label = 'Location', onChange }) => {
  const { getValues } = useSettings();
  const customFunc = useCustomProviderFunction();
  const [value, setValue] = useState<Place | undefined>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | undefined>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emit = useCallback(
    (p: Place | undefined) => {
      setValue(p);
      onChange({
        target: { name, value: p ? { id: p.id, name: p.name } : undefined },
      });
    },
    [name, onChange]
  );

  useEffect(() => {
    const saved = getValues()[name];
    if (saved?.id) {
      setValue(saved);
      return;
    }
    const last = remembered();
    if (last) {
      emit(last);
    }
  }, []);

  const search = useCallback(async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setError('');
    try {
      const list = await customFunc.get('placeSearch', { q: query });
      if (Array.isArray(list)) {
        setResults(list);
      } else {
        // The backend answers { error } with Meta's reason, or false when
        // the channel itself was refused.
        setResults([]);
        const why = list?.error || '';
        setError(
          why
            ? 'Meta refused the search: ' + why + HINT
            : 'The channel refused the search. Reconnect it in Settings, or' +
                HINT
        );
      }
    } catch (e: any) {
      setResults([]);
      // Meta's own reason (e.g. a missing permission), so it can be fixed.
      const why = e?.message || e?.error || '';
      setError('Place search failed' + (why ? ': ' + why : '') + '.' + HINT);
    } finally {
      setLoading(false);
    }
  }, [query, customFunc]);

  // Search as you type (after a short pause), so it works without pressing Search.
  useEffect(() => {
    if (query.trim().length < 3) return;
    const t = setTimeout(() => search(), 600);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (p: Place) => {
    remember(p);
    emit(p);
    setResults(undefined);
    setQuery('');
  };

  return (
    <div className="flex flex-col gap-[8px] pt-[16px]">
      <div className="text-[14px]">{label}</div>
      {value ? (
        <div className="flex items-center gap-[10px] rounded-[8px] border border-newTableBorder bg-newBgColorInner px-[12px] py-[8px]">
          <span>📍</span>
          <span className="flex-1">{value.name || value.id}</span>
          <button
            type="button"
            className="opacity-70 hover:opacity-100"
            onClick={() => {
              remember(undefined);
              emit(undefined);
            }}
          >
            ✕ Remove
          </button>
        </div>
      ) : (
        <>
          <div className="flex w-full items-center gap-[8px]">
            <input
              className="flex-1 min-w-0 h-[40px] rounded-[8px] border border-newTableBorder bg-newBgColorInner px-[12px] outline-none"
              placeholder="City or place (e.g. New York), a Facebook Page link, or a Page id"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  search();
                }
              }}
            />
            <button
              type="button"
              className="shrink-0 whitespace-nowrap h-[40px] px-[16px] rounded-[8px] bg-btnSimple border border-newTableBorder"
              onClick={search}
              disabled={loading}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
          {error && <div className="text-[12px] text-red-400">{error}</div>}
          {results && !results.length && !error && (
            <div className="text-[12px] opacity-70">
              No places found. Try the city name, or paste the place&apos;s
              Facebook Page id (facebook.com &rarr; the place&apos;s Page &rarr;
              About &rarr; Page transparency &rarr; Page ID).
            </div>
          )}
          {!!results?.length && (
            <div className="flex flex-col rounded-[8px] border border-newTableBorder overflow-hidden max-h-[240px] overflow-y-auto">
              {results.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="text-start px-[12px] py-[8px] hover:bg-boxFocused"
                  onClick={() => pick(p)}
                >
                  <div>{p.name}</div>
                  {p.where && (
                    <div className="text-[12px] opacity-70">{p.where}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
