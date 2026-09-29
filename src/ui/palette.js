// Panel de comandos (spec §7). Doble función: acelera el tipeo — que a los 13
// años es cuello de botella real — y es la documentación siempre visible.
//
// La marca ‸ de las plantillas indica dónde queda el cursor tras insertar.

export const COMANDOS = [
  {
    grupo: 'Acciones',
    nombre: 'avanzar',
    plantilla: 'avanzar();\n‸',
    etiqueta: 'avanzar();',
    ayuda: 'Un paso hacia donde estás mirando.',
  },
  {
    grupo: 'Acciones',
    nombre: 'girarDerecha',
    plantilla: 'girarDerecha();\n‸',
    etiqueta: 'girarDerecha();',
    ayuda: 'Gira a la derecha sin moverte de la casilla.',
  },
  {
    grupo: 'Acciones',
    nombre: 'girarIzquierda',
    plantilla: 'girarIzquierda();\n‸',
    etiqueta: 'girarIzquierda();',
    ayuda: 'Gira a la izquierda sin moverte de la casilla.',
  },
  {
    grupo: 'Preguntas',
    nombre: 'caminoLibre',
    plantilla: 'caminoLibre()',
    etiqueta: 'caminoLibre()',
    ayuda: '¿Está libre la casilla de enfrente? Va dentro de un si o un mientras.',
  },
  {
    grupo: 'Preguntas',
    nombre: 'caminoLibreDerecha',
    plantilla: 'caminoLibreDerecha()',
    etiqueta: 'caminoLibreDerecha()',
    ayuda: '¿Está libre la casilla de tu derecha?',
  },
  {
    grupo: 'Estructuras',
    nombre: 'repetir',
    plantilla: 'repetir (4) {\n  ‸\n}\n',
    etiqueta: 'repetir (4) {\n  \n}',
    ayuda: 'Repite lo de adentro el número de veces que le pongas.',
  },
  {
    grupo: 'Estructuras',
    nombre: 'si',
    plantilla: 'si (caminoLibre()) {\n  ‸\n} sino {\n  \n}\n',
    etiqueta: 'si (caminoLibre()) {\n  \n} sino {\n  \n}',
    ayuda: 'Una cosa u otra, según la respuesta a la pregunta.',
  },
  {
    grupo: 'Estructuras',
    nombre: 'mientras',
    plantilla: 'mientras (caminoLibre()) {\n  ‸\n}\n',
    etiqueta: 'mientras (caminoLibre()) {\n  \n}',
    ayuda: 'Repite mientras la respuesta siga siendo sí.',
  },
  {
    grupo: 'Estructuras',
    nombre: 'repetirHastaLaMeta',
    plantilla: 'repetirHastaLaMeta {\n  ‸\n}\n',
    etiqueta: 'repetirHastaLaMeta {\n  \n}',
    ayuda: 'Repite hasta que el robot pise la meta.',
  },
];

export function crearPaleta(contenedor, { alInsertar }) {
  /**
   * @param {string[]} permitidos comandos desbloqueados en el nivel
   * @param {string[]} nuevos comandos que se acaban de desbloquear
   */
  function mostrar(permitidos, nuevos = []) {
    const visibles = COMANDOS.filter((comando) => permitidos.includes(comando.nombre));
    const nodos = [];
    let grupoActual = null;

    for (const comando of visibles) {
      if (comando.grupo !== grupoActual) {
        grupoActual = comando.grupo;
        const titulo = document.createElement('div');
        titulo.className = 'grupo';
        titulo.textContent = grupoActual;
        nodos.push(titulo);
      }

      const boton = document.createElement('button');
      boton.className = 'comando';
      boton.type = 'button';
      boton.setAttribute('aria-label', `Insertar ${comando.nombre}`);
      boton.title = comando.ayuda;
      if (nuevos.includes(comando.nombre)) boton.classList.add('nuevo');

      const codigo = document.createElement('span');
      codigo.textContent = comando.etiqueta;
      const ayuda = document.createElement('small');
      ayuda.textContent = comando.ayuda;
      boton.append(codigo, ayuda);

      boton.addEventListener('click', () => alInsertar(comando.plantilla));
      nodos.push(boton);
    }

    contenedor.replaceChildren(...nodos);
  }

  return { mostrar };
}
