import { useRef, useState } from 'react';

const API_URL = 'http://localhost:5000/api/drive-upload';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

export default function UploadForm() {
  const inputRef = useRef();
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const [failed, setFailed] = useState([]);

  const onPick = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked]);
    setStatus({ type: '', msg: '' });
    setUploaded([]);
    setFailed([]);
  };

  const removeAt = (i) => setFiles(files.filter((_, idx) => idx !== i));
  const clearAll = () => {
    setFiles([]);
    setStatus({ type: '', msg: '' });
    setUploaded([]);
    setFailed([]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      return setStatus({ type: 'error', msg: 'Select at least one file.' });
    }

    setLoading(true);
    setStatus({ type: '', msg: '' });
    setUploaded([]);
    setFailed([]);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));

      const res = await fetch(API_URL, { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setStatus({ type: 'success', msg: `✅ ${data.message}` });
        setUploaded(data.uploaded || []);
        setFailed(data.failed || []);
        setFiles([]);
      } else {
        setStatus({ type: 'error', msg: '❌ ' + (data.error || 'Upload failed.') });
        setFailed(data.failed || []);
      }
    } catch (err) {
      setStatus({ type: 'error', msg: '❌ Network error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-16">
      <header className="text-center mb-10 animate-fade-up">
        <h1 className="text-4xl font-bold">
          Drive <span className="text-brand">Upload</span>
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Push files straight into your XMARKET Drive folder.
        </p>
      </header>

      <form onSubmit={handleUpload} className="nm-flat p-8 space-y-6 stagger">
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = Array.from(e.dataTransfer.files || []);
            setFiles((prev) => [...prev, ...dropped]);
          }}
          className="nm-pressed rounded-2xl p-10 text-center cursor-pointer
                     transition-all hover:opacity-90"
        >
          <p className="text-4xl mb-3">📁</p>
          <p className="font-semibold text-gray-700">
            Click or drag files here
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

        {/* File list */}
        {files.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold uppercase text-gray-500">
                {files.length} file{files.length > 1 ? 's' : ''} · {formatBytes(totalSize)}
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                Clear all
              </button>
            </div>
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="nm-pressed rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-up"
                >
                  <span className="text-xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {f.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(f.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className="text-red-500 font-bold text-sm"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || files.length === 0}
          className="nm-btn w-full py-4 text-base animate-pulse-slow"
        >
          {loading ? '⏳ Uploading...' : `☁️ Upload ${files.length || ''} to Drive`}
        </button>

        {status.msg && (
          <p className={`text-center font-semibold text-sm ${
            status.type === 'success' ? 'text-green-500' : 'text-red-500'
          }`}>
            {status.msg}
          </p>
        )}

        {/* Results */}
        {uploaded.length > 0 && (
          <div className="nm-pressed rounded-2xl p-5">
            <p className="text-xs font-bold uppercase text-gray-500 mb-3">
              ✅ Uploaded
            </p>
            <ul className="space-y-2">
              {uploaded.map((u, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={u.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand hover:underline"
                  >
                    {u.name}
                  </a>
                  <span className="text-xs text-gray-400 ml-2">
                    {formatBytes(u.size)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {failed.length > 0 && (
          <div className="nm-pressed rounded-2xl p-5">
            <p className="text-xs font-bold uppercase text-red-500 mb-3">
              ❌ Failed
            </p>
            <ul className="space-y-2">
              {failed.map((f, i) => (
                <li key={i} className="text-sm text-gray-600">
                  <strong>{f.name}</strong> — {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
