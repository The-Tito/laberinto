// Los cinco niveles (spec §4).
//
// Cada nivel existe para forzar UN descubrimiento. No hay niveles intermedios y
// el orden no se toca: la rampa es el diseño.
//
// El mapa del nivel 4 está congelado como dato: se eligió con el generador
// (semilla 16, 4×4 celdas) entre los que tienen más callejones que engañan, y se
// pegó aquí. Un nivel fijo debe ser un dato, no una generación en tiempo de carga.

import { COMANDOS_BASE, COMANDOS_TODOS } from '../lang/parser.js';
import { generarLaberinto } from './generator.js';

const mapa = (texto) =>
  texto
    .trim()
    .split('\n')
    .map((fila) => fila.trim());

export const NIVELES = [
  {
    numero: 1,
    titulo: 'Pasillo recto',
    descubrimiento: 'El bucle repetir',
    pista: 'Seis pasos hasta la meta. Se puede en dos bloques.',
    mapa: mapa(`
      #########
      #S.....M#
      #########
    `),
    par: 2,
    ingenuo: 6,
    limitePasos: 500,
    permitidos: COMANDOS_BASE,
    solucion: `repetir (6) {
  avanzar();
}`,
  },

  {
    numero: 2,
    titulo: 'Forma de L',
    descubrimiento: 'Los giros, y repetir más de una vez',
    pista: 'El camino da vuelta. ¿Cuántos pasos antes de girar?',
    mapa: mapa(`
      #######
      #S....#
      #####.#
      #####.#
      #####.#
      #####M#
      #######
    `),
    par: 5,
    ingenuo: 9,
    limitePasos: 500,
    permitidos: COMANDOS_BASE,
    solucion: `repetir (4) {
  avanzar();
}
girarDerecha();
repetir (4) {
  avanzar();
}`,
  },

  {
    numero: 3,
    titulo: 'Zigzag',
    descubrimiento: 'mientras — el programa averigua solo cuántos pasos dar',
    pista: 'Los tramos miden distinto. Contar pasos ya no sirve.',
    mapa: mapa(`
      ##########
      #S...#####
      ####.#####
      ####...###
      ######.###
      ######...#
      ########.#
      ########M#
      ##########
    `),
    // El spec publica par 6, pero su propia solución de referencia cuesta 7.
    // El spec §8.2 resuelve el empate: "corrige el par, no la solución".
    par: 7,
    ingenuo: 13,
    limitePasos: 500,
    permitidos: COMANDOS_BASE,
    solucion: `repetir (3) {
  mientras (caminoLibre()) {
    avanzar();
  }
  girarDerecha();
  mientras (caminoLibre()) {
    avanzar();
  }
  girarIzquierda();
}`,
  },

  {
    numero: 4,
    titulo: 'Laberinto',
    descubrimiento: 'si / sino, y combinar estructuras',
    pista: 'Hay callejones sin salida. Una regla sencilla los resuelve todos.',
    mapa: mapa(`
      #########
      #S#.....#
      #.###.###
      #...#...#
      ###.###.#
      #.#.#...#
      #.#.#.#.#
      #.....#M#
      #########
    `),
    par: 8, // generoso a propósito: el óptimo conocido cuesta 7
    limitePasos: 500,
    permitidos: COMANDOS_BASE,
    solucion: `repetir (40) {
  si (caminoLibreDerecha()) {
    girarDerecha();
    avanzar();
  } sino {
    si (caminoLibre()) {
      avanzar();
    } sino {
      girarIzquierda();
    }
  }
}`,
  },

  {
    numero: 5,
    titulo: 'BONUS · Laberinto aleatorio',
    descubrimiento: 'Un programa que resuelve problemas que su autor nunca vio',
    pista: 'Otro laberinto cada vez que corres. Contar pasos ya no es opción.',
    esBonus: true,
    aleatorio: true,
    generarMapa: () => generarLaberinto({ celdasAncho: 5, celdasAlto: 5 }),
    par: 8,
    limitePasos: 1500,
    permitidos: COMANDOS_TODOS,
    solucion: `repetirHastaLaMeta {
  si (caminoLibreDerecha()) {
    girarDerecha();
    avanzar();
  } sino {
    si (caminoLibre()) {
      avanzar();
    } sino {
      girarIzquierda();
    }
  }
}`,
  },
];

export function nivelPorNumero(numero) {
  return NIVELES.find((nivel) => nivel.numero === numero) ?? NIVELES[0];
}

/** El mapa del nivel: fijo, o recién generado si el nivel es aleatorio. */
export function mapaDelNivel(nivel) {
  return nivel.aleatorio ? nivel.generarMapa() : nivel.mapa;
}
