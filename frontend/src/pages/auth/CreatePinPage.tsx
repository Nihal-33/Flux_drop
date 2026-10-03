import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, AlertCircle, KeyRound, Check } from 'lucide-react';
import { FluxDropLogo } from '../../components/brand/FluxDropLogo';
import { CinematicBackground } from '../../components/ui/CinematicBackground';
import { useAuth } from '../../context/AuthContext';

export const CreatePinPage: React.FC = () => {
  const navigate = useNavigate();
  const { createPin } = useAuth();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValidLength = /^\d{6}$/.test(pin);
  const isMatch = pin.length === 6 && pin === confirmPin;
  const isWeak = ['123456', '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '654321'].includes(pin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidLength) {
      setError('PIN must be exactly 6 numeric digits.');
      return;
    }

    if (isWeak) {
      setError('Please avoid sequential or repeated numbers like 123456 or 000000.');
      return;
    }

    if (!isMatch) {
      setError('PIN and confirmation PIN do not match.');
      return;
    }

    setLoading(true);
    try {
      await createPin(pin, confirmPin);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create security PIN.');
    } finally {
      setLoading(false);
    }
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
          <FluxDropLogo size="lg" className="mb-4 inline-block hover:scale-105 transition-transform" />
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/20">
            <KeyRound className="w-6 h-6 text-[#61f7df]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
            Create your security PIN
          </h1>
          <p className="text-sm text-gray-200 mt-2 max-w-xs mx-auto font-medium drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            Your PIN adds a zero-knowledge hardware protection layer to your FluxDrop workspace.
          </p>
        </div>

        <div className="p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">6-Digit Security PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full px-4 py-3 rounded-xl glass-input text-center text-xl tracking-[0.5em] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Confirm 6-Digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full px-4 py-3 rounded-xl glass-input text-center text-xl tracking-[0.5em] font-mono"
              />
            </div>

            {/* Quality Checklist */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isValidLength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>Exactly 6 numeric digits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>Confirmation PIN matches</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isValidLength || !isMatch || isWeak}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition disabled:opacity-40"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Activate PIN & Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
