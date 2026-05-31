import { useState } from 'react';
import { Plus, LogOut, UserPlus } from 'lucide-react';
import type { Podcast } from '../types';
import { supabase } from '../supabase';

interface Props {
  podcasts: Podcast[];
  isAnonymous: boolean;
  userEmail?: string;
  onAddPodcast: () => void;
  onSelectPodcast: (podcast: Podcast) => void;
}

export function Library({ podcasts, isAnonymous, userEmail, onAddPodcast, onSelectPodcast }: Props) {
  const [showSync, setShowSync] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const redirectTo = 'https://janielecustodio.com/podcast-app/';
    // Always use signInWithOtp — it reliably passes emailRedirectTo.
    // updateUser's emailRedirectTo is ignored by Supabase for magic links.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (otpError) {
      setError(otpError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setVerifying(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: 'email',
    });
    if (verifyError) {
      setError(verifyError.message);
    } else {
      setShowSync(false);
    }
    setVerifying(false);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Library</h1>
          {!isAnonymous && userEmail && (
            <p className="text-gray-600 text-xs mt-0.5 truncate max-w-[200px]">{userEmail}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAnonymous ? (
            <button
              onClick={() => setShowSync(true)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-gray-900 active:bg-gray-800 text-gray-400 text-xs font-medium"
              title="Connect your account"
            >
              <UserPlus size={13} />
              Connect account
            </button>
          ) : (
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center active:bg-gray-800"
              title="Sign out"
            >
              <LogOut size={16} className="text-gray-400" />
            </button>
          )}
          <button
            onClick={onAddPodcast}
            className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center active:bg-purple-700"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* Connect account modal for anonymous users */}
      {showSync && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-5">
            {sent ? (
              <div>
                <p className="text-white font-semibold mb-1">Check your email</p>
                <p className="text-gray-400 text-sm mb-4">
                  We sent a code and a magic link to <span className="text-gray-200">{email}</span>.
                </p>
                <form onSubmit={handleVerify} className="flex flex-col gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Enter 8-digit code"
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none border border-gray-700 focus:border-purple-500 placeholder-gray-600 text-center tracking-widest text-lg"
                  />
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setSent(false); setOtp(''); setError(null); }}
                      className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold text-sm"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={verifying || otp.length < 8}
                      className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm disabled:opacity-40"
                    >
                      {verifying ? 'Verifying…' : 'Verify code'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <h3 className="text-white font-bold text-lg mb-1">Connect your account</h3>
                <p className="text-gray-400 text-sm mb-4">Enter your email to sync your library across devices. We'll send a magic link — no password needed.</p>
                <form onSubmit={handleLinkEmail} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none border border-gray-700 focus:border-purple-500 placeholder-gray-600"
                  />
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSync(false)}
                      className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !email}
                      className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm disabled:opacity-40"
                    >
                      {loading ? 'Sending…' : 'Send link'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sign out confirmation */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-5">
            <h3 className="text-white font-bold text-lg mb-1">Sign out?</h3>
            <p className="text-gray-400 text-sm mb-5">Your library will still be saved and you can sign back in with your email.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {podcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
            <span className="text-3xl">🎙️</span>
          </div>
          <p className="text-white text-lg font-semibold mb-1">No podcasts yet</p>
          <p className="text-gray-500 text-sm">Tap + to add your first podcast</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {podcasts.map((podcast) => (
            <button
              key={podcast.id}
              onClick={() => onSelectPodcast(podcast)}
              className="flex flex-col items-start text-left active:opacity-70"
            >
              <img
                src={podcast.artworkUrl}
                alt={podcast.title}
                className="w-full aspect-square rounded-2xl object-cover mb-2 shadow-lg"
              />
              <p className="text-white text-sm font-semibold truncate w-full leading-tight">
                {podcast.title}
              </p>
              <p className="text-gray-500 text-xs truncate w-full mt-0.5">{podcast.author}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
