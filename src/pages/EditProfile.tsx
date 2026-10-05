import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabaseClient';
import { uploadImage } from '@/services/storage';
import Avatar from '@/components/Avatar';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina',
  'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados',
  'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana',
  'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon',
  'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo (Brazzaville)', 'Congo (DR)', 'Costa Rica', "Côte d'Ivoire", 'Croatia', 'Cuba', 'Cyprus',
  'Czechia', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji',
  'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon',
  'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi',
  'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
  'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
  'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
  'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

type AreaFields = {
  country?: string | null;
  state?: string | null;
  lga?: string | null;
  neighborhood?: string | null;
};

const withCurrent = (options: string[], current: string) =>
  current && !options.includes(current) ? [current, ...options] : options;

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

export default function EditProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const { dataSaver } = useSettings();
  const navigate = useNavigate();
  const area = (profile ?? {}) as AreaFields;
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [website, setWebsite] = useState(profile?.website ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [coverUrl, setCoverUrl] = useState(profile?.cover_url ?? '');
  const [country, setCountry] = useState(area.country ?? (area.state ? 'Nigeria' : ''));
  const [stateName, setStateName] = useState(area.state ?? '');
  const [lga, setLga] = useState(area.lga ?? '');
  const [neighborhood, setNeighborhood] = useState(area.neighborhood ?? '');
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [lgaOptions, setLgaOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States / regions for countries other than Nigeria
  useEffect(() => {
    if (!country || country === 'Nigeria') {
      setStateOptions([]);
      return;
    }
    let cancelled = false;
    (supabase as any)
      .from('world_states')
      .select('state')
      .eq('country', country)
      .limit(5000)
      .then(({ data }: { data: { state: string }[] | null }) => {
        if (!cancelled) setStateOptions(uniqueSorted((data ?? []).map((r) => r.state)));
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  // Cities / Local Governments for the chosen state
  useEffect(() => {
    if (!country || !stateName) {
      setLgaOptions([]);
      return;
    }
    let cancelled = false;
    (supabase as any)
      .from('ng_areas')
      .select('lga')
      .eq('country', country)
      .eq('state', stateName)
      .limit(5000)
      .then(({ data }: { data: { lga: string }[] | null }) => {
        if (!cancelled) setLgaOptions(uniqueSorted((data ?? []).map((r) => r.lga)));
      });
    return () => {
      cancelled = true;
    };
  }, [country, stateName]);

  const handleCountryChange = (value: string) => {
    setCountry(value);
    setStateName('');
    setLga('');
  };

  const handleStateChange = (value: string) => {
    setStateName(value);
    setLga('');
  };

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
      setError('Username can only contain lowercase letters, numbers, and underscores (3-20 characters).');
      return;
    }

    setSaving(true);

    // If username changed, check no one else is using it
    if (cleanUsername !== profile?.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .neq('id', user.id)
        .maybeSingle();

      if (existing) {
        setSaving(false);
        setError('This username is already taken. Please choose another.');
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
        country: country.trim() || null,
        state: stateName.trim() || null,
        lga: lga.trim() || null,
        neighborhood: neighborhood.trim() || null,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', user.id);

    setSaving(false);
    if (updateError) {
      if (updateError.code === '23505') {
        setError('This username is already taken. Please choose another.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }
    await refreshProfile();
    navigate('/profile');
  };

  const fieldClass =
    'w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-900';

  const stateList = country === 'Nigeria' ? NIGERIAN_STATES : stateOptions;

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
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className={fieldClass} />

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

        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" maxLength={300} rows={3} className={`${fieldClass} resize-none`} />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className={fieldClass} />
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" className={fieldClass} />
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold">My Area</h2>
        <p className="mb-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ana amfani da wannan wajen nuna maka labaran yankinka. / Used to show you news from your area.
        </p>
        <div className="space-y-3">
          <select value={country} onChange={(e) => handleCountryChange(e.target.value)} className={fieldClass}>
            <option value="">Ƙasa / Country</option>
            {withCurrent(COUNTRIES, country).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {country && (
            <>
              {stateList.length > 0 ? (
                <select value={stateName} onChange={(e) => handleStateChange(e.target.value)} className={fieldClass}>
                  <option value="">Jiha / State or Region</option>
                  {withCurrent(stateList, stateName).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={stateName}
                  onChange={(e) => handleStateChange(e.target.value)}
                  placeholder="Jiha / State or Region"
                  className={fieldClass}
                />
              )}

              {stateName && (
                <>
                  {lgaOptions.length > 0 ? (
                    <select value={lga} onChange={(e) => setLga(e.target.value)} className={fieldClass}>
                      <option value="">Birni ko Ƙaramar hukuma / City or Local Government</option>
                      {withCurrent(lgaOptions, lga).map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={lga}
                      onChange={(e) => setLga(e.target.value)}
                      placeholder="Birni ko Ƙaramar hukuma / City or Local Government"
                      className={fieldClass}
                    />
                  )}

                  <input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Unguwa / Neighborhood"
                    className={fieldClass}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="mt-5 w-full rounded-lg bg-zumra-500 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
  }
