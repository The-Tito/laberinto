// Scheduler: drena el generador del intérprete a la velocidad que le pidan.
//
// Toda la diferencia entre "Correr" y "Cámara lenta" está en un número (spec §7).
// La cámara lenta es la herramienta de depuración de la sesión: cuando pregunten
// "¿por qué no funciona?", la respuesta es correrlo lento y ver dónde se rompe.

export const VELOCIDAD_NORMAL = 45;
export const VELOCIDAD_LENTA = 400;

// Tope de reloj para "Correr": pasado ese tiempo se drena el resto de un tirón y
// se muestra el desenlace. Sin él, un bucle infinito tardaría medio minuto en dar
// su mensaje — y el mensaje es justo lo que necesitan ver rápido.
export const TOPE_ANIMACION_MS = 3000;

export function crearCorredor() {
  let temporizador = null;
  let generadorActual = null;

  function detener() {
    clearTimeout(temporizador);
    temporizador = null;
    generadorActual = null;
  }

  /**
   * @param {Generator} generador el del intérprete
   * @param {{ intervalo: number, alPaso: Function, alFin: Function, alError: Function }} opciones
   */
  function correr(generador, { intervalo, tope = null, alPaso, alFin, alError }) {
    detener();
    generadorActual = generador;
    const arranque = Date.now();

    /** Consume lo que queda sin animar: sólo importa el desenlace. */
    const drenar = () => {
      while (true) {
        let resultado;
        try {
          resultado = generador.next();
        } catch (fallo) {
          detener();
          alError(fallo);
          return;
        }
        if (resultado.done) {
          detener();
          alFin(resultado.value);
          return;
        }
        alPaso(resultado.value, { animado: false });
      }
    };

    const tick = () => {
      if (generadorActual !== generador) return; // lo cancelaron a medio camino

      let resultado;
      try {
        resultado = generador.next();
      } catch (fallo) {
        detener();
        alError(fallo);
        return;
      }

      if (resultado.done) {
        detener();
        alFin(resultado.value);
        return;
      }

      // El evento llega ANTES de que la línea se ejecute: se resalta, y en el
      // siguiente tick se ve su efecto. Es como se lee un depurador.
      alPaso(resultado.value, { animado: true });

      if (tope !== null && Date.now() - arranque > tope) {
        drenar();
        return;
      }
      temporizador = setTimeout(tick, intervalo);
    };

    tick();
  }

  return {
    correr,
    detener,
    get activo() {
      return generadorActual !== null;
    },
  };
}
