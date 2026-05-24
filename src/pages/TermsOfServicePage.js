import React from 'react';
import LegalPageShell from '../components/LegalPageShell';

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p>
        By accessing or using Zentrya Biz, you agree to these Terms of Service. If you do not agree, do not use
        the service.
      </p>

      <h2>Service</h2>
      <p>
        Zentrya Biz provides cloud-based software for billing, inventory, reporting, and related shop operations.
        Features and availability may change as we improve the product.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for keeping your login credentials secure and for activity under your account. You
        must provide accurate registration information and comply with applicable laws when using the service.
      </p>

      <h2>Subscriptions & trials</h2>
      <p>
        Paid plans and free trials are described on our pricing page. Fees, renewal terms, and cancellation rules
        shown at checkout or in your account apply to your subscription.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You may not misuse the service, attempt unauthorized access, interfere with other users, or use the
        platform for unlawful purposes. We may suspend accounts that violate these terms.
      </p>

      <h2>Data & availability</h2>
      <p>
        You retain ownership of business data you enter. We strive for reliable uptime but do not guarantee
        uninterrupted service. Maintain your own backups for critical records where appropriate.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, Zentrya Biz is provided &quot;as is&quot; and we are not liable for
        indirect or consequential damages arising from use of the service.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about these terms:{' '}
        <a href="mailto:support@zentryasolutions.com">support@zentryasolutions.com</a>
      </p>
    </LegalPageShell>
  );
}
