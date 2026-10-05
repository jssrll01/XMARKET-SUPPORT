import { useState } from 'react';
import FileDropdown from './FileDropdown';
import ReceiverList from './ReceiverList';
import AttachmentUpload from './AttachmentUpload';
import ConfirmModal from './ConfirmModal';
import useDriveFiles from '../useDriveFiles';
import { useSettings } from '../context/SettingsContext';
import { parseCSV } from '../utils/csv';
import { replaceVariables } from '../utils/variables';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';


const API_URL = `${API_BASE}/api/send`;
const RETRY_URL = `${API_BASE}/api/retry`;

export default function SendForm() {
  const { settings } = useSettings();
  const { files: driveFiles, loading: driveLoading, error: driveError, reload: reloadDrive } = useDriveFiles();

  const [selectedIds, setSelectedIds] = useState([]);
  const [receivers, setReceivers] = useState(['']);
  const [orderId, setOrderId] = useState('');
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [useCsv, setUseCsv] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [failedPayload, setFailedPayload] = useState([]);

  const onCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    setCsvRows(rows);
    setUseCsv(true);
  };

  const buildPayload = () => {
    const files = driveFiles.filter((f) => selectedIds.includes(f.id));
    const recipients = useCsv && csvRows.length
      ? csvRows
      : receivers.filter((r) => r.trim()).map((r) => ({ email: r }));

    return recipients.map((recipient) => {
      const vars = {
        name: recipient.name || '',
        company: recipient.company || settings.senderCompany,
        orderId: recipient.orderId || orderId,
        email: recipient.email,
      };
      return {
        receiver: recipient.email,
        note: replaceVariables(note, vars),
        orderId: vars.orderId,
        senderName: settings.senderName,
        senderCompany: settings.senderCompany,
        files,
      };
    });
  };

  const doSend = async () => {
    const payload = buildPayload();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      attachments.forEach((a) => formData.append('attachments', a));

      const res = await fetch(API_URL, { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success && (!data.failed || data.failed.length === 0)) {
        setStatus({ type: 'success', msg: `✅ ${data.message}` });
        setFailedPayload([]);
        setSelectedIds([]);
        setReceivers(['']);
        setOrderId('');
        setNote('');
        setAttachments([]);
        setCsvRows([]);
        setUseCsv(false);
      } else if (data.success && data.failed?.length) {
        setStatus({
          type: 'error',
          msg: `⚠️ ${data.message} You can retry the failed ones below.`,
        });
        setFailedPayload(data.failed);
      } else {
        setStatus({ type: 'error', msg: '❌ ' + (data.error || 'Send failed.') });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: '❌ Network error: ' + err.message });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const filledReceivers = useCsv
      ? csvRows.length
      : receivers.filter((r) => r.trim()).length;

    if (filledReceivers === 0) {
      return setStatus({ type: 'error', msg: 'Add at least one receiver email.' });
    }

    setStatus({ type: '', msg: '' });
    setConfirmOpen(true);
  };

  const handleRetry = async () => {
    if (failedPayload.length === 0) return;
    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const formData = new FormData();
      formData.append('payload', JSON.stringify(failedPayload.map((f) => f.payload)));
      attachments.forEach((a) => formData.append('attachments', a));

      const res = await fetch(RETRY_URL, { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setStatus({ type: 'success', msg: `✅ ${data.message}` });
        setFailedPayload([]);
      } else {
        setStatus({ type: 'error', msg: '❌ Retry failed: ' + data.error });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: '❌ Network error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const recipientCount = useCsv
    ? csvRows.length
    : receivers.filter((r) => r.trim()).length;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-16">
      <header className="text-center mb-10 animate-fade-up">
        <h1 className="text-4xl font-bold">
          XMARKET <span className="text-brand">Support</span>
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Send files & documents professionally.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="nm-flat p-8 space-y-6 stagger overflow-visible">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Your Name</label>
            <input className="nm-input opacity-80" value={settings.senderName} readOnly />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Company</label>
            <input className="nm-input opacity-80" value={settings.senderCompany} readOnly />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Order ID <span className="text-gray-400">(optional)</span>
          </label>
          <input
            className="nm-input"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. XM-2026-00123"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold uppercase text-gray-500">
              Receivers <span className="text-red-500">*</span>
            </label>
            <label className="text-xs text-brand cursor-pointer hover:underline">
              📄 Import CSV
              <input type="file" accept=".csv" onChange={onCsvUpload} className="hidden" />
            </label>
          </div>
          {useCsv ? (
            <div className="nm-pressed p-3 text-sm">
              ✅ {csvRows.length} recipients loaded from CSV.
              <button
                type="button"
                onClick={() => { setUseCsv(false); setCsvRows([]); }}
                className="ml-3 text-red-500 text-xs font-bold"
              >
                clear
              </button>
            </div>
          ) : (
            <ReceiverList receivers={receivers} setReceivers={setReceivers} />
          )}
        </div>

        <div className="relative z-30">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Files <span className="text-gray-400">(optional)</span>
          </label>
          <FileDropdown
            files={driveFiles}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            loading={driveLoading}
            error={driveError}
            onReload={reloadDrive}
          />
        </div>

        <div className="relative z-10">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Message <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            rows={6}
            className="nm-input resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a personal message (optional)..."
          />
        </div>

        <div className="relative z-10">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Attach Local Files <span className="text-gray-400">(optional)</span>
          </label>
          <AttachmentUpload files={attachments} setFiles={setAttachments} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="nm-btn w-full py-4 text-base animate-pulse-slow"
        >
          {loading ? '⏳ Sending...' : '📤 Send Email'}
        </button>

        {failedPayload.length > 0 && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={loading}
            className="nm-btn w-full py-3 text-sm text-orange-500"
          >
            🔁 Retry {failedPayload.length} Failed Send{failedPayload.length > 1 ? 's' : ''}
          </button>
        )}

        {status.msg && (
          <p className={`text-center font-semibold text-sm ${
            status.type === 'success' ? 'text-green-500' : 'text-red-500'
          }`}>
            {status.msg}
          </p>
        )}
      </form>

      <ConfirmModal
        open={confirmOpen}
        loading={loading}
        data={{
          recipientCount,
          fileCount: selectedIds.length,
          attachmentCount: attachments.length,
        }}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSend}
      />
    </div>
  );
}
