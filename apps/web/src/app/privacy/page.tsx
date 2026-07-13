import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Grookai Vault",
  description:
    "Grookai Vault privacy policy covering accounts, vault data, public profiles, messages, photos, scanner usage, analytics, and support.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Privacy</p>
        <h1 className="text-3xl font-semibold text-slate-950">Privacy Policy</h1>
        <p className="text-sm leading-6 text-slate-600">
          This launch draft explains what Grookai Vault collects and how it is used. It should be reviewed by counsel
          before broad public launch.
        </p>
      </div>

      <div className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-7 text-sm leading-7 text-slate-700 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account information, including email address and account identifiers.</li>
            <li>Collection data, including vault cards, wanted cards, sections, public wall settings, and notes.</li>
            <li>User content, including profile media, card photos, uploaded images, messages, and submissions.</li>
            <li>Device-permission content you choose to provide, such as camera captures or selected photo-library images.</li>
            <li>Approximate or permission-based location signals when you use location-aware collector features.</li>
            <li>Usage, diagnostics, and security data used to operate, protect, and improve the service.</li>
          </ul>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">How We Use Information</h2>
          <p>
            Grookai Vault uses information to provide account access, card search, vault management, public collector
            profiles, messaging, scanner and image workflows, notifications, support, abuse prevention, and product
            analytics.
          </p>
          <p>
            We use operational telemetry to understand whether core flows work, diagnose failures, prevent abuse, and
            improve launch readiness. We do not sell personal information.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">Public Content</h2>
          <p>
            If you enable public profile, Wall, or sharing features, selected collection information and profile
            details may be visible to other users and public web visitors. You can manage public profile and Wall
            settings from your account.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">Service Providers</h2>
          <p>
            Grookai Vault relies on service providers for hosting, authentication, database storage, app distribution,
            analytics, notifications, and diagnostics. These providers process information only as needed to run the
            service.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">Choices and Deletion</h2>
          <p>
            You can request account deletion or partial data deletion from the{" "}
            <a className="font-medium text-slate-950 underline" href="/account/delete">
              Account Deletion
            </a>{" "}
            page. You can also contact support for privacy or data-access questions.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">Contact</h2>
          <p>
            Privacy questions can be sent to{" "}
            <a className="font-medium text-slate-950 underline" href="mailto:support@grookaivault.com">
              support@grookaivault.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
