// Marcador de bloques y consola de mensajes.
//
// El marcador es de golf, no de duelo (spec §5): se compite contra el par del
// nivel, nunca contra el hermano. Por eso aquí no hay ni puede haber nada que
// compare a los dos jugadores.

export function crearMarcador(contenedor) {
  /**
   * @param {number|null} bloques null mientras el programa no se puede leer
   * @param {number} par
   */
  function mostrar(bloques, par) {
    const cuadros = document.createElement('div');
    cuadros.className = 'cuadros';

    const total = Math.max(par, bloques ?? 0);
    for (let i = 0; i < total; i++) {
      const cuadro = document.createElement('span');
      cuadro.className = 'cuadro';
      if (bloques !== null && i < bloques) {
        cuadro.classList.add(i < par ? 'lleno' : 'excedido');
      }
      cuadros.append(cuadro);
    }

    const cuenta = document.createElement('span');
    cuenta.className = 'cuenta';
    cuenta.textContent = `${bloques ?? '–'} / ${par}`;
    if (bloques !== null && bloques <= par) cuenta.classList.add('en-par');

    const rotulo = document.createElement('span');
    rotulo.textContent = 'Bloques';

    contenedor.replaceChildren(rotulo, cuadros, cuenta);
  }

  return { mostrar };
}

export function crearConsola(elemento) {
  function escribir(texto, tipo = 'normal') {
    elemento.textContent = texto;
    elemento.classList.toggle('error', tipo === 'error');
    elemento.classList.toggle('exito', tipo === 'exito');
  }

  return { escribir };
}
