import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Lock,
  ArrowRight,
  FileCode,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Link as LinkIcon,
  FileCheck,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
  KeyRound,
  RefreshCw,
  Share2,
  Receipt,
  Code2,
  ShieldCheck,
} from 'lucide-react';
import { FluxDropLogo } from '../../components/brand/FluxDropLogo';
import { CinematicBackground } from '../../components/ui/CinematicBackground';

export const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const supportedTypes = [
    {
      icon: <Image className="w-6 h-6 text-cyan-400" />,
      title: 'Images',
      desc: 'Lossless RAW, PNG, JPEG, SVG, WebP with instant high-res previews.',
    },
    {
      icon: <Video className="w-6 h-6 text-blue-400" />,
      title: 'Videos',
      desc: 'Stream high-bitrate 4K MP4, MOV, MKV files with zero compression.',
    },
    {
      icon: <FileCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Documents',
      desc: 'PDFs, spreadsheets, presentations, and design briefs.',
    },
    {
      icon: <FileCode className="w-6 h-6 text-indigo-400" />,
      title: 'Code',
      desc: 'Send source files, snippets, scripts and project folders.',
    },
    {
      icon: <FileText className="w-6 h-6 text-yellow-400" />,
      title: 'Text',
      desc: 'Instant clipboard sync, formatted markdown, and raw notes.',
    },
    {
      icon: <LinkIcon className="w-6 h-6 text-pink-400" />,
      title: 'Links',
      desc: 'Rich URL cards with live metadata and domain previews.',
    },
    {
      icon: <Music className="w-6 h-6 text-purple-400" />,
      title: 'Audio',
      desc: 'Lossless FLAC, WAV, and MP3 recordings.',
    },
    {
      icon: <Archive className="w-6 h-6 text-orange-400" />,
      title: 'Archives',
      desc: 'ZIP, RAR, 7Z, TAR archives with multi-gigabyte support.',
    },
  ];

  const faqs = [
    {
      q: 'How does FluxDrop compare to AirDrop or LocalSend?',
      a: 'Unlike AirDrop which is locked to Apple hardware, FluxDrop operates seamlessly across Windows, macOS, Linux, Android, and iOS. Compared to LocalSend, FluxDrop provides a unified workspace with cloud relay fallback, PIN-verified access, signed expiring links, and persistent transfer history.',
    },
    {
      q: 'How does the PIN security layer work?',
      a: 'Your account password and workspace PIN are strictly separated credentials. While your password handles account authentication, your 6-digit PIN encrypts workspace pairing and authorizes sensitive file transfers. Multiple failed PIN entries trigger automated rate-limiting and temporary account lockout.',
    },
    {
      q: 'Are transfers direct or routed through a server?',
      a: 'When your devices reside on the same local network or support WebRTC P2P mesh, FluxDrop sends data directly peer-to-peer. When network constraints prevent direct handshakes, our secure end-to-end encrypted relay guarantees delivery.',
    },
    {
      q: 'Are download links predictable or public?',
      a: 'Never. Files in FluxDrop use generated UUID storage keys rather than original filenames. File downloads require cryptographic HMAC-SHA256 signed tokens that expire automatically.',
    },
    {
      q: 'What is the maximum transfer size limit?',
      a: 'FluxDrop supports chunked streaming uploads capable of handling files up to 5GB seamlessly without choking client browser memory.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#05070B] text-[#F5F7FA] selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Background cinematic looping video & lighting blooms */}
      <CinematicBackground variant="hero" />

      {/* Navigation Header - Floating Liquid Glass Island (Scrolls naturally with page) */}
      <header className="relative z-40 px-4 sm:px-6 w-full pt-4 sm:pt-6">
        <div className="max-w-6xl mx-auto px-5 sm:px-7 h-16 rounded-full glass-card flex items-center justify-between border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <Link to="/" className="shrink-0 flex items-center">
            <FluxDropLogo size="sm" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-medium text-gray-200">
            <a href="#how-it-works" className="hover:text-cyan-300 transition">How it works</a>
            <a href="#features" className="hover:text-cyan-300 transition">Features</a>
            <a href="#security" className="hover:text-cyan-300 transition">Security</a>
            <a href="#cross-device" className="hover:text-cyan-300 transition">Devices</a>
            <a href="#faq" className="hover:text-cyan-300 transition">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-medium text-white hover:text-[#61f7df] px-3.5 py-1.5 rounded-full hover:bg-white/10 transition"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="text-xs sm:text-sm font-bold text-[#031310] bg-[#61f7df] hover:bg-[#7effe8] px-4 py-2 rounded-full shadow-[0_0_20px_rgba(97,247,223,0.4)] hover:shadow-[0_0_30px_rgba(97,247,223,0.6)] transition-all duration-200 hover:scale-[1.03]"
            >
              Get started
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Slide-down Glass Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden mt-3 max-w-6xl mx-auto overflow-hidden rounded-2xl border border-white/15 glass-panel px-6 py-6 space-y-4"
            >
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-gray-300 hover:text-cyan-400 py-1"
              >
                How it works
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-gray-300 hover:text-cyan-400 py-1"
              >
                Features
              </a>
              <a
                href="#security"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-gray-300 hover:text-cyan-400 py-1"
              >
                Security
              </a>
              <a
                href="#cross-device"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-gray-300 hover:text-cyan-400 py-1"
              >
                Devices
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium text-gray-300 hover:text-cyan-400 py-1"
              >
                FAQ
              </a>
              <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                <Link
                  to="/login"
                  className="w-full text-center py-2.5 text-sm font-medium rounded-xl border border-white/10 text-white hover:bg-white/5"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="w-full text-center py-2.5 text-sm font-bold rounded-xl bg-[#61f7df] text-[#031310] shadow-[0_0_20px_rgba(97,247,223,0.4)]"
                >
                  Get started
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-24 md:pt-24 md:pb-36 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-[#61f7df]/25 text-xs font-medium text-[#61f7df] mb-8 shadow-[0_0_15px_rgba(97,247,223,0.15)]"
        >
          <span className="w-2 h-2 rounded-full bg-[#61f7df] animate-ping" />
          Cross-Platform Hardware Transfer Mesh
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-heading font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.08]"
        >
          Move Anything.{' '}
          <span className="text-gradient">Anywhere.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl md:text-2xl text-[#8B95A7] max-w-2xl mx-auto font-normal leading-relaxed"
        >
          Your devices. One secure space.
          <br />
          <span className="text-gray-400 text-base sm:text-lg">
            Send files, code, images, videos, text and links between your devices in seconds.
          </span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#61f7df] hover:bg-[#7effe8] text-[#031310] font-bold text-base shadow-[0_0_30px_rgba(97,247,223,0.45)] hover:shadow-[0_0_45px_rgba(97,247,223,0.7)] flex items-center justify-center gap-2 group transition-all duration-200 hover:scale-[1.03]"
          >
            Start Sharing
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-[#031310]" />
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-7 py-4 rounded-xl bg-white/[0.06] hover:bg-[#61f7df]/10 border border-[#61f7df]/30 hover:border-[#61f7df]/70 text-white font-medium text-base shadow-[0_0_15px_rgba(97,247,223,0.12)] hover:shadow-[0_0_25px_rgba(97,247,223,0.25)] backdrop-blur-md transition-all duration-200"
          >
            See How It Works
          </a>
        </motion.div>

        {/* Trust Badges Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 pt-8 border-t border-white/[0.08] max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-[#8B95A7]"
        >
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Private by design</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Fast transfers</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Laptop className="w-4 h-4 text-cyan-400" />
            <span>Cross-device</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Secure PIN access</span>
          </div>
        </motion.div>

      </section>

      {/* New Dashboard Capabilities Section */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Core Dashboard Suite</span>
          <h2 className="text-3xl sm:text-5xl font-heading font-bold text-white mt-3">
            Power your workflow in one place.
          </h2>
          <p className="text-[#8B95A7] mt-4 text-base sm:text-lg">
            Khata debit & credit ledger, multi-language code studio, and zero-trust cloud sync.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Module 1: Udhar & Khata */}
          <div className="p-8 rounded-2xl glass-card relative group hover:border-[#61f7df]/40 transition-all duration-300">
            <span className="text-5xl font-heading font-black text-white/[0.07] group-hover:text-emerald-400/20 transition-colors">
              01
            </span>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 mt-2 shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-white mb-2 group-hover:text-emerald-300 transition-colors">
              Udhar & Khata Management
            </h3>
            <p className="text-[#8B95A7] text-sm leading-relaxed mb-5">
              Track customer credit and debit balances (Lena & Dena Hai), manage transaction ledgers, and send instant WhatsApp payment reminders with automatic Supabase cloud sync.
            </p>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10 text-[11px] font-mono text-emerald-400">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">Customer Ledger</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">WhatsApp Alerts</span>
            </div>
          </div>

          {/* Module 2: Code Studio */}
          <div className="p-8 rounded-2xl glass-card relative group hover:border-cyan-400/40 transition-all duration-300">
            <span className="text-5xl font-heading font-black text-white/[0.07] group-hover:text-cyan-400/20 transition-colors">
              02
            </span>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 mt-2 shadow-[0_0_20px_rgba(0,229,255,0.15)] group-hover:scale-110 transition-transform">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-white mb-2 group-hover:text-cyan-300 transition-colors">
              Save & Write Code
            </h3>
            <p className="text-[#8B95A7] text-sm leading-relaxed mb-5">
              Write, edit, and organize code snippets across Python, JavaScript, TypeScript, HTML, CSS, SQL, and JSON with real-time syntax highlighting, instant execution, and 1-click copying.
            </p>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10 text-[11px] font-mono text-cyan-400">
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">10+ Languages</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">Cloud Snippets</span>
            </div>
          </div>

          {/* Module 3: Cloud Vault */}
          <div className="p-8 rounded-2xl glass-card relative group hover:border-indigo-400/40 transition-all duration-300">
            <span className="text-5xl font-heading font-black text-white/[0.07] group-hover:text-indigo-400/20 transition-colors">
              03
            </span>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 mt-2 shadow-[0_0_20px_rgba(99,102,241,0.15)] group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors">
              Secure Cloud Vault
            </h3>
            <p className="text-[#8B95A7] text-sm leading-relaxed mb-5">
              Protect sensitive documents, files, notes, and links with double-credential security (account password + 6-digit workspace PIN) backed by encrypted Supabase storage.
            </p>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10 text-[11px] font-mono text-indigo-400">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">6-Digit PIN</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">Zero-Trust</span>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Content Types */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Universal Formats</span>
          <h2 className="text-3xl sm:text-5xl font-heading font-bold text-white mt-3">
            Designed for everything you share.
          </h2>
          <p className="text-[#8B95A7] mt-4 text-base sm:text-lg">
            High performance pipelines tuned for every data format.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {supportedTypes.map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl glass-card group transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/20 shadow-inner flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-cyan-400/50 transition-all duration-300">
                {item.icon}
              </div>
              <h3 className="text-lg font-heading font-semibold text-white mb-1.5 group-hover:text-cyan-300 transition-colors">{item.title}</h3>
              <p className="text-xs text-[#8B95A7] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security Architecture */}
      <section id="security" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Zero-Trust Philosophy</span>
            <h2 className="text-3xl sm:text-5xl font-heading font-bold text-white mt-3 leading-tight">
              Private transfers. Built into the architecture.
            </h2>
            <p className="text-[#8B95A7] mt-6 text-base sm:text-lg leading-relaxed">
              We never expose private files through predictable public URLs. Security credentials and transfer authorization are enforced at every protocol layer.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Dual-Credential Architecture</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Separate account password and workspace PIN prevent privilege escalation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Signed Expiring URLs</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Download links use cryptographic HMAC-SHA256 signatures that expire within hours.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Device Revocation</h4>
                  <p className="text-xs text-gray-400 mt-0.5">One-click remote termination disconnects unverified laptops or lost phones instantly.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Brute-Force Lockout Protection</h4>
                  <p className="text-xs text-gray-400 mt-0.5">PIN attempts are strictly rate-limited with automatic 15-minute lockout thresholds.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl glass-panel border border-cyan-500/20 relative">
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-cyan-400" />
                <span className="font-heading font-semibold text-white text-base">Security Matrix</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-mono">
                Verified
              </span>
            </div>

            <div className="mt-6 space-y-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl glass-card-interactive flex items-center justify-between">
                <span className="text-gray-400">Password Hashing</span>
                <span className="text-emerald-400">Bcrypt (Salt 12)</span>
              </div>
              <div className="p-3.5 rounded-xl glass-card-interactive flex items-center justify-between">
                <span className="text-gray-400">PIN Pepper & Salt</span>
                <span className="text-emerald-400">HMAC-SHA256 + Bcrypt</span>
              </div>
              <div className="p-3.5 rounded-xl glass-card-interactive flex items-center justify-between">
                <span className="text-gray-400">Pairing Handshake</span>
                <span className="text-cyan-400">10-Min Ephemeral Token</span>
              </div>
              <div className="p-3.5 rounded-xl glass-card-interactive flex items-center justify-between">
                <span className="text-gray-400">Storage Keys</span>
                <span className="text-cyan-400">Non-Predictable UUID</span>
              </div>
              <div className="p-3.5 rounded-xl glass-card-interactive flex items-center justify-between">
                <span className="text-gray-400">Transport Layer</span>
                <span className="text-indigo-400">WSS + WebRTC Mesh</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cross Device Experience */}
      <section id="cross-device" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-white/[0.08] text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Universal Ecosystem</span>
        <h2 className="text-3xl sm:text-5xl font-heading font-bold text-white mt-3 max-w-2xl mx-auto">
          One account. All your devices.
        </h2>
        <p className="text-[#8B95A7] mt-4 max-w-2xl mx-auto text-base sm:text-lg">
          Start a transfer on your laptop and continue it on your phone. FluxDrop keeps your devices connected through a simple, secure experience.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 max-w-3xl mx-auto">
          {['Windows PC', 'MacBook Pro', 'Linux Workstation', 'Android Phone', 'iPhone', 'iPad Pro'].map((dev, i) => (
            <div key={i} className="px-5 py-3 rounded-2xl glass-card flex items-center gap-3">
              {dev.includes('PC') || dev.includes('Linux') ? (
                <Monitor className="w-5 h-5 text-cyan-400" />
              ) : dev.includes('MacBook') ? (
                <Laptop className="w-5 h-5 text-blue-400" />
              ) : dev.includes('iPad') ? (
                <Tablet className="w-5 h-5 text-purple-400" />
              ) : (
                <Smartphone className="w-5 h-5 text-indigo-400" />
              )}
              <span className="text-sm font-medium text-white">{dev}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-24 px-6 max-w-4xl mx-auto border-t border-white/[0.08]">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Clear Answers</span>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mt-3">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl glass-card border border-white/[0.07] overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between gap-4"
              >
                <span className="text-base font-semibold text-white">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 shrink-0 ${
                    activeFaq === index ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>
              {activeFaq === index && (
                <div className="px-6 pb-6 text-sm text-[#8B95A7] leading-relaxed border-t border-white/[0.05] pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-24 px-6 max-w-5xl mx-auto text-center border-t border-white/[0.08]">
        <div className="p-12 sm:p-16 rounded-3xl glass-panel border border-cyan-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-b from-cyan-500/10 to-transparent blur-[100px] pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white">
            Your devices are ready.
          </h2>
          <p className="text-lg text-[#8B95A7] mt-4 max-w-xl mx-auto">
            Move files, code, text and links without the friction.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#61f7df] hover:bg-[#7effe8] text-[#031310] font-bold text-base shadow-[0_0_25px_rgba(97,247,223,0.45)] hover:shadow-[0_0_35px_rgba(97,247,223,0.65)] transition-all duration-200 hover:scale-[1.03]"
            >
              Create your account
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/[0.06] hover:bg-[#61f7df]/10 border border-[#61f7df]/30 hover:border-[#61f7df]/70 text-white font-medium text-base transition-all duration-200"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <FluxDropLogo size="lg" showTagline={true} />
            <p className="text-sm text-[#8B95A7] mt-4 max-w-sm">
              Move anything. Anywhere. Premium cross-device digital transfer platform.
            </p>
          </div>
          <div>
            <h5 className="text-xs font-semibold uppercase text-gray-300 tracking-wider mb-4">Product</h5>
            <ul className="space-y-2.5 text-sm text-[#8B95A7]">
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><a href="#security" className="hover:text-white transition">Security</a></li>
              <li><Link to="/files" className="hover:text-white transition">Files</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition">Workspace</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-semibold uppercase text-gray-300 tracking-wider mb-4">Company</h5>
            <ul className="space-y-2.5 text-sm text-[#8B95A7]">
              <li><span className="hover:text-white transition cursor-pointer">About</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Contact</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Privacy</span></li>
              <li><span className="hover:text-white transition cursor-pointer">Terms</span></li>
            </ul>
          </div>
          <div>
            <h5 className="text-xs font-semibold uppercase text-gray-300 tracking-wider mb-4">Social</h5>
            <ul className="space-y-2.5 text-sm text-[#8B95A7]">
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition">GitHub</a></li>
              <li><a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition">X</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition">LinkedIn</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8B95A7]">
          <p>© 2026 FluxDrop. All rights reserved.</p>
          <div className="flex items-center gap-2 mt-4 sm:mt-0 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Systems Normal • Latency 14ms</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
