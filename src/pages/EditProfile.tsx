import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabaseClient';
import { uploadImage } from '@/services/storage';
import Avatar from '@/components/Avatar';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export default function EditProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const { dataSaver } = useSettings();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [website, setWebsite] = useState(profile?.website ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [coverUrl, setCoverUrl] = useState(profile?.cover_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>, kind: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const { publicUrl } = await uploadImage({
        file,
        userId: user.id,
        bucket: kind === 'avatar' ? 'avatars' : 'covers',
        kind,
        dataSaver
      });
      if (kind === 'avatar') setAvatarUrl(publicUrl);
      else setCoverUrl(publicUrl);
    } catch {
      setError('Image upload failed. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setError(null);

    const cleanUsername = username.trim().toLowerCase();

    if (!USERNAME_REGEX.test(cleanUsername)) {
      setError('Username: haruffa (a-z), lambobi, ko "_" kawai, 3-20 characters.');
      return;
    }

    setSaving(true);

    // Idan username ya canza, duba ko wani ba ya amfani da shi
    if (cleanUsername !== profile?.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .neq('id', user.id)
        .maybeSingle();

      if (existing) {
        setSaving(false);
        setError('Wannan username ana amfani da shi tuni. Zaɓi wani.');
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        username: cleanUsername,
        bio: bio.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        avatar_url: avatarUrl || null,
        cover_url: coverUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    setSaving(false);
    if (updateError) {
      if (updateError.code === '23505') {
        setError('Wannan username ana amfani da shi tuni. Zaɓi wani.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }
    await refreshProfile();
    navigate('/profile');
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold">Edit Profile</h1>
      {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <div className="relative mb-12 h-32 rounded-lg bg-gray-200 dark:bg-gray-800">
        {coverUrl && <img src={coverUrl} alt="" className="h-full w-full rounded-lg object-cover" />}
        <label className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          Change Cover
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'cover')} />
        </label>
        <label className="absolute -bottom-8 left-4 cursor-pointer">
          <div className="rounded-full border-4 border-white dark:border-gray-900">
            <Avatar src={avatarUrl} name={fullName} size={72} />
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'avatar')} />
        </label>
      </div>

      <div className="space-y-3">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />

        <div className="flex items-center rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
          <span className="pl-2.5 text-sm text-gray-400">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="username"
            maxLength={20}
            className="w-full bg-transparent p-2.5 pl-1 text-sm outline-none"
          />
        </div>

        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" maxLength={300} rows={3} className="w-full resize-none rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
      </div>

      <button onClick={handleSave} disabled={saving} className="mt-5 w-full rounded-lg bg-zumra-500 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
    }
