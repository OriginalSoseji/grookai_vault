import { p10 } from './utils.ts'

Deno.test('p10 guard: <5 uses min', () => {
  const a = [10, 20, 30]
  if (p10(a) !== 10) throw new Error('expected min for <5 samples')
})

Deno.test('p10 computes approx 10th percentile', () => {
  const a = [1,2,3,4,5,6,7,8,9,10]
  const v = p10(a)
  if (v == null || v > 2) throw new Error('unexpected p10 value')
})

