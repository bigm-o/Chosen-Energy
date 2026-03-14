import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Zap, Activity } from 'lucide-react';
import { toast } from 'sonner';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login({ email, password });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-800 selection:bg-blue-100">
      {/* Left side - Truck Visual Section */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <img
            src="/truck.jpg"
            alt="Chosen Energy Truck"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-black/80" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 backdrop-blur-sm">
                CE
              </div>
              <span className="text-2xl font-black tracking-tight text-white drop-shadow-md">Chosen Energy</span>
            </div>

            <div className="max-w-md">
              <h1 className="text-5xl font-black text-white leading-tight mb-6 drop-shadow-lg">
                Redefining Fuel <span className="text-blue-400">Logistics</span> Management.
              </h1>
              <p className="text-lg text-gray-200 font-medium leading-relaxed drop-shadow-md">
                Streamline your diesel operations with real-time tracking, automated approvals, and precise stock management.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="p-6 rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-md shadow-lg">
              <ShieldCheck className="w-8 h-8 text-blue-400 mb-4 drop-shadow" />
              <h3 className="text-white font-bold mb-1 drop-shadow">Enterprise Ready</h3>
              <p className="text-sm text-gray-300">Military-grade security for your industrial data.</p>
            </div>
            <div className="p-6 rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-md shadow-lg">
              <Zap className="w-8 h-8 text-indigo-400 mb-4 drop-shadow" />
              <h3 className="text-white font-bold mb-1 drop-shadow">Ultra-Fast Sync</h3>
              <p className="text-sm text-gray-300">Instant updates across all driver and admin portals.</p>
            </div>
          </div>

          <div className="mt-12 flex items-center gap-4 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest drop-shadow">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Systems Online • Powered by Chosen Energy v2.0</span>
          </div>
        </div>
      </div>

      {/* Right side - Modern Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 sm:p-12 md:p-16">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-12">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-200">
              CE
            </div>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Please enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                Access Identifier
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email or Username"
                  className="w-full pl-12 pr-4 h-14 bg-gray-50 dark:bg-gray-900/50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-semibold text-gray-900 dark:text-gray-100 placeholder:text-gray-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                Security Key
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 h-14 bg-gray-50 dark:bg-gray-900/50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-semibold text-gray-900 dark:text-gray-100 placeholder:text-gray-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500/20" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-gray-700 transition-colors">Keep me signed in</span>
              </label>
              <button type="button" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700">Forgot Password?</button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-black rounded-2xl transition-all shadow-xl shadow-gray-200 active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Verifying Access...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-20 text-center">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
              © 2026 Chosen Energy Limited. All systems encrypted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}