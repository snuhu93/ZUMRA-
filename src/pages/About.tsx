export default function About() {
  return (
    <div className="p-4 text-sm leading-relaxed">
      <h1 className="mb-4 text-lg font-bold text-zumra-600">About ZUMRA</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        ZUMRA is a lightweight social network built to connect, share, and belong -- optimized for
        low-end phones, small storage, and slow or expensive mobile data.
      </p>

      <h2 id="terms" className="mb-2 mt-6 text-base font-semibold">Terms</h2>
      <p className="text-gray-600 dark:text-gray-400">
        By using ZUMRA you agree to treat other members with respect, avoid posting illegal or
        harmful content, and accept that content you post may be viewed by others according to the
        privacy setting you choose. Accounts that violate these terms may be suspended.
      </p>

      <h2 id="privacy" className="mb-2 mt-6 text-base font-semibold">Privacy Policy</h2>
      <p className="text-gray-600 dark:text-gray-400">
        ZUMRA stores your profile, posts, and messages securely using Supabase, protected by
        row-level security so only authorized users can access your data. We do not sell your
        personal information. You can request account deletion at any time from Settings.
      </p>

      <h2 id="help" className="mb-2 mt-6 text-base font-semibold">Help</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Need help? Contact us at zumra.app.support@gmail.com, or check the Settings screen for account, privacy, and data options., or check the Settings screen for account,
        privacy, and data options.
      </p>

      <p className="mt-8 text-center text-xs text-gray-400">Contact: zumra.app.support@gmail.com</p>
    </div>
  );
}
