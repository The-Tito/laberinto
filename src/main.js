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
import { crearEnlace, URL_FORMULARIO, URL_CANAL } from './ui/enlaces.js';
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
const pistasVistas = new Map(); // nivel → cuántas pistas ha abierto
let nodoPista = null; // la pista en consola, para cambiarla sin borrar el error

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
  // Las pistas no se ofrecen antes de que hagan falta (SPEC §10): el botón sólo
  // existe en los niveles donde ya fallaron 3 veces.
  $('pista-btn').hidden = (fallosPorNivel.get(nivel.numero) ?? 0) < 3;
  $('pista-btn').classList.remove('resaltado');

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
  // Una pista pedida a media corrida la borraría el mensaje final.
  $('pista-btn').disabled = corriendo;
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
        if (nivel.numero === 4 || nivel.esBonus) ofrecerMasNiveles();
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

// --- Puerta "Quiero más niveles" (CAMBIOS-cohorte-0 §5) ---------------------
//
// Mide si quieren más sin prometer nada que no exista: al primer clic dice la
// verdad y los manda a opinar.

function enlaceFormulario(texto) {
  return crearEnlace(texto, URL_FORMULARIO, () => metricas.registrarUnaVez('feedback-clic'));
}

function enlaceCanal(texto) {
  return crearEnlace(texto, URL_CANAL, () => metricas.registrarUnaVez('canal-clic'));
}

function ofrecerMasNiveles() {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton';
  boton.textContent = 'Quiero más niveles →';
  boton.addEventListener('click', () => {
    metricas.registrarUnaVez('mas-niveles-clic');
    const respuesta = document.createElement('p');
    respuesta.className = 'puerta';
    respuesta.append(
      'Todavía no existen — tú decides si los construyo. Cuéntame qué te pareció y vota en el canal qué sigue. ',
      enlaceFormulario('Dar mi opinión (1 min)'),
    );
    if (URL_CANAL) {
      // El link del canal sólo abre en la app de Instagram: en computadora lleva
      // a una página que pide el celular. Ahí se dice dónde está, sin link.
      const tactil = document.createElement('span');
      tactil.className = 'solo-tactil';
      tactil.append(' · ', enlaceCanal('Ir al canal'));
      const compu = document.createElement('span');
      compu.className = 'solo-compu';
      compu.textContent = 'El canal se abre desde la app de Instagram en tu celular.';
      respuesta.append(tactil, compu);
    }
    boton.replaceWith(respuesta);
  });
  consola.agregar(boton);
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

// Se llama DESPUÉS de escribir el mensaje del fallo: el empujón va como anexo
// debajo de ese mensaje, y el siguiente escribir() lo borra.
function contarFallo() {
  const fallos = (fallosPorNivel.get(nivel.numero) ?? 0) + 1;
  fallosPorNivel.set(nivel.numero, fallos);
  // El contador no se reinicia: el empujón sale una vez por nivel y por sesión.
  if (fallos !== 3) return;

  metricas.registrarUnaVez(`n${nivel.numero}-3-fallos`);
  // La frase que el SPEC §10 le da al guía: enseña a depurar, no sólo a pasar.
  const empujon = document.createElement('p');
  empujon.className = 'nota-consola';
  empujon.textContent =
    '¿Y si lo corres en Cámara lenta? Mira en qué línea el personaje hace algo que no esperabas.';
  consola.agregar(empujon);
  $('pista-btn').hidden = false;
  $('pista-btn').classList.add('resaltado');
}

// --- Pistas escalonadas (CAMBIOS-cohorte-0 §7b) -----------------------------
//
// No se ofrecen antes de que hagan falta (SPEC §10): el botón aparece, resaltado,
// al tercer fallo en el nivel y ahí se queda. Cada toque abre una más.

function mostrarPista() {
  $('pista-btn').classList.remove('resaltado');

  const vistas = Math.min((pistasVistas.get(nivel.numero) ?? 0) + 1, nivel.pistas.length);
  const yaEranTodas = pistasVistas.get(nivel.numero) === nivel.pistas.length;
  pistasVistas.set(nivel.numero, vistas);
  metricas.registrarUnaVez(`n${nivel.numero}-pista-${vistas}`);

  const texto = `Pista ${vistas} de ${nivel.pistas.length} · ${nivel.pistas[vistas - 1]}`;
  // Debajo del mensaje actual, sin borrar el error que están leyendo.
  if (!nodoPista?.isConnected) {
    nodoPista = document.createElement('p');
    nodoPista.className = 'nota-consola';
    consola.agregar(nodoPista);
  }
  nodoPista.textContent = yaEranTodas ? `Esas son todas las pistas de este nivel. ${texto}` : texto;
  editor.enfocar();
}

// --- Aviso en pantallas angostas (CAMBIOS-cohorte-0 §7) -------------------
//
// Sólo sugiere: el juego no se bloquea en el celular. El CSS decide cuándo se ve.

$('cerrar-aviso').addEventListener('click', () => {
  $('aviso-movil').hidden = true;
});
$('copiar-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $('copiar-link').textContent = '¡Copiado!';
  } catch {
    // Navegadores dentro de apps a veces no dejan copiar: se muestra el link
    // para copiarlo a mano.
    const url = document.createElement('span');
    url.className = 'aviso-url';
    url.textContent = location.href;
    $('copiar-link').replaceWith(url);
  }
});

// --- Controles ------------------------------------------------------------

$('pista-btn').addEventListener('click', mostrarPista);

// Link permanente al formulario (CAMBIOS-cohorte-0 §6): también quien abandona
// debe poder opinar, y es justo quien más información da.
$('opinion').href = URL_FORMULARIO;
$('opinion').addEventListener('click', () => metricas.registrarUnaVez('feedback-clic'));

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
metricas.registrarDiaDeVisita();
