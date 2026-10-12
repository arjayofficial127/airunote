// Local-only browser fixtures. Every API request is fulfilled here; no backend is contacted.
const fs = require('fs'),
  path = require('path'),
  assert = require('assert');
const { chromium } = require('playwright');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    f,
  );
const {
  creatorAppearance,
  plainAppearance,
  legacyAppearance,
  holidayAppearance,
} = require('../../../backend-node/src/modules/exam-appearance/contract.ts');
const out = path.resolve(
  __dirname,
  '../../../docs/admin-ux-proposal/implementation-qa',
);
fs.mkdirSync(out, { recursive: true });
const org = '11111111-1111-4111-8111-111111111111',
  id = '22222222-2222-4222-8222-222222222222',
  section = '33333333-3333-4333-8333-333333333333';
const now = '2026-10-12T01:00:00.000Z';
let exam = {
  id,
  orgId: org,
  title: '386 - FY27 HOLIDAY PROMOTION',
  description:
    'Complete instructions remain visible. Read each question carefully and select the correct answer.',
  status: 'draft',
  publicId: 'local-admin-review',
  durationMinutes: 15,
  oneQuestionAtATime: true,
  preventFocusLoss: true,
  maxAttempts: 3,
  reviewMode: 'respondent_answers',
  shuffleQuestions: true,
  shuffleOptions: true,
  requireEmail: false,
  requireIdentifier: true,
  startsAt: null,
  endsAt: null,
  archivedAt: null,
  archivedByUserId: null,
  createdAt: now,
  updatedAt: now,
  attemptCount: 0,
  sections: [
    {
      id: section,
      title: 'Knowledge',
      description: null,
      position: 0,
      pinned: false,
    },
  ],
  questions: [
    'single_choice',
    'multiple_choice',
    'true_false',
    'short_text',
    'date',
  ].map((type, i) => ({
    id: `44444444-4444-4444-8444-44444444444${i}`,
    examId: id,
    sectionId: section,
    type,
    prompt: `Question ${i + 1}: ${type.replaceAll('_', ' ')} with a detailed prompt`,
    explanation: null,
    position: i,
    required: true,
    graded: false,
    points: 1,
    pinned: false,
    maxTimeSeconds: null,
    correctAnswers: [],
    options: type.includes('choice')
      ? [
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            label: 'Option A',
            position: 0,
          },
          {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            label: 'Option B',
            position: 1,
          },
        ]
      : [],
  })),
};
let appearance = {
  config: structuredClone(creatorAppearance),
  templateId: null,
  revision: 1,
};
let templates = [
  {
    id: 'theme1',
    name: 'Wrapped in Joy',
    config: structuredClone(holidayAppearance),
    revision: 1,
    archivedAt: null,
  },
];
let defaultTemplateId = null;
let failSave = false;
let failAppearance = false;
let mutations = [];
let unknown = new Set();
const respondent = {
  id: 'attempt1',
  respondentName: 'Jordan Lee',
  respondentEmail: 'jordan@example.test',
  respondentIdentifier: '10235',
  attemptNumber: 1,
  status: 'terminated',
  classification: 'focus_terminated',
  terminationReason: 'focus_loss',
  focusViolationCount: 1,
  startedAt: now,
  completedAt: null,
  endedAt: now,
  lastActiveAt: now,
  timeInExamSeconds: 242,
  remainingSeconds: 658,
  active: false,
  needsAdmin: true,
  eligibleForContinue: true,
  activeQuestionId: null,
  earnedPoints: 1,
  possiblePoints: 5,
  percentage: 20,
  scoreIsProvisional: true,
  answers: {},
  isPreview: false,
  previewedByEmail: null,
  previewedByRole: null,
  voidedAt: null,
  voidReason: null,
};
const report = () => ({
  exam,
  generatedAt: now,
  summary: {
    totalAttempts: 1,
    completed: 0,
    inProgress: 0,
    terminated: 1,
    needsAdmin: 1,
    activeNow: 0,
    inactiveStale: 0,
    timedOut: 0,
    voided: 0,
    previews: 0,
  },
  respondents: [respondent],
  questionPerformance: exam.questions.map((q) => ({
    questionId: q.id,
    prompt: q.prompt,
    graded: q.graded,
    points: q.points,
    answeredCount: 1,
    skippedCount: 0,
    correctCount: 0,
    incorrectCount: 1,
    averageResponseSeconds: 24,
    correctPercentage: 0,
    correctRespondents: [],
    incorrectRespondents: [{ id: 'attempt1', name: 'Jordan Lee' }],
    optionPerformance: q.options.map((o) => ({
      optionId: o.id,
      label: o.label,
      selectedCount: 1,
      selectedPercentage: 50,
      correct: false,
      respondents: [],
    })),
  })),
  recentEvents: [],
});
async function main() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await context.addCookies([
    {
      name: 'airunote_accessToken',
      value: 'local-fixture-only',
      domain: 'localhost',
      path: '/',
    },
  ]);
  await context.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (!url.pathname.startsWith('/api/')) {
      if (url.hostname === 'localhost') return route.continue();
      return route.abort();
    }
    const p = url.pathname.replace(/^\/api/, '');
    const method = req.method();
    if (method === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    let data = [];
    let status = 200;
    let body;
    try {
      body = req.postDataJSON();
    } catch {}
    if (method !== 'GET') mutations.push({ path: p, method });
    if (p === '/auth/me' || p === '/auth/me/full')
      data = {
        id: 'local-user',
        name: 'Local Admin',
        email: 'admin@example.test',
      };
    else if (p === '/orgs')
      data = [
        {
          id: org,
          name: 'Local QA workspace',
          slug: 'local-qa',
          description: null,
          isActive: true,
          createdAt: now,
          roles: ['admin'],
          plan: 'free',
        },
      ];
    else if (p === '/orgs/limit') data = { isSuperAdmin: false };
    else if (p.endsWith('/exams/settings'))
      data = {
        journeyMode: 'exam_first',
        visibleTopLevelApps: ['exams', 'airunote'],
      };
    else if (p.endsWith('/appearance/templates')) {
      if (method === 'POST') {
        const t = {
          id: 'theme' + (templates.length + 1),
          ...body,
          revision: 1,
          archivedAt: null,
        };
        templates.push(t);
        data = t;
      } else data = { templates, defaultTemplateId };
    } else if (p.endsWith('/appearance/default')) {
      defaultTemplateId = body.templateId;
      data = {};
    } else if (p.includes('/appearance/exams/')) {
      if (method === 'PUT') {
        if (failAppearance) {
          status = 409;
          data = null;
        } else appearance = { ...body, revision: appearance.revision + 1 };
      }
      data = appearance;
    } else if (p.endsWith('/access-code'))
      data =
        method === 'GET'
          ? { enabled: false }
          : {
              code: body.enabled ? '12345678' : null,
              path: '/exam/local-admin-review',
            };
    else if (p.endsWith('/preview-code'))
      data = {
        code: body.enabled ? '87654321' : null,
        path: '/exam/preview/local-admin-review',
      };
    else if (p.endsWith('/report')) data = report();
    else if (p.endsWith('/continue'))
      data = { path: '/exam/continue/local-token' };
    else if (p.endsWith('/void')) {
      respondent.classification = 'void';
      respondent.voidReason = body.reason;
      data = {};
    } else if (p.endsWith('/definition')) {
      if (failSave) {
        status = 400;
      } else {
        exam = {
          ...exam,
          ...body,
          questions: body.questions.map((q, i) => ({
            ...q,
            id: q.id || `q${i}`,
            examId: id,
            sectionId: q.sectionId || null,
            options: (q.options || []).map((o, j) => ({
              ...o,
              id: o.id || o.key || `option${j}`,
              position: j,
            })),
          })),
          sections: (body.sections || []).map((s, i) => ({
            ...s,
            id: s.id || s.key || `s${i}`,
          })),
        };
      }
      data = exam;
    } else if (p.endsWith('/exams')) data = [exam];
    else if (p.endsWith(`/exams/${id}`)) {
      if (method === 'PATCH') exam = { ...exam, ...body };
      data = exam;
    } else if (p.endsWith('/files/capabilities'))
      data = { uploadsAvailable: false, maxBytes: 10485760, types: [] };
    else if (
      p.endsWith('/files') ||
      p.endsWith('/files/cleanup') ||
      p.endsWith('/posts') ||
      p.endsWith('/collections')
    )
      data = [];
    else if (p.endsWith('/usage'))
      data = {
        plan: 'free',
        documents: { used: 1, limit: 100, remaining: 99 },
        folders: { used: 1, limit: 100, remaining: 99 },
      };
    else if (p.includes('/apps')) data = [];
    else {
      unknown.add(p);
      data = {};
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(
        status >= 400
          ? { success: false, error: { message: 'Fixture save rejection' } }
          : { success: true, data },
      ),
    });
  });
  const page = await context.newPage();
  global.qapage = page;
  global.qamutations = mutations;
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:3000/orgs/${org}/exams`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('heading', { name: 'Exams', exact: true }).waitFor();
  console.log('Library ready');
  await page.screenshot({
    animations: 'disabled',
    path: path.join(out, 'library-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('searchbox').fill('not-a-match');
  await page.getByRole('heading', { name: 'No matching exams' }).waitFor();
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  await page.getByRole('link', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Setup', exact: true }).waitFor();
  console.log('Builder ready');
  await page
    .getByLabel('Title', { exact: true })
    .fill('Local review changed title');
  await page
    .getByRole('button', { name: 'Questions (5)', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'All questions', exact: true })
    .click();
  assert.equal(
    await page.getByRole('textbox', { name: /Question \d+ prompt/ }).count(),
    5,
  );
  await page.getByRole('button', { name: 'JSON pro', exact: true }).click();
  const json = page.getByRole('textbox', { name: 'Exam JSON' });
  const original = await json.inputValue();
  await json.fill('{ invalid json');
  await page.getByRole('button', { name: 'Setup', exact: true }).click();
  await page.getByRole('button', { name: 'JSON pro', exact: true }).click();
  assert.equal(await json.inputValue(), '{ invalid json');
  await page
    .getByRole('button', { name: 'Apply to draft', exact: true })
    .click();
  await page.getByText(/JSON was not applied/).waitFor();
  await page
    .getByRole('button', { name: 'Reload from draft', exact: true })
    .click();
  await json.fill(
    original.replace('Local review changed title', 'Applied JSON title'),
  );
  await page
    .getByRole('button', { name: 'Apply to draft', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Save exam', exact: true })
    .first()
    .click();
  await page
    .getByText('Exam saved. Reports use the latest grading rules.')
    .waitFor();
  console.log('Draft/JSON save passed');
  await page.getByRole('button', { name: 'Setup', exact: true }).click();
  await page
    .getByRole('button', { name: 'Timing & attempts', exact: true })
    .click();
  await page
    .getByLabel('Attempt limit', { exact: true })
    .selectOption('unlimited');
  await page
    .getByRole('button', { name: 'Save exam', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByRole('button', { name: 'Opening', exact: true }).click();
  await page.getByLabel('Text below the button').fill('Local helper edit');
  await page.getByRole('button', { name: 'Setup', exact: true }).click();
  await page.getByRole('link', { name: 'All exams', exact: false }).click();
  await page.getByRole('dialog', { name: 'Leave without saving?' }).waitFor();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  assert.equal(
    await page.getByLabel('Text below the button').inputValue(),
    'Local helper edit',
  );
  await page
    .getByRole('button', { name: 'Save appearance', exact: true })
    .first()
    .click();
  await page.getByText(/Appearance saved. New attempts/).waitFor();
  console.log('Appearance/navigation passed');
  const qa = [];
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of [
      'Setup',
      'Questions (5)',
      'Appearance',
      'Share & access',
      'JSON pro',
    ]) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      if (tab === 'Appearance') {
        await page
          .getByRole('button', { name: 'Edit', exact: true })
          .click()
          .catch(() => {});
      }
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      qa.push({ tab, ...metrics });
      if (width === 390 || width === 1440)
        await page.screenshot({
          animations: 'disabled',
          path: path.join(out, `${tab.replace(/[^a-z]/gi, '-')}-${width}.png`),
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page
    .getByLabel('Preview screen', { exact: true })
    .selectOption('questions');
  await page.screenshot({
    animations: 'disabled',
    path: path.join(out, 'preview-question-desktop.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Share & access', exact: true })
    .click();
  await page.getByRole('button', { name: /Examiner code · Off/ }).click();
  await page
    .getByRole('button', { name: 'Generate code', exact: true })
    .click();
  await page.getByText('12345678', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  console.log('Code dialog passed');
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await page
    .getByRole('button', { name: 'Live attempts', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'Copy continue link', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Generate & copy continue link', exact: true })
    .click();
  await page.getByLabel('Generated continuation link').waitFor();
  assert.equal(mutations.filter((x) => x.path.endsWith('/continue')).length, 1);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page
    .getByRole('button', { name: 'Void & allow retake', exact: true })
    .click();
  await page
    .getByLabel('Reason', { exact: true })
    .fill('Local fixture interruption');
  await page
    .getByRole('button', { name: 'Confirm void & allow retake' })
    .click();
  await page.getByText(/Attempt voided. History retained/).waitFor();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  console.log('Report recovery passed');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of [
      'Live attempts',
      'Answer matrix',
      'Question analytics',
    ]) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      qa.push({
        tab,
        ...(await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }))),
      });
      if (width === 390 || width === 1440)
        await page.screenshot({
          animations: 'disabled',
          path: path.join(out, `${tab.replaceAll(' ', '-')}-${width}.png`),
          fullPage: true,
        });
    }
  }
  await page
    .getByRole('button', { name: 'Switch to dark admin theme' })
    .click();
  console.log(
    'Dark surfaces',
    await page.locator('.admin-report-stat').evaluateAll((nodes) =>
      nodes.map((n) => ({
        class: n.className,
        bg: getComputedStyle(n).backgroundColor,
        image: getComputedStyle(n).backgroundImage,
        panel: getComputedStyle(n).getPropertyValue('--admin-panel'),
      })),
    ),
  );
  await page.screenshot({
    animations: 'disabled',
    path: path.join(out, 'report-dark.png'),
    fullPage: true,
  });
  for (const route of ['exam-templates', 'files']) {
    await page.goto(`http://localhost:3000/orgs/${org}/${route}`, {
      waitUntil: 'networkidle',
    });
    await page.screenshot({
      animations: 'disabled',
      path: path.join(out, `${route}-dark.png`),
      fullPage: true,
    });
  }
  fs.writeFileSync(
    path.join(out, 'results.json'),
    JSON.stringify({ qa, errors, unknown: [...unknown], mutations }, null, 2),
  );
  console.log(
    JSON.stringify({
      checks: qa.length,
      overflow: qa.filter((x) => x.scroll > x.width),
      errors,
      unknown: [...unknown],
    }),
  );
  await browser.close();
}
main().catch(async (e) => {
  console.error(e);
  if (global.qapage) {
    console.log(
      (await global.qapage.locator('body').innerText()).slice(0, 7000),
    );
    await global.qapage.screenshot({
      animations: 'disabled',
      path: path.join(out, 'failure.png'),
      fullPage: true,
    });
  }
  console.log(global.qamutations);
  process.exit(1);
});
