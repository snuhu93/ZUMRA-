import { t as globalT, useLang, type Lang } from '@/i18n';

type Dict = Record<string, string>;

const strings: Record<Lang, Dict> = {
  en: {
    'chat.send': 'Send',
    'chat.messagePlaceholder': 'Type a message...',
    'chat.reply': 'Reply',
    'chat.replyingTo': 'Replying to',
    'chat.replyingToMessage': 'Replying to a message',
    'chat.conversation': 'Conversation',
    'voice.record': 'Record voice message',
    'voice.cancel': 'Cancel',
    'voice.send': 'Send voice message',
    'voice.sending': 'Sending...',
    'voice.translate': 'Translate',
    'voice.translating': 'Translating...',
    'voice.original': 'Original text',
    'voice.translateError': 'Translation failed, try again',
    'voice.micDenied': 'Microphone permission was denied.',
    'voice.sendFailed': 'Could not send the voice message. Try again.'
  },
  ha: {
    'chat.send': 'Aika',
    'chat.messagePlaceholder': 'Rubuta saƙo...',
    'chat.reply': 'Amsa',
    'chat.replyingTo': 'Ana amsa wa',
    'chat.replyingToMessage': 'Amsa ga wani saƙo',
    'chat.conversation': 'Tattaunawa',
    'voice.record': 'Naɗa saƙon murya',
    'voice.cancel': 'Soke',
    'voice.send': 'Aika saƙon murya',
    'voice.sending': 'Ana aikawa...',
    'voice.translate': 'Fassara',
    'voice.translating': 'Ana fassarawa...',
    'voice.original': 'Rubutun asali',
    'voice.translateError': 'Fassarar ta gaza, a sake gwadawa',
    'voice.micDenied': 'An hana izinin makirufo.',
    'voice.sendFailed': 'Ba a iya aika saƙon murya ba. A sake gwadawa.'
  },
  ig: {
    'chat.send': 'Zipu',
    'chat.messagePlaceholder': 'Dee ozi...',
    'chat.reply': 'Zaghachi',
    'chat.replyingTo': 'Na-azaghachi',
    'chat.replyingToMessage': 'Na-azaghachi ozi',
    'chat.conversation': 'Mkparịta ụka',
    'voice.record': 'Dekọọ ozi olu',
    'voice.cancel': 'Kagbuo',
    'voice.send': 'Zipu ozi olu',
    'voice.sending': 'Na-ezipụ...',
    'voice.translate': 'Sụgharịa',
    'voice.translating': 'Na-asụgharị...',
    'voice.original': 'Ederede mbụ',
    'voice.translateError': 'Nsụgharị adaghị, nwaa ọzọ',
    'voice.micDenied': 'E jụrụ ikike maịkrofon.',
    'voice.sendFailed': 'Enweghị ike izipu ozi olu. Nwaa ọzọ.'
  },
  yo: {
    'chat.send': 'Fi ránṣẹ́',
    'chat.messagePlaceholder': 'Kọ ìfọ̀rọ̀ránṣẹ́...',
    'chat.reply': 'Fèsì',
    'chat.replyingTo': 'Ń fèsì sí',
    'chat.replyingToMessage': 'Ń fèsì sí ìfọ̀rọ̀ránṣẹ́ kan',
    'chat.conversation': 'Ìjíròrò',
    'voice.record': 'Gba ohùn sílẹ̀',
    'voice.cancel': 'Fagilé',
    'voice.send': 'Fi ohùn ránṣẹ́',
    'voice.sending': 'Ń fi ránṣẹ́...',
    'voice.translate': 'Túmọ̀',
    'voice.translating': 'Ń túmọ̀...',
    'voice.original': 'Ọ̀rọ̀ àtilẹ̀wá',
    'voice.translateError': 'Ìtumọ̀ kùnà, gbìyànjú lẹ́ẹ̀kan sí i',
    'voice.micDenied': 'A kọ̀ ìyọ̀nda gbohungbohun.',
    'voice.sendFailed': 'A kò lè fi ohùn ránṣẹ́. Gbìyànjú lẹ́ẹ̀kan sí i.'
  },
  fr: {
    'chat.send': 'Envoyer',
    'chat.messagePlaceholder': 'Écrivez un message...',
    'chat.reply': 'Répondre',
    'chat.replyingTo': 'Réponse à',
    'chat.replyingToMessage': 'Réponse à un message',
    'chat.conversation': 'Conversation',
    'voice.record': 'Enregistrer un message vocal',
    'voice.cancel': 'Annuler',
    'voice.send': 'Envoyer le message vocal',
    'voice.sending': 'Envoi...',
    'voice.translate': 'Traduire',
    'voice.translating': 'Traduction...',
    'voice.original': 'Texte original',
    'voice.translateError': 'Échec de la traduction, réessayez',
    'voice.micDenied': "L'accès au microphone a été refusé.",
    'voice.sendFailed': "Impossible d'envoyer le message vocal. Réessayez."
  },
  ar: {
    'chat.send': 'إرسال',
    'chat.messagePlaceholder': 'اكتب رسالة...',
    'chat.reply': 'رد',
    'chat.replyingTo': 'الرد على',
    'chat.replyingToMessage': 'الرد على رسالة',
    'chat.conversation': 'محادثة',
    'voice.record': 'تسجيل رسالة صوتية',
    'voice.cancel': 'إلغاء',
    'voice.send': 'إرسال الرسالة الصوتية',
    'voice.sending': 'جارٍ الإرسال...',
    'voice.translate': 'ترجمة',
    'voice.translating': 'جارٍ الترجمة...',
    'voice.original': 'النص الأصلي',
    'voice.translateError': 'فشلت الترجمة، حاول مرة أخرى',
    'voice.micDenied': 'تم رفض إذن الميكروفون.',
    'voice.sendFailed': 'تعذّر إرسال الرسالة الصوتية. حاول مرة أخرى.'
  }
};

// Yana bin harshen app kai tsaye. Maɓallan da babu a nan, yana ɗaukar su daga i18n na asali.
export function useChatT() {
  const lang = useLang();
  return (key: string): string =>
    strings[lang]?.[key] ?? strings.en[key] ?? globalT(key);
    }
