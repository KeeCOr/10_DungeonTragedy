import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const vdf = fs.readFileSync(new URL('../steam/app_build.vdf', import.meta.url), 'utf8');

test('release: package.json and package-lock.json stay in 1.0.1 lockstep', () => {
  assert.equal(pkg.version, '1.0.1');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
});

test('release: portable build artifact name is version-qualified', () => {
  const winTargets = pkg.build.win.target.map((t) => t.target);
  assert.ok(winTargets.includes('portable'), 'win.target must include a portable build');
  assert.equal(pkg.build.portable.artifactName, 'DragonTactics_v${version}_portable.exe');

  const resolvedName = pkg.build.portable.artifactName.replace('${version}', pkg.version);
  assert.equal(resolvedName, `DragonTactics_v${pkg.version}_portable.exe`);
  assert.match(resolvedName, /^DragonTactics_v\d+\.\d+\.\d+_portable\.exe$/);
});

test('release: Steam app_build.vdf describes v1.0.1 with the expected depot config', () => {
  assert.match(vdf, /"Desc"\s+"Dragon Tactics v1\.0\.1"/);
  assert.match(vdf, /"AppID"\s+"REPLACE_WITH_REAL_APP_ID"/);
  assert.match(vdf, /"BuildOutput"\s+"\.\.\/\.\.\/steamcmd_output\/"/);
  assert.match(vdf, /"Depots"/);
  assert.match(vdf, /"FileMapping"/);
  assert.match(vdf, /"recursive"\s+"1"/);
  assert.match(vdf, /"FileExclusion"\s+"node_modules\\\*"/);
  assert.match(vdf, /"FileExclusion"\s+"\.git\\\*"/);
});
