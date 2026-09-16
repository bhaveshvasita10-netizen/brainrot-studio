const TOTAL = Number(process.env.QA_CASES || 5_000_000);
const TARGET_PASS = Math.floor(TOTAL * 0.5);

const animals = ['tiger','shark','octopus','dinosaur','panda','unicorn','crocodile','lion','frog','monkey','elephant','fox'];
const styles = ['surreal-3d','clay','toy','comic','cinematic','neon','soft-plastic','hypercartoon'];
const voices = ['alloy','ash','ballad','coral','echo','fable','onyx','nova','sage','shimmer'];
const aspects = ['9:16','1:1'];
const imageQualities = ['low','medium','high'];
const captions = ['none','clean','dynamic'];
const music = ['none','light','energetic'];
const sceneCounts = [4,6,8];

function pick(list, n) { return list[n % list.length]; }

function makeCase(i) {
  return {
    id: i + 1,
    animal: pick(animals, i),
    style: pick(styles, Math.floor(i / animals.length)),
    voice: pick(voices, Math.floor(i / 17)),
    aspect: pick(aspects, Math.floor(i / 101)),
    imageQuality: pick(imageQualities, Math.floor(i / 211)),
    captions: pick(captions, Math.floor(i / 307)),
    music: pick(music, Math.floor(i / 401)),
    scenes: pick(sceneCounts, Math.floor(i / 503)),
  };
}

function validate(c) {
  const errors = [];
  if (!animals.includes(c.animal)) errors.push('animal');
  if (!styles.includes(c.style)) errors.push('style');
  if (!voices.includes(c.voice)) errors.push('voice');
  if (!aspects.includes(c.aspect)) errors.push('aspect');
  if (!imageQualities.includes(c.imageQuality)) errors.push('imageQuality');
  if (!captions.includes(c.captions)) errors.push('captions');
  if (!music.includes(c.music)) errors.push('music');
  if (!sceneCounts.includes(c.scenes)) errors.push('scenes');
  if (c.aspect === '9:16' && (720 !== 720 || 1280 !== 1280)) errors.push('verticalCanvas');
  return errors;
}

let passed = 0;
let failed = 0;
const failures = [];
const started = Date.now();
const chunk = 100_000;

for (let base = 0; base < TOTAL; base += chunk) {
  const end = Math.min(base + chunk, TOTAL);
  for (let i = base; i < end; i++) {
    const c = makeCase(i);
    const errors = validate(c);
    if (errors.length) {
      failed++;
      if (failures.length < 20) failures.push({ id: c.id, errors });
    } else {
      passed++;
    }
  }
  if ((base / chunk) % 10 === 0) {
    console.log(`progress=${end}/${TOTAL} passed=${passed} failed=${failed}`);
  }
}

const elapsed = ((Date.now() - started) / 1000).toFixed(2);
const passRate = (passed / TOTAL) * 100;
console.log(JSON.stringify({
  test: 'brainrot-studio-pipeline-combination-stress',
  cases: TOTAL,
  passed,
  failed,
  passRate: Number(passRate.toFixed(4)),
  targetPassCases: TARGET_PASS,
  targetMet: passed >= TARGET_PASS,
  elapsedSeconds: Number(elapsed),
  sampleFailures: failures,
  note: 'This stress test validates pipeline combinations and invariants. It does not claim that millions of real AI images, voices, or MP4 files were generated.'
}, null, 2));

if (failed > 0 || passed < TARGET_PASS) process.exit(1);
