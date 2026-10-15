import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="mx-auto max-w-2xl p-4 text-sm leading-relaxed">
      <Link to="/" className="mb-4 inline-block text-xs text-zumra-600">
        ‹ Back to ZUMRA
      </Link>

      <h1 className="mb-4 text-lg font-bold text-zumra-600">About ZUMRA</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        ZUMRA is a lightweight social network built to connect, share, and belong -- optimized for
        low-end phones, small storage, and slow or expensive mobile data.
      </p>

      <h2 id="terms" className="mb-2 mt-6 text-base font-semibold">Terms</h2>
      <p className="text-gray-600 dark:text-gray-400">
        By using ZUMRA you agree to treat other members with respect, avoid posting illegal or
        harmful content, and accept that content you post may be viewed by others according to the
        privacy setting you choose. Accounts that violate these terms may be suspended. You can
        report content or users from inside the app, and block users from Settings.
      </p>

      <h2 id="privacy" className="mb-2 mt-6 text-base font-semibold">Privacy Policy</h2>
      <p className="mb-3 text-xs text-gray-400">Last updated: October 2026</p>

      <h3 className="mb-1 mt-3 font-semibold">Information we collect</h3>
      <ul className="list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
        <li>Account details: email address, username, and password (stored securely by our authentication provider).</li>
        <li>Profile details you choose to add: display name, photo, bio, and your state, local government area, and ward.</li>
        <li>Content you create: posts, photos, short videos, statuses, comments, and messages.</li>
        <li>Social activity: friends, follows, likes, saves, blocks, and reports you submit.</li>
        <li>Microphone audio, only when you join or host an Open Talk room or record Radio, and only after you allow microphone access on your device.</li>
      </ul>

      <h3 className="mb-1 mt-4 font-semibold">How we use it</h3>
      <p className="text-gray-600 dark:text-gray-400">
        To run the app, show your content to the people allowed by your privacy setting, send
        account emails (such as confirmation and password reset), and keep the community safe.
        We do not sell your personal information and we do not show third-party advertising.
      </p>

      <h3 className="mb-1 mt-4 font-semibold">Service providers</h3>
      <p className="text-gray-600 dark:text-gray-400">
        We use Supabase to store accounts, content, and files (protected by row-level security so
        only authorized users can access your data), LiveKit to power live audio rooms, and Brevo
        to deliver account emails. These providers process data only to provide their service to us.
      </p>

      <h3 className="mb-1 mt-4 font-semibold">Your choices and data deletion</h3>
      <p className="text-gray-600 dark:text-gray-400">
        You can edit or delete your posts, change who can see them, and block other users at any
        time. You can delete your account from Settings, which removes your account and content.
        You can also email us to request deletion or a copy of your data.
      </p>

      <h3 className="mb-1 mt-4 font-semibold">Children</h3>
      <p className="text-gray-600 dark:text-gray-400">
        ZUMRA is not intended for children under 13, and we do not knowingly collect their
        information.
      </p>

      <h2 id="help" className="mb-2 mt-6 text-base font-semibold">Help</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Need help? Contact us at zumra.app.support@gmail.com, or check the Settings screen for
        account, privacy, and data options.
      </p>

      <p className="mt-8 text-center text-xs text-gray-400">Contact: zumra.app.support@gmail.com</p>
    </div>
  );
        }
