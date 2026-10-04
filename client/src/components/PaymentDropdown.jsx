import { useEffect, useRef, useState } from 'react';

const OPTIONS = [
  { value: 'GCash', label: 'GCash', emoji: '💙' },
  { value: 'Maya', label: 'Maya', emoji: '💜' },
  { value: 'Bank Transfer (GoTyme)', label: 'Bank Transfer (GoTyme)', emoji: '🏦' },
];

export default function PaymentDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = OPTIONS.find((o) => o.value === value) || OPTIONS[0];

  return (
    <div className="nm-dropdown" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="nm-input flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm">
          <span>{current.emoji}</span>
          <span>{current.label}</span>
        </span>
        <span className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="nm-dropdown-panel animate-fade-up !p-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3
                          transition-all duration-150 ${
                            value === opt.value
                              ? 'nm-pressed text-brand font-semibold'
                              : 'hover:bg-white/10'
                          }`}
            >
              <span className="text-base">{opt.emoji}</span>
              <span>{opt.label}</span>
              {value === opt.value && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
