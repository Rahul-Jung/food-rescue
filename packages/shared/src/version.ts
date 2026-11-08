/** Compare "1.2.10" style versions: -1 if a < b, 0 if equal, 1 if a > b. Missing parts count as 0. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.trim().split('.').map((p) => parseInt(p, 10) || 0);
  const pb = b.trim().split('.').map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** True when the installed app is older than app_settings.min_app_version. */
export function needsUpdate(installed: string, minRequired: string): boolean {
  return compareVersions(installed, minRequired) < 0;
}
