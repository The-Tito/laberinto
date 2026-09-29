// Cableado de la aplicación.
//
// El núcleo (lang/, runtime/, game/) no sabe que existe el DOM; este archivo es
// el único que conoce a los dos lados.

import { NIVELES, nivelPorNumero, mapaDelNivel } from './game/levels.js';
import { Mundo } from './game/world.js';
import { parsear } from './lang/parser.js';
import { contarBloques } from './lang/blocks.js';
import { esErrorDelJuego } from './lang/errors.js';
import { ejecutar } from './runtime/interpreter.js';

import { crearEditor } from './ui/editor.js';
import { crearRenderizador } from './ui/renderer.js';
import { crearPaleta } from './ui/palette.js';
import { crearMarcador, crearConsola } from './ui/hud.js';
import { crearMetricas } from './ui/metricas.js';
import {
  crearCorredor,
  VELOCIDAD_NORMAL,
  VELOCIDAD_LENTA,
  TOPE_ANIMACION_MS,
} from './ui/runner.js';

const $ = (id) => document.getElementById(id);

const editor = crearEditor({
  textarea: $('codigo'),
  gutter: $('gutter'),
  espejo: $('espejo'),
  banda: $('banda'),
});
const renderizador = crearRenderizador($('mapa'));
const paleta = crearPaleta($('comandos'), { alInsertar: (plantilla) => editor.insertar(plantilla) });
const marcador = crearMarcador($('marcador'));
const consola = crearConsola($('consola'));
const corredor = crearCorredor();
const metricas = crearMetricas({
  referente: document.referrer,
  pantalla: `${screen.width},${screen.height},${devicePixelRatio}`,
});

const borradores = new Map(); // el programa de cada nivel se conserva al cambiar
let nivel = NIVELES[0];
let mundo = null;
let recorrido = new Set();
let corridasBonus = 0; // para bonus-5-corridas
// Un solo contador por nivel: errores y corridas sin meta suman igual. Al tercero
// es cuando alguien empieza a atorarse de verdad (CAMBIOS-cohorte-0 §3).
const fallosPorNivel = new Map();

// --- Dibujo ---------------------------------------------------------------

function redibujar(llego = false) {
  renderizador.dibujar(mundo, { recorrido, llego });
  $('nota-mapa').textContent = `${mundo.ancho}×${mundo.alto} · mira al ${renderizador.nombreDireccion(mundo)}`;
}

function marcarPosicion() {
  recorrido.add(`${mundo.x},${mundo.y}`);
}

// --- Niveles --------------------------------------------------------------

function pintarNavegacion() {
  const fichas = NIVELES.map((n) => {
    const boton = document.createElement('button');
    boton.className = 'ficha-nivel';
    boton.type = 'button';
    if (n.esBonus) boton.classList.add('bonus');
    boton.textContent = n.esBonus ? 'BONUS' : String(n.numero).padStart(2, '0');
    boton.setAttribute('aria-current', String(n.numero === nivel.numero));
    boton.title = `Nivel ${n.numero} · ${n.titulo}`;
    boton.addEventListener('click', () => cargarNivel(n.numero));
    return boton;
  });
  $('niveles').replaceChildren(...fichas);
}

function cargarNivel(numero, { conservarBorrador = true } = {}) {
  if (mundo && conservarBorrador) borradores.set(nivel.numero, editor.valor);

  corredor.detener();
  nivel = nivelPorNumero(numero);
  mundo = new Mundo(mapaDelNivel(nivel));
  recorrido = new Set();
  marcarPosicion();

  $('titulo-nivel').textContent = nivel.titulo;
  $('descubrimiento').textContent = nivel.descubrimiento;
  $('pista').textContent = nivel.pista;
  $('etiqueta-mapa').textContent = nivel.aleatorio ? 'Mapa · cambia en cada corrida' : 'Mapa';

  paleta.mostrar(nivel.permitidos, nivel.esBonus ? ['repetirHastaLaMeta'] : []);
  pintarNavegacion();

  editor.limpiarResaltado();
  editor.valor = borradores.get(nivel.numero) ?? '';

  consola.escribir(
    nivel.esBonus
      ? 'Bonus: el laberinto cambia cada vez que corres. Se desbloqueó repetirHastaLaMeta.'
      : `Nivel ${nivel.numero}. ${nivel.pista}`,
  );

  redibujar();
  editor.enfocar();
}

// --- Marcador de bloques en vivo ------------------------------------------

function actualizarMarcador() {
  let bloques = null;
  try {
    bloques = contarBloques(parsear(editor.valor, { permitidos: nivel.permitidos }));
  } catch {
    // Mientras escriben, un programa a medias no es un error: sólo no se cuenta.
    bloques = null;
  }
  marcador.mostrar(bloques, nivel.par);
}

editor.alCambiar(() => {
  actualizarMarcador();
  // En cuanto tocan el código, la marca de la corrida anterior ya no dice nada:
  // se refiere a un programa que dejó de existir. El mensaje de la consola sí se
  // queda, porque ese sigue sirviendo mientras lo arreglan.
  editor.limpiarResaltado();
});

// --- Ejecución ------------------------------------------------------------

function prepararMundo() {
  // Spec §4: el nivel 5 estrena laberinto en cada corrida.
  if (nivel.aleatorio) {
    mundo = new Mundo(mapaDelNivel(nivel));
  } else {
    mundo.reiniciar();
  }
  recorrido = new Set();
  marcarPosicion();
}

function fijarBotones(corriendo, cual) {
  $('correr').disabled = corriendo;
  $('lento').disabled = corriendo;
  $('correr').classList.toggle('corriendo', corriendo && cual === 'correr');
  $('lento').classList.toggle('corriendo', corriendo && cual === 'lento');
}

function correr(intervalo, cual) {
  metricas.registrarUnaVez(`n${nivel.numero}-primera-corrida`);
  if (cual === 'lento') metricas.registrarUnaVez('camara-lenta');
  if (nivel.esBonus && ++corridasBonus === 5) metricas.registrarUnaVez('bonus-5-corridas');

  corredor.detener();
  editor.limpiarResaltado();
  prepararMundo();
  redibujar();

  let ast;
  try {
    ast = parsear(editor.valor, { permitidos: nivel.permitidos });
  } catch (fallo) {
    return reportarFallo(fallo);
  }

  const bloques = contarBloques(ast);
  fijarBotones(true, cual);
  consola.escribir('Corriendo… (Reiniciar lo detiene)');

  corredor.correr(ejecutar(ast, mundo, { limitePasos: nivel.limitePasos }), {
    intervalo,
    // La cámara lenta no se acota: es la herramienta de depuración y ahí sí
    // quieren ver cada paso. Para cortarla está Reiniciar, que nunca se apaga.
    tope: cual === 'correr' ? TOPE_ANIMACION_MS : null,
    alPaso: (evento, { animado }) => {
      marcarPosicion();
      if (!animado) return;
      editor.resaltar(evento.linea);
      redibujar();
    },
    alFin: (resultado) => {
      fijarBotones(false);
      marcarPosicion();
      redibujar(resultado.llego);

      if (resultado.llego) {
        editor.limpiarResaltado();
        consola.escribir(mensajeDeVictoria(bloques), 'exito');
        metricas.registrarUnaVez(`n${nivel.numero}-completado`);
        if (bloques <= nivel.par) metricas.registrarUnaVez(`n${nivel.numero}-en-par`);
      } else {
        // Que vean DÓNDE se detuvo, no sólo que se detuvo (spec §6).
        editor.resaltar(resultado.ultimaLinea, { error: true });
        consola.escribir(
          `Tu programa terminó en la línea ${resultado.ultimaLinea} y el robot no llegó a la meta. ¿Qué le faltó por hacer?`,
        );
        metricas.registrarUnaVez(`n${nivel.numero}-sin-meta`);
        contarFallo();
      }
    },
    alError: (fallo) => {
      fijarBotones(false);
      redibujar();
      reportarFallo(fallo);
    },
  });
}

function mensajeDeVictoria(bloques) {
  const par = nivel.par;
  if (nivel.esBonus) {
    return `Llegaste — y ese laberinto no lo había visto nadie. ${bloques} bloques.`;
  }
  if (bloques < par) return `Llegaste en ${bloques} bloques. Bajo par (${par}).`;
  if (bloques === par) return `Llegaste en ${bloques} bloques. Justo en el par.`;
  return `Llegaste en ${bloques} bloques. El par es ${par}: ¿se puede decir más corto?`;
}

function reportarFallo(fallo) {
  fijarBotones(false);
  if (!esErrorDelJuego(fallo)) throw fallo;
  metricas.registrarUnaVez(`n${nivel.numero}-error-${fallo.codigo}`);
  consola.escribir(fallo.mensaje, 'error');
  if (fallo.linea) editor.resaltar(fallo.linea, { error: true });
  else editor.limpiarResaltado();
  contarFallo();
}

function contarFallo() {
  const fallos = (fallosPorNivel.get(nivel.numero) ?? 0) + 1;
  fallosPorNivel.set(nivel.numero, fallos);
  if (fallos === 3) metricas.registrarUnaVez(`n${nivel.numero}-3-fallos`);
}

// --- Controles ------------------------------------------------------------

$('correr').addEventListener('click', () => correr(VELOCIDAD_NORMAL, 'correr'));
$('lento').addEventListener('click', () => correr(VELOCIDAD_LENTA, 'lento'));
$('reiniciar').addEventListener('click', () => {
  corredor.detener();
  fijarBotones(false);
  mundo.reiniciar();
  recorrido = new Set();
  marcarPosicion();
  editor.limpiarResaltado();
  redibujar();
  consola.escribir('Robot de vuelta al inicio. Tu programa sigue ahí.');
});

document.addEventListener('keydown', (evento) => {
  if ((evento.metaKey || evento.ctrlKey) && evento.key === 'Enter') {
    evento.preventDefault();
    correr(evento.shiftKey ? VELOCIDAD_LENTA : VELOCIDAD_NORMAL, evento.shiftKey ? 'lento' : 'correr');
  }
});

window.addEventListener('resize', () => redibujar());

// --- Arranque -------------------------------------------------------------

cargarNivel(1, { conservarBorrador: false });
actualizarMarcador();
metricas.registrarVisita();
