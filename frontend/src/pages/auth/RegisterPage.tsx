import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { FluxDropLogo } from '../../components/brand/FluxDropLogo';
import { CinematicBackground } from '../../components/ui/CinematicBackground';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('What city or place were you born in?');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setError('Password must be at least 8 characters and contain letters and numbers.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    if (!securityAnswer.trim()) {
      setError('Please provide an answer for your security question to enable PIN recovery.');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        securityQuestion,
        securityAnswer: securityAnswer.trim(),
      });
      // Proceed to mandatory PIN creation
      navigate('/create-pin');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
          <Link to="/" className="inline-block mb-4 hover:scale-105 transition-transform">
            <FluxDropLogo size="lg" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
            Create your account
          </h1>
          <p className="text-sm text-gray-200 mt-2 font-medium drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            Start moving files across your devices securely
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            {/* Password quality cues */}
            <div className="pt-1 pb-2 space-y-1.5 text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasLetter && hasNumber ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>Letters & numbers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordsMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>Passwords match</span>
              </div>
            </div>

            {/* Security Question for PIN Recovery */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#61f7df]" />
                    <span>Security Question (for PIN recovery)</span>
                  </label>
                  <span className="text-[10px] text-[#61f7df] font-mono px-1.5 py-0.5 rounded bg-[#61f7df]/10 border border-[#61f7df]/20">
                    Recovery
                  </span>
                </div>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white bg-[#0b111e] cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="What city or place were you born in?" className="bg-[#0b111e] text-white py-1">
                    What city or place were you born in? (Birthplace)
                  </option>
                  <option value="What is your mother’s maiden name or birthplace?" className="bg-[#0b111e] text-white py-1">
                    What is your mother’s maiden name or birthplace?
                  </option>
                  <option value="What was the name of your first school or college?" className="bg-[#0b111e] text-white py-1">
                    What was the name of your first school or college?
                  </option>
                  <option value="What was your childhood nickname?" className="bg-[#0b111e] text-white py-1">
                    What was your childhood nickname?
                  </option>
                  <option value="What is your favorite childhood food or dish?" className="bg-[#0b111e] text-white py-1">
                    What is your favorite childhood food or dish?
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Your Secret Security Answer
                </label>
                <input
                  type="text"
                  required
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="e.g. Mumbai, New York, Jaipur (your birthplace)"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  💡 This secret answer will allow you to unlock your dashboard if you ever forget your 6-digit PIN.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-[#0B0F16] text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-gray-400 leading-snug cursor-pointer">
                I agree to the <span className="text-white hover:underline">Terms of Service</span> and <span className="text-white hover:underline">Privacy Policy</span>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-[#61f7df] hover:bg-[#7effe8] text-[#031310] font-bold text-sm shadow-[0_0_20px_rgba(97,247,223,0.35)] hover:shadow-[0_0_30px_rgba(97,247,223,0.55)] flex items-center justify-center gap-2 transition hover:scale-[1.01] disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium ml-1">
              Log in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
