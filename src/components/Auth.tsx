import { useState } from 'react';
import { supabase } from '../supabase';

export function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-dvh bg-black text-white items-center justify-center px-8">
      <div className="w-full max-w-sm">
        {/* Logo / icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-purple-600 flex items-center justify-center shadow-2xl">
            <svg viewBox="0 0 32 32" className="w-10 h-10 fill-white">
              <circle cx="16" cy="16" r="7" fill="none" stroke="white" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="3" />
              <line x1="16" y1="23" x2="16" y2="28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="12" y1="27" x2="20" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">Podcasts</h1>
        <p className="text-gray-400 text-center text-sm mb-10">
          Sign in to sync your library across devices
        </p>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-900/40 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-green-400 fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">Check your email</p>
            <p className="text-gray-500 text-sm">
              We sent a magic link to <span className="text-gray-300">{email}</span>.<br />
              Click it to sign in — no password needed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-gray-900 text-white rounded-xl px-4 py-3.5 text-sm outline-none border border-gray-800 focus:border-purple-500 transition-colors placeholder-gray-600"
            />

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-purple-600 text-white rounded-xl py-3.5 text-sm font-semibold active:bg-purple-700 disabled:opacity-40 transition-opacity"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
