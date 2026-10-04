import { useState } from 'react';
import ReceiverList from './ReceiverList';
import AttachmentUpload from './AttachmentUpload';
import ConfirmModal from './ConfirmModal';
import { useSettings } from '../context/SettingsContext';

const API_URL = 'http://localhost:5000/api/send-website';

export default function WebsiteForm() {
  const { settings } = useSettings();

  const [projectName, setProjectName] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [techStack, setTechStack] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [clientName, setClientName] = useState('');
  const [receivers, setReceivers] = useState(['']);
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [failedPayload, setFailedPayload] = useState([]);

  const buildPayload = () => {
    const recipients = receivers.filter((r) => r.trim()).map((r) => ({ email: r }));
    return recipients.map((recipient) => ({
      receiver: recipient.email,
      projectName,
      liveUrl,
      repoUrl,
      techStack,
      deliveryDate,
      clientName,
      note,
      senderName: settings.senderName,
      senderCompany: settings.senderCompany,
    }));
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
        setProjectName('');
        setLiveUrl('');
        setRepoUrl('');
        setTechStack('');
        setClientName('');
        setReceivers(['']);
        setNote('');
        setAttachments([]);
      } else if (data.success && data.failed?.length) {
        setStatus({ type: 'error', msg: `⚠️ ${data.message}` });
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

    const filledReceivers = receivers.filter((r) => r.trim()).length;
    if (filledReceivers === 0) {
      return setStatus({ type: 'error', msg: 'Add at least one receiver email.' });
    }
    if (!projectName.trim()) {
      return setStatus({ type: 'error', msg: 'Project name is required.' });
    }
    if (!liveUrl.trim() && !repoUrl.trim() && attachments.length === 0) {
      return setStatus({
        type: 'error',
        msg: 'Add at least one: Live URL, Repo URL, or attachment.',
      });
    }

    setStatus({ type: '', msg: '' });
    setConfirmOpen(true);
  };

  const handleRetry = async () => {
    if (failedPayload.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('payload', JSON.stringify(failedPayload.map((f) => f.payload)));
      attachments.forEach((a) => formData.append('attachments', a));

      const res = await fetch(API_URL, { method: 'POST', body: formData });
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

  const recipientCount = receivers.filter((r) => r.trim()).length;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-16">
      <header className="text-center mb-10 animate-fade-up">
        <h1 className="text-4xl font-bold">
          Website <span className="text-brand">Delivery</span>
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Deliver web projects to your clients — links + files + message.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="nm-flat p-8 space-y-6 stagger overflow-visible">
        {/* Sender (read-only) */}
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">From</label>
            <input className="nm-input opacity-80" value={settings.senderName} readOnly />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Company</label>
            <input className="nm-input opacity-80" value={settings.senderCompany} readOnly />
          </div>
        </div>

        {/* Project + Client + Delivery */}
        <div className="grid md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              className="nm-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Company Website Redesign"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
              Client Name
            </label>
            <input
              className="nm-input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Juan Dela Cruz"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
              Delivery Date
            </label>
            <input
              type="date"
              className="nm-input"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
        </div>

        {/* URLs */}
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
              🌐 Live Website URL
            </label>
            <input
              type="url"
              className="nm-input"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://client-site.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
              💻 Repository URL <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="url"
              className="nm-input"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/..."
            />
          </div>
        </div>

        {/* Tech stack */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            🛠 Tech Stack <span className="text-gray-400">(optional)</span>
          </label>
          <input
            className="nm-input"
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            placeholder="React, Node.js, Tailwind, MongoDB"
          />
        </div>

        {/* Receivers */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Receiver(s) <span className="text-red-500">*</span>
          </label>
          <ReceiverList receivers={receivers} setReceivers={setReceivers} />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Message <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            rows={5}
            className="nm-input resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for your client — e.g. how to log in, deployment info, etc."
          />
        </div>

        {/* Attachments */}
        <div className="relative z-10">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Attachments <span className="text-gray-400">(zip, docs, screenshots — optional)</span>
          </label>
          <AttachmentUpload files={attachments} setFiles={setAttachments} />
        </div>

        {/* Actions */}
        <button
          type="submit"
          disabled={loading}
          className="nm-btn w-full py-4 text-base animate-pulse-slow"
        >
          {loading ? '⏳ Sending...' : '🌐 Send Project Delivery'}
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
          fileCount: 0,
          attachmentCount: attachments.length,
        }}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSend}
      />
    </div>
  );
}
