# DragonTactics Next Improvement Instruction

Date: 2026-06-24

## Goal
Turn the current biggest project issue into a small, executable improvement batch. This file is intentionally scoped so the next worker can start without rereading the whole workspace audit.

## Instructions
1. Make dragon activation the centerpiece: preview expected impact before use and summarize actual result after use.
2. Add three tutorial scenarios focused on timing: early dragon use, delayed dragon use, and missed opportunity.
3. Replace or document any runtime SVG/code-drawn dragon, board, or VFX resources before visual polish work.

## Completion Rules
- Do not include discarded projects in this batch.
- If gameplay, UI, systems, content, controls, build behavior, or project scope changes, update the project planning document and update log before build/release.
- If runtime source changes, run the nearest available validation and then perform the required build/package step from the project instructions.
- If a folder or asset looks ambiguous, document the decision instead of deleting it.

## 2026-06-30 Completion Note
- Completed as v0.4.0: dragon activation preview, actual activation summary, three timing tutorial scenarios, and runtime resource documentation are present.
- Validation rerun in this batch: `npm test` passed 161 tests.
- Build note: this project is a static web/Node server project with no package build script; run `npm start` or `npm run serve` to serve the refreshed source.

## 2026-07-02 Recheck Note

- Re-ran `npm test`; 161 tests passed.
- No new runtime blocker was found in the current automated suite.
- Keep any hold/critical label tied to explicit strategic scope or content-depth concerns, not to an unresolved dragon-feedback regression.
