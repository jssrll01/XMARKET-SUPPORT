import { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function fileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
  if (['ppt', 'pptx'].includes(ext)) return '📙';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
  return '📄';
}

export default function DriveFilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');

  const [filesOpen, setFilesOpen] = useState(false);
  const filesWrapRef = useRef(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [receipt, setReceipt] = useState(null);

  const loadFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/drive-files`);
      const data = await res.json();
      if (data.success) setFiles(data.files || []);
      else setError(data.error || 'Failed to load files.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFiles(); }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!filesOpen) return;
    const onClick = (e) => {
      if (filesWrapRef.current && !filesWrapRef.current.contains(e.target)) {
        setFilesOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [filesOpen]);

  const filtered = useMemo(
    () => files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
    [files, search]
  );

  const toggleFile = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectAll = () => setSelectedIds(filtered.map((f) => f.id));
  const clearAll = () => setSelectedIds([]);

  const removeFile = (id) =>
    setSelectedIds((prev) => prev.filter((x) => x !== id));

  const selectedFiles = files.filter((f) => selectedIds.includes(f.id));

  const totalSize = selectedFiles.reduce((s, f) => s + (f.size || 0), 0);

  const label = loading
    ? 'Loading...'
    : selectedIds.length === 0
      ? 'Select files...'
      : `${selectedIds.length} file${selectedIds.length > 1 ? 's' : ''} selected`;

  const handleGrantClick = (e) => {
    e.preventDefault();
    if (!email.trim()) return setStatus({ type: 'error', msg: 'Enter a client email.' });
    if (selectedIds.length === 0) return setStatus({ type: 'error', msg: 'Select at least one file.' });
    setStatus({ type: '', msg: '' });
    setConfirmOpen(true);
  };

  const doGrant = async () => {
    setSharing(true);
    setStatus({ type: '', msg: '' });
    let succeeded = 0;
    const errors = [];

    for (const fileId of selectedIds) {
      const file = files.find((f) => f.id === fileId);
      try {
        const res = await fetch(`${API_BASE}/api/drive-share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, email: email.trim() }),
        });
        const data = await res.json();
        if (data.success) succeeded++;
        else errors.push({ name: file?.name, error: data.error });
      } catch (err) {
        errors.push({ name: file?.name, error: err.message });
      }
    }

    setSharing(false);
    setConfirmOpen(false);

    if (errors.length === 0) {
      setStatus({ type: 'success', msg: `✅ Access granted to ${email} for ${succeeded} file(s).` });
      setReceipt({ email, count: succeeded, files: selectedFiles.map((f) => f.name) });
      setSelectedIds([]);
      setEmail('');
    } else {
      setStatus({
        type: 'error',
        msg: `⚠️ ${succeeded}/${selectedIds.length} succeeded. ${errors.length} failed.`,
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-16">
      <header className="text-center mb-10 animate-fade-up">
        <h1 className="text-4xl font-bold">
          Drive <span className="text-brand">Files</span>
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Enter the client email, select files, and grant access.
        </p>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6 stagger">
        <div className="nm-pressed rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-brand">{files.length}</p>
          <p className="text-xs uppercase text-gray-500 mt-1">In Drive</p>
        </div>
        <div className="nm-pressed rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-brand">{selectedIds.length}</p>
          <p className="text-xs uppercase text-gray-500 mt-1">Selected</p>
        </div>
        <div className="nm-pressed rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-brand">{formatBytes(totalSize)}</p>
          <p className="text-xs uppercase text-gray-500 mt-1">Total Size</p>
        </div>
      </div>

      <div className="nm-flat p-6 space-y-6 animate-fade-up">
        {/* Client Email */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            👤 Client Email
          </label>
          <input
            type="email"
            className="nm-input"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status.msg) setStatus({ type: '', msg: '' });
            }}
            placeholder="client@gmail.com"
          />
          <p className="text-xs text-gray-400 mt-2">
            Reader access will be granted to this email.
          </p>
        </div>

        {/* Files Dropdown */}
        <div className="relative" ref={filesWrapRef}>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            📁 Files
          </label>

          <button
            type="button"
            onClick={() => setFilesOpen((o) => !o)}
            className="nm-input w-full flex items-center justify-between text-left"
          >
            <span className={selectedIds.length ? '' : 'text-gray-400'}>
              {label}
            </span>
            <span className={`transition-transform duration-300 ${filesOpen ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>

          {filesOpen && (
            <div className="nm-dropdown-panel animate-fade-up">
              <input
                type="text"
                className="nm-input !py-2 !text-sm mb-3"
                placeholder="🔍 Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="flex gap-2 mb-3">
                <button type="button" onClick={selectAll} className="nm-btn !py-1.5 !px-3 !text-xs">
                  Select All
                </button>
                <button type="button" onClick={clearAll} className="nm-btn !py-1.5 !px-3 !text-xs text-red-500">
                  Clear All
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {error && (
                  <p className="text-center text-red-500 py-3 text-sm">{error}</p>
                )}
                {!error && filtered.length === 0 && (
                  <p className="text-center text-gray-400 py-3 text-sm">
                    {files.length === 0 ? 'No files in the Drive folder.' : 'No matches.'}
                  </p>
                )}
                {!error && filtered.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/10 transition"
                  >
                    <input
                      type="checkbox"
                      className="nm-check"
                      checked={selectedIds.includes(f.id)}
                      onChange={() => toggleFile(f.id)}
                    />
                    <span className="text-base shrink-0">{fileIcon(f.name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{f.name}</p>
                      {f.size > 0 && (
                        <p className="text-xs text-gray-400">{formatBytes(f.size)}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ============ NEW: ACCESS FILES SECTION ============ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-bold uppercase text-gray-500">
              🔐 Access Files
            </label>
            {selectedIds.length > 0 && (
              <span className="text-xs text-gray-400">
                {selectedIds.length} file{selectedIds.length > 1 ? 's' : ''} · {formatBytes(totalSize)}
              </span>
            )}
          </div>

          {selectedFiles.length === 0 ? (
            <div className="nm-pressed rounded-2xl p-6 text-center">
              <p className="text-3xl mb-2 opacity-40">📂</p>
              <p className="text-sm text-gray-400">
                No files selected yet. Pick files from the dropdown above.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedFiles.map((f) => (
                <li
                  key={f.id}
                  className="nm-pressed rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-up"
                >
                  <span className="text-xl shrink-0">{fileIcon(f.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {f.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatBytes(f.size)} · Reader access
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="text-red-500 font-bold text-sm px-2"
                    title="Remove"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Grant button */}
        <button
          type="button"
          onClick={handleGrantClick}
          disabled={sharing}
          className="nm-btn w-full py-4 text-base"
        >
          🔗 Grant Access
        </button>

        {status.msg && (
          <p className={`text-center text-sm font-semibold ${
            status.type === 'success' ? 'text-green-500' : 'text-red-500'
          }`}>
            {status.msg}
          </p>
        )}
      </div>

      {/* Success Receipt Modal */}
      {receipt && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-up"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setReceipt(null)}
        >
          <div className="nm-flat p-7 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center
                              bg-gradient-to-br from-green-400 to-green-600 text-white text-3xl mb-3">
                ✓
              </div>
              <h3 className="text-xl font-bold">Access Granted</h3>
            </div>

            <div className="nm-pressed p-4 mb-3 text-center">
              <p className="text-xs uppercase text-gray-400 mb-1">Granted to</p>
              <p className="text-sm font-semibold text-gray-700 break-all">{receipt.email}</p>
            </div>

            <div className="nm-pressed p-4 mb-5">
              <p className="text-xs uppercase text-gray-400 mb-2">
                {receipt.count} File{receipt.count > 1 ? 's' : ''}
              </p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {receipt.files.map((n, i) => (
                  <li key={i} className="text-xs text-gray-600 truncate">📄 {n}</li>
                ))}
              </ul>
            </div>

            <button onClick={() => setReceipt(null)} className="nm-btn w-full py-3">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-up"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => !sharing && setConfirmOpen(false)}
        >
          <div className="nm-flat p-7 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-3">🔗 Confirm Access</h3>
            <p className="text-sm text-gray-500 mb-4">
              Grant <strong>reader</strong> access to:
            </p>

            <div className="nm-pressed p-4 mb-4">
              <p className="text-xs uppercase text-gray-400 mb-1">Client Email</p>
              <p className="text-sm font-semibold text-gray-700 break-all">{email}</p>
            </div>

            <div className="nm-pressed p-4 mb-4 max-h-48 overflow-y-auto">
              <p className="text-xs uppercase text-gray-400 mb-2">
                Files ({selectedFiles.length}) · {formatBytes(totalSize)}
              </p>
              <ul className="space-y-1">
                {selectedFiles.map((f) => (
                  <li key={f.id} className="text-sm text-gray-700 truncate">
                    {fileIcon(f.name)} {f.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={sharing}
                className="nm-btn flex-1"
              >
                Cancel
              </button>
              <button
                onClick={doGrant}
                disabled={sharing}
                className="nm-btn flex-1 text-brand"
              >
                {sharing ? '⏳ Granting...' : '✅ Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
