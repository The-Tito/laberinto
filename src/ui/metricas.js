// Medición anónima para la cohorte 0 (CAMBIOS-cohorte-0 §3).
//
// GoatCounter, sin cookies ni localStorage. Es provisional: la herramienta
// definitiva se elige en la Fase 5, y por eso todo lo que sabe de GoatCounter
// vive en este archivo y en ningún otro.
//
// Regla dura: la medición nunca rompe el juego. Con doble clic (file://), en un
// servidor local, con ?nometricas o sin red, esto se apaga en silencio.
//
// Sólo se mide en el dominio publicado: las vistas previas de Cloudflare
// (<rama>.juego-laberinto.pages.dev) también son https, y medirlas mezclaría las
// pruebas con los datos del canal.
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
export const DOMINIO_PUBLICADO = 'juego-laberinto.pages.dev';

/** Envío real: el pixel de GoatCounter. Los fallos llegan como evento, no lanzan. */
function enviarConImagen(url) {
  new Image().src = url;
}

/**
 * @param {{
 *   ubicacion?: { protocol: string, hostname: string, pathname: string, search: string },
 *   enviar?: (url: string) => unknown,
 *   mostrar?: (...datos: unknown[]) => void,
 *   codigo?: string,
 *   dominio?: string,
 *   referente?: string,
 *   pantalla?: string,
 * }} opciones
 */
export function crearMetricas({
  ubicacion = globalThis.location,
  enviar = enviarConImagen,
  mostrar = (...datos) => globalThis.console?.info(...datos),
  codigo = CODIGO_GOATCOUNTER,
  dominio = DOMINIO_PUBLICADO,
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
      const publicada = ubicacion?.protocol === 'https:' && ubicacion?.hostname === dominio;
      return publicada ? 'enviar' : 'apagada';
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

  /**
   * Recurrencia (cambio 2): sólo avisa el día en que el contador sube, para que
   * recargar la página el mismo día no repita el evento.
   * @param {Parameters<typeof contarDiaDeVisita>[0]} [opciones]
   */
  function registrarDiaDeVisita(opciones) {
    const visita = contarDiaDeVisita(opciones);
    if (!visita?.esNuevoDia) return;
    if (visita.dias === 2) registrarUnaVez('visita-dia-2');
    else if (visita.dias >= 3) registrarUnaVez('visita-dia-3-mas');
  }

  return { registrarVisita, registrar, registrarUnaVez, registrarDiaDeVisita };
}

// --- Contador de visitas (CAMBIOS-cohorte-0 §4) ---------------------------
//
// Un solo registro local y anónimo: cuántos días distintos ha abierto el juego y
// cuál fue el último. Nada más. No es guardado en la nube (SPEC §11).

export const CLAVE_VISITAS = 'laberinto-visitas';

/** Fecha local AAAA-MM-DD: "un día" es el día de quien juega, no el de UTC. */
export function fechaLocal(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/**
 * Suma un día si hoy es distinto al último guardado.
 * @param {{ almacenamiento?: Storage, hoy?: string }} [opciones]
 * @returns {{ dias: number, esNuevoDia: boolean } | null} null si no hay almacenamiento
 */
export function contarDiaDeVisita({ almacenamiento, hoy = fechaLocal() } = {}) {
  try {
    // Leer localStorage puede lanzar por sí solo (Safari privado, cookies bloqueadas).
    const guardado = almacenamiento ?? globalThis.localStorage;
    if (!guardado) return null;

    let anterior = null;
    try {
      anterior = JSON.parse(guardado.getItem(CLAVE_VISITAS));
    } catch {
      // Registro dañado: se empieza de nuevo.
    }
    const dias = Number.isInteger(anterior?.dias) && anterior.dias > 0 ? anterior.dias : 0;
    if (dias > 0 && anterior.ultima === hoy) return { dias, esNuevoDia: false };

    const nuevo = { dias: dias + 1, ultima: hoy };
    guardado.setItem(CLAVE_VISITAS, JSON.stringify(nuevo));
    return { dias: nuevo.dias, esNuevoDia: true };
  } catch {
    return null;
  }
}
