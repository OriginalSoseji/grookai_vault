import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';

const API_KEY = (process.env.JUSTTCG_API_KEY ?? '').trim();
const BASE_URL = (process.env.JUSTTCG_API_BASE_URL || 'https://api.justtcg.com/v1')
  .trim()
  .replace(/\/+$/, '');

const SAMPLE_LIMIT = 20;
const SEARCH_LIMIT = 5;
const REQUEST_DELAY_MS = 250;

if (!API_KEY) {
  console.error('❌ Missing JUSTTCG_API_KEY in env');
  process.exit(1);
}

if (typeof fetch !== 'function') {
  console.error('❌ Global fetch unavailable; use Node 18+');
  process.exit(1);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  if (!value) return '';

  return String(value)
    .toUpperCase()
    .split('/')
    .map(part => part.replace(/^0+(\d)/, '$1'))
    .join('/')
    .split('/')[0]
    .trim();
}

function getSetName(record) {
  const setRecord = Array.isArray(record?.set) ? record.set[0] : record?.set;
  return typeof setRecord?.name === 'string' ? setRecord.name.trim() : '';
}

function getCandidateSetLabel(candidate) {
  if (typeof candidate?.set_name === 'string' && candidate.set_name.trim()) {
    return candidate.set_name.trim();
  }

  if (typeof candidate?.set === 'string' && candidate.set.trim()) {
    return candidate.set.trim();
  }

  if (candidate?.set && typeof candidate.set === 'object') {
    if (typeof candidate.set.name === 'string' && candidate.set.name.trim()) {
      return candidate.set.name.trim();
    }

    if (typeof candidate.set.code === 'string' && candidate.set.code.trim()) {
      return candidate.set.code.trim();
    }

    if (typeof candidate.set.id === 'string' && candidate.set.id.trim()) {
      return candidate.set.id.trim();
    }
  }

  return '';
}

async function parseJsonSafely(res) {
  const text = await res.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function loadSampleCards() {
  const supabase = createBackendClient();
  const { data, error } = await supabase
    .from('card_prints')
    .select('id,name,set_code,number_plain,set:sets(name)')
    .order('created_at', { ascending: false })
    .limit(SAMPLE_LIMIT);

  if (error) {
    throw new Error(`[justtcg-mapping-dryrun] sample query failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? '',
    setCode: row.set_code ?? '',
    setName: getSetName(row),
    numberPlain: row.number_plain ?? '',
  }));
}

async function fetchCandidates(cardName) {
  const params = new URLSearchParams({
    q: cardName,
    game: 'pokemon',
    limit: String(SEARCH_LIMIT),
  });

  const res = await fetch(`${BASE_URL}/cards?${params.toString()}`, {
    method: 'GET',
    headers: {
      'x-api-key': API_KEY,
      Accept: 'application/json',
    },
  });

  const payload = await parseJsonSafely(res);

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error:
        payload?.error ||
        payload?.message ||
        `JustTCG request failed with status ${res.status}`,
      candidates: [],
    };
  }

  const candidates = Array.isArray(payload?.data)
    ? payload.data
    : payload?.data
      ? [payload.data]
      : [];

  return {
    ok: true,
    status: res.status,
    error: null,
    candidates,
  };
}

function evaluateCandidates(card, candidates) {
  const targetName = normalizeText(card.name);
  const targetSetCode = normalizeText(card.setCode);
  const targetSetName = normalizeText(card.setName);
  const targetNumber = normalizeNumber(card.numberPlain);

  const prefilteredCandidates = candidates.filter((candidate) => {
    const candidateNumber = normalizeNumber(candidate?.number);
    return targetNumber && candidateNumber === targetNumber;
  });

  const candidatesToEvaluate =
    prefilteredCandidates.length > 0 ? prefilteredCandidates : candidates;

  const decorated = candidatesToEvaluate.map((candidate) => {
    const candidateName = normalizeText(candidate?.name);
    const candidateSet = normalizeText(getCandidateSetLabel(candidate));
    const candidateNumber = normalizeNumber(candidate?.number);

    const nameMatch = candidateName === targetName;
    const setMatch =
      Boolean(candidateSet) &&
      (
        candidateSet === targetSetName ||
        candidateSet === targetSetCode ||
        candidateSet.replace(/\s+/g, '') === targetSetName.replace(/\s+/g, '') ||
        candidateSet.replace(/\s+/g, '') === targetSetCode.replace(/\s+/g, '')
      );
    const numberMatch = Boolean(targetNumber) && candidateNumber === targetNumber;

    return {
      candidate,
      nameMatch,
      setMatch,
      numberMatch,
      fullMatch: nameMatch && setMatch && numberMatch,
    };
  });

  const fullMatches = decorated.filter((item) => item.fullMatch);

  if (fullMatches.length === 1) {
    return {
      result: 'PASS',
      matchedCandidate: fullMatches[0].candidate,
      prefilteredCandidateCount: prefilteredCandidates.length,
      reason: 'Exactly one candidate satisfied normalized name equality plus set and number match.',
    };
  }

  if (fullMatches.length > 1) {
    return {
      result: 'AMBIGUOUS',
      matchedCandidate: null,
      prefilteredCandidateCount: prefilteredCandidates.length,
      reason: `Multiple candidates satisfied normalized name equality plus set and number match (${fullMatches.length}).`,
    };
  }

  const nameMatches = decorated.filter((item) => item.nameMatch).length;
  const setMatches = decorated.filter((item) => item.setMatch).length;
  const numberMatches = decorated.filter((item) => item.numberMatch).length;

  if (decorated.length === 0) {
    return {
      result: 'FAIL',
      matchedCandidate: null,
      prefilteredCandidateCount: prefilteredCandidates.length,
      reason: 'No candidates returned from JustTCG.',
    };
  }

  return {
    result: 'FAIL',
    matchedCandidate: null,
    prefilteredCandidateCount: prefilteredCandidates.length,
    reason: `No candidate satisfied the full rule (name_matches=${nameMatches}, set_matches=${setMatches}, number_matches=${numberMatches}).`,
  };
}

function logCardResult(card, outcome, candidateCount) {
  console.log('\nCARD:');
  console.log(`${card.id} | ${card.name} | ${card.setCode} | ${card.numberPlain}`);
  console.log('\nRESULT:');
  console.log(outcome.result);
  console.log('\nDETAIL:');
  console.log(`- candidates returned: ${candidateCount}`);
  console.log(`- matched candidate: ${outcome.matchedCandidate?.id ?? 'null'}`);
  console.log(`- reason: ${outcome.reason}`);
}

async function main() {
  const summary = {
    total: 0,
    pass: 0,
    fail: 0,
    ambiguous: 0,
  };

  let cards = [];
  try {
    cards = await loadSampleCards();
  } catch (error) {
    console.error('❌ Failed to load sample cards:', error);
    process.exit(1);
  }

  if (cards.length === 0) {
    console.log('SUMMARY:');
    console.log('total: 0');
    console.log('pass: 0');
    console.log('fail: 0');
    console.log('ambiguous: 0');
    return;
  }

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    summary.total += 1;

    try {
      const apiResult = await fetchCandidates(card.name);

      if (!apiResult.ok) {
        summary.fail += 1;
        logCardResult(
          card,
          {
            result: 'FAIL',
            matchedCandidate: null,
            reason: `API error (${apiResult.status}): ${apiResult.error}`,
          },
          0,
        );
      } else {
        const outcome = evaluateCandidates(card, apiResult.candidates);
        if (outcome.result === 'PASS') {
          summary.pass += 1;
        } else if (outcome.result === 'AMBIGUOUS') {
          summary.ambiguous += 1;
        } else {
          summary.fail += 1;
        }

        if (outcome.prefilteredCandidateCount > 0) {
          console.log(`- prefilter reduced candidates: ${apiResult.candidates.length} → ${outcome.prefilteredCandidateCount}`);
        }

        logCardResult(card, outcome, apiResult.candidates.length);
      }
    } catch (error) {
      summary.fail += 1;
      logCardResult(
        card,
        {
          result: 'FAIL',
          matchedCandidate: null,
          reason: `Unhandled request error: ${error instanceof Error ? error.message : String(error)}`,
        },
        0,
      );
    }

    if (index < cards.length - 1) {
      await delay(REQUEST_DELAY_MS);
    }
  }

  console.log('\nSUMMARY:');
  console.log(`total: ${summary.total}`);
  console.log(`pass: ${summary.pass}`);
  console.log(`fail: ${summary.fail}`);
  console.log(`ambiguous: ${summary.ambiguous}`);
}

main().catch((error) => {
  console.error('❌ Unhandled dry-run failure:', error);
  process.exit(1);
});
