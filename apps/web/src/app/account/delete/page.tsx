import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Deletion | Grookai Vault",
  description:
    "How Grookai Vault users can request account deletion and deletion of associated account data.",
};

export default function AccountDeletionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Account Data</p>
        <h1 className="text-3xl font-semibold text-slate-950">Account Deletion</h1>
        <p className="text-sm leading-6 text-slate-600">
          Grookai Vault users can request deletion of their account and associated account data at any time.
        </p>
      </div>

      <div className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-7 text-sm leading-7 text-slate-700 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Request Account Deletion</h2>
          <p>
            To request deletion, email{" "}
            <a className="font-medium text-slate-950 underline" href="mailto:support@grookaivault.com">
              support@grookaivault.com
            </a>{" "}
            from the email address associated with your Grookai Vault account. Use the subject line
            &quot;Account deletion request&quot; and include your Grookai username or profile link if available.
          </p>
          <p>
            We may ask you to confirm ownership of the account before processing the request. Once verified, we will
            delete or anonymize account data associated with your Grookai Vault account within 30 days unless a longer
            retention period is required for security, fraud prevention, legal compliance, or dispute resolution.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">Data Deleted</h2>
          <p>Account deletion generally includes deletion or anonymization of:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account profile information, including email-linked account identity.</li>
            <li>Saved collection, vault, wishlist, and ownership records tied to your account.</li>
            <li>Public profile and collection pages controlled by your account.</li>
            <li>User-submitted notes, organization settings, and app preferences tied to your account.</li>
          </ul>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">Data That May Be Retained</h2>
          <p>
            Some limited records may be retained when necessary for security, fraud prevention, abuse prevention,
            legal compliance, backup integrity, or financial/accounting obligations. Retained records are limited to
            what is necessary for those purposes and are removed or anonymized when no longer needed.
          </p>
          <p>
            Public catalog data, Grookai card IDs, card metadata, and language-agnostic card identity information are
            part of Grookai Vault&apos;s public catalog and are not user account data.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">Partial Data Deletion</h2>
          <p>
            You may also request deletion of some user data without deleting your entire account by emailing{" "}
            <a className="font-medium text-slate-950 underline" href="mailto:support@grookaivault.com">
              support@grookaivault.com
            </a>{" "}
            with the specific data you want removed.
          </p>
        </section>
      </div>
    </div>
  );
}
