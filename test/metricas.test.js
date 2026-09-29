// CAMBIOS-cohorte-0 §8, puntos 1–3: la medición cuenta bien y nunca rompe el juego.

import test from 'node:test';
import assert from 'node:assert/strict';

import { crearMetricas } from '../src/ui/metricas.js';

const PUBLICADA = { protocol: 'https:', pathname: '/laberinto/', search: '?ref=canal' };

/** Métricas con un envío falso que anota cada URL. */
function conEspia(opciones = {}) {
  const urls = [];
  const metricas = crearMetricas({
    ubicacion: PUBLICADA,
    enviar: (url) => urls.push(new URL(url)),
    ...opciones,
  });
  return { metricas, urls };
}

test('§8.1 · registrarUnaVez no envía dos veces el mismo evento en una sesión', () => {
  const { metricas, urls } = conEspia();
  metricas.registrarUnaVez('n1-completado');
  metricas.registrarUnaVez('n1-completado');
  metricas.registrarUnaVez('n2-completado');
  assert.deepEqual(
    urls.map((u) => u.searchParams.get('p')),
    ['n1-completado', 'n2-completado'],
  );
});

test('registrar envía el evento con el formato de GoatCounter', () => {
  const { metricas, urls } = conEspia({ codigo: 'prueba' });
  metricas.registrar('n3-error-LIMITE_PASOS');
  const [url] = urls;
  assert.equal(url.origin + url.pathname, 'https://prueba.goatcounter.com/count');
  assert.equal(url.searchParams.get('p'), 'n3-error-LIMITE_PASOS');
  assert.equal(url.searchParams.get('e'), 'true');
});

test('un evento nunca empieza con "/" (GoatCounter lo prohíbe)', () => {
  const { metricas, urls } = conEspia();
  metricas.registrar('/camara-lenta');
  assert.equal(urls[0].searchParams.get('p'), 'camara-lenta');
});

test('la visita lleva la ruta y el ?ref=canal, y no se marca como evento', () => {
  const { metricas, urls } = conEspia({ pantalla: '1440,900,2' });
  metricas.registrarVisita();
  const [url] = urls;
  assert.equal(url.searchParams.get('p'), '/laberinto/');
  assert.equal(url.searchParams.get('q'), '?ref=canal');
  assert.equal(url.searchParams.get('s'), '1440,900,2');
  assert.equal(url.searchParams.has('e'), false);
});

test('§8.2 · registrar no hace nada fuera de https', () => {
  for (const protocol of ['file:', 'http:']) {
    const { metricas, urls } = conEspia({ ubicacion: { ...PUBLICADA, protocol } });
    metricas.registrar('n1-primera-corrida');
    metricas.registrarVisita();
    assert.equal(urls.length, 0, protocol);
  }
});

test('§8.2 · registrar no hace nada con ?nometricas', () => {
  for (const search of ['?nometricas', '?ref=canal&nometricas']) {
    const { metricas, urls } = conEspia({ ubicacion: { ...PUBLICADA, search } });
    metricas.registrar('n1-primera-corrida');
    metricas.registrarVisita();
    assert.equal(urls.length, 0, search);
  }
});

test('sin ubicación (Node, pruebas) la medición está apagada', () => {
  const urls = [];
  const metricas = crearMetricas({ ubicacion: undefined, enviar: (u) => urls.push(u) });
  metricas.registrar('n1-completado');
  assert.equal(urls.length, 0);
});

test('§8.3 · registrar no lanza si la petición falla', async () => {
  const lanza = crearMetricas({
    ubicacion: PUBLICADA,
    enviar: () => {
      throw new Error('sin red');
    },
  });
  assert.doesNotThrow(() => lanza.registrar('n1-completado'));
  assert.doesNotThrow(() => lanza.registrarVisita());

  let rechazos = 0;
  const rechaza = crearMetricas({
    ubicacion: PUBLICADA,
    enviar: () => {
      rechazos++;
      return Promise.reject(new Error('bloqueada'));
    },
  });
  assert.doesNotThrow(() => rechaza.registrarUnaVez('n1-completado'));
  // Da una vuelta al ciclo de eventos: un rechazo sin atrapar tumbaría el test.
  await new Promise((listo) => setTimeout(listo, 0));
  assert.equal(rechazos, 1);
});
