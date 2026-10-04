export default function ReceiverList({ receivers, setReceivers }) {
  const update = (i, val) => {
    const next = [...receivers];
    next[i] = val;
    setReceivers(next);
  };

  const add = () => setReceivers([...receivers, '']);
  const remove = (i) => setReceivers(receivers.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {receivers.map((r, i) => (
        <div key={i} className="flex gap-2 items-center animate-fade-up">
          <input
            type="email"
            className="nm-input flex-1"
            placeholder="receiver@gmail.com"
            value={r}
            onChange={(e) => update(i, e.target.value)}
          />
          {receivers.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="nm-btn !px-3 !py-2 text-red-500"
              title="Remove"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={add} className="nm-btn text-sm">
        ➕ Add Receiver
      </button>
    </div>
  );
}
