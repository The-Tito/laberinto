// El intérprete es un generador: hace `yield` con la línea ANTES de ejecutarla.
//
// Esa sola decisión resuelve cinco requisitos del spec de una vez:
//   · resaltar la línea en ejecución (§7)  → la línea viene en el evento
//   · cámara lenta a 400 ms (§7)           → drenar con setTimeout
//   · correr rápido (§7)                   → el mismo drenado, más seguido
//   · límite de pasos / bucle infinito (§6) → contar eventos
//   · tests sin navegador (§8)             → drenar con un while
//
// La ejecución se detiene en cuanto el robot pisa la meta: lo que pase después
// no debería poder convertir una victoria en un choque.

import { CODIGOS, error } from '../lang/errors.js';

const META_ALCANZADA = Symbol('meta alcanzada');

export const LIMITE_PASOS_POR_DEFECTO = 500;

/**
 * @param {object} ast programa parseado
 * @param {import('../game/world.js').Mundo} mundo
 * @param {{ limitePasos?: number }} opciones
 * @yields {{ linea: number, tipo: 'accion'|'pregunta'|'bucle' }}
 * @returns {{ llego: boolean, ultimaLinea: number|null, pasos: number }}
 */
export function* ejecutar(ast, mundo, { limitePasos = LIMITE_PASOS_POR_DEFECTO } = {}) {
  const ctx = {
    mundo,
    limitePasos,
    pasos: 0,
    ultimaLinea: null,
    bucleActual: 'mientras',
  };

  try {
    yield* ejecutarLista(ast.cuerpo, ctx);
  } catch (e) {
    if (e !== META_ALCANZADA) throw e;
  }

  return { llego: mundo.enMeta(), ultimaLinea: ctx.ultimaLinea, pasos: ctx.pasos };
}

function* paso(ctx, linea, tipo) {
  ctx.pasos++;
  if (ctx.pasos > ctx.limitePasos) {
    throw error(CODIGOS.LIMITE_PASOS, {
      limite: ctx.limitePasos,
      estructura: ctx.bucleActual,
      linea,
    });
  }
  ctx.ultimaLinea = linea;
  yield { linea, tipo };
}

function* ejecutarLista(sentencias, ctx) {
  for (const sentencia of sentencias) {
    yield* ejecutarSentencia(sentencia, ctx);
  }
}

function* ejecutarSentencia(sentencia, ctx) {
  switch (sentencia.tipo) {
    case 'accion':
      return yield* ejecutarAccion(sentencia, ctx);
    case 'repetir':
      return yield* ejecutarRepetir(sentencia, ctx);
    case 'mientras':
      return yield* ejecutarMientras(sentencia, ctx);
    case 'si':
      return yield* ejecutarSi(sentencia, ctx);
    case 'repetirHastaLaMeta':
      return yield* ejecutarRepetirHastaLaMeta(sentencia, ctx);
    default:
      throw new Error(`Sentencia sin ejecutar: ${sentencia.tipo}`);
  }
}

function* ejecutarAccion(sentencia, ctx) {
  yield* paso(ctx, sentencia.linea, 'accion');

  if (sentencia.nombre === 'avanzar') {
    if (!ctx.mundo.avanzar()) {
      throw error(CODIGOS.CHOQUE, { linea: sentencia.linea });
    }
    if (ctx.mundo.enMeta()) throw META_ALCANZADA;
    return;
  }

  if (sentencia.nombre === 'girarDerecha') return ctx.mundo.girarDerecha();
  if (sentencia.nombre === 'girarIzquierda') return ctx.mundo.girarIzquierda();

  throw new Error(`Acción sin implementar: ${sentencia.nombre}`);
}

function evaluar(condicion, mundo) {
  if (condicion.nombre === 'caminoLibre') return mundo.caminoLibre();
  if (condicion.nombre === 'caminoLibreDerecha') return mundo.caminoLibreDerecha();
  throw new Error(`Sensor sin implementar: ${condicion.nombre}`);
}

function* ejecutarRepetir(sentencia, ctx) {
  const anterior = ctx.bucleActual;
  ctx.bucleActual = 'repetir';
  for (let i = 0; i < sentencia.veces; i++) {
    // Se resalta la cabecera en cada vuelta: ver el bucle "regresar arriba" es
    // justamente lo que hace que el bucle deje de ser magia.
    yield* paso(ctx, sentencia.linea, 'bucle');
    yield* ejecutarLista(sentencia.cuerpo, ctx);
  }
  ctx.bucleActual = anterior;
}

function* ejecutarMientras(sentencia, ctx) {
  const anterior = ctx.bucleActual;
  ctx.bucleActual = 'mientras';
  while (true) {
    yield* paso(ctx, sentencia.linea, 'pregunta');
    if (!evaluar(sentencia.condicion, ctx.mundo)) break;
    yield* ejecutarLista(sentencia.cuerpo, ctx);
  }
  ctx.bucleActual = anterior;
}

function* ejecutarSi(sentencia, ctx) {
  yield* paso(ctx, sentencia.linea, 'pregunta');
  if (evaluar(sentencia.condicion, ctx.mundo)) {
    yield* ejecutarLista(sentencia.cuerpo, ctx);
  } else if (sentencia.sino) {
    yield* ejecutarLista(sentencia.sino, ctx);
  }
}

function* ejecutarRepetirHastaLaMeta(sentencia, ctx) {
  const anterior = ctx.bucleActual;
  ctx.bucleActual = 'repetirHastaLaMeta';
  while (!ctx.mundo.enMeta()) {
    yield* paso(ctx, sentencia.linea, 'bucle');
    yield* ejecutarLista(sentencia.cuerpo, ctx);
  }
  ctx.bucleActual = anterior;
}

/**
 * Drena el generador de un tirón. Es lo que usan los tests; la UI drena a mano
 * para poder animar entre paso y paso.
 */
export function ejecutarCompleto(ast, mundo, opciones) {
  const corrida = ejecutar(ast, mundo, opciones);
  let resultado = corrida.next();
  while (!resultado.done) resultado = corrida.next();
  return resultado.value;
}
