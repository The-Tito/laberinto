// Medición anónima para la cohorte 0 (CAMBIOS-cohorte-0 §3).
//
// GoatCounter, sin cookies ni localStorage. Es provisional: la herramienta
// definitiva se elige en la Fase 5, y por eso todo lo que sabe de GoatCounter
// vive en este archivo y en ningún otro.
//
// Regla dura: la medición nunca rompe el juego. Con doble clic (file://), en un
// servidor local, con ?nometricas o sin red, esto se apaga en silencio.
//
// Para probar a mano: ?depurar-metricas escribe cada evento en la consola del
// navegador en vez de enviarlo. Funciona también con doble clic.
//
// El envío y la ubicación entran por parámetro para que los tests corran en Node,
// igual que generarLaberinto recibe `aleatorio`.
//
// Formato del endpoint (goatcounter.com/help/pixel):
//   GET https://CODIGO.goatcounter.com/count?p=<ruta o evento>&e=true
//   p   ruta o nombre del evento; un evento no puede empezar con "/"
//   e   true si es evento
//   r   referente · q  query de la página (campañas) · s  "ancho,alto,escala"
//   rnd ignorado; sólo evita caché

export const CODIGO_GOATCOUNTER = 'antonio-selvas';

/** Envío real: el pixel de GoatCounter. Los fallos llegan como evento, no lanzan. */
function enviarConImagen(url) {
  new Image().src = url;
}

/**
 * @param {{
 *   ubicacion?: { protocol: string, pathname: string, search: string },
 *   enviar?: (url: string) => unknown,
 *   mostrar?: (...datos: unknown[]) => void,
 *   codigo?: string,
 *   referente?: string,
 *   pantalla?: string,
 * }} opciones
 */
export function crearMetricas({
  ubicacion = globalThis.location,
  enviar = enviarConImagen,
  mostrar = (...datos) => globalThis.console?.info(...datos),
  codigo = CODIGO_GOATCOUNTER,
  referente = '',
  pantalla = '',
} = {}) {
  const enviados = new Set();

  /** @returns {'apagada' | 'depurar' | 'enviar'} */
  function modo() {
    try {
      const query = new URLSearchParams(ubicacion?.search ?? '');
      if (query.has('nometricas')) return 'apagada';
      if (query.has('depurar-metricas')) return 'depurar';
      return ubicacion?.protocol === 'https:' ? 'enviar' : 'apagada';
    } catch {
      return 'apagada';
    }
  }

  function mandar(parametros) {
    const actual = modo();
    if (actual === 'apagada') return;
    try {
      if (actual === 'depurar') {
        mostrar('[métricas]', parametros.e ? `evento ${parametros.p}` : 'visita', parametros);
        return;
      }
      const url = new URL(`https://${codigo}.goatcounter.com/count`);
      for (const [clave, valor] of Object.entries(parametros)) {
        if (valor) url.searchParams.set(clave, valor);
      }
      url.searchParams.set('rnd', Math.random().toString(36).slice(2));
      const respuesta = enviar(url.toString());
      respuesta?.catch?.(() => {});
    } catch {
      // Sin red, bloqueada o lo que sea: el juego sigue.
    }
  }

  /** Pageview al abrir. `q` lleva el ?ref=canal para separar la campaña. */
  function registrarVisita() {
    mandar({
      p: ubicacion?.pathname || '/',
      q: ubicacion?.search,
      r: referente,
      s: pantalla,
    });
  }

  /** @param {string} nombre p. ej. "n3-error-LIMITE_PASOS" */
  function registrar(nombre) {
    mandar({ p: nombre.replace(/^\/+/, ''), e: 'true' });
  }

  /** Igual que registrar, pero un mismo evento sale una sola vez por sesión. */
  function registrarUnaVez(nombre) {
    if (enviados.has(nombre)) return;
    enviados.add(nombre);
    registrar(nombre);
  }

  return { registrarVisita, registrar, registrarUnaVez };
}
