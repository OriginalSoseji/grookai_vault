import type { Metadata } from "next";
import InformationPage from "@/components/layout/InformationPage";

export const metadata: Metadata = {
  title: "Support | Grookai Vault",
  description: "Contact Grookai Vault support for account help, data issues, safety reports, and launch feedback.",
};

export default function SupportPage() {
  return (
    <InformationPage
      eyebrow="Support"
      title="Support"
      description="Use this page for account questions, card-data issues, safety reports, and product problems."
    >
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

        <section>
          <h2 className="text-lg font-semibold text-slate-950">What To Include</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Account help: your account email and what you were trying to do.</li>
            <li>Card data issue: the card name, set, card number, and Grookai URL if available.</li>
            <li>Safety report: the profile, message, card, Wall item, or listing involved.</li>
            <li>Bug report: device, browser or app version, and screenshots if useful.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-950">Account Deletion</h2>
          <p>
            Account deletion requests are handled on the{" "}
            <a className="font-medium text-slate-950 underline" href="/account/delete">
              Account Deletion
            </a>{" "}
            page.
          </p>
        </section>
    </InformationPage>
  );
}
