// Generates docs/MISSION_DEPENDENCY_MATRIX.md from js/data/missionDependencies.js, so the doc cannot drift.
// Run:  node tools/matrix-doc.mjs        (writes the file)
//   or: tools/matrix-doc.sh              (no Node needed: runs this module in headless Chrome)
// The self-test (js/engine/resources.test.html) fails if the committed doc differs from matrixMarkdown().

import { MISSION_DEPENDENCIES, HONEST_LIMITS } from '../js/data/missionDependencies.js';
import { SCENARIOS } from '../js/data/scenarios.js';
import { itemName } from '../js/engine/dependencies.js';

const cell = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const names = (ids) => (ids?.length ? ids.map((id) => `${itemName(id)} (\`${id}\`)`).join(', ') : '—');

export function matrixMarkdown() {
  const out = [
    '# Mission dependency matrix',
    '',
    '> GENERATED from `js/data/missionDependencies.js` by `tools/matrix-doc.mjs` — do not edit by hand.',
    '> The engine reads the same file: payload, timing, calibration and ground checks (`engine/dependencies.js`),',
    '> the objective verdict (MET / PARTLY / NOT MET), the system map and the "Change:" dependency line.',
    '',
    '- **scope** `mission` = needed for any goal of this mission (engineering GO / NO-GO); `goal` = needed for this goal only (objective verdict).',
    '- **status** required · one_of · conditional (only when a "depends on" item is chosen) · optional (never changes a verdict) · incompatible.',
    '- **checked by**: a physical gate in `engine/validation.js` verifies this rule; the matrix only explains it.',
    '- **evidence level** documented (source says so) · estimate (research model) · assumption.',
    '',
  ];
  for (const sc of SCENARIOS) {
    out.push(`## ${sc.name} (\`${sc.id}\`)`, '');
    for (const lim of HONEST_LIMITS[sc.id] ?? []) out.push(`- Honest limit${lim.variants ? ` (${lim.variants.join(', ')})` : ''}: ${lim.text}`);
    out.push('');
    for (const v of sc.variants) {
      out.push(`### Goal: ${v.label} (\`${v.id}\`)`, '');
      out.push('| Capability | Scope | Status | Satisfied by | Partly by | Depends on | Not a substitute | Why required | Why alternatives | Evidence |');
      out.push('|---|---|---|---|---|---|---|---|---|---|');
      for (const r of MISSION_DEPENDENCIES.filter((x) => x.missionId === sc.id && x.variantId === v.id)) {
        const sub = r.status === 'incompatible' ? `${r.incompatibleWithAsSubstitute.length} items (see whyNotById)` : names(r.incompatibleWithAsSubstitute);
        out.push(`| ${cell(r.capability)} | ${r.scope} | ${r.status}${r.checkedBy ? ` (checked by \`${r.checkedBy}\`)` : ''} | ${cell(names(r.satisfiedBy))} | ${cell(names(r.partialBy))} | ${cell(names(r.dependsOn))} | ${cell(sub)} | ${cell(r.whyRequired)} | ${cell(r.whyAlternatives)} | ${r.evidence.join(', ') || '—'} · ${r.evidenceLevel} |`);
      }
      out.push('');
    }
  }
  return out.join('\n');
}

// Node entry point: write the doc.
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('matrix-doc.mjs')) {
  const { writeFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const target = fileURLToPath(new URL('../docs/MISSION_DEPENDENCY_MATRIX.md', import.meta.url));
  writeFileSync(target, `${matrixMarkdown()}\n`);
  console.log(`wrote ${target}`);
}
