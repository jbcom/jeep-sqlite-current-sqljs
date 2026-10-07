import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(new URL(path, `file://${root}`), 'utf8');
const requireText = (text, expected, name) => {
  if (!text.includes(expected)) throw new Error(`${name} must include: ${expected}`);
};
const forbidText = (text, unexpected, name) => {
  if (text.includes(unexpected)) throw new Error(`${name} must not include: ${unexpected}`);
};

const release = read('.github/workflows/release.yml');
requireText(release, "if: vars.RELEASE_AUTOMATION_ENABLED == 'true'", 'Release workflow');
forbidText(release, 'if: false', 'Release workflow');

const cd = read('.github/workflows/cd.yml');
for (const expected of [
  "vars.RELEASE_AUTOMATION_ENABLED == 'true' && github.event.workflow_run.name == 'CI' &&",
  "vars.RELEASE_AUTOMATION_ENABLED == 'true' && github.event.workflow_run.name == 'Release' &&",
  "github.event.workflow_run.conclusion == 'success'",
]) {
  requireText(cd, expected, 'CD workflow');
}
forbidText(cd, 'if: false', 'CD workflow');

const automerge = read('.github/workflows/automerge.yml');
for (const expected of [
  'types: [opened, synchronize, reopened, ready_for_review, labeled]',
  "vars.RELEASE_AUTOMATION_ENABLED == 'true' &&",
  'github.event.pull_request.draft == false',
  "github.event.pull_request.base.ref == 'main'",
  'github.event.pull_request.head.repo.full_name == github.repository',
  "github.event.pull_request.user.login == 'jbdevprimary'",
  "github.event.pull_request.head.ref == 'release-please--branches--main--components--jeep-sqlite-current-sqljs'",
  "startsWith(github.event.pull_request.title, 'chore(main): release ')",
  "contains(github.event.pull_request.labels.*.name, 'autorelease: pending')",
  "contains(github.event.pull_request.body, 'This PR was generated with [Release Please]')",
  "github.event.pull_request.user.login == 'dependabot[bot]'",
]) {
  requireText(automerge, expected, 'Automerge workflow');
}
forbidText(automerge, 'if: false', 'Automerge workflow');
forbidText(automerge, '\n      false &&', 'Automerge workflow');

const permitsReleasePlease = ({ author, sameRepository, branch, title, labels, body }) =>
  author === 'jbdevprimary' &&
  sameRepository &&
  branch === 'release-please--branches--main--components--jeep-sqlite-current-sqljs' &&
  title.startsWith('chore(main): release ') &&
  labels.includes('autorelease: pending') &&
  body.includes('This PR was generated with [Release Please]');
const trustedReleasePlease = {
  author: 'jbdevprimary',
  sameRepository: true,
  branch: 'release-please--branches--main--components--jeep-sqlite-current-sqljs',
  title: 'chore(main): release 2.9.1',
  labels: ['autorelease: pending'],
  body: ':robot: This PR was generated with [Release Please]',
};
if (!permitsReleasePlease(trustedReleasePlease)) {
  throw new Error('Automerge workflow must admit the trusted Release Please identity');
}
if (permitsReleasePlease({ ...trustedReleasePlease, author: 'untrusted-contributor' })) {
  throw new Error('Automerge workflow must reject an untrusted Release Please actor');
}

const ruleset = read('scripts/apply-branch-ruleset.mjs');
requireText(ruleset, 'rulesets?includes_parents=false', 'Ruleset script');
requireText(ruleset, "ruleset.source_type === 'Repository'", 'Ruleset script');
requireText(ruleset, 'node $' + '{process.argv[1]}', 'Ruleset script');
