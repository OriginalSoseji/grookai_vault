import test from 'node:test';
import assert from 'node:assert/strict';
import { bindListingConditionToCopy as bind } from '../../backend/ebay/seller_copy_condition_v1.mjs';

function fixture() {
  return { copy: { is_graded: false, condition_label: 'LP', slab_cert_id: null },
    input: { categoryId: '183454', condition: { conditionId: '4000' } },
    condition: { condition: 'USED_VERY_GOOD', conditionDescription: 'Physical surface wear in photographs.',
      conditionDescriptors: [{ name: '40001', values: ['400015'] }] } };
}
function graded() {
  return { copy: { is_graded: true, grade_company: 'PSA', grade_value: '10',
    slab_cert_id: 'certificate', card_print_id: 'canonical-parent' },
  input: { categoryId: '183454', condition: { conditionId: '2750' } },
  condition: { condition: 'LIKE_NEW', conditionDescription: 'Physical graded copy in photographs.',
    conditionDescriptors: [{ name: '27501', values: ['275010'] },
      { name: '27502', values: ['275020'] }, { name: '27503', additionalInfo: '12345678' }] },
  slabCert: { id: 'certificate', card_print_id: 'canonical-parent', grader: 'PSA',
    grade: 10, cert_number: '12345678', qualifiers: null } };
}
test('each known physical CCG condition matches its official descriptor without rewriting saved condition', () => {
  for (const [label, value] of Object.entries({ NM: '400010', LP: '400015', MP: '400016', HP: '400017' })) {
    const args = fixture(); args.copy.condition_label = label;
    args.condition.conditionDescriptors[0].values = [value];
    const before = structuredClone(args);
    assert.deepEqual(bind(args), args.condition);
    assert.deepEqual(args, before);
  }
});
test('known LP cannot be offered as NM and unknown condition still requires an explicit valid descriptor', () => {
  const args = fixture(); args.condition.conditionDescriptors[0].values = ['400010'];
  assert.throws(() => bind(args), e => e.code === 'listing_copy_condition_mismatch');
  args.copy.condition_label = null;
  assert.equal(bind(args).conditionDescriptors[0].values[0], '400010');
  args.condition.conditionDescriptors = [];
  assert.throws(() => bind(args), e => e.code === 'listing_copy_condition_mismatch');
});
test('a damaged card requires explicit disclosure and cannot silently become Near Mint', () => {
  const args = fixture(); args.copy.condition_label = 'DMG';
  assert.throws(() => bind(args), e => e.code === 'listing_damage_disclosure_required');
  args.condition.conditionDescriptors[0].values = ['400017'];
  args.input.condition.damagedDisclosureConfirmed = true;
  assert.match(bind(args).conditionDescription, /^Damaged card[.]/);
  args.condition.conditionDescription = 'a'.repeat(1000);
  assert.throws(() => bind(args), e => e.code === 'listing_damage_description_too_long');
});
test('graded copy descriptors must match its canonical grader, grade and exact certificate', () => {
  const args = graded();
  assert.deepEqual(bind(args), args.condition);
  for (const [index, value] of [[0, '275013'], [1, '275021']]) {
    const wrong = graded(); wrong.condition.conditionDescriptors[index].values = [value];
    assert.throws(() => bind(wrong), e => e.code === 'listing_copy_grade_mismatch');
  }
  args.condition.conditionDescriptors[2].additionalInfo = 'different-cert';
  assert.throws(() => bind(args), e => e.code === 'listing_copy_certificate_mismatch');
});
test('missing, different or qualified certificates cannot be represented as an ordinary numeric grade', () => {
  for (const change of [v => { v.slabCert = null; }, v => { v.slabCert.id = 'other'; },
    v => { v.slabCert.card_print_id = 'other'; }, v => { v.slabCert.qualifiers = ['OC']; },
    v => { v.slabCert.grade = 9; }]) {
    const args = graded(); change(args);
    assert.throws(() => bind(args), e => e.code === 'listing_certificate_unavailable');
  }
});
test('a certificate cannot be invented for an unregistered graded copy', () => {
  const args = graded(); args.copy.slab_cert_id = null;
  assert.throws(() => bind(args), e => e.code === 'listing_copy_certificate_mismatch');
});
test('unsupported categories and contradictory raw/slab identities fail closed', () => {
  const args = fixture(); args.input.categoryId = 'invented-category';
  assert.throws(() => bind(args), e => e.code === 'listing_copy_condition_unsupported');
  args.input.categoryId = '183454'; args.copy.slab_cert_id = 'certificate';
  assert.throws(() => bind(args), e => e.code === 'listing_copy_grade_mismatch');
});
