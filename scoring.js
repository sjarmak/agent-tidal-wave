/*
 * Damage model: the closer the guess, the harder the wave hits.
 *
 * Magnitudes span orders of magnitude, so proximity is measured on a LOG ratio,
 * not a linear difference. Exact guess => 100 damage. Off by E_MAX-fold or more
 * => 0. This is the same "closeness => score" idea as the Python scoring engine,
 * recast as symmetric damage instead of closest-without-going-over.
 */
const Scoring = (() => {
  const E_MAX = Math.log(8); // beyond ~8x off in either direction = no damage

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  function tierFor(damage) {
    if (damage >= 85) return { key: 'direct', label: 'DIRECT HIT' };
    if (damage >= 60) return { key: 'heavy', label: 'WAVE BREACH' };
    if (damage >= 30) return { key: 'glancing', label: 'GLANCING BLOW' };
    if (damage > 0) return { key: 'ripple', label: 'RIPPLE' };
    return { key: 'miss', label: 'DRY DOCK' };
  }

  function evaluate(guess, real) {
    if (!(guess > 0) || !(real > 0)) {
      throw new Error('guess and real must be positive numbers');
    }
    const logErr = Math.abs(Math.log(guess / real));
    const damage = Math.round(clamp(100 * (1 - logErr / E_MAX), 0, 100));
    const ratio = guess >= real ? guess / real : real / guess; // "off by Nx"
    return {
      damage,
      tier: tierFor(damage),
      overUnder: guess > real ? 'over' : guess < real ? 'under' : 'exact',
      offByX: ratio,
    };
  }

  // Date rounds: damage falls 20 points per month of distance from the answer.
  function evaluateMonths(guessIndex, answerIndex) {
    const apart = Math.abs(guessIndex - answerIndex);
    const damage = clamp(100 - apart * 20, 0, 100);
    return { damage, tier: tierFor(damage), monthsApart: apart };
  }

  return Object.freeze({ E_MAX, evaluate, evaluateMonths, tierFor });
})();
