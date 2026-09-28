import { useSyncExternalStore } from 'react';

export const LANGUAGES = {
  en: 'English',
  ha: 'Hausa',
  fr: 'Français',
  ar: 'العربية',
  yo: 'Yorùbá',
  ig: 'Igbo'
} as const;

export type Lang = keyof typeof LANGUAGES;

const RTL_LANGS: Lang[] = ['ar'];

const translations: Record<Lang, Record<string, string>> = {
  en: {
    tagline: 'Connect. Share. Belong.',
    home: 'Home', login: 'Log in', logout: 'Log out',
    nav_home: 'Home', nav_friends: 'Friends', nav_create: 'Create',
    nav_messages: 'Messages', nav_profile: 'Profile',
    no_posts_yet: 'No posts yet.',
    no_friend_requests: "You don't have any friend requests.",
    no_messages_yet: 'No messages yet.',
    no_notifications_yet: "You don't have any notifications yet.",
    offline_message: "You're offline. Showing previously loaded content.",
    waiting_for_connection: 'Waiting for connection...',
    sent: 'Sent',
    something_went_wrong: 'Something went wrong. Please try again.',
    unstable_connection: 'Your internet connection appears to be unstable.',
    image_upload_failed: 'Image upload failed. Please try again.',
    video_too_large: 'Video is too large.',
    username_taken: 'Username is already taken.',
    uploading: 'Uploading...', sending: 'Sending...', saving: 'Saving...', deleting: 'Deleting...',
    requests: 'Requests', friends: 'Friends', suggested: 'Suggested', loading: 'Loading...',
    accept: 'Accept', reject: 'Reject', add_friend: 'Add Friend', request_sent: 'Request Sent',
    accept_request: 'Accept Request', friends_status: 'Friends ✓',
    no_friends_yet: 'No friends yet.', no_suggestions: 'No suggestions right now.',
    posts: 'Posts', followers: 'Followers', following: 'Following', follow: 'Follow',
    message: 'Message', share: 'Share', report: 'Report', block: 'Block',
    edit_profile: 'Edit Profile', about: 'About', photos: 'Photos', videos: 'Videos',
    no_photos_yet: 'No photos yet.', no_videos_yet: 'No videos yet.',
    profile_not_found: 'Profile not found.', language: 'Language'
  },
  ha: {
    tagline: 'Haɗu. Raba. Kasance.',
    home: 'Gida', login: 'Shiga', logout: 'Fita',
    nav_home: 'Gida', nav_friends: 'Abokai', nav_create: 'Ƙirƙira',
    nav_messages: 'Saƙonni', nav_profile: 'Shafina',
    no_posts_yet: 'Babu wallafa tukuna.',
    no_friend_requests: 'Ba ka da buƙatun abota.',
    no_messages_yet: 'Babu saƙo tukuna.',
    no_notifications_yet: 'Ba ka da sanarwa tukuna.',
    offline_message: 'Ba ka da intanet. Ana nuna abin da aka ɗora a baya.',
    waiting_for_connection: 'Ana jiran haɗin intanet...',
    sent: 'An aika',
    something_went_wrong: 'Wani abu ya faru. Da fatan a sake gwadawa.',
    unstable_connection: 'Intanet ɗinka yana da matsala.',
    image_upload_failed: 'An kasa ɗora hoto. Da fatan a sake gwadawa.',
    video_too_large: 'Bidiyon ya yi girma da yawa.',
    username_taken: 'An riga an ɗauki wannan sunan mai amfani.',
    uploading: 'Ana ɗorawa...', sending: 'Ana aikawa...', saving: 'Ana adanawa...', deleting: 'Ana gogewa...',
    requests: 'Buƙatu', friends: 'Abokai', suggested: 'Shawarwari', loading: 'Ana lodi...',
    accept: 'Amince', reject: 'Ƙi', add_friend: 'Ƙara Aboki', request_sent: 'An aika Buƙata',
    accept_request: 'Amince da Buƙata', friends_status: 'Abokai ✓',
    no_friends_yet: 'Babu abokai tukuna.', no_suggestions: 'Babu shawarwari yanzu.',
    posts: 'Wallafa', followers: 'Masu bi', following: 'Ana bi', follow: 'Bi',
    message: 'Saƙo', share: 'Raba', report: 'Kai ƙara', block: 'Toshe',
    edit_profile: 'Gyara Profile', about: 'Game da', photos: 'Hotuna', videos: 'Bidiyoyi',
    no_photos_yet: 'Babu hotuna tukuna.', no_videos_yet: 'Babu bidiyo tukuna.',
    profile_not_found: 'Ba a sami profile ba.', language: 'Harshe'
  },
  fr: {
    tagline: 'Connectez-vous. Partagez. Appartenez.',
    home: 'Accueil', login: 'Se connecter', logout: 'Se déconnecter',
    nav_home: 'Accueil', nav_friends: 'Amis', nav_create: 'Créer',
    nav_messages: 'Messages', nav_profile: 'Profil',
    no_posts_yet: 'Aucune publication pour le moment.',
    no_friend_requests: "Vous n'avez aucune demande d'ami.",
    no_messages_yet: 'Aucun message pour le moment.',
    no_notifications_yet: "Vous n'avez aucune notification.",
    offline_message: 'Vous êtes hors ligne. Affichage du contenu déjà chargé.',
    waiting_for_connection: 'En attente de connexion...',
    sent: 'Envoyé',
    something_went_wrong: "Une erreur s'est produite. Veuillez réessayer.",
    unstable_connection: 'Votre connexion Internet semble instable.',
    image_upload_failed: "Échec de l'envoi de l'image. Veuillez réessayer.",
    video_too_large: 'La vidéo est trop volumineuse.',
    username_taken: "Ce nom d'utilisateur est déjà pris.",
    uploading: 'Envoi en cours...', sending: 'Envoi...', saving: 'Enregistrement...', deleting: 'Suppression...',
    requests: 'Demandes', friends: 'Amis', suggested: 'Suggestions', loading: 'Chargement...',
    accept: 'Accepter', reject: 'Refuser', add_friend: 'Ajouter', request_sent: 'Demande envoyée',
    accept_request: 'Accepter la demande', friends_status: 'Amis ✓',
    no_friends_yet: "Pas encore d'amis.", no_suggestions: 'Aucune suggestion pour le moment.',
    posts: 'Publications', followers: 'Abonnés', following: 'Abonnements', follow: "S'abonner",
    message: 'Message', share: 'Partager', report: 'Signaler', block: 'Bloquer',
    edit_profile: 'Modifier le profil', about: 'À propos', photos: 'Photos', videos: 'Vidéos',
    no_photos_yet: 'Aucune photo pour le moment.', no_videos_yet: 'Aucune vidéo pour le moment.',
    profile_not_found: 'Profil introuvable.', language: 'Langue'
  },
  ar: {
    tagline: 'تواصل. شارك. انتمِ.',
    home: 'الرئيسية', login: 'تسجيل الدخول', logout: 'تسجيل الخروج',
    nav_home: 'الرئيسية', nav_friends: 'الأصدقاء', nav_create: 'إنشاء',
    nav_messages: 'الرسائل', nav_profile: 'الملف الشخصي',
    no_posts_yet: 'لا توجد منشورات بعد.',
    no_friend_requests: 'ليس لديك طلبات صداقة.',
    no_messages_yet: 'لا توجد رسائل بعد.',
    no_notifications_yet: 'ليس لديك إشعارات بعد.',
    offline_message: 'أنت غير متصل. يتم عرض المحتوى المحمّل سابقًا.',
    waiting_for_connection: 'في انتظار الاتصال...',
    sent: 'تم الإرسال',
    something_went_wrong: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    unstable_connection: 'يبدو أن اتصالك بالإنترنت غير مستقر.',
    image_upload_failed: 'فشل رفع الصورة. يرجى المحاولة مرة أخرى.',
    video_too_large: 'حجم الفيديو كبير جدًا.',
    username_taken: 'اسم المستخدم مستخدم بالفعل.',
    uploading: 'جارٍ الرفع...', sending: 'جارٍ الإرسال...', saving: 'جارٍ الحفظ...', deleting: 'جارٍ الحذف...',
    requests: 'الطلبات', friends: 'الأصدقاء', suggested: 'مقترحون', loading: 'جارٍ التحميل...',
    accept: 'قبول', reject: 'رفض', add_friend: 'إضافة صديق', request_sent: 'تم إرسال الطلب',
    accept_request: 'قبول الطلب', friends_status: 'أصدقاء ✓',
    no_friends_yet: 'لا يوجد أصدقاء بعد.', no_suggestions: 'لا توجد اقتراحات الآن.',
    posts: 'منشورات', followers: 'متابعون', following: 'يتابع', follow: 'متابعة',
    message: 'رسالة', share: 'مشاركة', report: 'إبلاغ', block: 'حظر',
    edit_profile: 'تعديل الملف الشخصي', about: 'نبذة', photos: 'الصور', videos: 'الفيديوهات',
    no_photos_yet: 'لا توجد صور بعد.', no_videos_yet: 'لا توجد فيديوهات بعد.',
    profile_not_found: 'الملف الشخصي غير موجود.', language: 'اللغة'
  },
  yo: {
    tagline: 'Sopọ. Pín. Jẹ́ apá kan.',
    home: 'Ilé', login: 'Wọlé', logout: 'Jáde',
    nav_home: 'Ilé', nav_friends: 'Àwọn Ọ̀rẹ́', nav_create: 'Ṣẹ̀dá',
    nav_messages: 'Àwọn Ìfọ̀rọ̀ránṣẹ́', nav_profile: 'Àkọọ́lẹ̀',
    no_posts_yet: 'Kò tíì sí ìfìwéránṣẹ́ kankan.',
    no_friend_requests: 'O kò ní ìbéèrè ọ̀rẹ́ kankan.',
    no_messages_yet: 'Kò tíì sí ìfọ̀rọ̀ránṣẹ́ kankan.',
    no_notifications_yet: 'O kò tíì ní ìfitónilétí kankan.',
    offline_message: 'O kò sí lórí íńtánẹ́ẹ̀tì. À ń fi àkóónú tí a ti kó jáde tẹ́lẹ̀ hàn.',
    waiting_for_connection: 'Ń dúró de ìsopọ̀...',
    sent: 'Ti fi ránṣẹ́',
    something_went_wrong: 'Nǹkan kan ṣẹlẹ̀. Jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan sí i.',
    unstable_connection: 'Ìsopọ̀ íńtánẹ́ẹ̀tì rẹ dàbí èyí tí kò dúró ṣinṣin.',
    image_upload_failed: 'Gbígbé àwòrán kùnà. Jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan sí i.',
    video_too_large: 'Fídíò náà tóbi jù.',
    username_taken: 'Ẹnìkan ti lo orúkọ olùlò yìí.',
    uploading: 'Ń gbé e sókè...', sending: 'Ń fi ránṣẹ́...', saving: 'Ń fipamọ́...', deleting: 'Ń parẹ́...',
    requests: 'Àwọn Ìbéèrè', friends: 'Àwọn Ọ̀rẹ́', suggested: 'Àbá', loading: 'Ń gbé wá...',
    accept: 'Gbà', reject: 'Kọ̀', add_friend: 'Fi Ọ̀rẹ́ Kún', request_sent: 'Ti Fi Ìbéèrè Ránṣẹ́',
    accept_request: 'Gba Ìbéèrè', friends_status: 'Ọ̀rẹ́ ✓',
    no_friends_yet: 'Kò tíì sí ọ̀rẹ́ kankan.', no_suggestions: 'Kò sí àbá báyìí.',
    posts: 'Àwọn Ìfìwéránṣẹ́', followers: 'Àwọn Olùtẹ̀lé', following: 'Ń Tẹ̀lé', follow: 'Tẹ̀lé',
    message: 'Ìfọ̀rọ̀ránṣẹ́', share: 'Pín', report: 'Ròyìn', block: 'Dí',
    edit_profile: 'Ṣàtúnṣe Àkọọ́lẹ̀', about: 'Nípa', photos: 'Àwọn Fọ́tò', videos: 'Àwọn Fídíò',
    no_photos_yet: 'Kò tíì sí fọ́tò kankan.', no_videos_yet: 'Kò tíì sí fídíò kankan.',
    profile_not_found: 'A kò rí àkọọ́lẹ̀ náà.', language: 'Èdè'
  },
  ig: {
    tagline: 'Jikọọ. Kesaa. Bụrụ nke ọgbakọ.',
    home: 'Ụlọ', login: 'Banye', logout: 'Pụọ',
    nav_home: 'Ụlọ', nav_friends: 'Ndị enyi', nav_create: 'Mepụta',
    nav_messages: 'Ozi', nav_profile: 'Profaịlụ',
    no_posts_yet: 'Enweghị ederede ọ bụla ka.',
    no_friend_requests: 'Ọ nweghị arịrịọ enyi i nwere.',
    no_messages_yet: 'Enweghị ozi ọ bụla ka.',
    no_notifications_yet: 'Ọ nweghị ọkwa i nwere ka.',
    offline_message: 'Ị anọghị n’ịntanetị. Na-egosi ihe e buru na mbụ.',
    waiting_for_connection: 'Na-eche njikọ...',
    sent: 'E zigara',
    something_went_wrong: 'Ihe mere. Biko nwaa ọzọ.',
    unstable_connection: 'Njikọ ịntanetị gị dị ka nke na-adịghị ike.',
    image_upload_failed: 'Ibu foto adaghị. Biko nwaa ọzọ.',
    video_too_large: 'Vidiyo ahụ buru ibu nke ukwuu.',
    username_taken: 'Onye ọzọ ejirila aha njirimara a.',
    uploading: 'Na-ebu...', sending: 'Na-ezipụ...', saving: 'Na-echekwa...', deleting: 'Na-ehichapụ...',
    requests: 'Arịrịọ', friends: 'Ndị enyi', suggested: 'Aro', loading: 'Na-ebu...',
    accept: 'Nabata', reject: 'Jụ', add_friend: 'Tinye Enyi', request_sent: 'E zigara Arịrịọ',
    accept_request: 'Nabata Arịrịọ', friends_status: 'Ndị enyi ✓',
    no_friends_yet: 'Enweghị enyi ka.', no_suggestions: 'Enweghị aro ugbu a.',
    posts: 'Ederede', followers: 'Ndị na-eso', following: 'Na-eso', follow: 'Soro',
    message: 'Ozi', share: 'Kesaa', report: 'Kọọ', block: 'Kpọchie',
    edit_profile: 'Dezie Profaịlụ', about: 'Banyere', photos: 'Foto', videos: 'Vidiyo',
    no_photos_yet: 'Enweghị foto ka.', no_videos_yet: 'Enweghị vidiyo ka.',
    profile_not_found: 'Enweghị profaịlụ hụrụ.', language: 'Asụsụ'
  }
};

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function isLang(value: string | null): value is Lang {
  return !!value && value in LANGUAGES;
}

function applyDirection(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
}

const stored = localStorage.getItem('lang');
let current: Lang = isLang(stored) ? stored : 'en';
applyDirection(current);

export function setLanguage(lang: Lang) {
  current = lang;
  localStorage.setItem('lang', lang);
  applyDirection(lang);
  listeners.forEach((l) => l()); // yana sa duk app ya sake zana kansa
}

export function getLanguage(): Lang {
  return current;
}

export function t(key: string): string {
  return translations[current][key] ?? translations.en[key] ?? key;
}

// Yi amfani da wannan a cikin components don su sake zana kansu idan harshe ya canza
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLanguage);
}

export function useT() {
  useLang();
  return t;
    }
