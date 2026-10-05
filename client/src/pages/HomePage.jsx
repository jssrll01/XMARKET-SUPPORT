import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
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
  return '📄';
}

export default function HomePage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storage, setStorage] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState('');
  const [recipientCounts, setRecipientCounts] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [fr, sr] = await Promise.all([
        fetch(`${API_BASE}/api/drive-files`).then((r) => r.json()),
        fetch(`${API_BASE}/api/drive-storage`).then((r) => r.json()).catch(() => null),
      ]);
      if (fr.success) setFiles(fr.files || []);
      else setError(fr.error || 'Failed to load files.');
      if (sr && sr.success) setStorage(sr);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async () => {
    const counts = {};
    for (const f of files.slice(0, 20)) {
      try {
        const r = await fetch(`${API_BASE}/api/drive-permissions/${f.id}`).then((r) => r.json());
        if (r.success) {
          r.permissions.forEach((p) => {
            counts[p.email] = (counts[p.email] || 0) + 1;
          });
        }
      } catch {}
    }
    setRecipientCounts(counts);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (files.length > 0) loadRecipients(); }, [files.length]);

  // Sorted files
  const sortedFiles = useMemo(() => {
    const arr = [...files];
    if (sortBy === 'name') arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'name-desc') arr.sort((a, b) => b.name.localeCompare(a.name));
    if (sortBy === 'size') arr.sort((a, b) => (b.size || 0) - (a.size || 0));
    return arr;
  }, [files, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
    // File count trend (last 7 days from createdTime, fallback 0)
    const trend = Array(7).fill(0);
    const now = new Date();
    files.forEach((f) => {
      if (!f.createdTime) return;
      const d = new Date(f.createdTime);
      const diff = Math.floor((now - d) / (24 * 60 * 60 * 1000));
      if (diff >= 0 && diff < 7) trend[6 - diff]++;
    });
    const largest = [...files].sort((a, b) => (b.size || 0) - (a.size || 0))[0];
    return { totalSize, trend, largest };
  }, [files]);

  // Top recipients
  const topRecipients = useMemo(() => {
    return Object.entries(recipientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [recipientCounts]);

  const handleRename = async (file) => {
    if (!newName.trim() || newName === file.name) return setRenaming(null);
    try {
      const res = await fetch(`${API_BASE}/api/drive-rename/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      }).then((r) => r.json());
      if (res.success) {
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, name: newName.trim() } : f)));
        setRenaming(null);
        setNewName('');
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 pb-16">
        <div className="nm-flat p-12 text-center animate-fade-up">
          <p className="text-3xl mb-3 animate-pulse-slow">⏳</p>
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-16">
      <header className="text-center mb-8 animate-fade-up">
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center
                        bg-gradient-to-br from-brand to-brand-dark shadow-lg shadow-blue-500/30">
          <span className="text-3xl font-black text-white">XM</span>
        </div>
        <h1 className="text-4xl font-bold">XMARKET <span className="text-brand">Dashboard</span></h1>
        <p className="text-sm text-gray-500 mt-2">Live stats from your Drive folder.</p>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        <button onClick={() => navigate('/upload')}
          className="nm-btn !py-4 flex flex-col items-center gap-1">
          <span className="text-2xl">☁️</span>
          <span className="text-xs">Upload</span>
        </button>
        <button onClick={() => navigate('/drive')}
          className="nm-btn !py-4 flex flex-col items-center gap-1">
          <span className="text-2xl">🔗</span>
          <span className="text-xs">Grant</span>
        </button>
        <button onClick={() => navigate('/revoke')}
          className="nm-btn !py-4 flex flex-col items-center gap-1">
          <span className="text-2xl">🗑️</span>
          <span className="text-xs">Revoke</span>
        </button>
        <button onClick={load}
          className="nm-btn !py-4 flex flex-col items-center gap-1">
          <span className="text-2xl">↻</span>
          <span className="text-xs">Refresh</span>
        </button>
      </div>

      {/* Expiring alert (placeholder — hook in later) */}
      <div className="nm-pressed rounded-2xl p-4 mb-6 animate-fade-up">
        <p className="text-xs text-gray-500">
          ⏱️ <strong>Access expiry:</strong> no scheduled revokes yet.
        </p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 stagger">
        <div className="nm-flat p-6 text-center">
          <p className="text-4xl mb-2">📁</p>
          <p className="text-3xl font-bold text-brand">{files.length}</p>
          <p className="text-xs uppercase text-gray-500 mt-1">Total Files</p>
        </div>
        <div className="nm-flat p-6 text-center">
          <p className="text-4xl mb-2">💾</p>
          <p className="text-3xl font-bold text-brand">{formatBytes(stats.totalSize)}</p>
          <p className="text-xs uppercase text-gray-500 mt-1">Folder Size</p>
        </div>
        <div className="nm-flat p-6 text-center">
          <p className="text-4xl mb-2">🏆</p>
          <p className="text-3xl font-bold text-brand">
            {stats.largest ? formatBytes(stats.largest.size) : '—'}
          </p>
          <p className="text-xs uppercase text-gray-500 mt-1">Largest</p>
        </div>
      </div>

      {/* Storage bar */}
      {storage && storage.limit > 0 && (
        <div className="nm-flat p-6 mb-6 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase text-gray-500">💾 Drive Storage</h2>
            <span className="text-xs text-gray-400">
              {formatBytes(storage.usage)} / {formatBytes(storage.limit)}
            </span>
          </div>
          <div className="nm-pressed rounded-full h-4 overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-all duration-500"
              style={{ width: Math.min(100, (storage.usage / storage.limit) * 100) + '%' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Used: <strong>{Math.round((storage.usage / storage.limit) * 100)}%</strong></span>
            <span>Free: <strong>{formatBytes(storage.limit - storage.usage)}</strong></span>
          </div>
        </div>
      )}

      {/* File count trend (last 7 days) */}
      <div className="nm-flat p-6 mb-6 animate-fade-up">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">📈 Uploads (Last 7 Days)</h2>
        <div className="flex items-end justify-between gap-2 h-32">
          {stats.trend.map((v, i) => {
            const max = Math.max(...stats.trend, 1);
            const height = (v / max) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <span className="text-xs text-gray-400 mb-1">{v}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-brand to-brand-dark transition-all duration-500"
                     style={{ height: `${Math.max(height, 4)}%` }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Top recipients */}
      {topRecipients.length > 0 && (
        <div className="nm-flat p-6 mb-6 animate-fade-up">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">👥 Top Recipients</h2>
          <ul className="space-y-2">
            {topRecipients.map(([email, count], i) => (
              <li key={email} className="nm-pressed rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{['🥇', '🥈', '🥉'][i] || '👤'}</span>
                <span className="text-sm text-gray-700 truncate flex-1">{email}</span>
                <span className="text-xs text-gray-400">{count} file{count > 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All files with sort + rename */}
      <div className="nm-flat p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-bold uppercase text-gray-500">📂 All Files ({files.length})</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="nm-input !py-2 !px-3 !w-auto !text-xs"
          >
            <option value="name">A-Z</option>
            <option value="name-desc">Z-A</option>
            <option value="size">Largest First</option>
          </select>
        </div>

        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {sortedFiles.map((f) => (
            <li key={f.id}
                className="nm-pressed rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-up">
              <span className="text-xl shrink-0">{fileIcon(f.name)}</span>
              <div className="flex-1 min-w-0">
                {renaming === f.id ? (
                  <div className="flex gap-2">
                    <input value={newName} onChange={(e) => setNewName(e.target.value)}
                           className="nm-input !py-1 !text-xs flex-1" autoFocus />
                    <button onClick={() => handleRename(f)}
                            className="text-green-500 text-xs font-bold">Save</button>
                    <button onClick={() => setRenaming(null)}
                            className="text-gray-400 text-xs">✕</button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">{formatBytes(f.size)}</p>
                  </>
                )}
              </div>
              {renaming !== f.id && (
                <>
                  <button onClick={() => { setRenaming(f.id); setNewName(f.name); }}
                          className="text-gray-400 text-xs hover:text-brand" title="Rename">✏️</button>
                  <a href={f.link} target="_blank" rel="noreferrer"
                     className="text-brand hover:underline text-xs font-bold">Open →</a>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-red-500 text-center mt-4">{error}</p>}
    </div>
  );
}
