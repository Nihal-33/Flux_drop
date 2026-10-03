# FluxDrop — Move anything. Anywhere.

> **Production-Ready, Premium Cross-Device Digital File Sharing Platform**  
> *"Your files. Your devices. One secure space."*

---

## 🌟 Overview

**FluxDrop** is a modern, high-performance cross-device digital transfer platform. It enables seamless, real-time sharing of files, documents, media, source code snippets, formatted text, and URL links between desktops, laptops, phones, and tablets across any operating system (**PC ↔ Mac ↔ Linux ↔ Android ↔ iOS**).

Engineered with a **dark luxury glassmorphism technical aesthetic**, FluxDrop avoids generic cloud clones and delivers an original, ultra-responsive experience with dual-credential zero-trust security.

---

## 🔐 Security Architecture

FluxDrop implements an enterprise-grade security model where credentials and transfer rights are strictly isolated:

1. **Dual-Credential Isolation**:
   - **Account Password**: Used strictly for account access and identity authentication. Hashed with **Bcrypt (12 rounds)**.
   - **Workspace PIN**: A 6-digit zero-knowledge credential used to authorize workspace access, pair new hardware, and sign transfer channels. Hashed with **HMAC-SHA256 (Server Salt Pepper) + Bcrypt**.
2. **Brute-Force Lockout Protection**:
   - Multiple incorrect PIN entries trigger exponential rate limiting.
   - 5 consecutive failed attempts trigger an automated **15-minute security lockout cooldown** with real-time countdown display.
3. **No Predictable Public URLs**:
   - Physical storage keys are obfuscated: `users/{userId}/{uuid}_{sanitizedName}`. Original filenames are never exposed as paths.
   - Downloads require cryptographic **HMAC-SHA256 signed tokens** with strict expiration timestamps.
4. **Device Revocation & Session Management**:
   - Every hardware node receives a cryptographic token hash.
   - Remote revocation instantly terminates all active socket connections and download permissions for lost or unverified devices.
5. **Real-time Transfer Verification**:
   - Every file payload receives a SHA-256 cryptographic checksum calculation upon transmission.

---

## 🚀 Key Features

- **Cinematic Landing Page**:
  - Full-viewport dark navy/black aesthetic (`#05070B`, `#0B0F16`, `#111722`) with restrained electric cyan/indigo accents.
  - Floating hardware silhouettes (Laptop, Desktop, Smartphone, Tablet) with dynamic streaming connection beams.
  - Interactive 3-step workflow, supported content breakdown, security matrix, cross-device showcase, and FAQs.
- **Quick Send Workflow**:
  - Drag-and-drop dropzone supporting multi-file uploads and folders up to 5GB.
  - 4-step transfer wizard: Content Selection → Target Device Selection → Security Handshake → Real-Time Progress → Completed Celebration with confetti.
- **Device Pairing & Dedicated `/receive` Page**:
  - Ephemeral 6-digit grouping codes (e.g. `482 913`).
  - Dynamic QR codes embedding short-lived pairing tokens (`fluxdrop://pair/...`).
  - Real-time approval modals on the recipient device: *"Pair with Nihal's Laptop? (Windows 11 • Chrome)"* with Approve/Decline.
- **Supported Content Pipelines**:
  - **Images & Videos**: Lossless previews for PNG, JPEG, SVG, WebP, MP4, MOV, MKV.
  - **Documents & Archives**: PDF viewers, ZIP/RAR/7Z archives with byte-exact progress.
  - **Text & Source Code**: Built-in syntax-highlighted code editor supporting TypeScript, Python, JSON, SQL, HTML/CSS, Markdown, C++, Java with character counts and instant direct dispatch.
  - **Link Sharing**: Auto-detects URLs, extracts domain names, and fetches live favicon cards.
- **File Vault & Browser**:
  - Filter by category (*Images, Videos, Documents, Code, Archives, Audio, Other*).
  - Search by filename, sort by newest/size/name, toggle Grid vs. List view.
  - One-click secure signed downloads, renames, and deletions with real-time storage quota updates.
- **Hardware & Transfer Management**:
  - Detailed transfer audit history (Tabs: *All, Sent, Received, Active, Completed, Failed*).
  - Slide-over detail drawer displaying transfer IDs, checksums, transport type (Direct P2P vs. Secure Relay), and timestamps.
  - Device listing with online pulse badges, trusted device toggles, and remote revocation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide React, React Router v7, Canvas Confetti, QR Code SVG |
| **Backend** | Node.js, Express, TypeScript, WebSocket Server (`ws`), Multer, Bcrypt.js, JSON Web Tokens (JWT), Crypto |
| **Storage & DB** | File-persisted atomic JSON database engine with foreign-key referential integrity; Local disk vault with UUID partitioning |
| **Networking** | WebSocket real-time event pipeline + WebRTC signaling + cross-tab BroadcastChannel mesh |

---

## ⚡ Quickstart

### Prerequisites
- Node.js `v18+` (Tested on Node `v24.15.0`)
- npm `v9+`

### 1. Start Backend Server
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000` with WebSocket on `ws://localhost:5000/ws`.*

### 2. Start Frontend Client
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🧪 Testing Credentials & Demo Mode

The database is pre-seeded with a default test account for immediate local evaluation:

- **Username / Identifier**: `nihal`
- **Password**: `Password123!`
- **6-Digit Workspace PIN**: `482913`

> **Multi-Tab Live Pairing Test**:  
> Open two browser windows at `http://localhost:5173`. Window 1 acts as *Nihal's Laptop*, Window 2 acts as *Nihal's Phone* (or new connecting hardware). Initiate a file transfer in Window 1 and observe the real-time incoming transfer prompt appear instantly in Window 2!

---

## 🧪 Automated Test Suite

Run the security and transfer unit tests:
```bash
npm test
```
**Test coverage includes**:
- Password hashing & bcrypt verification
- Separate PIN hashing with HMAC-SHA256 server salt pepper
- 6-digit grouping code generation
- Signed download token generation, expiration, and tamper detection
- `TransferManager` lifecycle (`create` → `accept` → `start` → `progress` → `complete` → `cancel`)
- Rate-limiting attempt counters and 15-minute lockout thresholds

---

## 📄 License
MIT License. © 2026 FluxDrop Team. All rights reserved.
