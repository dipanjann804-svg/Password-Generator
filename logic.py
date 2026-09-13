# All the "logical" / computational parts of the password generator,
# now implemented in Python and executed in-browser via Pyodide.
#
# The network animation and all DOM/UI wiring stay in script.js exactly
# as before — this file only replaces the pure logic that used to live
# in generatePassword(), strength(), and updateCriteria() in script.js.

import secrets
import string

LC = string.ascii_lowercase
UC = string.ascii_uppercase
DIG = string.digits
PUNC = string.punctuation


def _secure_random_index(max_val):
    """Unbiased random index in [0, max_val) using a CSPRNG (secrets)."""
    return secrets.randbelow(max_val)


def _active_sets(use_lc, use_uc, use_dig, use_punc):
    sets = []
    if use_lc:
        sets.append(LC)
    if use_uc:
        sets.append(UC)
    if use_dig:
        sets.append(DIG)
    if use_punc:
        sets.append(PUNC)
    return sets


def generate_password(use_lc, use_uc, use_dig, use_punc, length):
    """Generate a random password from the selected character sets.

    Mirrors the previous JS generatePassword(): guarantees at least one
    character from each active set (when length allows), fills the rest
    from the combined pool, then does a Fisher-Yates shuffle — all using
    a cryptographically secure random source.
    """
    active_sets = _active_sets(use_lc, use_uc, use_dig, use_punc)
    if not active_sets:
        # Defensive fallback if this is ever called with nothing selected
        # (the UI itself always keeps at least one chip active, so this
        # path shouldn't normally be hit — same safety net idea as the
        # standalone generator.py script).
        active_sets = [LC, DIG]

    pool = "".join(active_sets)
    length = int(length)

    chars = []
    if length >= len(active_sets):
        for s in active_sets:
            chars.append(s[_secure_random_index(len(s))])

    while len(chars) < length:
        chars.append(pool[_secure_random_index(len(pool))])

    for i in range(len(chars) - 1, 0, -1):
        j = _secure_random_index(i + 1)
        chars[i], chars[j] = chars[j], chars[i]

    return "".join(chars)


def password_strength(password):
    """Score 1-5, same rule set as the original JS strength()."""
    score = 0
    if any(c.islower() for c in password):
        score += 1
    if any(c.isupper() for c in password):
        score += 1
    if any(c.isdigit() for c in password):
        score += 1
    if any((not c.isalnum()) for c in password):
        score += 1
    if len(password) >= 15:
        score += 1
    return max(1, score)


def check_criteria(value):
    """Criteria dict for the 'Check Your Own Password' card."""
    return {
        "len": len(value) >= 12,
        "lc": any(c.islower() for c in value),
        "uc": any(c.isupper() for c in value),
        "dig": any(c.isdigit() for c in value),
        "sym": any((not c.isalnum()) for c in value),
    }