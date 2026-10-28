import { EbaySellerApiError } from './seller_client_v1.mjs';

// Official descriptor IDs; live Metadata must still admit every selected value.
export const descriptorSource = 'https://developer.ebay.com/api-docs/user-guides/static/mip-user-guide/mip-enum-condition-descriptor-ids.html';
const raw = Object.freeze({ NM: '400010', LP: '400015', MP: '400016', HP: '400017' });
const graders = Object.freeze({ PSA: '275010', BCCG: '275011', BVG: '275012',
  BGS: '275013', CSG: '275014', CGC: '275015', SGC: '275016', KSA: '275017',
  GMA: '275018', HGA: '275019', ISA: '2750110', PCA: '2750111', GSG: '2750112',
  PGS: '2750113', MNT: '2750114', TAG: '2750115', RARE: '2750116', RCG: '2750117',
  PCG: '2750118', ACE: '2750119', CGA: '2750120', TCG: '2750121', ARK: '2750122' });
const grades = Object.freeze(Object.fromEntries(Array.from({ length: 19 }, (_, index) =>
  [String(10 - index / 2), '27502' + index])));
const fail = code => { throw new EbaySellerApiError(code); };
const singleValue = (descriptors, name) => {
  const value = descriptors.find(d => d.name === name);
  return value?.values?.length === 1 ? value.values[0] : null;
};

export function suggestedCopyCondition({ copy, choices, slabCert }) {
  const conditionId = copy.is_graded ? '2750' : '4000';
  const definition = choices.find(v => v.conditionId === conditionId);
  if (!definition) fail('listing_copy_condition_unsupported');
  const descriptors = [];
  const add = (id, value) => {
    if (value && definition.conditionDescriptors?.find(d => d.conditionDescriptorId === id)
      ?.conditionDescriptorValues?.some(v => v.conditionDescriptorValueId === value)) {
      descriptors.push({ id, values: [value] });
    }
  };
  if (copy.is_graded) {
    add('27501', graders[String(copy.grade_company ?? '').trim().toUpperCase()]);
    add('27502', grades[String(copy.grade_value ?? '').trim()]);
    if (copy.slab_cert_id && slabCert?.id === copy.slab_cert_id
        && definition.conditionDescriptors?.some(d => d.conditionDescriptorId === '27503')) {
      descriptors.push({ id: '27503', additionalInfo: slabCert.cert_number });
    }
  } else if (Object.hasOwn(raw, copy.condition_label)) {
    add('40001', raw[copy.condition_label]);
  }
  return { conditionId, descriptors, description: '', damagedDisclosureConfirmed: false };
}

// Invoked after live provider constraints have validated the descriptors. This
// second check binds their meaning to the canonical saved copy and certificate.
export function bindListingConditionToCopy({ copy, input, condition, slabCert }) {
  if (input.categoryId !== '183454' || typeof copy.is_graded !== 'boolean') {
    fail('listing_copy_condition_unsupported');
  }
  const descriptors = condition.conditionDescriptors ?? [];
  if (!copy.is_graded) {
    if (copy.slab_cert_id) fail('listing_copy_grade_mismatch');
    if (input.condition.conditionId !== '4000' || condition.condition !== 'USED_VERY_GOOD') fail('listing_copy_condition_mismatch');
    const selected = singleValue(descriptors, '40001');
    if (!Object.values(raw).includes(selected)) fail('listing_copy_condition_mismatch');
    const known = copy.condition_label;
    if (known !== null && known !== undefined && known !== 'DMG'
        && (!Object.hasOwn(raw, known) || raw[known] !== selected)) fail('listing_copy_condition_mismatch');
    if (known === 'DMG') {
      // eBay CCG has no separate Damaged descriptor. A collector must explicitly
      // acknowledge disclosure under its lowest condition; never silently map.
      if (selected !== raw.HP || input.condition.damagedDisclosureConfirmed !== true) fail('listing_damage_disclosure_required');
      const description = 'Damaged card. ' + condition.conditionDescription;
      if (description.length > 1000) fail('listing_damage_description_too_long');
      return { ...condition, conditionDescription: description };
    }
    return condition;
  }
  const grader = String(copy.grade_company ?? '').trim().toUpperCase();
  const grade = String(copy.grade_value ?? '').trim();
  if (input.condition.conditionId !== '2750' || condition.condition !== 'LIKE_NEW'
      || !graders[grader] || !grades[grade]
      || singleValue(descriptors, '27501') !== graders[grader]
      || singleValue(descriptors, '27502') !== grades[grade]) fail('listing_copy_grade_mismatch');
  if (copy.slab_cert_id) {
    if (!slabCert || slabCert.id !== copy.slab_cert_id || slabCert.card_print_id !== copy.card_print_id
        || String(slabCert.grader).trim().toUpperCase() !== grader
        || String(slabCert.grade) !== grade || slabCert.qualifiers?.length
        || typeof slabCert.cert_number !== 'string' || !slabCert.cert_number.trim()) fail('listing_certificate_unavailable');
    const certification = descriptors.find(d => d.name === '27503');
    if (certification?.additionalInfo !== slabCert.cert_number) fail('listing_copy_certificate_mismatch');
  } else if (descriptors.some(d => d.name === '27503')) {
    fail('listing_copy_certificate_mismatch');
  }
  return condition;
}
