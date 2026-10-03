import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { FluxDropLogo } from '../../components/brand/FluxDropLogo';
import { CinematicBackground } from '../../components/ui/CinematicBackground';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#05070B] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <CinematicBackground variant="auth" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4 hover:scale-105 transition-transform">
            <FluxDropLogo size="lg" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
            Reset your password
          </h1>
          <p className="text-sm text-gray-200 mt-2 font-medium drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            Enter your account email to receive recovery instructions
          </p>
        </div>

        <div className="p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl">
          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Recovery email sent</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                If an account exists for <span className="text-cyan-400 font-medium">{email}</span>, you will receive password reset instructions shortly.
              </p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to log in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Email address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm pl-10"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 transition"
              >
                Send Recovery Link
              </button>

              <div className="pt-2 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to log in
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
