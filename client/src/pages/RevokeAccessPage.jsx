import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

export default function RevokeAccessPage() {
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState('');
  const [fileSearch, setFileSearch] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [perms, setPerms] = useState([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsError, setPermsError] = useState('');
  const [permSearch, setPermSearch] = useState('');

  const [revoking, setRevoking] = useState(null);
  const [bulkRevoking, setBulkRevoking] = useState(false);
  const [selectedPermIds, setSelectedPermIds] = useState([]);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const loadFiles = async () => {
    setFilesLoading(true);
    setFilesError('');
    try {
      const res = await fetch(`${API_BASE}/api/drive-files`);
      const data = await res.json();
      if (data.success) setFiles(data.files || []);
      else setFilesError(data.error || 'Failed to load files.');
    } catch (err) {
      setFilesError(err.message);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => { loadFiles(); }, []);

  const filteredFiles = useMemo(
    () => files.filter((f) => f.name.toLowerCase().includes(fileSearch.toLowerCase())),
    [files, fileSearch]
  );

  const filteredPerms = useMemo(
    () => perms.filter((p) => p.email.toLowerCase().includes(permSearch.toLowerCase())),
    [perms, permSearch]
  );

  const loadPerms = async (file) => {
    setSelectedFile(file);
    setPermsLoading(true);
    setPermsError('');
    setPerms([]);
    setPermSearch('');
    setSelectedPermIds([]);
    setStatus({ type: '', msg: '' });
    try {
      const res = await fetch(`${API_BASE}/api/drive-permissions/${file.id}`);
      const data = await res.json();
      if (data.success) setPerms(data.permissions || []);
      else setPermsError(data.error || 'Failed to load permissions.');
    } catch (err) {
      setPermsError(err.message);
    } finally {
      setPermsLoading(false);
    }
  };

  const copyEmails = async () => {
    if (perms.length === 0) return;
    const emails = perms.map((p) => p.email).join(', ');
    try {
      await navigator.clipboard.writeText(emails);
      setStatus({ type: 'success', msg: `📋 Copied ${perms.length} email(s)` });
    } catch {
      setStatus({ type: 'error', msg: '❌ Copy failed' });
    }
  };

  const togglePerm = (id) =>
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectAllPerms = () => setSelectedPermIds(filteredPerms.map((p) => p.id));
  const clearPermSelection = () => setSelectedPermIds([]);

  const revokeSelected = async () => {
    if (!selectedFile || selectedPermIds.length === 0) return;
    if (!confirm(`Revoke access for ${selectedPermIds.length} selected user(s)?`)) return;
    setBulkRevoking(true);
    let ok = 0;
    for (const pid of selectedPermIds) {
      try {
        const res = await fetch(
          `${API_BASE}/api/drive-permissions/${selectedFile.id}/${pid}`,
          { method: 'DELETE' }
        );
        const data = await res.json();
        if (data.success) ok++;
      } catch {}
    }
    setPerms((prev) => prev.filter((p) => !selectedPermIds.includes(p.id)));
    setSelectedPermIds([]);
    setBulkRevoking(false);
    setStatus({ type: 'success', msg: `🚫 Revoked ${ok} access(es).` });
  };

  const revokeAll = async () => {
    if (!selectedFile || perms.length === 0) return;
    if (!confirm(`Revoke access for ALL ${perms.length} user(s)?`)) return;
    setBulkRevoking(true);
    let ok = 0;
    for (const p of perms) {
      try {
        const res = await fetch(
          `${API_BASE}/api/drive-permissions/${selectedFile.id}/${p.id}`,
          { method: 'DELETE' }
        );
        const data = await res.json();
        if (data.success) ok++;
      } catch {}
    }
    setPerms([]);
    setBulkRevoking(false);
    setStatus({
      type: ok === perms.length ? 'success' : 'error',
      msg: `🚫 Revoked ${ok}/${perms.length} accesses.`,
    });
  };

  const revoke = async (perm) => {
    if (!selectedFile) return;
    setRevoking(perm.id);
    try {
      const res = await fetch(
        `${API_BASE}/api/drive-permissions/${selectedFile.id}/${perm.id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        setPerms((prev) => prev.filter((p) => p.id !== perm.id));
        setStatus({ type: 'success', msg: `✅ Access revoked for ${perm.email}` });
      } else {
        setStatus({ type: 'error', msg: '❌ ' + (data.error || 'Failed.') });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: '❌ ' + err.message });
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-16">
      <header className="text-center mb-10 animate-fade-up">
        <h1 className="text-4xl font-bold">Revoke</h1>
        <p className="text-sm text-gray-500 mt-2">
          Manage who has access to each file.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Files panel */}
        <div className="nm-flat p-5 animate-fade-up">
          <h2 className="text-xs font-bold uppercase text-gray-500 mb-3">
            📁 Files ({filteredFiles.length}/{files.length})
          </h2>

          <input
            type="text"
            className="nm-input !py-2.5 !text-sm mb-3"
            placeholder="🔍 Search files..."
            value={fileSearch}
            onChange={(e) => setFileSearch(e.target.value)}
          />

          {filesLoading && <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>}
          {filesError && <p className="text-sm text-red-500 py-4 text-center">{filesError}</p>}

          {!filesLoading && !filesError && filteredFiles.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">
              {files.length === 0 ? 'No files in Drive.' : 'No matches.'}
            </p>
          )}

          {!filesLoading && filteredFiles.length > 0 && (
            <ul className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredFiles.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => loadPerms(f)}
                    className={`w-full text-left px-3 py-3 rounded-2xl flex items-center gap-3 transition ${
                      selectedFile?.id === f.id ? 'nm-pressed' : 'hover:bg-white/20'
                    }`}
                  >
                    <span className="text-xl shrink-0">{fileIcon(f.name)}</span>
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {f.name}
                    </span>
                    {selectedFile?.id === f.id && (
                      <span className="text-xs text-brand font-bold">●</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Permissions panel */}
        <div className="nm-flat p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase text-gray-500">
              🔐 Access List
            </h2>
            {perms.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={copyEmails}
                  className="text-xs text-brand font-bold hover:underline">📋 Copy</button>
                <button type="button" onClick={selectAllPerms}
                  className="text-xs text-brand font-bold hover:underline">✓ All</button>
                <button type="button" onClick={clearPermSelection}
                  className="text-xs text-gray-500 font-bold hover:underline">Clear</button>
                <button type="button" onClick={revokeSelected}
                  disabled={bulkRevoking || selectedPermIds.length === 0}
                  className="text-xs text-red-500 font-bold hover:underline disabled:opacity-50">
                  🚫 Revoke Selected ({selectedPermIds.length})
                </button>
              </div>
            )}
          </div>

          {!selectedFile && (
            <div className="text-center py-8">
              <p className="text-3xl mb-2 opacity-40">👈</p>
              <p className="text-sm text-gray-400">
                Select a file to see who has access.
              </p>
            </div>
          )}

          {selectedFile && (
            <>
              <p className="text-sm text-gray-700 font-medium truncate mb-3">
                {fileIcon(selectedFile.name)} {selectedFile.name}
              </p>

              <input
                type="text"
                className="nm-input !py-2.5 !text-sm mb-3"
                placeholder="🔍 Search emails..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
              />

              {permsLoading && <p className="text-sm text-gray-500 py-4 text-center">Loading access list...</p>}
              {permsError && <p className="text-sm text-red-500 py-4 text-center">{permsError}</p>}

              {!permsLoading && !permsError && filteredPerms.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2 opacity-40">🔒</p>
                  <p className="text-sm text-gray-400">
                    {perms.length === 0
                      ? 'No shared users. Only the owner has access.'
                      : 'No matches.'}
                  </p>
                </div>
              )}

              {!permsLoading && filteredPerms.length > 0 && (
                <ul className="space-y-2 max-h-[420px] overflow-y-auto">
                  {filteredPerms.map((p) => (
                    <li
                      key={p.id}
                      className={`nm-pressed rounded-2xl px-4 py-3 flex items-center gap-3 ${
                        selectedPermIds.includes(p.id) ? 'ring-2 ring-brand' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="nm-check"
                        checked={selectedPermIds.includes(p.id)}
                        onChange={() => togglePerm(p.id)}
                      />
                      <span className="text-xl shrink-0">👤</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{p.email}</p>
                        <p className="text-xs text-gray-400 capitalize">
                          Role: {p.role}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => revoke(p)}
                        disabled={revoking === p.id}
                        className="text-red-500 text-xs font-bold px-2 py-1 hover:underline disabled:opacity-50"
                      >
                        {revoking === p.id ? '...' : '✕ Revoke'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {status.msg && (
            <p className={`text-center text-sm font-semibold mt-4 ${
              status.type === 'success' ? 'text-green-500' : 'text-red-500'
            }`}>
              {status.msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
