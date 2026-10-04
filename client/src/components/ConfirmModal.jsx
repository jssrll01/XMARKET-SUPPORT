export default function ConfirmModal({ open, data, onCancel, onConfirm, loading }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-up"
      style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div className="nm-flat p-7 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-3">📤 Confirm Send</h3>
        <div className="space-y-3 text-sm">
          <div className="nm-pressed p-4">
            <p className="text-xs uppercase text-gray-400 mb-1">Recipients</p>
            <p className="font-semibold">{data.recipientCount}</p>
          </div>
          <div className="nm-pressed p-4">
            <p className="text-xs uppercase text-gray-400 mb-1">Files</p>
            <p className="font-semibold">{data.fileCount}</p>
          </div>
          {data.attachmentCount > 0 && (
            <div className="nm-pressed p-4">
              <p className="text-xs uppercase text-gray-400 mb-1">Attachments</p>
              <p className="font-semibold">{data.attachmentCount}</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} disabled={loading} className="nm-btn flex-1">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="nm-btn flex-1 text-brand">
            {loading ? '⏳ Sending...' : '✅ Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
