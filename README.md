# XMARKET Support

A neumorphic PWA for sending files, receipts, and project deliveries directly to Gmail — powered by Google Drive.

## Features

- **Send Files** — pick files from Google Drive and email links; auto-shares with each recipient
- **Upload to Drive** — drag & drop local files into your Drive folder
- **Send Receipts** — itemized receipts with GCash / Maya / GoTyme payment options
- **Website Delivery** — hand off web projects with live URL, repo, tech stack, attachments
- **Settings** — sender identity, dark mode, persistent preferences
- **Auth Gate** — access-code protected entry
- **PWA** — installable on Android, iOS, and desktop
- **Neumorphism UI** — soft shadows, smooth transitions

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React · Vite · Tailwind CSS · Framer Motion · React Router |
| Backend | Node.js · Express · Nodemailer · Multer |
| Cloud | Google Drive API · Gmail SMTP · Cloudinary |
| Auth | Gmail App Password · Google Service Account |

## Getting Started

### Prerequisites

- Node.js 18+
- Gmail with 2FA + App Password
- Google Cloud project with Drive API
- Service Account JSON key

### 1. Clone & Install

\`\`\`bash
git clone https://github.com/jssrll01/XMARKET-SUPPORT.git
cd XMARKET-SUPPORT
npm run install:all
\`\`\`

### 2. Configure

\`\`\`bash
cd server
cp .env.example .env
\`\`\`

Edit \`.env\` with your credentials. Place your Service Account JSON at \`server/service-account.json\`, then share your Drive folder with the service account email (Editor permission).

### 3. Run

\`\`\`bash
npm run dev
\`\`\`

- Frontend → http://localhost:5173
- Backend → http://localhost:5000

## Project Structure

\`\`\`
xmsupport/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── utils/
│   └── public/
└── server/
    ├── server.js
    └── service-account.json  (gitignored)
\`\`\`

## Security

- \`.env\` and \`service-account.json\` are gitignored
- Drive files auto-shared per-recipient (no public links)
- Duplicate send detection (5-min window)

## License

Private — all rights reserved.
\`\`\`
