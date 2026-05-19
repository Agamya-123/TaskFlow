'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn('credentials', {
      email,
      password,
      role,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/');
    } else {
      alert('Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  // Direct demo login triggers
  const triggerDemoLogin = async (selectedRole: 'ADMIN' | 'MEMBER') => {
    setLoading(true);
    const demoEmail = selectedRole === 'ADMIN' ? 'admin@taskflow.io' : 'member@taskflow.io';
    const demoPassword = 'password123';
    
    const result = await signIn('credentials', {
      email: demoEmail,
      password: demoPassword,
      role: selectedRole,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/');
    } else {
      alert('Demo login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-6">
      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-secondary/15 blur-[120px] pointer-events-none"></div>

      <div className="relative glass-card p-8 md:p-10 rounded-3xl w-full max-w-md flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
        <div className="text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 mb-4 animate-pulse">
            <span className="material-symbols-outlined text-background font-bold text-2xl">layers</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent mb-1">
            TaskFlow AI
          </h1>
          <p className="text-sm text-on-surface-variant/80 font-medium">
            Sign in or auto-register to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-on-surface/80 tracking-wide uppercase">Workspace Role</label>
            <div className="flex p-1 bg-surface-container/60 border border-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === 'ADMIN'
                    ? 'bg-primary text-background font-bold shadow-md shadow-primary/10'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole('MEMBER')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  role === 'MEMBER'
                    ? 'bg-primary text-background font-bold shadow-md shadow-primary/10'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">person</span>
                Team Member
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-on-surface/80 tracking-wide uppercase">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/60 text-lg">mail</span>
              <input 
                type="email" 
                required 
                placeholder="developer@taskflow.io"
                className="w-full bg-surface-container/60 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-on-surface/80 tracking-wide uppercase">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/60 text-lg">lock</span>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                className="w-full bg-surface-container/60 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-2 w-full bg-gradient-to-r from-primary to-secondary text-background font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-background border-t-transparent animate-spin"></span>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">login</span>
                <span>Enter Workspace</span>
              </>
            )}
          </button>
        </form>

        <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
          <label className="text-[10px] font-bold text-center text-on-surface-variant/70 uppercase tracking-widest">
            ⚡ Quick Demo Access
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => triggerDemoLogin('ADMIN')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/40 text-xs font-bold transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm font-bold">admin_panel_settings</span>
              Demo Admin
            </button>
            <button
              onClick={() => triggerDemoLogin('MEMBER')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/25 hover:border-secondary/40 text-xs font-bold transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm font-bold">person</span>
              Demo Member
            </button>
          </div>
        </div>

        <div className="text-center pt-1">
          <p className="text-[10px] text-on-surface-variant/45 leading-normal">
            To register a custom account, simply enter any credentials above and check your workspace.
          </p>
        </div>
      </div>
    </main>
  );
}
