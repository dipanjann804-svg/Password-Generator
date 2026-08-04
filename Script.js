const LC = "abcdefghijklmnopqrstuvwxyz";
const UC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIG = "0123456789";
const PUNC = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
const AMBIGUOUS = /[il1IoO0]/g;

const state = { lc: true, uc: true, dig: true, punc: true, noAmbig: false };
let currentPassword = "";
let isRevealed = true;

const lengthSlider = document.getElementById('lengthSlider');
const lenNum = document.getElementById('lenNum');
const passwordEl = document.getElementById('password');
const genBtn = document.getElementById('genBtn');
const copyBtn = document.getElementById('copyBtn');
const toggleBtn = document.getElementById('toggleBtn');
const toast = document.getElementById('toast');
const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');

const strengthColors = ["#ff5b6a", "#ff5b6a", "#ffc857", "#4fe0a8", "#5fd0ff"];
const strengthNames = ["Weak", "Okay", "Good", "Strong", "Very Strong"];

lengthSlider.addEventListener('input', () => {
  lenNum.textContent = lengthSlider.value;
});

const CORE_KEYS = ['lc', 'uc', 'dig', 'punc'];

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const key = chip.dataset.key;
    if (CORE_KEYS.includes(key)) {
      const activeCount = CORE_KEYS.filter(k => state[k]).length;
      if (state[key] && activeCount === 1) return; // keep at least one set active
    }
    state[key] = !state[key];
    chip.classList.toggle('on', state[key]);
  });
});

function stripAmbiguous(str) {
  return state.noAmbig ? str.replace(AMBIGUOUS, '') : str;
}

function buildPool() {
  let pool = "";
  if (state.lc) pool += stripAmbiguous(LC);
  if (state.uc) pool += stripAmbiguous(UC);
  if (state.dig) pool += stripAmbiguous(DIG);
  if (state.punc) pool += PUNC;
  return pool;
}

// Unbiased random index using rejection sampling over crypto values
function secureRandomIndex(max) {
  const range = 256 - (256 % max);
  const arr = new Uint8Array(1);
  let x;
  do {
    crypto.getRandomValues(arr);
    x = arr[0];
  } while (x >= range);
  return x % max;
}

function generatePassword() {
  const pool = buildPool();
  const len = parseInt(lengthSlider.value, 10);
  if (!pool) return "";

  const activeSets = [];
  if (state.lc) activeSets.push(stripAmbiguous(LC));
  if (state.uc) activeSets.push(stripAmbiguous(UC));
  if (state.dig) activeSets.push(stripAmbiguous(DIG));
  if (state.punc) activeSets.push(PUNC);

  let chars = [];
  if (len >= activeSets.length) {
    activeSets.forEach(set => chars.push(set[secureRandomIndex(set.length)]));
  }
  while (chars.length < len) {
    chars.push(pool[secureRandomIndex(pool.length)]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function strength(password) {
  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 15) score++;
  return Math.max(1, score);
}

function updateStrength(score) {
  const idx = score - 1;
  strengthFill.style.width = ((score / 5) * 100) + '%';
  strengthFill.style.background = strengthColors[idx];
  strengthLabel.textContent = strengthNames[idx];
  strengthLabel.style.color = strengthColors[idx];
}

function resetStrength() {
  strengthFill.style.width = '0%';
  strengthLabel.textContent = '—';
  strengthLabel.style.color = 'var(--ink-dim)';
}

function renderPassword() {
  if (!currentPassword) return;
  passwordEl.textContent = isRevealed ? currentPassword : '•'.repeat(currentPassword.length);
}

function setEyeIcon() {
  toggleBtn.innerHTML = isRevealed
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.4 13.4 0 0 1-3.1 3.9M6.6 6.6C3.6 8.5 1.5 12 1.5 12s3.5 7 10.5 7a10.6 10.6 0 0 0 4.4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  toggleBtn.title = isRevealed ? 'Hide password' : 'Show password';
  toggleBtn.setAttribute('aria-label', toggleBtn.title);
}

function onGenerate() {
  currentPassword = generatePassword();
  isRevealed = true;
  setEyeIcon();
  passwordEl.classList.remove('placeholder');
  renderPassword();
  updateStrength(strength(currentPassword));
}

genBtn.addEventListener('click', onGenerate);

toggleBtn.addEventListener('click', () => {
  if (!currentPassword) return;
  isRevealed = !isRevealed;
  setEyeIcon();
  renderPassword();
});

passwordEl.addEventListener('click', () => {
  if (!currentPassword) return;
  const range = document.createRange();
  range.selectNodeContents(passwordEl);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') onGenerate();
});

copyBtn.addEventListener('click', async () => {
  if (!currentPassword) return;
  try {
    await navigator.clipboard.writeText(currentPassword);
    toast.textContent = "Copied to clipboard";
  } catch (e) {
    toast.textContent = "Copy failed — select manually";
  }
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
});

// ---------- Check Your Own Password ----------

const checkInput = document.getElementById('checkInput');
const checkToggleBtn = document.getElementById('checkToggleBtn');
const checkEyeIcon = document.getElementById('checkEyeIcon');
const checkStrengthFill = document.getElementById('checkStrengthFill');
const checkStrengthLabel = document.getElementById('checkStrengthLabel');
const criteriaList = document.getElementById('criteria');

let checkRevealed = false;

function setCheckEyeIcon() {
  checkToggleBtn.innerHTML = checkRevealed
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.4 13.4 0 0 1-3.1 3.9M6.6 6.6C3.6 8.5 1.5 12 1.5 12s3.5 7 10.5 7a10.6 10.6 0 0 0 4.4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  checkToggleBtn.title = checkRevealed ? 'Hide password' : 'Show password';
  checkToggleBtn.setAttribute('aria-label', checkToggleBtn.title);
  checkInput.type = checkRevealed ? 'text' : 'password';
}

function resetCheckStrength() {
  checkStrengthFill.style.width = '0%';
  checkStrengthFill.style.background = 'var(--ink-dim)';
  checkStrengthLabel.textContent = '—';
  checkStrengthLabel.style.color = 'var(--ink-dim)';
  criteriaList.querySelectorAll('li').forEach(li => li.classList.remove('met'));
}

function updateCriteria(value) {
  const checks = {
    len: value.length >= 12,
    lc: /[a-z]/.test(value),
    uc: /[A-Z]/.test(value),
    dig: /[0-9]/.test(value),
    sym: /[^a-zA-Z0-9]/.test(value)
  };
  criteriaList.querySelectorAll('li').forEach(li => {
    li.classList.toggle('met', !!checks[li.dataset.key]);
  });
  return checks;
}

checkInput.addEventListener('input', () => {
  const value = checkInput.value;
  if (!value) {
    resetCheckStrength();
    return;
  }
  const checks = updateCriteria(value);
  const metCount = Object.values(checks).filter(Boolean).length;
  const score = Math.max(1, Math.min(5, metCount));
  const idx = score - 1;
  checkStrengthFill.style.width = ((score / 5) * 100) + '%';
  checkStrengthFill.style.background = strengthColors[idx];
  checkStrengthLabel.textContent = strengthNames[idx];
  checkStrengthLabel.style.color = strengthColors[idx];
});

checkToggleBtn.addEventListener('click', () => {
  checkRevealed = !checkRevealed;
  setCheckEyeIcon();
  checkInput.focus();
});

setCheckEyeIcon();
resetCheckStrength();

// Starts blank — nothing is generated or filled until the user clicks Generate
resetStrength();
setEyeIcon();



(function () {
  const canvas = document.getElementById('network');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let w, h, nodes;
  const LINK_DIST = 150;
  const NODE_COUNT_DIVISOR = 18000; // higher = fewer nodes

  function viewportSize() {
    // visualViewport reflects the real on-screen area (accounts for
    // mobile address-bar collapse/expand); window.inner* can lag behind it.
    if (window.visualViewport) {
      return { w: window.visualViewport.width, h: window.visualViewport.height };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  }

  let lastW = 0, lastH = 0;
  // Mobile browsers fire resize/scroll events just from the address bar
  // collapsing as you scroll. Those are small height-only changes — treat
  // them as "same size" so the network doesn't reset and jump around.
  const RESIZE_THRESHOLD_W = 40;
  const RESIZE_THRESHOLD_H = 120;

  function resize() {
    const size = viewportSize();
    w = canvas.width = size.w;
    h = canvas.height = size.h;
    canvas.style.width = size.w + 'px';
    canvas.style.height = size.h + 'px';

    const isRealResize =
      !nodes ||
      Math.abs(size.w - lastW) > RESIZE_THRESHOLD_W ||
      Math.abs(size.h - lastH) > RESIZE_THRESHOLD_H;

    if (isRealResize) {
      lastW = size.w;
      lastH = size.h;
      const count = Math.min(90, Math.max(30, Math.floor((w * h) / NODE_COUNT_DIVISOR)));
      nodes = new Array(count).fill(0).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 1.2
      }));
    } else {
      // Keep existing nodes, just make sure none drift outside the
      // (barely) new bounds.
      nodes.forEach(n => {
        n.x = Math.min(n.x, w);
        n.y = Math.min(n.y, h);
      });
    }
  }

  let resizeQueued = false;
  function queueResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resize();
      resizeQueued = false;
    });
  }

  window.addEventListener('resize', queueResize);
  window.addEventListener('orientationchange', queueResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', queueResize);
    window.visualViewport.addEventListener('scroll', queueResize);
  }
  resize();

  function step() {
    ctx.clearRect(0, 0, w, h);

    // move nodes, bounce off edges
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    });

    // draw links
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.35;
          ctx.strokeStyle = `rgba(95, 208, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // draw nodes with glow
    nodes.forEach(n => {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6);
      grad.addColorStop(0, 'rgba(10, 232, 91, 0.9)');
      grad.addColorStop(1, 'rgba(19, 86, 106, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(61, 114, 101, 0.95)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();