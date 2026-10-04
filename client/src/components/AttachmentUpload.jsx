import { useRef } from 'react';

export default function AttachmentUpload({ files, setFiles }) {
  const inputRef = useRef();

  const onChange = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked]);
  };

  const remove = (i) => setFiles(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={onChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        className="nm-btn text-sm"
      >
        📎 Add Attachments
      </button>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="nm-pressed !rounded-xl px-3 py-2 flex justify-between items-center text-sm animate-fade-up"
            >
              <span className="truncate text-gray-700">
                {f.name}{' '}
                <span className="text-xs text-gray-400">
                  ({(f.size / 1024).toFixed(0)} KB)
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-red-500 text-xs font-bold"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
