# Vibranium Cipher — Password Generator

A single-page password generator and password strength checker, styled with a
"cyber neon" theme and an animated particle-network background. All password
logic runs **locally in the browser** — nothing is ever sent to a server.

## Features

- **Generate Password**
  - Adjustable length (4–64 characters) via a slider
  - Toggleable character sets: lowercase, uppercase, numbers, symbols
  - Guarantees at least one character from each selected set (when length allows)
  - Cryptographically secure randomness (Python's `secrets` module)
  - Live strength meter (Weak → Very Strong)
  - Click the password to select it, one click to copy, show/hide toggle
  - Press `Enter` to generate

- **Check Your Own Password**
  - Paste or type any password to see its strength
  - Live checklist: 12+ characters, lowercase, uppercase, number, symbol
  - Checked entirely client-side — nothing is stored or transmitted

- **Background**
  - Animated, resize-aware particle network (canvas), respects
    `prefers-reduced-motion`

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom properties for easy theme swapping) |
| UI behavior / animation | Vanilla JavaScript |
| Password logic (generation, strength, criteria) | **Python**, run in-browser via [Pyodide](https://pyodide.org) (WebAssembly) |

The project intentionally splits responsibilities:

- **`script.js`** — all UI wiring: DOM updates, button clicks, slider input,
  show/hide toggles, copy-to-clipboard, toast messages, and the background
  network animation.
- **`logic.py`** — all the actual "logic": generating a password, scoring its
  strength, and checking criteria. This runs as real Python in the browser
  via Pyodide, not JavaScript.

## File Structure

```
.
├── index.html   # Page markup
├── style.css    # All styling (theme, layout, animation styling)
├── script.js    # UI behavior + background animation + Pyodide bridge
├── logic.py     # Password generation / strength / criteria logic (Python)
└── README.md    # This file
```

## How It Works

1. `index.html` loads the Pyodide runtime from a CDN, then `script.js`.
2. On page load, `script.js` boots Pyodide, fetches `logic.py`, and runs it
   inside the in-browser Python interpreter.
3. When the user clicks **Generate Password** (or types into the password
   checker), `script.js` calls the relevant Python function through a small
   bridge (`pyCall`) and updates the DOM with the result:

   | UI action | JS entry point | Python function |
   |---|---|---|
   | Generate Password | `generatePassword()` | `generate_password(use_lc, use_uc, use_dig, use_punc, length)` |
   | Strength meter (generated password) | `strength()` | `password_strength(password)` |
   | Check Your Own Password | `updateCriteria()` | `check_criteria(value)` |

## Running Locally

Because `script.js` fetches `logic.py` with `fetch()`, the project must be
served over HTTP — opening `index.html` directly via `file://` will fail due
to browser CORS/security restrictions on local file fetches.

Serve it with any static file server, for example:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

(Any other static server — VS Code Live Server, `npx serve`, nginx, etc. —
works the same way.)

## Browser Support

Requires a modern browser with WebAssembly support (all current versions of
Chrome, Firefox, Safari, and Edge). First load takes a moment longer than a
typical static page while Pyodide's Python runtime downloads and initializes;
subsequent interactions are instant.

## Customization

- **Color theme**: `style.css` exposes CSS custom properties at the top of
  the file (`--card-glow-1`, `--card-glow-2`, `--card-bg-a`, `--card-bg-b`)
  with a few preset palettes commented out (Sea Green, Light Violet, Emerald
  Green, Royal Blue) — swap the four values to change the card's look.
- **Password rules**: adjust length bounds, criteria thresholds, or add new
  character sets in `logic.py`.

## Security Notes

- Passwords are generated using Python's `secrets` module (a CSPRNG), not the
  general-purpose `random` module.
- No password, generated or checked, ever leaves the browser — there is no
  backend, no network request, and no storage involved.
