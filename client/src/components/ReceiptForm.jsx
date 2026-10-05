import { useState } from 'react';
import ReceiverList from './ReceiverList';
import ConfirmModal from './ConfirmModal';
import { useSettings } from '../context/SettingsContext';

const API_URL = 'http://localhost:5000/api/send-receipt';

const emptyItem = { name: '', qty: 1, price: 0 };

export default function ReceiptForm() {
  const { settings } = useSettings();

  const [orderId, setOrderId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [receivers, setReceivers] = useState(['']);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [failedPayload, setFailedPayload] = useState([]);

  // ---- Items ----
  const updateItem = (i, key, value) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: value };
    setItems(next);
  };
  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  // ---- Totals ----
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
    0
  );
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  const fmt = (n) =>
    '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });

  // ---- Submit ----
  const buildPayload = () => {
    const cleanItems = items.filter((it) => it.name.trim());
    const recipients = receivers.filter((r) => r.trim()).map((r) => ({ email: r }));

    return recipients.map((recipient) => ({
      receiver: recipient.email,
      orderId,
      date,
      customerName,
      items: cleanItems,
      subtotal,
      discount: Number(discount) || 0,
      total,
      paymentMethod,
      deliveryMethod,
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
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();

      if (data.success && (!data.failed || data.failed.length === 0)) {
        setStatus({ type: 'success', msg: `✅ ${data.message}` });
        setFailedPayload([]);
        setOrderId('');
        setCustomerName('');
        setReceivers(['']);
        setItems([{ ...emptyItem }]);
        setDiscount(0);
        setNote('');
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
    const hasItems = items.some((it) => it.name.trim());
    if (!hasItems) {
      return setStatus({ type: 'error', msg: 'Add at least one item.' });
    }

    setStatus({ type: '', msg: '' });
    setConfirmOpen(true);
  };

  const handleRetry = async () => {
    if (failedPayload.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: failedPayload.map((f) => f.payload) }),
      });
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
          Purchase <span className="text-brand">Receipt</span>
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Send a professional receipt to your customer.
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

        {/* Order + Date + Customer */}
        <div className="grid md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
              Order ID <span className="text-red-500">*</span>
            </label>
            <input
              className="nm-input"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="XM-2026-00123"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Date</label>
            <input
              type="date"
              className="nm-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
              Customer Name
            </label>
            <input
              className="nm-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Juan Dela Cruz"
            />
          </div>
        </div>

        {/* Receivers */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Receiver(s) <span className="text-red-500">*</span>
          </label>
          <ReceiverList receivers={receivers} setReceivers={setReceivers} />
        </div>

        {/* Items */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-bold uppercase text-gray-500">Items</label>
            <button type="button" onClick={addItem} className="nm-btn !py-1.5 !px-3 !text-xs">
              ➕ Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="nm-pressed p-4 rounded-2xl">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">Item Name</label>
                    <input
                      className="nm-input !py-2 !text-sm"
                      value={item.name}
                      onChange={(e) => updateItem(i, 'name', e.target.value)}
                      placeholder="Product name"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      className="nm-input !py-2 !text-sm"
                      value={item.qty}
                      onChange={(e) => updateItem(i, 'qty', e.target.value)}
                    />
                  </div>
                  <div className="col-span-5 md:col-span-2">
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="nm-input !py-2 !text-sm"
                      value={item.price}
                      onChange={(e) => updateItem(i, 'price', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="nm-btn !px-3 !py-2 text-red-500 text-xs"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-right text-xs text-gray-500 mt-2">
                  Line total: <strong>{fmt((Number(item.qty) || 0) * (Number(item.price) || 0))}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Discount + Payment Method */}
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Discount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="nm-input"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Payment Method
          </label>
          <input
            className="nm-input"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="GCash / Maya / Bank Transfer"
          />
        </div>

        {/* Delivery Method */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Delivery Method
          </label>
          <input
            className="nm-input"
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value)}
            placeholder="Pickup / Lalamove / J\&T / Grab"
          />
        </div>
        </div>

        {/* Totals */}
        <div className="nm-pressed p-5 rounded-2xl space-y-2 text-sm relative z-10">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Discount</span>
            <span>− {fmt(discount || 0)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-700 pt-2 border-t border-white/30">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            rows={3}
            className="nm-input resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the customer..."
          />
        </div>

        {/* Actions */}
        <button
          type="submit"
          disabled={loading}
          className="nm-btn w-full py-4 text-base animate-pulse-slow"
        >
          {loading ? '⏳ Sending...' : '🧾 Send Receipt'}
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
        data={{ recipientCount, fileCount: 0, attachmentCount: 0 }}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSend}
      />
    </div>
  );
}
