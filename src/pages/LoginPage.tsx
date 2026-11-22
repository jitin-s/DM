import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-28 pb-20 min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#F01428]/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md bg-[#0F0F13] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-3">
            <img
              src="/logo_cropped.png"
              alt="DevilMotion"
              className="h-8 w-auto mx-auto drop-shadow-[0_0_15px_rgba(240,20,40,0.5)]"
            />
          </Link>
          <h1 className="text-2xl font-black text-white font-heading">Sign In</h1>
          <p className="text-xs text-[#9E9EB2] mt-1">
            Access your cloud anime watchlist, synchronized playback history, and admin console.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-[#F01428] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9E9EB2] mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#646478] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3 py-2.5 bg-[#16161E] rounded-xl text-sm text-white placeholder-[#646478] border border-white/10 focus:outline-none focus:border-[#F01428]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#9E9EB2] uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#646478] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-[#16161E] rounded-xl text-sm text-white placeholder-[#646478] border border-white/10 focus:outline-none focus:border-[#F01428]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#646478] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button variant="primary" fullWidth size="lg" disabled={isSubmitting} className="mt-2 glow-red">
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#9E9EB2]">
          <span className="font-semibold text-white">Default Admin Account:</span><br/>
          <span className="font-mono text-[#FF4D61]">admin@devilmotion.com / admin123456</span>
        </div>

        <div className="mt-6 text-center text-xs text-[#9E9EB2]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#F01428] font-bold hover:underline">
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
};
