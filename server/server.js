require('dotenv').config();
const express = require('express');
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

// ============ DRIVE SHARE ============
app.post('/api/drive-share', async (req, res) => {
  try {
    if (!driveClient) {
      return res.status(503).json({ success: false, error: 'Drive API not configured.' });
    }

    const { fileId, email } = req.body;
    if (!fileId || !email) {
      return res.status(400).json({ success: false, error: 'fileId and email required.' });
    }

    // Check if already shared
    const existing = await driveClient.permissions.list({
      fileId,
      fields: 'permissions(id, emailAddress)',
    });
    const already = (existing.data.permissions || []).find(
      (p) => p.emailAddress && p.emailAddress.toLowerCase() === email.toLowerCase()
    );

    if (already) {
      return res.json({ success: true, message: 'Already shared with ' + email });
    }

    await driveClient.permissions.create({
      fileId,
      sendNotificationEmail: false,
      requestBody: {
        role: 'reader',
        type: 'user',
        emailAddress: email,
      },
    });

    res.json({ success: true, message: 'Shared with ' + email });
  } catch (err) {
    console.error('Share error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============ DRIVE PERMISSIONS LIST ============
app.get('/api/drive-permissions/:fileId', async (req, res) => {
  try {
    if (!driveClient) {
      return res.status(503).json({ success: false, error: 'Drive API not configured.' });
    }
    const { fileId } = req.params;
    const result = await driveClient.permissions.list({
      fileId,
      fields: 'permissions(id, emailAddress, displayName, role, type)',
    });
    // Filter out the service account itself (owner/self)
    const perms = (result.data.permissions || [])
      .filter((p) => p.type === 'user' && p.emailAddress)
      .map((p) => ({
        id: p.id,
        email: p.emailAddress,
        name: p.displayName || p.emailAddress,
        role: p.role,
      }));
    res.json({ success: true, permissions: perms });
  } catch (err) {
    console.error('List perms error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ DRIVE PERMISSIONS REVOKE ============
app.delete('/api/drive-permissions/:fileId/:permissionId', async (req, res) => {
  try {
    if (!driveClient) {
      return res.status(503).json({ success: false, error: 'Drive API not configured.' });
    }
    const { fileId, permissionId } = req.params;
    await driveClient.permissions.delete({ fileId, permissionId });
    res.json({ success: true, message: 'Access removed.' });
  } catch (err) {
    console.error('Revoke error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============ DRIVE STORAGE ============
app.get('/api/drive-storage', async (req, res) => {
  try {
    if (!driveClient) {
      return res.status(503).json({ success: false, error: 'Drive API not configured.' });
    }
    const about = await driveClient.about.get({
      fields: 'storageQuota(limit, usage, usageInDrive)',
    });
    const q = about.data.storageQuota || {};
    res.json({
      success: true,
      limit: q.limit ? Number(q.limit) : 0,
      usage: q.usage ? Number(q.usage) : 0,
      usageInDrive: q.usageInDrive ? Number(q.usageInDrive) : 0,
    });
  } catch (err) {
    console.error('Storage error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ CHECK DUPLICATE FILENAME ============
app.post('/api/drive-check-duplicate', async (req, res) => {
  try {
    if (!driveClient) {
      return res.status(503).json({ success: false, error: 'Drive API not configured.' });
    }
    const { name } = req.body;
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!name || !folderId) {
      return res.status(400).json({ success: false, error: 'name required' });
    }
    const safe = name.replace(/'/g, "\\'");
    const result = await driveClient.files.list({
      q: `'${folderId}' in parents and name = '${safe}' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1,
    });
    const exists = (result.data.files || []).length > 0;
    res.json({ success: true, exists, existingId: exists ? result.data.files[0].id : null });
  } catch (err) {
    console.error('Duplicate check error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============ RENAME FILE ============
app.patch('/api/drive-rename/:fileId', async (req, res) => {
  try {
    if (!driveClient) return res.status(503).json({ success: false, error: 'Drive not configured.' });
    const { fileId } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    const result = await driveClient.files.update({
      fileId,
      requestBody: { name },
      fields: 'id, name, webViewLink',
    });
    res.json({ success: true, file: result.data });
  } catch (err) {
    console.error('Rename error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ TRENDING ============
app.get('/api/trending', async (req, res) => {
  try {
    if (!driveClient) return res.status(503).json({ success: false, error: 'Drive not configured.' });
    const folderId = process.env.DRIVE_FOLDER_ID;
    const result = await driveClient.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, size, createdTime)',
      orderBy: 'createdTime',
      pageSize: 500,
    });
    res.json({ success: true, files: result.data.files || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Xmarket Support server v7 running at http://localhost:${PORT}`);
});
