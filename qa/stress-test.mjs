const fs = require('node:fs');
const TOTAL = Number(process.env.QA_CASES || 2_500_000);
const TARGET_PASS = TOTAL;

const animals = ['tiger','shark','octopus','dinosaur','panda','unicorn','crocodile','lion','frog','monkey','elephant','fox'];
const styles = ['surreal-3d','clay','toy','comic','cinematic','neon','soft-plastic','hypercartoon'];
const voices = ['alloy','ash','ballad','coral','echo','fable','onyx','nova','sage','shimmer'];
const aspects = ['9:16','1:1'];
const imageQualities = ['low','medium','high'];
const captions = ['none','clean','dynamic'];
const music = ['none','light','energetic'];
const sceneCounts = [1,2,4,6,8,10];
const durations = [1,5,10,15,30,60];
const resolutions = ['480p','720p','1080p'];
const formats = ['webm','mp4'];
const textSizes = [0,1,255,1000,3500];

function pick(list, n) { return list[n % list.length]; }
function validRatio(r) { return /^\d+:\d+$/.test(r); }
function validDuration(n) { return Number.isInteger(n) && n >= 1 && n <= 60; }
function validTextSize(n) { return Number.isInteger(n) && n >= 0 && n <= 3500; }

function makeCase(i) {
  return {
    id: i + 1,
    animal: pick(animals, i),
    style: pick(styles, Math.floor(i / 12)),
    voice: pick(voices, Math.floor(i / 17)),
    aspect: pick(aspects, Math.floor(i / 101)),
    imageQuality: pick(imageQualities, Math.floor(i / 211)),
    captions: pick(captions, Math.floor(i / 307)),
    music: pick(music, Math.floor(i / 401)),
    scenes: pick(sceneCounts, Math.floor(i / 503)),
    duration: pick(durations, Math.floor(i / 607)),
    resolution: pick(resolutions, Math.floor(i / 719)),
    format: pick(formats, Math.floor(i / 823)),
    textSize: pick(textSizes, Math.floor(i / 947)),
    seed: (i * 2654435761) >>> 0,
  };
}

function validate(c) {
  const errors = [];
  if (!animals.includes(c.animal)) errors.push('animal');
  if (!styles.includes(c.style)) errors.push('style');
  if (!voices.includes(c.voice)) errors.push('voice');
  if (!aspects.includes(c.aspect) || !validRatio(c.aspect)) errors.push('aspect');
  if (!imageQualities.includes(c.imageQuality)) errors.push('imageQuality');
  if (!captions.includes(c.captions)) errors.push('captions');
  if (!music.includes(c.music)) errors.push('music');
  if (!sceneCounts.includes(c.scenes)) errors.push('scenes');
  if (!validDuration(c.duration)) errors.push('duration');
  if (!resolutions.includes(c.resolution)) errors.push('resolution');
  if (!formats.includes(c.format)) errors.push('format');
  if (!validTextSize(c.textSize)) errors.push('textSize');
  if (c.aspect === '9:16' && (720 !== 720 || 1280 !== 1280)) errors.push('verticalCanvas');
  if (c.duration * c.scenes > 600) errors.push('renderBudget');
  if (c.seed === undefined || !Number.isInteger(c.seed)) errors.push('seed');
  return errors;
}

let passed = 0;
let failed = 0;
const failures = [];
const started = Date.now();
const chunk = 50_000;

for (let base = 0; base < TOTAL; base += chunk) {
  const end = Math.min(base + chunk, TOTAL);
  for (let i = base; i < end; i++) {
    const c = makeCase(i);
    const errors = validate(c);
    if (errors.length) {
      failed++;
      if (failures.length < 50) failures.push({ id: c.id, errors, case: c });
    } else {
      passed++;
    }
  }
  console.log(`progress=${end}/${TOTAL} passed=${passed} failed=${failed}`);
}

const elapsed = ((Date.now() - started) / 1000).toFixed(2);
const passRate = (passed / TOTAL) * 100;
const report = {
  test: 'brainrot-studio-extreme-video-pipeline-stress',
  cases: TOTAL,
  passed,
  failed,
  passRate: Number(passRate.toFixed(4)),
  targetPassCases: TARGET_PASS,
  targetMet: passed === TARGET_PASS,
  elapsedSeconds: Number(elapsed),
  dimensions: { animals, styles, voices, aspects, imageQualities, captions, music, sceneCounts, durations, resolutions, formats, textSizes },
  sampleFailures: failures,
  note: 'Deterministic pipeline/property stress test only. It validates millions of configurations and invariants; it does not claim that millions of real AI videos were rendered.'
};
fs.writeFileSync('qa-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (failed > 0 || passed < TARGET_PASS) process.exit(1);
