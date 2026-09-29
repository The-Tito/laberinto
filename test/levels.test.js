// Spec §8.1 y §8.2: la solución de referencia de cada nivel llega a la meta, y su
// conteo de bloques concuerda con el par publicado.

import test from 'node:test';
import assert from 'node:assert/strict';

import { NIVELES, mapaDelNivel } from '../src/game/levels.js';
import { Mundo } from '../src/game/world.js';
import { parsear } from '../src/lang/parser.js';
import { contarBloques } from '../src/lang/blocks.js';
import { ejecutarCompleto } from '../src/runtime/interpreter.js';
import { CODIGOS, esErrorDelJuego } from '../src/lang/errors.js';

function correr(nivel, codigo, mapa = mapaDelNivel(nivel)) {
  const ast = parsear(codigo, { permitidos: nivel.permitidos });
  const mundo = new Mundo(mapa);
  const resultado = ejecutarCompleto(ast, mundo, { limitePasos: nivel.limitePasos });
  return { ...resultado, mundo, bloques: contarBloques(ast) };
}

for (const nivel of NIVELES) {
  test(`nivel ${nivel.numero} · la solución de referencia llega a la meta`, () => {
    const { llego, pasos } = correr(nivel, nivel.solucion);
    assert.ok(llego, `el robot no llegó a la meta en el nivel ${nivel.numero}`);
    assert.ok(pasos <= nivel.limitePasos, `se pasó del límite: ${pasos}`);
  });
}

test('§8.2 · el conteo de la solución de referencia concuerda con el par', () => {
  const conteos = Object.fromEntries(
    NIVELES.map((nivel) => [nivel.numero, contarBloques(parsear(nivel.solucion, { permitidos: nivel.permitidos }))]),
  );

  // Niveles 1–3: el par ES el óptimo conocido.
  assert.equal(conteos[1], 2);
  assert.equal(conteos[2], 5);
  assert.equal(conteos[3], 7);

  // Niveles 4–5: el spec declara el par "generoso a propósito", así que basta
  // que la referencia no lo exceda.
  assert.ok(conteos[4] <= NIVELES[3].par, `nivel 4: ${conteos[4]} > par ${NIVELES[3].par}`);
  assert.ok(conteos[5] <= NIVELES[4].par, `nivel 5: ${conteos[5]} > par ${NIVELES[4].par}`);

  for (const nivel of NIVELES.slice(0, 3)) {
    assert.equal(conteos[nivel.numero], nivel.par, `nivel ${nivel.numero}`);
  }
});

test('nivel 1 · la solución ingenua también funciona', () => {
  // El spec §4 es explícito: van a escribir avanzar() seis veces y va a funcionar.
  // Ese camino no se bloquea nunca.
  const nivel = NIVELES[0];
  const { llego, bloques } = correr(nivel, 'avanzar();\n'.repeat(6));
  assert.ok(llego);
  assert.equal(bloques, nivel.ingenuo);
});

test('nivel 5 · la misma solución sirve para diez laberintos distintos', () => {
  const nivel = NIVELES[4];
  const mapas = new Set();
  for (let i = 0; i < 10; i++) {
    const mapa = mapaDelNivel(nivel);
    mapas.add(mapa.join('|'));
    const { llego } = correr(nivel, nivel.solucion, mapa);
    assert.ok(llego, `no llegó en el laberinto ${i}`);
  }
  assert.ok(mapas.size > 1, 'el nivel 5 debería cambiar de laberinto en cada corrida');
});

// --- Errores de ejecución (spec §6) ---------------------------------------

test('§6 · chocar señala la línea y no culpa a nadie', () => {
  try {
    correr(NIVELES[0], 'avanzar();\navanzar();\ngirarIzquierda();\navanzar();\n');
    assert.fail('debía chocar');
  } catch (e) {
    assert.ok(esErrorDelJuego(e));
    assert.equal(e.codigo, CODIGOS.CHOQUE);
    assert.equal(e.linea, 4);
    assert.equal(e.mensaje, 'Chocaste en la línea 4 — ¿el camino seguía libre ahí?');
  }
});

test('§6 · el bucle infinito pregunta por la condición', () => {
  try {
    // Gira y desgira para siempre: la condición nunca se vuelve falsa.
    correr(NIVELES[0], 'mientras (caminoLibre()) {\n  girarDerecha();\n  girarIzquierda();\n}\n');
    assert.fail('debía toparse con el límite');
  } catch (e) {
    assert.ok(esErrorDelJuego(e));
    assert.equal(e.codigo, CODIGOS.LIMITE_PASOS);
    assert.match(e.mensaje, /¿La condición del mientras alguna vez se vuelve falsa\?/);
  }
});

test('quedarse corto no es un error: informa dónde se detuvo', () => {
  const { llego, ultimaLinea } = correr(NIVELES[0], 'avanzar();\navanzar();\n');
  assert.equal(llego, false);
  assert.equal(ultimaLinea, 2);
});

test('la ejecución se detiene al pisar la meta', () => {
  // Si el programa sigue después de llegar, no debe poder convertir la victoria
  // en un choque.
  const { llego } = correr(NIVELES[0], 'repetir (20) {\n  avanzar();\n}\n');
  assert.ok(llego);
});
