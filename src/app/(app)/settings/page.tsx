'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, Wallet, Twitter, Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';

export default function SettingsPage() {
  const {
    user,
    authenticated,
    ready,
    xHandle: authXHandle,
    xDisplayName,
    xBio,
    xProfileImageUrl,
    walletAddress
  } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load user data from DB, falling back to X data
  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;

    fetch(`/api/user/me?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        // Use DB values first, then fall back to X data, then proxy data
        const dbName = data.user?.displayName;
        const dbBio = data.user?.bio;
        const proxyBio = data.proxy?.bio;

        setDisplayName(dbName || xDisplayName || '');
        setBio(dbBio || xBio || proxyBio || '');
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [ready, authenticated, user?.id, xDisplayName, xBio]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          displayName: displayName.trim() || null,
          bio: bio.trim() || null
        })
      });
      if (res.ok) setSaved(true);
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray text-sm mt-0.5">Manage your Proxi account</p>
      </div>

      {/* Avatar */}
      <Card className="space-y-4">
        <h2 className="text-white font-semibold">Profile Photo</h2>
        <div className="flex items-center gap-4">
          {xProfileImageUrl ? (
            <img
              src={xProfileImageUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover border border-white/6"
            />
          ) : (
            <Avatar size="xl" />
          )}
          <div className="space-y-2">
            <p className="text-gray text-xs">
              {xProfileImageUrl
                ? 'Synced from your X account'
                : 'Connect X to sync your profile photo'}
            </p>
          </div>
        </div>
      </Card>

      {/* Profile */}
      <Card className="space-y-4">
        <h2 className="text-white font-semibold">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="text-gray text-xs mb-1.5 block">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setSaved(false);
              }}
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className="text-gray text-xs mb-1.5 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setSaved(false);
              }}
              placeholder="Tell the world about yourself..."
              className="w-full h-24 bg-white/4 border border-white/6 rounded-lg p-3.5 text-sm text-white placeholder:text-gray/50 resize-none outline-none focus:border-lime/30"
            />
          </div>
        </div>
      </Card>

      {/* Socials */}
      <Card className="space-y-4">
        <h2 className="text-white font-semibold">Connected Accounts</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/2 border border-white/4">
            <div className="flex items-center gap-3">
              <Twitter size={18} className="text-gray" />
              <div>
                <span className="text-white text-sm">X (Twitter)</span>
                {authXHandle ? (
                  <span className="text-gray text-xs block">@{authXHandle}</span>
                ) : (
                  <span className="text-gray/50 text-xs block">Not connected</span>
                )}
              </div>
            </div>
            {authXHandle ? (
              <Badge className="text-emerald-400 text-xs">Connected</Badge>
            ) : (
              <Button variant="outline" size="sm">
                Connect
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/2 border border-white/4">
            <div className="flex items-center gap-3">
              <Wallet size={18} className="text-gray" />
              <div>
                <span className="text-white text-sm">Wallet</span>
                {walletAddress ? (
                  <span className="text-gray text-xs block">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                ) : (
                  <span className="text-gray/50 text-xs block">Not connected</span>
                )}
              </div>
            </div>
            {walletAddress ? (
              <Badge className="text-emerald-400 text-xs">Connected</Badge>
            ) : (
              <Button variant="outline" size="sm">
                Connect
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Button size="lg" className="w-full rounded-lg"  onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Saving...
          </>
        ) : saved ? (
          <>
            <Check size={16} /> Saved
          </>
        ) : (
          <>
            <Save size={16} /> Save Changes
          </>
        )}
      </Button>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/6 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}
