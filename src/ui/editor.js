// Editor: números de línea, resaltado de sintaxis y la banda de la línea que se
// está ejecutando (spec §7).
//
// Es un <textarea> transparente encima de un <pre> espejo. Las líneas no se
// parten nunca (white-space: pre), y por eso la banda puede calcularse con pura
// aritmética: línea × alto de línea. Si las líneas se partieran, el número de la
// izquierda y la banda dejarían de coincidir con lo que se ve.

const CLAVES = ['repetirHastaLaMeta', 'repetir', 'mientras', 'sino', 'si'];
const SENSORES = ['caminoLibreDerecha', 'caminoLibre'];
const ACCIONES = ['avanzar', 'girarDerecha', 'girarIzquierda'];

const PATRON = new RegExp(
  [
    '(\\/\\/[^\\n]*)',
    `\\b(${CLAVES.join('|')})\\b`,
    `\\b(${SENSORES.join('|')})\\b`,
    `\\b(${ACCIONES.join('|')})\\b`,
    '(\\d+)',
    '([(){};])',
  ].join('|'),
  'g',
);

const escapar = (texto) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function colorear(texto) {
  let salida = '';
  let ultimo = 0;
  for (const coincidencia of texto.matchAll(PATRON)) {
    const [entero, comentario, clave, sensor, accion, numero, signo] = coincidencia;
    salida += escapar(texto.slice(ultimo, coincidencia.index));
    const clase = comentario
      ? 'tok-comentario'
      : clave
        ? 'tok-clave'
        : sensor
          ? 'tok-sensor'
          : accion
            ? 'tok-accion'
            : numero
              ? 'tok-numero'
              : 'tok-signo';
    salida += `<span class="${clase}">${escapar(entero)}</span>`;
    ultimo = coincidencia.index + entero.length;
  }
  salida += escapar(texto.slice(ultimo));
  // El <pre> ignora un salto de línea final: se añade un espacio para que la
  // última línea siga midiendo lo mismo que en el textarea.
  return `${salida}\n `;
}

export function crearEditor({ textarea, gutter, espejo, banda }) {
  const raiz = getComputedStyle(document.documentElement);
  const altoLinea = parseFloat(raiz.getPropertyValue('--linea-alto'));
  const paddingSuperior = parseFloat(getComputedStyle(espejo).paddingTop);

  let lineaResaltada = null;
  let modoError = false;
  const suscriptores = [];

  function pintar() {
    const texto = textarea.value;
    espejo.innerHTML = colorear(texto);

    const lineas = texto.split('\n').length;
    if (gutter.childElementCount !== lineas) {
      gutter.replaceChildren(
        ...Array.from({ length: lineas }, (_, i) => {
          const span = document.createElement('span');
          span.textContent = String(i + 1);
          return span;
        }),
      );
      marcarGutter();
    }
    sincronizarScroll();
  }

  function marcarGutter() {
    for (const [i, span] of [...gutter.children].entries()) {
      span.classList.toggle('activa', i + 1 === lineaResaltada);
    }
  }

  function sincronizarScroll() {
    espejo.scrollTop = textarea.scrollTop;
    espejo.scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
    colocarBanda();
  }

  function colocarBanda() {
    if (lineaResaltada === null) {
      banda.classList.remove('visible', 'error');
      return;
    }
    const y = paddingSuperior + (lineaResaltada - 1) * altoLinea - textarea.scrollTop;
    banda.style.transform = `translateY(${y}px)`;
    banda.classList.toggle('error', modoError);
    banda.classList.add('visible');
  }

  function notificar() {
    for (const cb of suscriptores) cb(textarea.value);
  }

  textarea.addEventListener('input', () => {
    pintar();
    notificar();
  });
  textarea.addEventListener('scroll', sincronizarScroll);
  window.addEventListener('resize', sincronizarScroll);

  // Teclear no puede ser el cuello de botella (spec §2.5): el editor mantiene la
  // indentación por su cuenta.
  textarea.addEventListener('keydown', (evento) => {
    if (evento.key === 'Tab') {
      evento.preventDefault();
      insertar('  ');
      return;
    }
    if (evento.key === 'Enter') {
      evento.preventDefault();
      const hasta = textarea.value.slice(0, textarea.selectionStart);
      const lineaActual = hasta.slice(hasta.lastIndexOf('\n') + 1);
      const sangria = lineaActual.match(/^[ \t]*/)[0];
      const extra = lineaActual.trimEnd().endsWith('{') ? '  ' : '';
      insertar(`\n${sangria}${extra}`);
    }
  });

  /** Inserta en el cursor. La marca ‸ indica dónde queda el cursor al final. */
  function insertar(plantilla) {
    const inicio = textarea.selectionStart;
    const fin = textarea.selectionEnd;
    const texto = textarea.value;

    const hasta = texto.slice(0, inicio);
    const sangria = hasta.slice(hasta.lastIndexOf('\n') + 1).match(/^[ \t]*/)[0];

    let cuerpo = plantilla.replace(/\n/g, `\n${sangria}`);
    let desplazamiento = cuerpo.indexOf('‸');
    if (desplazamiento === -1) desplazamiento = cuerpo.length;
    else cuerpo = cuerpo.replace('‸', '');

    textarea.value = texto.slice(0, inicio) + cuerpo + texto.slice(fin);
    const caret = inicio + desplazamiento;
    textarea.setSelectionRange(caret, caret);
    textarea.focus();
    pintar();
    notificar();
  }

  pintar();

  return {
    get valor() {
      return textarea.value;
    },

    set valor(nuevo) {
      textarea.value = nuevo;
      pintar();
      notificar();
    },

    insertar,

    resaltar(linea, { error = false } = {}) {
      lineaResaltada = linea;
      modoError = error;
      marcarGutter();
      colocarBanda();
    },

    limpiarResaltado() {
      lineaResaltada = null;
      modoError = false;
      marcarGutter();
      colocarBanda();
    },

    alCambiar(cb) {
      suscriptores.push(cb);
    },

    enfocar() {
      textarea.focus();
    },
  };
}
