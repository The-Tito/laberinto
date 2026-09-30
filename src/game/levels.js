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
    // Pistas escalonadas (CAMBIOS-cohorte-0 §7b, textos de docs/PISTAS.md):
    // pregunta que hace mirar → concepto → estructura con huecos.
    pistas: [
      '¿Qué acción repites una y otra vez para llegar a la meta? ¿Cuántas veces?',
      'Cuando algo se repite igual, hay un comando para decirlo una sola vez: repetir. Búscalo en el panel.',
      'repetir (___) { ___ }',
    ],
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
    pistas: [
      'Imagina que tú eres el personaje y estás adentro del laberinto. Cuando llegues a la esquina, ¿hacia qué lado giras tú? No pienses en la pantalla.',
      'Girar no te mueve de casilla: solo cambia hacia dónde miras. Después de girar, avanzar() te lleva hacia tu nuevo "enfrente".',
      'repetir (___) { avanzar(); } → girar______(); → repetir (___) { avanzar(); }',
    ],
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
    pistas: [
      'Si contar ya no sirve, ¿qué podría preguntarse el personaje en cada paso para saber si puede seguir?',
      'caminoLibre() contesta sí o no. Con mientras, el personaje avanza mientras haya camino, sin que tú cuentes nada.',
      'Cada tramo es igual: avanza mientras haya camino y luego gira. repetir (___) { mientras (___) { avanzar(); } ___ }',
    ],
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
    pistas: [
      'Si estuvieras en un laberinto de verdad con los ojos cerrados, ¿qué regla seguirías con una mano en la pared para no perderte?',
      'Regla de la mano derecha: si a tu derecha hay camino, gira a la derecha y avanza. Si no, y enfrente hay camino, avanza. Si tampoco, gira a la izquierda. Para elegir entre caminos se usa si / sino.',
      'repetir (40) { si (caminoLibreDerecha()) { ___ } sino { ___ } }',
    ],
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
    pistas: [
      '¿Qué parte de tu programa del nivel 4 dependía de ese mapa exacto?',
      'El 40 del nivel 4 era una apuesta. repetirHastaLaMeta repite lo necesario, ni más ni menos.',
      'Si tu regla esperaba a chocar para decidir, a veces se pierde. Prueba decidir en cada paso: repetirHastaLaMeta { si (caminoLibreDerecha()) { ___ } sino { ___ } }',
    ],
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
