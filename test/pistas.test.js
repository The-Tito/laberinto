// CAMBIOS-cohorte-0 §7b: cada nivel tiene exactamente 3 pistas, y ninguna es la
// solución. "Ninguna contiene la solución" se prueba de la forma que importa: si
// alguien pega la pista en el editor tal cual, el nivel no se resuelve.

import test from 'node:test';
import assert from 'node:assert/strict';

import { NIVELES, mapaDelNivel } from '../src/game/levels.js';
import { Mundo } from '../src/game/world.js';
import { parsear } from '../src/lang/parser.js';
import { ejecutarCompleto } from '../src/runtime/interpreter.js';

/** ¿Pegar este texto en el editor resuelve el nivel? */
function resuelve(nivel, texto) {
  let ast;
  try {
    ast = parsear(texto, { permitidos: nivel.permitidos });
  } catch {
    return false; // ni siquiera es un programa
  }
  try {
    const mundo = new Mundo(mapaDelNivel(nivel));
    return ejecutarCompleto(ast, mundo, { limitePasos: nivel.limitePasos }).llego;
  } catch {
    return false;
  }
}

const normalizar = (texto) => texto.replace(/\s+/g, '');

for (const nivel of NIVELES) {
  test(`§7b · nivel ${nivel.numero} · tres pistas, de menos a más`, () => {
    assert.equal(nivel.pistas?.length, 3);
    for (const pista of nivel.pistas) {
      assert.equal(typeof pista, 'string');
      assert.ok(pista.trim().length > 0, 'pista vacía');
      assert.notEqual(pista, nivel.pista, 'repite la pista fija del nivel');
    }
    // PISTAS.md, regla 3: la tercera da la estructura CON huecos.
    assert.match(nivel.pistas[2], /___/, 'la pista 3 debe tener huecos');
  });

  test(`§7b · nivel ${nivel.numero} · ninguna pista es la solución`, () => {
    for (const pista of nivel.pistas) {
      assert.ok(
        !normalizar(pista).includes(normalizar(nivel.solucion)),
        `contiene la solución de referencia: "${pista}"`,
      );
      assert.ok(!resuelve(nivel, pista), `pegada en el editor, resuelve el nivel: "${pista}"`);
    }
  });
}

test('las pistas hablan como par: sin negación !, jerga ni "fácil"', () => {
  const prohibidas = ['!', 'fácil', 'facil', 'obvio', 'simplemente', 'error de sintaxis', 'token', 'undefined'];
  for (const nivel of NIVELES) {
    for (const pista of nivel.pistas) {
      for (const palabra of prohibidas) {
        assert.ok(
          !pista.toLowerCase().includes(palabra),
          `nivel ${nivel.numero}: "${pista}" contiene "${palabra}"`,
        );
      }
    }
  }
});

test('el test detecta de verdad una pista que regala la solución', () => {
  const nivel = NIVELES[0];
  assert.ok(resuelve(nivel, nivel.solucion));
  assert.ok(!resuelve(nivel, nivel.pistas[2]));
});
