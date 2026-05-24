import React from 'react';
import LegalPageShell from '../components/LegalPageShell';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p>
        Zentrya Biz (&quot;we&quot;, &quot;us&quot;) provides point-of-sale and business management software. This
        policy explains how we collect, use, and protect information when you use our website and application.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Account details such as name, email, and shop information you provide during signup.</li>
        <li>Business data you enter (sales, inventory, customers, suppliers) to operate the service.</li>
        <li>Technical data such as device identifiers, browser type, and logs used for security and support.</li>
      </ul>

      <h2>How we use information</h2>
      <p>
        We use your information to provide and improve the service, authenticate users, process subscriptions,
        send security or account-related emails, and respond to support requests.
      </p>

      <h2>Sharing</h2>
      <p>
        We do not sell your personal information. We may share data with infrastructure providers (e.g. hosting,
        payment processors such as Stripe) only as needed to run the service, subject to their policies and our
        agreements.
      </p>

      <h2>Security & retention</h2>
      <p>
        We apply reasonable technical and organizational measures to protect data. We retain information while
        your account is active and as required for legal or operational purposes.
      </p>

      <h2>Your choices</h2>
      <p>
        You may request access, correction, or deletion of account data by contacting us. Some data may be
        retained where required by law or for legitimate business records.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy:{' '}
        <a href="mailto:support@zentryasolutions.com">support@zentryasolutions.com</a>
      </p>
    </LegalPageShell>
  );
}
