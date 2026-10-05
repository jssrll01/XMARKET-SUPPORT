import { useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
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

export default function UploadForm() {
  const inputRef = useRef();
  const [items, setItems] = useState([]); // { id, file, customName, tag, progress, status, driveLink, error }
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const addFiles = (files) => {
    const next = Array.from(files).map((f, i) => ({
      id: Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 6),
      file: f,
      customName: f.name,
      tag: '',
      progress: 0,
      status: 'pending',
      driveLink: '',
      error: '',
    }));
    setItems((prev) => [...prev, ...next]);
    setStatus({ type: '', msg: '' });
  };

  const onPick = (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeAt = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const clearAll = () => {
    if (uploading) return;
    setItems([]);
    setStatus({ type: '', msg: '' });
  };

  const updateItem = (id, patch) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const checkDuplicate = async (name) => {
    try {
      const res = await fetch(`${API_BASE}/api/drive-check-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      return data.success && data.exists;
    } catch {
      return false;
    }
  };

  const uploadOne = (item) =>
    new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('files', item.file);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          updateItem(item.id, { progress: pct });
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            updateItem(item.id, {
              progress: 100,
              status: 'done',
              driveLink: data.uploaded?.[0]?.link || '',
            });
            resolve({ ok: true });
          } else {
            const err = data.error || data.failed?.[0]?.error || 'Upload failed';
            updateItem(item.id, { status: 'error', error: err, progress: 0 });
            resolve({ ok: false, error: err });
          }
        } catch {
          updateItem(item.id, { status: 'error', error: 'Bad response', progress: 0 });
          resolve({ ok: false, error: 'Bad response' });
        }
      };

      xhr.onerror = () => {
        updateItem(item.id, { status: 'error', error: 'Network error', progress: 0 });
        resolve({ ok: false, error: 'Network error' });
      };

      xhr.open('POST', `${API_BASE}/api/drive-upload`);
      xhr.send(fd);
    });

  const handleUpload = async (e) => {
    e.preventDefault();
    const pending = items.filter((x) => x.status === 'pending' || x.status === 'error');
    if (pending.length === 0) {
      return setStatus({ type: 'error', msg: 'No files to upload.' });
    }

    setUploading(true);
    setStatus({ type: '', msg: '' });

    // Duplicate detection — check all
    const dups = [];
    for (const it of pending) {
      const name = (it.customName || it.file.name).trim();
      const exists = await checkDuplicate(name);
      if (exists) dups.push(name);
    }

    // Auto-rename duplicates
    if (dups.length > 0) {
      const renamed = [];
      setItems((prev) =>
        prev.map((x) => {
          if (x.status !== 'pending' && x.status !== 'error') return x;
          const name = (x.customName || x.file.name).trim();
          if (dups.includes(name)) {
            const dot = name.lastIndexOf('.');
            const base = dot > 0 ? name.slice(0, dot) : name;
            const ext = dot > 0 ? name.slice(dot) : '';
            const newN = `${base} (1)${ext}`;
            renamed.push(`${name} → ${newN}`);
            return { ...x, customName: newN };
          }
          return x;
        })
      );
      setStatus({ type: 'error', msg: `ℹ️ Renamed ${dups.length} duplicate(s) automatically.` });
      await new Promise((r) => setTimeout(r, 300));
    }

    // Upload all in parallel
    let ok = 0;
    let failed = 0;
    for (const it of pending) {
      updateItem(it.id, { status: 'uploading', progress: 0, error: '' });
    }
    const results = await Promise.all(pending.map((it) => uploadOne(it)));
    results.forEach((r) => (r.ok ? ok++ : failed++));

    setUploading(false);
    if (failed === 0) {
      setStatus({ type: 'success', msg: `✅ Uploaded ${ok} file(s).` });
    } else {
      setStatus({
        type: 'error',
        msg: `⚠️ ${ok} uploaded, ${failed} failed.`,
      });
    }
  };

  const totalSize = items.reduce((s, x) => s + (x.file.size || 0), 0);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-16">
      <header className="text-center mb-10 animate-fade-up">
        <h1 className="text-4xl font-bold">
          Drive <span className="text-brand">Upload</span>
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Drag and drop files anywhere to queue them.
        </p>
      </header>

      <form onSubmit={handleUpload} className="nm-flat p-8 space-y-6 stagger">
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          className={`nm-pressed rounded-2xl p-10 text-center cursor-pointer
                      transition-all ${dragging ? 'ring-4 ring-brand scale-[1.02]' : 'hover:opacity-90'}`}
        >
          <p className="text-4xl mb-3">{dragging ? '📥' : '📁'}</p>
          <p className="font-semibold text-gray-700">
            {dragging ? 'Drop files here' : 'Click or drag files here'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Multiple files supported · Max 25 MB each
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={onPick}
            className="hidden"
          />
        </div>

        {/* Files list */}
        {items.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold uppercase text-gray-500">
                {items.length} file{items.length > 1 ? 's' : ''} · {formatBytes(totalSize)}
              </p>
              {!uploading && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-red-500 font-bold hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <ul className="space-y-3">
              {items.map((x) => (
                <li
                  key={x.id}
                  className="nm-pressed rounded-2xl px-4 py-3 animate-fade-up"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl shrink-0">{fileIcon(x.file.name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {x.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatBytes(x.file.size)}
                      </p>
                    </div>
                    {x.status === 'done' && (
                      <span className="text-green-500 font-bold">✓</span>
                    )}
                    {x.status === 'error' && (
                      <span className="text-red-500 font-bold">✗</span>
                    )}
                    {x.status !== 'uploading' && x.status !== 'done' && (
                      <button
                        type="button"
                        onClick={() => removeAt(x.id)}
                        className="text-red-500 font-bold text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Metadata inputs */}
                  {x.status === 'pending' || x.status === 'error' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        className="nm-input !py-1.5 !text-xs"
                        placeholder="Custom name"
                        value={x.customName}
                        onChange={(e) => updateItem(x.id, { customName: e.target.value })}
                      />
                      <input
                        type="text"
                        className="nm-input !py-1.5 !text-xs"
                        placeholder="Tag (optional)"
                        value={x.tag}
                        onChange={(e) => updateItem(x.id, { tag: e.target.value })}
                      />
                    </div>
                  ) : null}

                  {/* Progress bar */}
                  {x.status === 'uploading' || x.status === 'done' ? (
                    <div className="mt-2">
                      <div className="nm-pressed rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            x.status === 'done' ? 'bg-green-500' : 'bg-brand'
                          }`}
                          style={{ width: x.progress + '%' }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {x.progress}% {x.status === 'done' ? '· Uploaded' : ''}
                      </p>
                    </div>
                  ) : null}

                  {x.error && (
                    <p className="text-xs text-red-500 mt-1">{x.error}</p>
                  )}

                  {x.status === 'done' && x.driveLink && (
                    <a
                      href={x.driveLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand hover:underline mt-1 inline-block"
                    >
                      Open in Drive →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || items.length === 0}
          className="nm-btn w-full py-4 text-base animate-pulse-slow"
        >
          {uploading ? '⏳ Uploading...' : `☁️ Upload ${items.length || ''} to Drive`}
        </button>

        {status.msg && (
          <p className={`text-center font-semibold text-sm ${
            status.type === 'success' ? 'text-green-500' : 'text-red-500'
          }`}>
            {status.msg}
          </p>
        )}
      </form>
    </div>
  );
}
