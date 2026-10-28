import { EbaySellerApiError } from './seller_client_v1.mjs';

const text = (value, fallback) => typeof value === 'string' && value.trim() ? value : fallback;
const amount = value => value && typeof value.currency === 'string'
  && typeof value.value === 'string' && /^\d+(?:\.\d{1,2})?$/.test(value.value)
  ? `${value.currency} ${value.value}` : null;

// Human review labels are frozen beside the exact payload, never reconstructed
// from newer metadata after the collector has reviewed an unpublished offer.
export function sellerReviewDetails({ input, evidence, condition }) {
  const definition = evidence.conditionChoices.find(v => v.conditionId === input.condition.conditionId);
  if (!definition) throw new EbaySellerApiError('listing_condition_invalid');
  const descriptors = (condition.conditionDescriptors ?? []).map(selected => {
    const descriptor = definition.conditionDescriptors.find(v => v.conditionDescriptorId === selected.name);
    return { name: text(descriptor.conditionDescriptorName, selected.name),
      values: selected.additionalInfo !== undefined ? [selected.additionalInfo] : selected.values.map(id =>
        text(descriptor.conditionDescriptorValues.find(v => v.conditionDescriptorValueId === id)?.conditionDescriptorValueName, id)) };
  });
  const policies = Object.fromEntries(['fulfillment', 'payment', 'return'].map(kind => {
    const policy = evidence.policies[kind].find(v => v[kind + 'PolicyId'] === input.policies[kind]);
    const terms = [];
    if (kind === 'fulfillment') {
      for (const option of policy.shippingOptions ?? []) for (const service of option.shippingServices ?? []) {
        const cost = service.freeShipping === true ? 'Free shipping to the buyer'
          : option.costType === 'CALCULATED' ? 'Shipping calculated by eBay'
          : amount(service.shippingCost) ?? 'Shipping charge follows your eBay policy';
        terms.push([text(option.optionType, ''), text(service.shippingServiceCode, ''), cost].filter(Boolean).join(' · '));
      }
      if (policy.handlingTime?.value && policy.handlingTime.unit) terms.push(`Handling: ${policy.handlingTime.value} ${String(policy.handlingTime.unit).toLowerCase()}`);
    }
    if (kind === 'return') {
      if (policy.returnsAccepted === false) terms.push('Returns not accepted under this policy');
      if (policy.returnsAccepted === true) {
        terms.push(policy.returnPeriod?.value && policy.returnPeriod.unit
          ? `Returns accepted: ${policy.returnPeriod.value} ${String(policy.returnPeriod.unit).toLowerCase()}` : 'Returns accepted');
        if (policy.returnShippingCostPayer) terms.push(`Return shipping paid by ${String(policy.returnShippingCostPayer).toLowerCase()}`);
      }
    }
    return [kind, { name: text(policy.name, text(policy.description, kind + ' policy')), terms }];
  }));
  return { condition: text(definition.conditionDescription, input.condition.conditionId === '2750' ? 'Graded' : 'Ungraded'),
    conditionDescription: condition.conditionDescription, descriptors, policies,
    aspects: input.aspects };
}
