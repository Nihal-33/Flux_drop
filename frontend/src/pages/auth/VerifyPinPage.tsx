import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  KeyRound,
  ShieldAlert,
  ArrowRight,
  LogOut,
  Clock,
  ShieldCheck,
  Check,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';
import { FluxDropLogo } from '../../components/brand/FluxDropLogo';
import { CinematicBackground } from '../../components/ui/CinematicBackground';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const VerifyPinPage: React.FC = () => {
  const navigate = useNavigate();
  const { verifyPin, logout, isPinLocked, user, recoverPinWithQuestion } = useAuth();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Recovery Mode State
  const [isRecovering, setIsRecovering] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount & load security question
  useEffect(() => {
    inputRefs.current[0]?.focus();

    api.pin.getSecurityQuestion()
      .then((res) => {
        if (res.securityQuestion) {
          setSecurityQuestion(res.securityQuestion);
        }
      })
      .catch(() => {});
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleDigitChange = (index: number, value: string) => {
    if (lockoutSeconds > 0) return;
    setError(null);

    // Handle single character
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    // Auto advance
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits entered, auto-submit
    if (cleaned && index === 5 && newDigits.every((d) => d !== '')) {
      submitPin(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);

    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      submitPin(pasted);
    } else {
      inputRefs.current[Math.min(5, pasted.length)]?.focus();
    }
  };

  const submitPin = async (pinValue?: string) => {
    const fullPin = pinValue || digits.join('');
    if (fullPin.length !== 6) {
      setError('Please enter all 6 digits of your PIN.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verifyPin(fullPin);
      navigate('/dashboard');
    } catch (err: any) {
      triggerShake();
      setError(err.message || 'Incorrect PIN. Please try again.');
      if (err.message?.includes('locked')) {
        setLockoutSeconds(15 * 60);
      }
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAnswer.trim()) {
      setError('Please provide your secret security answer.');
      return;
    }

    if (newPin && newPin.length !== 6) {
      setError('If setting a new PIN, it must be exactly 6 numeric digits.');
      return;
    }

    if (newPin && newPin !== confirmNewPin) {
      setError('New PIN and confirmation do not match.');
      return;
    }

    setRecoveryLoading(true);
    setError(null);
    try {
      await recoverPinWithQuestion(securityAnswer.trim(), newPin.trim() || undefined);
      setRecoverySuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Security answer verification failed.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const formatLockoutTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/10">
            {isRecovering ? (
              <ShieldCheck className="w-7 h-7 text-[#61f7df]" />
            ) : (
              <KeyRound className="w-7 h-7 text-[#61f7df]" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
            {isRecovering ? 'PIN Recovery' : 'Enter your FluxDrop PIN'}
          </h1>
          <p className="text-sm text-gray-200 mt-2 font-medium drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            Logged in as <span className="text-[#61f7df] font-semibold">@{user?.username || 'user'}</span>
          </p>
        </div>

        <div className={`p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl ${shake ? 'animate-shake' : ''}`}>
          {isRecovering ? (
            /* Security Question Recovery Form */
            <form onSubmit={handleRecoverSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovering(false);
                    setError(null);
                  }}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-[#61f7df] uppercase tracking-wider">
                  Answer Security Question
                </span>
              </div>

              {recoverySuccess ? (
                <div className="py-6 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-emerald-300">Answer Verified!</p>
                  <p className="text-xs text-gray-300">Unlocking your secure dashboard...</p>
                </div>
              ) : (
                <>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Security Question</span>
                    </label>
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-white leading-relaxed">
                      {securityQuestion || 'What city or place were you born in?'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Your Secret Answer
                    </label>
                    <input
                      type="text"
                      required
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="e.g. Mumbai, New York (your birthplace)"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                      autoFocus
                    />
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        New 6-digit PIN (Optional)
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Leave blank or enter new 6-digit PIN"
                        className="w-full px-4 py-2 rounded-xl glass-input text-xs font-mono text-white"
                      />
                    </div>

                    {newPin.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Confirm New PIN
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          value={confirmNewPin}
                          onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="Re-enter new 6-digit PIN"
                          className="w-full px-4 py-2 rounded-xl glass-input text-xs font-mono text-white"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="w-full mt-3 py-3 px-4 rounded-xl bg-[#61f7df] hover:bg-[#7effe8] text-[#031310] font-bold text-xs shadow-lg shadow-[#61f7df]/20 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {recoveryLoading ? (
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Unlock Dashboard</span>
                      </>
                    )}
                  </button>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecovering(false);
                        setError(null);
                      }}
                      className="text-xs text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      ← Back to PIN entry
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            /* Normal 6-digit PIN Verification UI */
            <>
              {lockoutSeconds > 0 || isPinLocked ? (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-center">
                  <Clock className="w-8 h-8 text-red-400 mx-auto mb-2 animate-pulse" />
                  <h4 className="text-sm font-semibold text-red-300">PIN Access Locked</h4>
                  <p className="text-xs text-red-300/80 mt-1">
                    Too many failed attempts. Security cooldown active.
                  </p>
                  <div className="mt-3 text-2xl font-mono font-bold text-red-400">
                    {formatLockoutTimer(lockoutSeconds || 900)}
                  </div>
                </div>
              ) : error ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              ) : null}

              {/* 6 Digit Input Boxes */}
              <div className="flex items-center justify-between gap-2.5 my-6" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    disabled={lockoutSeconds > 0 || loading}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono rounded-2xl border transition-all duration-200 outline-none ${
                      digit
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-md shadow-cyan-500/10'
                        : 'border-white/10 bg-[#0B0F16]/90 text-white focus:border-cyan-500 focus:bg-[#111722]'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => submitPin()}
                disabled={loading || lockoutSeconds > 0 || digits.some((d) => d === '')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Unlock Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Security Question Recovery Link */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovering(true);
                    setError(null);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer hover:underline"
                >
                  Forgot your PIN? Unlock with Security Question
                </button>
              </div>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="flex items-center gap-1.5 hover:text-white transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
            <span className="text-gray-500 text-[11px]">Hardware Enclave Protected</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyPinPage;
