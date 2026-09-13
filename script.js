// ---------- Python logic bridge (Pyodide) ----------

// (UI wiring, DOM updates, the background animation) stays in this file.
let pythonReady = false;
let pythonFailed = false;

const pyodideReady = (async () => {
  try {
    const pyodide = await loadPyodide();
    const code = await (await fetch('logic.py')).text();
    await pyodide.runPythonAsync(code);
    pythonReady = true;
    return pyodide;
  } catch (err) {
    pythonFailed = true;
    console.error('Failed to initialize Python runtime:', err);
    throw err;
  }
})();

async function pyCall(name, ...args) {
  const py = await pyodideReady;
  const fn = py.globals.get(name);
  try {
    const result = fn(...args);
    if (result && typeof result.toJs === 'function') {
      const js = result.toJs({ dict_converter: Object.fromEntries });
      result.destroy();
      return js;
    }
    return result;
  } finally {
    fn.destroy();
  }
}

const state = { lc: true, uc: true, dig: true, punc: true};
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

async function generatePassword() {
  const len = parseInt(lengthSlider.value, 10);
  return pyCall('generate_password', state.lc, state.uc, state.dig, state.punc, len);
}

async function strength(password) {
  return pyCall('password_strength', password);
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

async function onGenerate() {
  try {
    currentPassword = await generatePassword();
    isRevealed = true;
    setEyeIcon();
    passwordEl.classList.remove('placeholder');
    renderPassword();
    updateStrength(await strength(currentPassword));
  } catch (err) {
    console.error('Password generation failed:', err);
    showToast('Couldn\'t start the generator — check your connection and reload');
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
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
    showToast('Copied to clipboard');
  } catch (e) {
    showToast('Copy failed — select manually');
  }
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

async function updateCriteria(value) {
  const checks = await pyCall('check_criteria', value);
  criteriaList.querySelectorAll('li').forEach(li => {
    li.classList.toggle('met', !!checks[li.dataset.key]);
  });
  return checks;
}

checkInput.addEventListener('input', async () => {
  const value = checkInput.value;
  if (!value) {
    resetCheckStrength();
    return;
  }
  let checks;
  try {
    checks = await updateCriteria(value);
  } catch (err) {
    console.error('Password check failed:', err);
    showToast('Couldn\'t start the checker — check your connection and reload');
    return;
  }
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
