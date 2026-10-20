import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useChatT } from '@/lib/chatStrings';

type Props = {
  messageId: string;
  content: string;
  myLanguage: string; // en, ha, ig, yo, fr, ar
  isMine: boolean;
};

export default function TextMessageBubble({
  messageId,
  content,
  myLanguage,
  isMine
}: Props) {
  const t = useChatT();

  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState('');
  const [error, setError] = useState(false);

  // Idan mai amfani ya canja harshen app, a share fassarar da ta gabata
  useEffect(() => {
    setTranslation('');
    setError(false);
  }, [myLanguage, messageId]);

  const translate = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'text-translate',
        { body: { messageId, targetLang: myLanguage } }
      );
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setTranslation(data.translation ?? '');
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p>{content}</p>

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
        <div className="mt-2 border-t border-current/20 pt-2">
          <p className="text-sm font-semibold">{translation}</p>
          <button
            onClick={() => setTranslation('')}
            className="mt-1 text-xs underline opacity-70"
          >
            {t('voice.original')}
          </button>
        </div>
      )}
    </div>
  );
    }
