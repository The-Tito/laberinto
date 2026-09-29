// Empaqueta el proyecto en dist/index.html: un archivo que se abre con doble
// clic, sin servidor, sin build del lado de ellos, sin dependencias (spec §7).
//
// El código fuente vive en módulos ES porque así se puede probar con `node --test`
// (spec §8). Aquí cada módulo se envuelve en su propio ámbito y los `import` se
// vuelven lecturas de ese ámbito: sin colisiones de nombres entre módulos y sin
// necesitar un empaquetador de verdad.
//
//   node build.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const ENTRADA = resolve(RAIZ, 'src/main.js');

const IMPORTS = /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?/g;
const EXPORTS = /^export\s+(const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm;

const identificador = (ruta) =>
  '__mod_' + relative(RAIZ, ruta).replace(/[^a-zA-Z0-9]/g, '_');

const modulos = new Map(); // ruta absoluta → { codigo, deps, exportados }
const orden = [];

async function recolectar(ruta) {
  if (modulos.has(ruta)) return;
  modulos.set(ruta, null); // marca de visitado, corta ciclos

  const fuente = await readFile(ruta, 'utf8');
  const deps = [];

  // Los import se reescriben a desestructuración del ámbito del módulo destino.
  let codigo = fuente.replace(IMPORTS, (_, nombres, especificador) => {
    const destino = resolve(dirname(ruta), especificador);
    deps.push(destino);
    const enlaces = nombres
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => {
        const [original, alias] = n.split(/\s+as\s+/).map((s) => s.trim());
        return alias ? `${original}: ${alias}` : original;
      })
      .join(', ');
    return `const { ${enlaces} } = ${identificador(destino)};`;
  });

  const exportados = [];
  for (const [, , nombre] of codigo.matchAll(EXPORTS)) exportados.push(nombre);
  codigo = codigo.replace(/^export\s+/gm, '');

  for (const dep of deps) await recolectar(dep);

  modulos.set(ruta, { codigo, exportados });
  orden.push(ruta);
}

await recolectar(ENTRADA);

const cuerpo = orden
  .map((ruta) => {
    const { codigo, exportados } = modulos.get(ruta);
    const nombre = relative(RAIZ, ruta);
    return [
      `// ${'='.repeat(70)}`,
      `// ${nombre}`,
      `// ${'='.repeat(70)}`,
      `const ${identificador(ruta)} = (() => {`,
      codigo.trimEnd(),
      `return { ${exportados.join(', ')} };`,
      `})();`,
    ].join('\n');
  })
  .join('\n\n');

const paquete = `(() => {\n'use strict';\n\n${cuerpo}\n})();`;

const css = await readFile(resolve(RAIZ, 'src/styles.css'), 'utf8');
let html = await readFile(resolve(RAIZ, 'index.html'), 'utf8');

html = html.replace(
  /\s*<link rel="stylesheet" href="src\/styles\.css" \/>/,
  `\n    <style>\n${css.trimEnd()}\n    </style>`,
);
html = html.replace(
  /\s*<script type="module" src="src\/main\.js"><\/script>/,
  `\n    <script>\n${paquete}\n    </script>`,
);

// Nada de src= ni href= puede sobrevivir: el archivo tiene que abrirse solo.
const referenciaExterna = /<(?:script|link|img|iframe)\b[^>]*\b(?:src|href)=/i.exec(html);
if (referenciaExterna) {
  throw new Error(`Quedó una referencia externa: ${referenciaExterna[0]}`);
}

await mkdir(resolve(RAIZ, 'dist'), { recursive: true });
await writeFile(resolve(RAIZ, 'dist/index.html'), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`dist/index.html · ${kb} kB · ${orden.length} módulos, 0 dependencias`);
