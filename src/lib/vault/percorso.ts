import path from 'path'

/**
 * Vero se `abs` sta dentro la cartella del vault (o è la cartella stessa).
 * Non basta startsWith: una cartella sorella con lo stesso prefisso (vault2) passerebbe.
 */
export function dentroVault(abs: string, vaultPath: string): boolean {
  const rel = path.relative(path.resolve(vaultPath), path.resolve(abs))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}
