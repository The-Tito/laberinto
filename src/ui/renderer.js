// Dibujo del mapa en Canvas 2D (spec §7).
//
// Todo es bloque duro: sin esquinas redondeadas, sin degradados, sin suavizado.
// La orientación del robot tiene que leerse de un vistazo desde el otro lado del
// escritorio, así que es una cuña negra sobre lima, no un adorno.

import { DIRECCIONES } from '../game/world.js';

const MARGEN = 20; // espacio para la numeración del borde
const CELDA_MAX = 64;
const CELDA_MIN = 14;

export function crearRenderizador(canvas) {
  const ctx = canvas.getContext('2d');
  const estilo = getComputedStyle(document.documentElement);
  const color = (nombre) => estilo.getPropertyValue(nombre).trim();

  function medir(mundo) {
    const caja = canvas.parentElement.getBoundingClientRect();
    const disponibleAncho = Math.max(160, caja.width - 32) - MARGEN;
    const disponibleAlto = Math.max(160, caja.height - 32) - MARGEN;
    const celda = Math.floor(
      Math.min(disponibleAncho / mundo.ancho, disponibleAlto / mundo.alto, CELDA_MAX),
    );
    return Math.max(CELDA_MIN, celda);
  }

  /**
   * @param {import('../game/world.js').Mundo} mundo
   * @param {{ recorrido?: Set<string>, llego?: boolean }} estado
   */
  function dibujar(mundo, estado = {}) {
    const celda = medir(mundo);
    const ancho = mundo.ancho * celda + MARGEN;
    const alto = mundo.alto * celda + MARGEN;
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== Math.round(ancho * dpr) || canvas.height !== Math.round(alto * dpr)) {
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      canvas.style.width = `${ancho}px`;
      canvas.style.height = `${alto}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, ancho, alto);

    const tinta = color('--tinta');
    const papel = color('--papel');
    const hueso = color('--hueso');
    const lima = color('--lima');
    const gris = color('--gris');

    dibujarNumeracion(mundo, celda, gris);

    for (let y = 0; y < mundo.alto; y++) {
      for (let x = 0; x < mundo.ancho; x++) {
        const px = MARGEN + x * celda;
        const py = MARGEN + y * celda;
        const esPared = mundo.esPared(x, y);

        if (esPared) {
          ctx.fillStyle = tinta;
          ctx.fillRect(px, py, celda, celda);
          continue;
        }

        ctx.fillStyle = papel;
        ctx.fillRect(px, py, celda, celda);

        // Rastro: por dónde ya pasó. Sirve para depurar sin decir nada.
        if (estado.recorrido?.has(`${x},${y}`)) {
          ctx.fillStyle = 'rgba(17,17,17,0.10)';
          ctx.fillRect(px, py, celda, celda);
        }

        // Punto de retícula: textura de papel milimétrico.
        ctx.fillStyle = 'rgba(17,17,17,0.16)';
        ctx.fillRect(px + celda / 2 - 1, py + celda / 2 - 1, 2, 2);
      }
    }

    dibujarMeta(mundo, celda, { tinta, lima, hueso, llego: estado.llego });
    dibujarRobot(mundo, celda, { tinta, lima });
  }

  function dibujarNumeracion(mundo, celda, gris) {
    ctx.fillStyle = gris;
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let x = 0; x < mundo.ancho; x++) {
      ctx.fillText(String(x), MARGEN + x * celda + celda / 2, MARGEN / 2);
    }
    for (let y = 0; y < mundo.alto; y++) {
      ctx.fillText(String(y), MARGEN / 2, MARGEN + y * celda + celda / 2);
    }
  }

  function dibujarMeta(mundo, celda, { tinta, lima, hueso, llego }) {
    const px = MARGEN + mundo.meta.x * celda;
    const py = MARGEN + mundo.meta.y * celda;

    if (llego) {
      ctx.fillStyle = lima;
      ctx.fillRect(px, py, celda, celda);
    }

    // Diana de cuadros concéntricos: legible a cualquier tamaño de celda.
    const paso = Math.max(2, Math.floor(celda / 8));
    ctx.strokeStyle = tinta;
    ctx.lineWidth = paso;
    for (let i = 1; i <= 2; i++) {
      const inset = paso * (i * 2 - 1);
      ctx.strokeRect(px + inset, py + inset, celda - inset * 2, celda - inset * 2);
    }
    ctx.fillStyle = llego ? tinta : hueso;
    ctx.fillRect(px + celda / 2 - paso, py + celda / 2 - paso, paso * 2, paso * 2);
  }

  function dibujarRobot(mundo, celda, { tinta, lima }) {
    const cx = MARGEN + mundo.x * celda + celda / 2;
    const cy = MARGEN + mundo.y * celda + celda / 2;
    const lado = celda * 0.78;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = lima;
    ctx.fillRect(-lado / 2, -lado / 2, lado, lado);
    ctx.strokeStyle = tinta;
    ctx.lineWidth = 2;
    ctx.strokeRect(-lado / 2, -lado / 2, lado, lado);

    // La cuña apunta a donde mira: 0 = Este, y de ahí en sentido horario.
    ctx.rotate((mundo.direccion * Math.PI) / 2);
    const r = lado * 0.32;
    ctx.fillStyle = tinta;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.75, -r * 0.9);
    ctx.lineTo(-r * 0.75, r * 0.9);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /** Nombre de la dirección, para la etiqueta del panel. */
  function nombreDireccion(mundo) {
    return DIRECCIONES[mundo.direccion].nombre;
  }

  return { dibujar, nombreDireccion };
}
