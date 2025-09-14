export function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFKD").replace(/\p{Diacritic}+/gu, "").trim();
}

export function levenshtein(a: string, b: string): number {
  const s = normalize(a);
  const t = normalize(b);
  const m = s.length, n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,      // deletion
        dp[j - 1] + 1,  // insertion
        prev + cost     // substitution
      );
      prev = temp;
    }
  }
  return dp[n];
}

export function similarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(normalize(a).length, normalize(b).length) || 1;
  return 1 - dist / maxLen; // 0..1, higher is better
}

export function rankCandidates<T>(query: string, items: T[], fields: ((x: T) => string | undefined)[]): Array<{ item: T; score: number }>{
  const qn = normalize(query);
  return items.map((it) => {
    let best = 0;
    for (const f of fields) {
      const v = f(it) || "";
      const vn = normalize(v);
      let s = similarity(qn, vn);
      // small boosts for prefix/substring matches
      if (vn.startsWith(qn)) s += 0.2;
      else if (vn.includes(qn)) s += 0.1;
      best = Math.max(best, s);
    }
    return { item: it, score: best };
  }).sort((a, b) => b.score - a.score);
}
