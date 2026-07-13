import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | Grookai Vault",
  description: "Contact Grookai Vault support for account help, data issues, safety reports, and launch feedback.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Support</p>
        <h1 className="text-3xl font-semibold text-slate-950">Support</h1>
        <p className="text-sm leading-6 text-slate-600">
          Use this page for launch support, account questions, card-data issues, and safety reports.
        </p>
      </div>

      <div className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-7 text-sm leading-7 text-slate-700 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Contact Support</h2>
          <p>
            Email{" "}
            <a className="font-medium text-slate-950 underline" href="mailto:support@grookaivault.com">
              support@grookaivault.com
            </a>{" "}
            with a short description of the issue and the email address or profile link connected to your account.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">What To Include</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account help: your account email and what you were trying to do.</li>
            <li>Card data issue: the card name, set, card number, and Grookai URL if available.</li>
            <li>Safety report: the profile, message, card, Wall item, or listing involved.</li>
            <li>Bug report: device, browser or app version, and screenshots if useful.</li>
          </ul>
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h2 className="text-lg font-semibold text-slate-950">Account Deletion</h2>
          <p>
            Account deletion requests are handled on the{" "}
            <a className="font-medium text-slate-950 underline" href="/account/delete">
              Account Deletion
            </a>{" "}
            page.
          </p>
        </section>
      </div>
    </div>
  );
}
