import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyEvidence } from '../../scripts/audits/verified_master_set_index_v1/agreement_engine/classifier.mjs';
import {
  buildStrictGuardrailOptions,
  enforceStrictGuardrails,
} from '../../scripts/audits/verified_master_set_index_v1/guardrails/strict_guardrails.mjs';
import { resolvePilotSets } from '../../scripts/audits/verified_master_set_index_v1/pilot_sets/defaults.mjs';

test('Ascended Heroes has a source-backed set-specific finish profile', () => {
  const [set] = resolvePilotSets('ascended_heroes');

  assert.equal(set.finish_profile.source_backed, true);
  assert.ok(set.finish_profile.source_url);
  assert.ok(set.finish_profile.focus_finishes.includes('rocket_reverse'));
  assert.ok(set.finish_profile.focus_finishes.includes('pokeball'));
  assert.ok(set.finish_profile.focus_finishes.includes('reverse'));
  assert.equal(set.finish_profile.focus_finishes.includes('masterball'), false);
  assert.ok(set.finish_profile.not_applicable_finishes.includes('masterball'));
  assert.equal(set.finish_profile.expected_parallel_counts.reverse.expected_count, 178);
  assert.equal(set.finish_profile.expected_parallel_counts.pokeball.expected_count, 130);
  assert.equal(set.finish_profile.expected_parallel_counts.rocket_reverse.expected_count, 10);
  assert.equal(set.finish_profile.expected_parallel_counts.masterball.expected_count, 0);
});

test('exact finish truth requires independent source authorities', () => {
  const records = [
    {
      source_key: 'source_one_page_a',
      source_kind: 'marketplace_checklist',
      source_url: 'https://example-checklist.test/cards/a',
      set_key: 'ascended_heroes',
      set_name: 'Ascended Heroes',
      card_number: '001',
      card_name: 'Example Card',
      finish_key: 'reverse',
      evidence_type: 'finish_presence',
      language: 'en',
    },
    {
      source_key: 'source_one_page_b',
      source_kind: 'marketplace_checklist',
      source_url: 'https://example-checklist.test/cards/b',
      set_key: 'ascended_heroes',
      set_name: 'Ascended Heroes',
      card_number: '001',
      card_name: 'Example Card',
      finish_key: 'reverse',
      evidence_type: 'finish_presence',
      language: 'en',
    },
  ];

  const classified = classifyEvidence(records);
  assert.equal(classified.printings.length, 1);
  assert.equal(classified.printings[0].status, 'human_source_verified');
  assert.equal(classified.printings[0].source_count, 1);
});

test('general parallel rules do not promote to exact card-level finish truth', () => {
  const records = [
    {
      source_key: 'rule_source',
      source_kind: 'collector_reference',
      source_url: 'https://collector-reference.test/ascended-heroes',
      set_key: 'ascended_heroes',
      set_name: 'Ascended Heroes',
      card_number: '001',
      card_name: 'Example Card',
      finish_key: 'pokeball',
      evidence_type: 'parallel_rule',
      language: 'en',
    },
  ];

  const classified = classifyEvidence(records);
  assert.equal(classified.printings.length, 0);
  assert.equal(classified.manual_review.length, 1);
  assert.equal(classified.manual_review[0].status, 'needs_manual_review');
});

test('strict guardrails stop not-applicable finish presence', () => {
  const [set] = resolvePilotSets('ascended_heroes');
  const records = [
    {
      source_key: 'bad_masterball_source',
      source_kind: 'collector_reference',
      source_url: 'https://collector-reference.test/bad-masterball',
      set_key: 'ascended_heroes',
      set_name: 'Ascended Heroes',
      card_number: '001',
      card_name: 'Example Card',
      finish_key: 'masterball',
      evidence_type: 'finish_presence',
      language: 'en',
    },
  ];
  const classified = classifyEvidence(records);

  assert.throws(
    () => enforceStrictGuardrails({
      records,
      classified,
      setConfigs: [set],
      options: buildStrictGuardrailOptions({ strictGuardrails: true }),
    }),
    /not-applicable finish masterball/,
  );
});

test('strict guardrails enforce expected finish counts for controlled batches', () => {
  const [set] = resolvePilotSets('ascended_heroes');
  const records = [
    {
      source_key: 'source_a',
      source_kind: 'collector_reference',
      source_url: 'https://source-a.test/card',
      set_key: 'ascended_heroes',
      set_name: 'Ascended Heroes',
      card_number: '001',
      card_name: 'Example Card',
      finish_key: 'pokeball',
      evidence_type: 'finish_presence',
      language: 'en',
    },
    {
      source_key: 'source_b',
      source_kind: 'marketplace_checklist',
      source_url: 'https://source-b.test/card',
      set_key: 'ascended_heroes',
      set_name: 'Ascended Heroes',
      card_number: '001',
      card_name: 'Example Card',
      finish_key: 'pokeball',
      evidence_type: 'finish_presence',
      language: 'en',
    },
  ];
  const classified = classifyEvidence(records);

  assert.throws(
    () => enforceStrictGuardrails({
      records,
      classified,
      setConfigs: [set],
      options: buildStrictGuardrailOptions({
        strictGuardrails: true,
        expectFinishCounts: 'pokeball=2',
      }),
    }),
    /Poke Ball expected master_verified count 2, found 1/,
  );
});
