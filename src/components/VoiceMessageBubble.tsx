import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useChatT } from '@/lib/chatStrings';

type Props = {
  messageId: string;
  audioPath: string;
  myLanguage: string; // en, ha, ig, yo, fr, ar
  isMine: boolean;
};

export default function VoiceMessageBubble({
  messageId,
  audioPath,
  myLanguage,
  isMine
}: Props) {
  const t = useChatT();

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

  // Idan mai amfani ya canja harshen app, a share fassarar da ta gabata
  useEffect(() => {
    setTranslation('');
    setTranscript('');
    setError(false);
  }, [myLanguage]);

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
          {loading ? t('voice.translating') : `🌐 ${t('voice.translate')}`}
        </button>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{t('voice.translateError')}</p>}

      {translation && (
        <div className="mt-2">
          <p className="text-sm font-semibold">{translation}</p>
          {transcript && (
            <details className="mt-1 text-xs opacity-80">
              <summary>{t('voice.original')}</summary>
              <p className="mt-1">{transcript}</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
      }
