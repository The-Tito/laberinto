// CAMBIOS-cohorte-0 §8.5: dist/index.html sigue siendo un solo archivo.
//
// La medición entra por una petición desde JS, no por un <script src> externo;
// si alguien pega el snippet oficial de GoatCounter, este test lo detiene.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

test('§8.5 · el build termina sin referencias externas e incluye las métricas', () => {
  // execFileSync lanza si build.mjs termina con error ("Quedó una referencia externa").
  execFileSync(process.execPath, ['build.mjs'], { cwd: RAIZ, stdio: 'pipe' });

  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<(?:script|link|img|iframe)\b[^>]*\b(?:src|href)=/i);
  assert.match(html, /goatcounter\.com\/count/, 'metricas.js no quedó empaquetado');
});
