import { useEffect, useRef, useState } from 'react';

export default function FileDropdown({ files, selectedIds, setSelectedIds, loading, error, onReload }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = (files || []).filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const clearAll = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(filtered.map((f) => f.id));

  const label = loading
    ? 'Loading files from Drive...'
    : selectedIds.length === 0
      ? 'Select files...'
      : `${selectedIds.length} file${selectedIds.length > 1 ? 's' : ''} selected`;

  return (
    <div className="nm-dropdown" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="nm-input flex items-center justify-between text-left disabled:opacity-60"
      >
        <span className={selectedIds.length ? '' : 'text-gray-400'}>{label}</span>
        <span className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="nm-dropdown-panel animate-fade-up">
          {error ? (
            <div className="text-sm text-red-500 p-3">
              {error}
              <button type="button" onClick={onReload} className="ml-2 underline">
                Retry
              </button>
            </div>
          ) : (
            <>
              <input
                className="nm-input !py-2 !text-sm mb-3"
                placeholder="🔍 Search files..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="flex gap-2 mb-3">
                <button type="button" onClick={selectAll} className="nm-btn !py-1.5 !px-3 !text-xs">
                  Select All
                </button>
                <button type="button" onClick={clearAll} className="nm-btn !py-1.5 !px-3 !text-xs text-red-500">
                  Clear All
                </button>
                <button type="button" onClick={onReload} className="nm-btn !py-1.5 !px-3 !text-xs ml-auto">
                  ↻
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1">
                {filtered.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {files.length === 0 ? 'No files in Drive folder.' : 'No matches.'}
                  </p>
                )}
                {filtered.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/10 transition"
                  >
                    <input
                      type="checkbox"
                      className="nm-check"
                      checked={selectedIds.includes(f.id)}
                      onChange={() => toggle(f.id)}
                    />
                    <span className="text-sm">{f.name}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {files.filter((f) => selectedIds.includes(f.id)).map((f) => (
            <span key={f.id} className="nm-pressed !rounded-full px-3 py-1 text-xs">
              {f.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
