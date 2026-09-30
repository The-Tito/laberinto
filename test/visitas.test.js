// CAMBIOS-cohorte-0 §8.4: el contador de visitas cuenta días distintos, no
// recargas, y sin localStorage el juego sigue como si nada.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  crearMetricas,
  contarDiaDeVisita,
  fechaLocal,
  CLAVE_VISITAS,
} from '../src/ui/metricas.js';

/** localStorage de mentiras, con lo mínimo que usa el contador. */
function almacenamientoFalso(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    datos,
  };
}

test('§8.4 · la primera visita cuenta 1 día', () => {
  const almacenamiento = almacenamientoFalso();
  assert.deepEqual(contarDiaDeVisita({ almacenamiento, hoy: '2026-10-01' }), {
    dias: 1,
    esNuevoDia: true,
  });
  assert.deepEqual(JSON.parse(almacenamiento.datos.get(CLAVE_VISITAS)), {
    dias: 1,
    ultima: '2026-10-01',
  });
});

test('§8.4 · el mismo día no suma', () => {
  const almacenamiento = almacenamientoFalso();
  contarDiaDeVisita({ almacenamiento, hoy: '2026-10-01' });
  assert.deepEqual(contarDiaDeVisita({ almacenamiento, hoy: '2026-10-01' }), {
    dias: 1,
    esNuevoDia: false,
  });
});

test('§8.4 · un día distinto suma 1', () => {
  const almacenamiento = almacenamientoFalso();
  contarDiaDeVisita({ almacenamiento, hoy: '2026-10-01' });
  assert.equal(contarDiaDeVisita({ almacenamiento, hoy: '2026-10-02' }).dias, 2);
  assert.equal(contarDiaDeVisita({ almacenamiento, hoy: '2026-10-09' }).dias, 3);
});

test('§8.4 · sin localStorage, o si falla, no rompe', () => {
  assert.equal(contarDiaDeVisita({ almacenamiento: null, hoy: '2026-10-01' }), null);

  const roto = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.doesNotThrow(() => contarDiaDeVisita({ almacenamiento: roto }));
  assert.equal(contarDiaDeVisita({ almacenamiento: roto }), null);
});

test('un registro dañado vuelve a empezar en 1', () => {
  for (const basura of ['{no es json', '{"dias":"tres"}', '{"dias":-4}']) {
    const almacenamiento = almacenamientoFalso({ [CLAVE_VISITAS]: basura });
    assert.equal(contarDiaDeVisita({ almacenamiento, hoy: '2026-10-01' }).dias, 1, basura);
  }
});

test('visita-dia-2 y visita-dia-3-mas sólo salen el día en que sube el contador', () => {
  const urls = [];
  const metricas = crearMetricas({
    ubicacion: { protocol: 'https:', hostname: 'juego-laberinto.pages.dev', pathname: '/', search: '' },
    enviar: (url) => urls.push(new URL(url).searchParams.get('p')),
  });
  const almacenamiento = almacenamientoFalso();
  const abrir = (hoy) => metricas.registrarDiaDeVisita({ almacenamiento, hoy });

  abrir('2026-10-01'); // día 1: nada
  abrir('2026-10-02'); // día 2
  abrir('2026-10-02'); // recarga: nada
  abrir('2026-10-03'); // día 3
  abrir('2026-10-04'); // día 4: ya se envió en esta sesión

  assert.deepEqual(urls, ['visita-dia-2', 'visita-dia-3-mas']);
});

test('fechaLocal usa el día local en formato AAAA-MM-DD', () => {
  assert.equal(fechaLocal(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
