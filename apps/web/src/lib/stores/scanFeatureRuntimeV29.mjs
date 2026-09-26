import fs from 'node:fs';
import { createRequire } from 'node:module';
import { FEATURE_CONTRACT_V28 as contract, featureHashV28 as hash } from './scanReferenceFeaturesV28.mjs';
export async function loadFeatureRuntimeV29() {
  const require = createRequire(import.meta.url), sharp = require('sharp');
  const fail = () => { throw new Error('Reference preparation runtime mismatch.'); };
  if (hash(fs.readFileSync(require.resolve('@techstark/opencv-js'))) !== contract.opencvSha256
    || require('@techstark/opencv-js/package.json').version !== contract.opencv) fail();
  for (const key of ['sharp', 'vips', 'webp', 'mozjpeg']) if (sharp.versions[key] !== contract[key]) fail();
  for (const version of [16, 19]) if (hash(fs.readFileSync(new URL(`./scanGeometryV${version}.mjs`, import.meta.url))) !== contract[`prepare${version}`]) fail();
  const cv = require('@techstark/opencv-js');
  if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; });
  // Emscripten exposes a then() on this object. Returning it directly from an
  // async function causes Promise assimilation instead of returning the runtime.
  return { cv };
}
