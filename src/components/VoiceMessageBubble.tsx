import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  messageId: string;
  audioPath: string;
  myLanguage: string; // en, ha, ig, yo, fr, ar
  isMine: boolean;
};

// Kalmomi kaɗan a harsunan 6 (daga baya za a iya mayar da su cikin i18n)
const TEXTS: Record<
  string,
  { translate: string; translating: string; original: string; error: string }
> = {
  en: {
    translate: 'Translate',
    translating: 'Translating...',
    original: 'Original text',
    error: 'Translation failed, try again',
  },
  ha: {
    translate: 'Fassara',
    translating: 'Ana fassarawa...',
    original: 'Rubutun asali',
    error: 'Fassarar ta gaza, a sake gwadawa',
  },
  ig: {
    translate: 'Sụgharịa',
    translating: 'Na-asụgharị...',
    original: 'Ederede mbụ',
    error: 'Nsụgharị adaghị, nwaa ọzọ',
  },
  yo: {
    translate: 'Túmọ̀',
    translating: 'Ń túmọ̀...',
    original: 'Ọ̀rọ̀ àtilẹ̀wá',
    error: 'Ìtumọ̀ kùnà, tún gbìyànjú',
  },
  fr: {
    translate: 'Traduire',
    translating: 'Traduction...',
    original: 'Texte original',
    error: 'Échec de la traduction, réessayez',
  },
  ar: {
    translate: 'ترجمة',
    translating: 'جارٍ الترجمة...',
    original: 'النص الأصلي',
    error: 'فشلت الترجمة، حاول مرة أخرى',
  },
};

export default function VoiceMessageBubble({
  messageId,
  audioPath,
  myLanguage,
  isMine,
}: Props) {
  const txt = TEXTS[myLanguage] ?? TEXTS.en;

  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.storage
      .from('voice-messages')
      .createSignedUrl(audioPath, 3600)
      .then(({ data }) => {
        if (active && data?.signedUrl) setAudioUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [audioPath]);

  const translate = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'voice-translate',
        { body: { messageId, targetLang: myLanguage } }
      );
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setTranscript(data.transcript ?? '');
      setTranslation(data.translation ?? '');
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-w-[200px]">
      {audioUrl ? (
        <audio src={audioUrl} controls className="h-10 w-full" />
      ) : (
        <p className="text-xs opacity-70">🎤 ...</p>
      )}

      {!isMine && !translation && (
        <button
          onClick={translate}
          disabled={loading}
          className="mt-2 rounded-full border border-current px-3 py-1 text-xs font-semibold opacity-80"
        >
          {loading ? txt.translating : `🌐 ${txt.translate}`}
        </button>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{txt.error}</p>}

      {translation && (
        <div className="mt-2">
          <p className="text-sm font-semibold">{translation}</p>
          {transcript && (
            <details className="mt-1 text-xs opacity-80">
              <summary>{txt.original}</summary>
              <p className="mt-1">{transcript}</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
  }
