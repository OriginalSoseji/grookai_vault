import type {OfferProposal} from '@/lib/sales/offerPolicies.mjs';
import {money} from '@/lib/sales/salesDesk.mjs';
import s from './OfferSummary.module.css';

// Presentation only. The editor retains quote freshness, review and apply authority.
export default function OfferSummary({suggested, agreed, trade, proposal}: {
    suggested: number; agreed: number | null; trade: boolean; proposal: OfferProposal | null;
}) {
    const unit = trade ? 'for this line' : 'per item';
    const items = proposal?.status === 'available' ? `${proposal.quantity} ${proposal.quantity === 1 ? 'item' : 'items'}` : '';
    return <section className={s.summary} aria-label="Offer comparison">
        <p className={s.suggested}>Suggested {trade ? 'credit' : 'offer'} <strong>${money(suggested)}</strong> {unit}</p>
        <p className={s.agreed}>{agreed === null ? `Enter an agreed ${trade ? 'credit' : 'price'}.` : <>
            Agreed {trade ? 'credit' : 'price'} <strong>${money(agreed)}</strong> {unit}
            {agreed !== suggested && <span>Kept until you apply a suggestion or edit it.</span>}
        </>}</p>
        {proposal?.status === 'available' && <p className={s.reference}>Reference ${money(proposal.referenceMinor)} × {proposal.rateBps / 100}% per item{trade ? ` · ${items}` : ''}{proposal.tierApplied ? ' · Low-value tier' : ''}</p>}
        <details className={s.details}><summary>Calculation details</summary>
            {proposal?.status === 'available' && <>
                <p>{trade ? `${items} · ` : ''}Calculated ${money(proposal.calculatedMinor)} {unit} · round {proposal.rounding.mode === 'down' ? 'down' : 'to nearest'} ${money(proposal.rounding.incrementMinor)}{proposal.tierApplied ? ' · Low-value tier' : ''}</p>
                <p>Calculated value is shown to the nearest cent. The offer rounds the full {trade ? 'line ' : ''}percentage result once.</p>
            </>}
            <p>Changing the reference{trade ? ', quantity' : ''} or policy keeps your agreed {trade ? 'credit' : 'price'}. Use the suggestion only when you agree to it.</p>
        </details>
    </section>;
}
