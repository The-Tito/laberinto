// Medición anónima para la cohorte 0 (CAMBIOS-cohorte-0 §3).
//
// GoatCounter, sin cookies ni localStorage. Es provisional: la herramienta
// definitiva se elige en la Fase 5, y por eso todo lo que sabe de GoatCounter
// vive en este archivo y en ningún otro.
//
// Regla dura: la medición nunca rompe el juego. Con doble clic (file://), en un
// servidor local, con ?nometricas o sin red, esto se apaga en silencio.
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
 *   codigo?: string,
 *   referente?: string,
 *   pantalla?: string,
 * }} opciones
 */
export function crearMetricas({
  ubicacion = globalThis.location,
  enviar = enviarConImagen,
  codigo = CODIGO_GOATCOUNTER,
  referente = '',
  pantalla = '',
} = {}) {
  const enviados = new Set();

  function activa() {
    try {
      if (ubicacion?.protocol !== 'https:') return false;
      return !new URLSearchParams(ubicacion.search).has('nometricas');
    } catch {
      return false;
    }
  }

  function mandar(parametros) {
    if (!activa()) return;
    try {
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
