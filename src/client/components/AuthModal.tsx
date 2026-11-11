import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side quick check
    if (!email || !email.includes('@')) {
      setFieldErrors({ email: ['Please enter a valid email address'] });
      return;
    }
    if (password.length < 6) {
      setFieldErrors({ password: ['Password must be at least 6 characters'] });
      return;
    }

    try {
      setLoading(true);
      if (tab === 'login') {
        await login({ email, password });
      } else {
        if (!fullName.trim()) {
          setFieldErrors({ fullName: ['Full name is required'] });
          setLoading(false);
          return;
        }
        await register({ email, password, fullName, phone });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
      if (err.details) {
        setFieldErrors(err.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setErrorMessage(null);
    setFieldErrors({});
    try {
      setLoading(true);
      await login({ email: demoEmail, password: demoPass });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal Dialog */}
      <div className="relative bg-[#111111] border border-[#262626] w-full max-w-md p-6 sm:p-8 text-white shadow-2xl z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-block bg-white text-black font-black text-sm px-2 py-0.5 mb-2">
            UT
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider font-heading">
            {tab === 'login' ? 'WELCOME BACK' : 'JOIN URBAN THREADS'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {tab === 'login'
              ? 'Sign in to access your orders and saved addresses.'
              : 'Create an account to track drops, cart items, and orders.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#262626] mb-6">
          <button
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
              setFieldErrors({});
            }}
            className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-colors ${
              tab === 'login' ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
              setFieldErrors({});
            }}
            className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-colors ${
              tab === 'register' ? 'border-white text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Register
          </button>
        </div>

        {/* General Error Banner */}
        {errorMessage && (
          <div className="mb-4 bg-red-950/70 border border-red-800 p-3 rounded-none flex items-start space-x-2 text-xs text-red-200">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Marcus Vance"
                    required
                    className="w-full bg-[#181818] border border-[#333333] text-white px-3 py-2 pl-9 text-xs focus:outline-none focus:border-white"
                  />
                  <UserIcon className="absolute left-3 top-2.5 text-gray-500" size={14} />
                </div>
                {fieldErrors.fullName && (
                  <p className="text-[11px] text-red-400 mt-1">{fieldErrors.fullName[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full bg-[#181818] border border-[#333333] text-white px-3 py-2 pl-9 text-xs focus:outline-none focus:border-white"
                  />
                  <Phone className="absolute left-3 top-2.5 text-gray-500" size={14} />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
                className="w-full bg-[#181818] border border-[#333333] text-white px-3 py-2 pl-9 text-xs focus:outline-none focus:border-white"
              />
              <Mail className="absolute left-3 top-2.5 text-gray-500" size={14} />
            </div>
            {fieldErrors.email && (
              <p className="text-[11px] text-red-400 mt-1">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#181818] border border-[#333333] text-white px-3 py-2 pl-9 text-xs focus:outline-none focus:border-white"
              />
              <Lock className="absolute left-3 top-2.5 text-gray-500" size={14} />
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-red-400 mt-1">{fieldErrors.password[0]}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-gray-200 text-black font-black text-xs py-3 uppercase tracking-widest transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : tab === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        {/* Demo Fast Login Pills for Reviewers */}
        <div className="mt-6 pt-6 border-t border-[#262626]">
          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 text-center mb-3">
            Reviewer Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoLogin('customer@urbanthreads.com', 'Customer@123456')}
              className="bg-[#1c1c1c] hover:bg-[#282828] border border-[#333333] text-[11px] font-semibold text-gray-200 py-2 px-3 text-center transition-colors"
            >
              Demo Customer
            </button>
            <button
              onClick={() => handleDemoLogin('admin@urbanthreads.com', 'Admin@123456')}
              className="bg-[#1c1c1c] hover:bg-[#282828] border border-red-900/60 text-[11px] font-semibold text-red-300 py-2 px-3 text-center transition-colors"
            >
              Demo Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

