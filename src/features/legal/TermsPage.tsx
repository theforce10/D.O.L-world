import { Link } from 'react-router'
import { BRAND } from '@/lib/brand'
import { ContactLine, LegalLayout } from './LegalLayout'

export function TermsPage() {
  return (
    <LegalLayout title="Terms of use" updated="31 October 2026">
      <section>
        <p>
          By creating an account you agree to these terms. They are short because the app does one thing: put you in the karaoke queue at{' '}
          {BRAND} events.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Use your real name and a phone number where the host can reach you during the event.</li>
          <li>Keep your password to yourself. You're responsible for songs submitted from your account.</li>
        </ul>
      </section>

      <section>
        <h2>The queue</h2>
        <ul>
          <li>You can have one song in the queue at a time for each event.</li>
          <li>
            Your number is a guide, not a guarantee. The host may reorder, skip or remove songs, for example if you're not there when
            called, the song isn't available, or time runs out.
          </li>
          <li>Song titles and notes must not be offensive. The host may remove anything inappropriate.</li>
        </ul>
      </section>

      <section>
        <h2>Fair use</h2>
        <p>
          Don't try to break the app, get around the queue, or read other people's data. We may suspend accounts that do. The app is
          provided as it is, and we can't promise it will always be available.
        </p>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>
          How we handle your details is explained in our{' '}
          <Link to="/privacy" className="font-semibold text-cyan-soft underline-offset-4 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Changes and questions</h2>
        <p>
          We may update these terms; the date at the top shows the latest version. Questions? Contact <ContactLine />.
        </p>
      </section>
    </LegalLayout>
  )
}
