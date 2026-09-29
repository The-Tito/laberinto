// Spec §8.3, declarado no opcional: 200 laberintos aleatorios, todos resueltos por
// la regla de la mano derecha dentro del límite de pasos.
//
// Un generador que de vez en cuando produce un laberinto con ciclos rompe el
// algoritmo, y eso pasaría en vivo, enfrente de ellos.

import test from 'node:test';
import assert from 'node:assert/strict';

import { generarLaberinto, crearAleatorio, contarCallejones } from '../src/game/generator.js';
import { Mundo } from '../src/game/world.js';
import { parsear, COMANDOS_TODOS } from '../src/lang/parser.js';
import { ejecutarCompleto } from '../src/runtime/interpreter.js';
import { NIVELES } from '../src/game/levels.js';

const NIVEL_5 = NIVELES[4];
const CORRIDAS = 200;

/** Recorre el grafo de celdas: aristas talladas y celdas alcanzables desde (0,0). */
function analizar(filas) {
  const celdasAlto = (filas.length - 1) / 2;
  const celdasAncho = (filas[0].length - 1) / 2;

  let aristas = 0;
  for (let y = 1; y < filas.length - 1; y++) {
    for (let x = 1; x < filas[y].length - 1; x++) {
      const entreCeldas = (x % 2 === 0) !== (y % 2 === 0);
      if (entreCeldas && filas[y][x] !== '#') aristas++;
    }
  }

  const visitadas = new Set();
  const pila = [[0, 0]];
  while (pila.length) {
    const [cx, cy] = pila.pop();
    const clave = `${cx},${cy}`;
    if (visitadas.has(clave)) continue;
    visitadas.add(clave);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= celdasAncho || ny < 0 || ny >= celdasAlto) continue;
      if (filas[cy * 2 + 1 + dy][cx * 2 + 1 + dx] === '#') continue;
      pila.push([nx, ny]);
    }
  }

  return {
    celdas: celdasAncho * celdasAlto,
    aristas,
    alcanzables: visitadas.size,
  };
}

test(`§8.3 · la mano derecha resuelve ${CORRIDAS} laberintos aleatorios`, () => {
  const ast = parsear(NIVEL_5.solucion, { permitidos: COMANDOS_TODOS });
  const aleatorio = crearAleatorio(20250813);
  let pasosMaximos = 0;

  for (let i = 0; i < CORRIDAS; i++) {
    const filas = generarLaberinto({ celdasAncho: 5, celdasAlto: 5, aleatorio });

    // Perfecto: árbol de expansión — sin ciclos y con todo alcanzable.
    const { celdas, aristas, alcanzables } = analizar(filas);
    assert.equal(aristas, celdas - 1, `laberinto ${i}: tiene ciclos`);
    assert.equal(alcanzables, celdas, `laberinto ${i}: hay celdas incomunicadas`);

    const mundo = new Mundo(filas);
    const { llego, pasos } = ejecutarCompleto(ast, mundo, {
      limitePasos: NIVEL_5.limitePasos,
    });

    assert.ok(llego, `laberinto ${i}: la mano derecha no llegó\n${filas.join('\n')}`);
    pasosMaximos = Math.max(pasosMaximos, pasos);
  }

  // El límite del nivel debe tener margen sobrado sobre el peor caso real: que
  // nunca salte el mensaje de bucle infinito con un programa correcto.
  console.log(`  peor caso observado: ${pasosMaximos} pasos (límite ${NIVEL_5.limitePasos})`);
  assert.ok(
    NIVEL_5.limitePasos >= pasosMaximos * 3,
    `el límite ${NIVEL_5.limitePasos} queda corto frente al peor caso ${pasosMaximos}`,
  );
});

test('el generador entrega laberintos con callejones sin salida', () => {
  const aleatorio = crearAleatorio(7);
  for (let i = 0; i < 20; i++) {
    const filas = generarLaberinto({ celdasAncho: 5, celdasAlto: 5, aleatorio });
    assert.ok(contarCallejones(filas) >= 2, `laberinto ${i}: sin callejones que engañen`);
  }
});

test('el laberinto congelado del nivel 4 cumple lo que pide el spec', () => {
  const filas = NIVELES[3].mapa;
  const { celdas, aristas, alcanzables } = analizar(filas);
  assert.equal(aristas, celdas - 1, 'el nivel 4 debe ser un laberinto perfecto');
  assert.equal(alcanzables, celdas);
  assert.ok(contarCallejones(filas) >= 4, 'al menos dos callejones que engañen, más S y M');
  assert.equal(filas.length, 9);
  assert.equal(filas[0].length, 9);
});
