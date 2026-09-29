import test from 'node:test';
import assert from 'node:assert/strict';

import { parsear, COMANDOS_BASE, COMANDOS_TODOS } from '../src/lang/parser.js';
import { contarBloques } from '../src/lang/blocks.js';
import { CODIGOS, esErrorDelJuego } from '../src/lang/errors.js';

/** Parsea esperando que falle, y devuelve el error del juego. */
function fallar(texto, opciones) {
  try {
    parsear(texto, opciones);
  } catch (e) {
    assert.ok(esErrorDelJuego(e), `esperaba un error del juego, llegó: ${e}`);
    return e;
  }
  assert.fail('el programa parseó y no debía');
}

test('programa válido produce el AST esperado', () => {
  const ast = parsear('repetir (6) {\n  avanzar();\n}\n');
  assert.equal(ast.cuerpo.length, 1);
  assert.equal(ast.cuerpo[0].tipo, 'repetir');
  assert.equal(ast.cuerpo[0].veces, 6);
  assert.equal(ast.cuerpo[0].cuerpo[0].nombre, 'avanzar');
  assert.equal(ast.cuerpo[0].cuerpo[0].linea, 2);
});

test('acepta si/sino, mientras y sensores anidados', () => {
  const ast = parsear(`
    mientras (caminoLibre()) {
      si (caminoLibreDerecha()) {
        girarDerecha();
      } sino {
        avanzar();
      }
    }
  `);
  const bucle = ast.cuerpo[0];
  assert.equal(bucle.tipo, 'mientras');
  assert.equal(bucle.condicion.nombre, 'caminoLibre');
  assert.equal(bucle.cuerpo[0].tipo, 'si');
  assert.equal(bucle.cuerpo[0].sino.length, 1);
});

test('el conteo de bloques ignora el formato', () => {
  const extendido = parsear('repetir (6) {\n\n  avanzar();\n\n}\n');
  const comprimido = parsear('repetir(6){avanzar();}');
  assert.equal(contarBloques(extendido), 2);
  assert.equal(contarBloques(comprimido), 2);
});

test('sino no suma bloques', () => {
  const conSino = parsear('si (caminoLibre()) { avanzar(); } sino { girarDerecha(); }');
  assert.equal(contarBloques(conSino), 3); // si + avanzar + girarDerecha
});

// --- Tabla del spec §6 -----------------------------------------------------

test('§6 · falta un paréntesis, con su línea', () => {
  const e = fallar('avanzar();\navanzar();\ngirarDerecha(;\n');
  assert.equal(e.codigo, CODIGOS.FALTA_PARENTESIS_CIERRE);
  assert.equal(e.linea, 3);
  assert.equal(e.mensaje, 'Falta cerrar un paréntesis en la línea 3.');
});

test('§6 · falta una llave, y señala la que quedó abierta', () => {
  const e = fallar('repetir (4) {\n  avanzar();\n');
  assert.equal(e.codigo, CODIGOS.FALTA_LLAVE_CIERRE);
  assert.equal(e.linea, 1);
});

test('§6 · comando inexistente remite al panel derecho', () => {
  const e = fallar('saltar();');
  assert.equal(e.codigo, CODIGOS.COMANDO_DESCONOCIDO);
  assert.equal(
    e.mensaje,
    'No conozco "saltar". Los comandos disponibles están en el panel de la derecha.',
  );
});

test('un comando casi bien escrito recibe sugerencia', () => {
  const mayuscula = fallar('Avanzar();');
  assert.equal(mayuscula.codigo, CODIGOS.COMANDO_DESCONOCIDO);
  assert.match(mayuscula.mensaje, /¿Querías escribir "avanzar"\?/);

  const typo = fallar('avansar();');
  assert.match(typo.mensaje, /¿Querías escribir "avanzar"\?/);
});

test('falta el punto y coma', () => {
  const e = fallar('avanzar()\navanzar();');
  assert.equal(e.codigo, CODIGOS.FALTA_PUNTO_Y_COMA);
  assert.equal(e.linea, 1);
});

test('§2 · el símbolo ! no existe en el lenguaje', () => {
  const e = fallar('si (!caminoLibre()) { avanzar(); }');
  assert.equal(e.codigo, CODIGOS.SIMBOLO_DESCONOCIDO);
  assert.equal(e.linea, 1);
});

test('un sensor usado como acción se explica, no se rechaza', () => {
  const e = fallar('caminoLibre();');
  assert.equal(e.codigo, CODIGOS.PREGUNTA_COMO_ACCION);
  assert.match(e.mensaje, /es una pregunta, no una acción/);
});

test('una acción usada como pregunta se explica', () => {
  const e = fallar('mientras (avanzar()) { avanzar(); }');
  assert.equal(e.codigo, CODIGOS.ACCION_COMO_PREGUNTA);
});

test('repetir sin número', () => {
  const e = fallar('repetir () { avanzar(); }');
  assert.equal(e.codigo, CODIGOS.FALTA_NUMERO);
  assert.equal(e.linea, 1);
});

test('programa vacío no es un error hostil', () => {
  const e = fallar('   \n\n // nada \n');
  assert.equal(e.codigo, CODIGOS.PROGRAMA_VACIO);
  assert.match(e.mensaje, /panel de la derecha/);
});

test('llave de más', () => {
  const e = fallar('avanzar();\n}');
  assert.equal(e.codigo, CODIGOS.SOBRA_LLAVE);
  assert.equal(e.linea, 2);
});

test('§4 · repetirHastaLaMeta está bloqueado antes del nivel 5', () => {
  const e = fallar('repetirHastaLaMeta { avanzar(); }', { permitidos: COMANDOS_BASE });
  assert.equal(e.codigo, CODIGOS.COMANDO_BLOQUEADO);
  assert.match(e.mensaje, /panel de la derecha/);

  const ok = parsear('repetirHastaLaMeta { avanzar(); }', { permitidos: COMANDOS_TODOS });
  assert.equal(ok.cuerpo[0].tipo, 'repetirHastaLaMeta');
});

// --- Tono de los mensajes (spec §6) ---------------------------------------

test('ningún mensaje usa jerga, inglés ni culpa al usuario', () => {
  const casos = [
    'saltar();',
    'avanzar()',
    'repetir (4) {',
    'si (!caminoLibre()) {}',
    '}',
    'caminoLibre();',
    'repetir () { avanzar(); }',
    '',
  ];
  const prohibidas = [
    'error de sintaxis',
    'syntax',
    'unexpected',
    'token',
    'undefined',
    'null',
    'exception',
    'stack',
    'inválido',
    'ilegal',
    'mal escrito',
  ];

  for (const caso of casos) {
    const e = fallar(caso);
    const mensaje = e.mensaje.toLowerCase();
    for (const palabra of prohibidas) {
      assert.ok(
        !mensaje.includes(palabra),
        `el mensaje "${e.mensaje}" contiene "${palabra}"`,
      );
    }
    assert.ok(e.mensaje.length > 0);
  }
});
