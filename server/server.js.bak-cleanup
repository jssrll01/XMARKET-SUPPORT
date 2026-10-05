require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '5mb' }));

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 },
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const BREVO_KEY = process.env.BREVO_API_KEY;

const transporter = {
  async sendMail({ from, to, subject, html, attachments = [] }) {
    const m = String(from).match(/^"?(.*?)"?\s*<(.+)>$/);
    const sender = m ? { name: m[1], email: m[2] } : { email: String(from) };
    const body = { sender, to: [{ email: to }], subject, htmlContent: html };
    if (attachments.length) {
      body.attachment = attachments.map((a) => ({
        name: a.filename,
        content: (a.content ? Buffer.from(a.content) : fs.readFileSync(a.path)).toString('base64'),
      }));
    }
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
    return r.json();
  },
};

console.log(BREVO_KEY ? '✅ Brevo email ready' : '❌ BREVO_API_KEY missing');

// ============ GOOGLE DRIVE ============
let driveClient = null;
try {
  let auth = null;

  if (process.env.SERVICE_ACCOUNT_JSON) {
    let raw = process.env.SERVICE_ACCOUNT_JSON.trim();
    let creds;
    try {
      creds = JSON.parse(raw);
    } catch {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      creds = JSON.parse(decoded);
    }
    auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    console.log('✅ Google Drive API ready (via env var)');
  } else {
    const keyPath = path.join(__dirname, 'service-account.json');
    if (fs.existsSync(keyPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      console.log('✅ Google Drive API ready (via file)');
    } else {
      console.log('⚠️  service-account.json not found — Drive API disabled');
    }
  }

  if (auth) {
    driveClient = google.drive({ version: 'v3', auth });
  }
} catch (e) {
  console.error('❌ Drive init failed:', e.message);
}

async function shareFileWithEmail(fileId, email) {
  if (!driveClient) throw new Error('Drive API not configured.');
  try {
    await driveClient.permissions.create({
      fileId,
      sendNotificationEmail: false,
      requestBody: {
        role: 'reader',
        type: 'user',
        emailAddress: email,
      },
    });
    return { ok: true };
  } catch (err) {
    if (err?.code === 409 || /already exists/i.test(err.message)) {
      return { ok: true, alreadyShared: true };
    }
    return { ok: false, error: err.message };
  }
}

async function shareAllFiles(files, receivers) {
  const failed = [];
  let shared = 0;
  for (const file of files || []) {
    if (!file.id) continue;
    for (const email of receivers || []) {
      const res = await shareFileWithEmail(file.id, email);
      if (res.ok) shared++;
      else failed.push({ fileId: file.id, fileName: file.name, email, error: res.error });
    }
  }
  return { shared, failed };
}

// ============ DUPLICATE DETECTION ============
const recentSends = new Map();
const DUP_WINDOW_MS = 5 * 60 * 1000;

function isDuplicate(key) {
  const last = recentSends.get(key);
  const now = Date.now();
  for (const [k, t] of recentSends.entries()) {
    if (now - t > DUP_WINDOW_MS) recentSends.delete(k);
  }
  if (last && now - last < DUP_WINDOW_MS) return true;
  recentSends.set(key, now);
  return false;
}

// ============ EMAIL WRAPPER ============
const BANNER_URL =
  'https://res.cloudinary.com/bvw3okdf/image/upload/v1791120399/file_00000000a45081fda5979918c86684c1.png';

function wrapEmail(innerHtml) {
  return `
    <div style="background:#f4f6fa; padding:32px 16px; font-family:-apple-system,'Segoe UI',Arial,sans-serif;">
      <div style="max-width:620px; margin:auto; background:#ffffff; border-radius:14px; overflow:hidden;
                  border:1px solid #e5eaf2;">
        <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb); padding:8px 0; text-align:center;">
          <img src="${BANNER_URL}" alt="XMARKET SUPPORT"
               width="620"
               style="display:block; width:100%; max-width:620px; height:auto;
                      border:0; margin:0 auto;" />
        </div>
        <div style="padding:36px 32px; color:#334155; font-size:14px; line-height:1.65;">
          ${innerHtml}
        </div>
        <div style="background:#fafbfd; padding:18px 24px; text-align:center;
                    color:#94a3b8; font-size:11px; letter-spacing:.04em;
                    border-top:1px solid #eef2f7;">
          Thank you for shopping with XMARKET
        </div>
      </div>
    </div>
  `;
}

// ============ FILES EMAIL ============
function buildFilesHtml(payload) {
  const { note, orderId, senderName, senderCompany, files } = payload;

  const fileRows = (files || [])
    .map(
      (f) => `
      <tr>
        <td style="padding:16px 0; border-bottom:1px solid #eef2f7;">
          <div style="font-weight:600; color:#0f172a; font-size:14px; margin-bottom:6px;">
            ${f.name}
          </div>
          <a href="${f.link}" target="_blank"
             style="color:#2563eb; text-decoration:none; font-size:13px;">
            Open in Google Drive →
          </a>
        </td>
      </tr>`
    )
    .join('');

  const orderLine = orderId
    ? `<p style="color:#64748b; font-size:13px; margin:0 0 24px;">
         <span style="color:#94a3b8;">Order ID:</span>
         <span style="font-family:monospace; color:#0f172a;">${orderId}</span>
       </p>`
    : '';

  const noteBlock = note
    ? `<div style="border-left:3px solid #2563eb; padding:2px 0 2px 16px; margin:24px 0;">
         <pre style="margin:0; font-family:inherit; white-space:pre-wrap;
                     color:#334155; font-size:14px; line-height:1.65;">${note}</pre>
       </div>`
    : '';

  const filesBlock = (files && files.length)
    ? `<h2 style="color:#0f172a; font-size:15px; font-weight:700;
                  margin:32px 0 4px; letter-spacing:.01em;">
         Files
       </h2>
       <table style="width:100%; border-collapse:collapse;">${fileRows}</table>`
    : '';

  const inner = `
    <p style="margin:0 0 16px; font-size:17px; color:#0f172a; font-weight:600;">
      Thank you for your purchase.
    </p>

    <p style="margin:0 0 8px; color:#334155;">
      We appreciate your trust in XMARKET. Your files are ready and linked below.
    </p>

    ${orderLine}
    ${noteBlock}
    ${filesBlock}

    <p style="margin:36px 0 4px; color:#334155;">Best regards,</p>
    <p style="margin:0; color:#0f172a; font-weight:600;">${senderName || 'Agent Astra'}</p>
    <p style="margin:2px 0 0; color:#64748b; font-size:13px;">
      ${senderCompany || 'XMARKET'} Support
    </p>

    <div style="margin-top:36px; padding-top:20px; border-top:1px solid #eef2f7;">
      <p style="margin:0 0 6px; color:#64748b; font-size:12px; line-height:1.6;">
        These links are private — please sign in with this same email address to open them.
      </p>
      <p style="margin:0; color:#64748b; font-size:12px; line-height:1.6;">
        If Chrome shows a security prompt, click <strong>"Open anyway"</strong> to view the files.
      </p>
    </div>
  `;

  return wrapEmail(inner);
}

// ============ RECEIPT EMAIL ============
function buildReceiptHtml(payload) {
  const {
    orderId, date, customerName, items, subtotal, discount, total,
    paymentMethod, deliveryMethod, note, senderName, senderCompany,
  } = payload;

  const fmt = (n) =>
    '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });

  const rows = (items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #eef2f7; color:#334155; font-size:13px;">
          ${it.name}
        </td>
        <td style="padding:10px 0; border-bottom:1px solid #eef2f7; color:#334155; font-size:13px; text-align:center;">
          ${it.qty}
        </td>
        <td style="padding:10px 0; border-bottom:1px solid #eef2f7; color:#334155; font-size:13px; text-align:right;">
          ${fmt(it.price)}
        </td>
        <td style="padding:10px 0; border-bottom:1px solid #eef2f7; color:#0f172a; font-size:13px; text-align:right; font-weight:600;">
          ${fmt((Number(it.qty) || 0) * (Number(it.price) || 0))}
        </td>
      </tr>`
    )
    .join('');

  const inner = `
    <p style="margin:0 0 16px; font-size:17px; color:#0f172a; font-weight:600;">
      Purchase Receipt
    </p>
    <p style="margin:0 0 24px; color:#334155;">
      Thank you for your purchase${customerName ? `, ${customerName}` : ''}. Here is your official receipt.
    </p>

    <table style="width:100%; margin-bottom:24px; font-size:13px; border-collapse:collapse;">
      <tr>
        <td style="padding:4px 0; color:#94a3b8;">Order ID</td>
        <td style="padding:4px 0; color:#0f172a; font-family:monospace; text-align:right;">${orderId || '—'}</td>
      </tr>
      <tr>
        <td style="padding:4px 0; color:#94a3b8;">Date</td>
        <td style="padding:4px 0; color:#0f172a; text-align:right;">${date || '—'}</td>
      </tr>
      ${
        customerName
          ? `<tr>
               <td style="padding:4px 0; color:#94a3b8;">Customer</td>
               <td style="padding:4px 0; color:#0f172a; text-align:right;">${customerName}</td>
             </tr>`
          : ''
      }
      ${
        paymentMethod
          ? `<tr>
               <td style="padding:4px 0; color:#94a3b8;">Payment</td>
               <td style="padding:4px 0; color:#0f172a; text-align:right;">${paymentMethod}</td>
             </tr>`
          : ''
      }
      ${
        deliveryMethod
          ? `<tr>
               <td style="padding:4px 0; color:#94a3b8;">Delivery</td>
               <td style="padding:4px 0; color:#0f172a; text-align:right;">${deliveryMethod}</td>
             </tr>`
          : ''
      }
    </table>

    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:8px 0; text-align:left; font-size:11px; letter-spacing:.06em;
                     text-transform:uppercase; color:#94a3b8; border-bottom:1px solid #eef2f7;">Item</th>
          <th style="padding:8px 0; text-align:center; font-size:11px; letter-spacing:.06em;
                     text-transform:uppercase; color:#94a3b8; border-bottom:1px solid #eef2f7;">Qty</th>
          <th style="padding:8px 0; text-align:right; font-size:11px; letter-spacing:.06em;
                     text-transform:uppercase; color:#94a3b8; border-bottom:1px solid #eef2f7;">Price</th>
          <th style="padding:8px 0; text-align:right; font-size:11px; letter-spacing:.06em;
                     text-transform:uppercase; color:#94a3b8; border-bottom:1px solid #eef2f7;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="4" style="padding:16px; text-align:center; color:#94a3b8;">No items.</td></tr>'}
      </tbody>
    </table>

    <table style="width:100%; margin-top:16px; font-size:13px; border-collapse:collapse;">
      <tr>
        <td style="padding:6px 0; color:#94a3b8; text-align:right;">Subtotal</td>
        <td style="padding:6px 0; color:#0f172a; text-align:right; width:120px;">${fmt(subtotal || 0)}</td>
      </tr>
      ${
        discount
          ? `<tr>
               <td style="padding:6px 0; color:#94a3b8; text-align:right;">Discount</td>
               <td style="padding:6px 0; color:#16a34a; text-align:right;">− ${fmt(discount)}</td>
             </tr>`
          : ''
      }
      <tr>
        <td style="padding:14px 0 0; color:#0f172a; text-align:right; font-size:14px; font-weight:700;
                   border-top:2px solid #eef2f7;">TOTAL</td>
        <td style="padding:14px 0 0; color:#2563eb; text-align:right; font-size:18px; font-weight:800;
                   border-top:2px solid #eef2f7;">${fmt(total || 0)}</td>
      </tr>
    </table>

    ${
      note
        ? `<div style="border-left:3px solid #2563eb; padding:2px 0 2px 16px; margin:28px 0;">
             <pre style="margin:0; font-family:inherit; white-space:pre-wrap; color:#334155; font-size:14px; line-height:1.65;">${note}</pre>
           </div>`
        : ''
    }

    <p style="margin:36px 0 4px; color:#334155;">Best regards,</p>
    <p style="margin:0; color:#0f172a; font-weight:600;">${senderName || 'Agent Astra'}</p>
    <p style="margin:2px 0 0; color:#64748b; font-size:13px;">
      ${senderCompany || 'XMARKET'} Support
    </p>
  `;

  return wrapEmail(inner);
}

// ============ WEBSITE EMAIL ============
function buildWebsiteHtml(payload) {
  const {
    projectName, liveUrl, repoUrl, techStack, deliveryDate, clientName,
    note, senderName, senderCompany,
  } = payload;

  const linkRow = (label, url) =>
    url
      ? `<tr>
           <td style="padding:12px 0; border-bottom:1px solid #eef2f7;">
             <div style="font-size:11px; letter-spacing:.08em; text-transform:uppercase;
                         color:#94a3b8; margin-bottom:4px;">${label}</div>
             <a href="${url}" target="_blank"
                style="color:#2563eb; text-decoration:none; font-size:14px; font-weight:600;
                       word-break:break-all;">
               ${url}
             </a>
           </td>
         </tr>`
      : '';

  const inner = `
    <p style="margin:0 0 16px; font-size:17px; color:#0f172a; font-weight:600;">
      Project Delivered: ${projectName || 'Web Project'}
    </p>
    <p style="margin:0 0 24px; color:#334155;">
      Hi${clientName ? ` ${clientName}` : ''}, your project is ready. Here are the details.
    </p>

    ${
      deliveryDate || techStack
        ? `<table style="width:100%; margin-bottom:24px; font-size:13px; border-collapse:collapse;">
             ${
               deliveryDate
                 ? `<tr>
                      <td style="padding:4px 0; color:#94a3b8;">Delivery Date</td>
                      <td style="padding:4px 0; color:#0f172a; text-align:right;">${deliveryDate}</td>
                    </tr>`
                 : ''
             }
             ${
               techStack
                 ? `<tr>
                      <td style="padding:4px 0; color:#94a3b8;">Tech Stack</td>
                      <td style="padding:4px 0; color:#0f172a; text-align:right;">${techStack}</td>
                    </tr>`
                 : ''
             }
           </table>`
        : ''
    }

    ${
      (liveUrl || repoUrl)
        ? `<h2 style="color:#0f172a; font-size:15px; font-weight:700; margin:24px 0 4px;">Project Links</h2>
           <table style="width:100%; border-collapse:collapse;">
             ${linkRow('Live Website', liveUrl)}
             ${linkRow('Repository', repoUrl)}
           </table>`
        : ''
    }

    ${
      note
        ? `<div style="border-left:3px solid #2563eb; padding:2px 0 2px 16px; margin:28px 0;">
             <div style="color:#94a3b8; font-size:11px; letter-spacing:.06em; text-transform:uppercase; margin-bottom:6px;">Notes</div>
             <pre style="margin:0; font-family:inherit; white-space:pre-wrap; color:#334155; font-size:14px; line-height:1.65;">${note}</pre>
           </div>`
        : ''
    }

    <p style="margin:28px 0 0; color:#94a3b8; font-size:12px; line-height:1.6;">
      Any additional files (documentation, screenshots, source zips) are attached to this email.
    </p>

    <p style="margin:36px 0 4px; color:#334155;">Best regards,</p>
    <p style="margin:0; color:#0f172a; font-weight:600;">${senderName || 'Agent Astra'}</p>
    <p style="margin:2px 0 0; color:#64748b; font-size:13px;">
      ${senderCompany || 'XMARKET'} — Web Development
    </p>
  `;

  return wrapEmail(inner);
}

// ============ ROUTES ============
app.get('/', (req, res) => res.json({ status: 'Xmarket Support API v6 🚀' }));

app.get('/api/drive-files', async (req, res) => {
  try {
    if (!driveClient) {
      return res.status(503).json({
        success: false,
        error: 'Drive API not configured. Add service-account.json to server/.',
      });
    }
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!folderId) {
      return res.status(400).json({ success: false, error: 'DRIVE_FOLDER_ID missing in .env' });
    }

    const result = await driveClient.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, iconLink, size)',
      orderBy: 'name',
      pageSize: 200,
    });

    const files = (result.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      link: f.webViewLink,
      mimeType: f.mimeType,
      size: f.size ? Number(f.size) : 0,
    }));

    res.json({ success: true, files });
  } catch (err) {
    console.error('Drive error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ SEND FILES ============
app.post('/api/send', upload.array('attachments', 10), async (req, res) => {
  const tempPaths = (req.files || []).map((f) => f.path);
  try {
    const payload = JSON.parse(req.body.payload || '[]');
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipients.' });
    }

    const attachmentList = (req.files || []).map((f) => ({
      filename: f.originalname,
      path: f.path,
    }));

    const results = [];

    for (const item of payload) {
      const fileNames = (item.files || []).map((f) => f.name);
      const dupKey = item.receiver.toLowerCase() + '|' + [...fileNames].sort().join(',');
      if (isDuplicate(dupKey)) {
        results.push({
          to: item.receiver,
          success: false,
          error: 'Duplicate: same files already sent in the last 5 minutes.',
          payload: item,
        });
        continue;
      }

      try {
        const shareResult = await shareAllFiles(item.files, [item.receiver]);
        if (shareResult.failed.length > 0) {
          console.warn('Share warnings:', shareResult.failed);
        }
      } catch (e) {
        console.warn('Share failed:', e.message);
      }

      try {
        await transporter.sendMail({
          from: `"${item.senderName || 'XMARKET Support'}" <${process.env.EMAIL_USER}>`,
          to: item.receiver,
          subject: 'Thank you for your purchase from XMARKET',
          html: buildFilesHtml(item),
          attachments: attachmentList,
        });
        results.push({ to: item.receiver, success: true, payload: item });
      } catch (err) {
        results.push({ to: item.receiver, success: false, error: err.message, payload: item });
      }
    }

    tempPaths.forEach((p) => fs.unlink(p, () => {}));

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    res.json({
      success: sent > 0,
      message: `Sent ${sent}/${results.length}.${failed.length ? ` ${failed.length} failed.` : ''}`,
      results,
      failed,
    });
  } catch (err) {
    console.error('Send error:', err);
    tempPaths.forEach((p) => fs.unlink(p, () => {}));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ SEND RECEIPT ============
app.post('/api/send-receipt', async (req, res) => {
  try {
    const payload = req.body.payload;
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipients.' });
    }

    const results = [];

    for (const item of payload) {
      const dupKey = 'receipt|' + (item.receiver || '').toLowerCase() + '|' + (item.orderId || '');
      if (isDuplicate(dupKey)) {
        results.push({
          to: item.receiver,
          success: false,
          error: 'Duplicate receipt already sent in the last 5 minutes.',
          payload: item,
        });
        continue;
      }

      try {
        await transporter.sendMail({
          from: `"${item.senderName || 'XMARKET Support'}" <${process.env.EMAIL_USER}>`,
          to: item.receiver,
          subject: `Purchase Receipt — ${item.orderId || 'XMARKET'}`,
          html: buildReceiptHtml(item),
        });
        results.push({ to: item.receiver, success: true, payload: item });
      } catch (err) {
        results.push({ to: item.receiver, success: false, error: err.message, payload: item });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    res.json({
      success: sent > 0,
      message: `Sent ${sent}/${results.length}.${failed.length ? ` ${failed.length} failed.` : ''}`,
      results,
      failed,
    });
  } catch (err) {
    console.error('Receipt send error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ SEND WEBSITE ============
app.post('/api/send-website', upload.array('attachments', 10), async (req, res) => {
  const tempPaths = (req.files || []).map((f) => f.path);
  try {
    const payload = JSON.parse(req.body.payload || '[]');
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipients.' });
    }

    const attachmentList = (req.files || []).map((f) => ({
      filename: f.originalname,
      path: f.path,
    }));

    const results = [];

    for (const item of payload) {
      const dupKey = 'website|' + (item.receiver || '').toLowerCase() + '|' + (item.projectName || '');
      if (isDuplicate(dupKey)) {
        results.push({
          to: item.receiver,
          success: false,
          error: 'Duplicate project delivery already sent in the last 5 minutes.',
          payload: item,
        });
        continue;
      }

      try {
        await transporter.sendMail({
          from: `"${item.senderName || 'XMARKET Support'}" <${process.env.EMAIL_USER}>`,
          to: item.receiver,
          subject: `🚀 Project Delivered — ${item.projectName || 'Web Project'}`,
          html: buildWebsiteHtml(item),
          attachments: attachmentList,
        });
        results.push({ to: item.receiver, success: true, payload: item });
      } catch (err) {
        results.push({ to: item.receiver, success: false, error: err.message, payload: item });
      }
    }

    tempPaths.forEach((p) => fs.unlink(p, () => {}));

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    res.json({
      success: sent > 0,
      message: `Sent ${sent}/${results.length}.${failed.length ? ` ${failed.length} failed.` : ''}`,
      results,
      failed,
    });
  } catch (err) {
    console.error('Website send error:', err);
    tempPaths.forEach((p) => fs.unlink(p, () => {}));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ RETRY FILES ============
app.post('/api/retry', upload.array('attachments', 10), async (req, res) => {
  const tempPaths = (req.files || []).map((f) => f.path);
  try {
    const payload = JSON.parse(req.body.payload || '[]');
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to retry.' });
    }

    const attachmentList = (req.files || []).map((f) => ({
      filename: f.originalname,
      path: f.path,
    }));

    const results = [];

    for (const item of payload) {
      try {
        try {
          await shareAllFiles(item.files, [item.receiver]);
        } catch (e) {
          console.warn('Share failed (retry):', e.message);
        }
        await transporter.sendMail({
          from: `"${item.senderName || 'XMARKET Support'}" <${process.env.EMAIL_USER}>`,
          to: item.receiver,
          subject: 'Thank you for your purchase from XMARKET',
          html: buildFilesHtml(item),
          attachments: attachmentList,
        });
        results.push({ to: item.receiver, success: true });
      } catch (err) {
        results.push({ to: item.receiver, success: false, error: err.message });
      }
    }

    tempPaths.forEach((p) => fs.unlink(p, () => {}));

    const sent = results.filter((r) => r.success).length;
    res.json({
      success: sent > 0,
      message: `Retried: ${sent}/${results.length} sent.`,
      results,
    });
  } catch (err) {
    tempPaths.forEach((p) => fs.unlink(p, () => {}));
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============ DRIVE UPLOAD ============
app.post('/api/drive-upload', upload.array('files', 20), async (req, res) => {
  const tempPaths = (req.files || []).map((f) => f.path);
  try {
    if (!driveClient) {
      tempPaths.forEach((p) => fs.unlink(p, () => {}));
      return res.status(503).json({ success: false, error: 'Drive API not configured.' });
    }
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!folderId) {
      tempPaths.forEach((p) => fs.unlink(p, () => {}));
      return res.status(400).json({ success: false, error: 'DRIVE_FOLDER_ID missing in .env' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded.' });
    }

    const uploaded = [];
    const failed = [];

    for (const f of req.files) {
      try {
        const result = await driveClient.files.create({
          requestBody: {
            name: f.originalname,
            parents: [folderId],
          },
          media: {
            mimeType: f.mimetype,
            body: fs.createReadStream(f.path),
          },
          fields: 'id, name, webViewLink, size, mimeType',
        });

        uploaded.push({
          id: result.data.id,
          name: result.data.name,
          link: result.data.webViewLink,
          size: result.data.size ? Number(result.data.size) : 0,
          mimeType: result.data.mimeType,
        });
      } catch (err) {
        failed.push({ name: f.originalname, error: err.message });
      }
    }

    tempPaths.forEach((p) => fs.unlink(p, () => {}));

    res.json({
      success: uploaded.length > 0,
      message: `Uploaded ${uploaded.length}/${req.files.length}.${failed.length ? ` ${failed.length} failed.` : ''}`,
      uploaded,
      failed,
    });
  } catch (err) {
    console.error('Upload error:', err);
    tempPaths.forEach((p) => fs.unlink(p, () => {}));
    res.status(500).json({ success: false, error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Xmarket Support server v7 running at http://localhost:${PORT}`);
});
