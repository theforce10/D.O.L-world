import { BRAND } from '@/lib/brand'
import { ContactLine, LegalLayout } from './LegalLayout'

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy policy" updated="31 October 2026">
      <section>
        <p>
          {BRAND} runs karaoke nights. This page explains what we collect when you use this app to join the singing queue, why, and what you
          can do about it.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your email address, and your name and profile photo if you sign in with Google.
          </li>
          <li>
            <strong>Profile:</strong> your full name, phone number and, if you add one, a profile photo.
          </li>
          <li>
            <strong>Songs:</strong> the songs you submit, any note for the host, your queue number and when you sang.
          </li>
          <li>
            <strong>Your marketing choice:</strong> whether you agreed to hear from us, and when.
          </li>
        </ul>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To give you a queue number and tell you when it's your turn.</li>
          <li>So the host can call you to the stage and reach you during the event.</li>
          <li>
            <strong>Only if you agreed:</strong> to tell you about future events and promotions. You can change this any time on your
            profile page.
          </li>
        </ul>
        <p className="mt-2">We don't sell your data and we don't share it with advertisers.</p>
      </section>

      <section>
        <h2>Who can see it</h2>
        <p>
          Other attendees only see queue numbers, never your name or contact details. The event organisers can see your profile and songs so
          they can run the queue. Your profile photo is stored at a link that isn't listed anywhere but could be opened by anyone who has
          it.
        </p>
      </section>

      <section>
        <h2>Services we use</h2>
        <ul>
          <li>
            <strong>Supabase</strong> stores your account, profile and songs (servers in the EU).
          </li>
          <li>
            <strong>Google</strong>, if you choose to sign in with Google.
          </li>
          <li>
            <strong>Resend</strong> sends emails such as sign-up confirmations, password resets and new-song alerts to the organisers.
          </li>
          <li>
            <strong>Vercel</strong> hosts the website.
          </li>
        </ul>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>We keep your account until you ask us to delete it. Song history is kept so organisers can see past events.</p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can see and correct your details on your profile page, and stop marketing messages there at any time. To get a copy of your
          data or have your account deleted, contact <ContactLine />.
        </p>
      </section>
    </LegalLayout>
  )
}
