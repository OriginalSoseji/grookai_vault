import type {Metadata} from 'next';
import Link from 'next/link';
import PageContainer from '@/components/layout/PageContainer';
import PageIntro from '@/components/layout/PageIntro';
import ConditionPricingCanary from '@/components/pricing/ConditionPricingCanary';
import {requireFounderAccess} from '@/lib/founder/requireFounderAccess';
import {createServerAdminClient} from '@/lib/supabase/admin';
import {getConditionCanaryCatalogV1} from '@/lib/pricing/conditionCanaryServer';

export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'Condition pricing preview | grookai',robots:{index:false,follow:false}};
export default async function ConditionPricingPreviewPage(){
  await requireFounderAccess('/founder/pricing/conditions');
  const printings=await getConditionCanaryCatalogV1(createServerAdminClient());
  return <PageContainer className="space-y-6 py-8">
    <PageIntro eyebrow="Founder / Pricing" title="Condition pricing preview" description="Dragons Exalted. Switch between governed printings and conditions to inspect the stored source amounts." actions={<Link href="/founder/pricing" className="gv-secondary-button">Back to pricing</Link>}/>
    <section className="space-y-5 rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface-base)] p-5 sm:p-7">
      <p className="text-sm leading-6 text-[var(--gv-text-secondary)]">{printings.length} verified printings are available in this preview. Missing conditions stay unavailable. Source-use and currency checks remain open.</p>
      <ConditionPricingCanary printings={printings}/>
    </section>
  </PageContainer>;
}
