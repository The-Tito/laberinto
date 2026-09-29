// El mundo: retícula, robot y sensores. Sin una sola referencia al DOM, para que
// los tests del spec §8 lo corran tal cual en Node.
//
// Notación del mapa (spec §4): '#' pared · '.' camino · 'S' inicio · 'M' meta.
// El robot siempre empieza mirando al Este.

export const ESTE = 0;
export const SUR = 1;
export const OESTE = 2;
export const NORTE = 3;

export const DIRECCIONES = [
  { dx: 1, dy: 0, nombre: 'este' },
  { dx: 0, dy: 1, nombre: 'sur' },
  { dx: -1, dy: 0, nombre: 'oeste' },
  { dx: 0, dy: -1, nombre: 'norte' },
];

export class Mundo {
  /** @param {string[]} filas mapa en ASCII, una cadena por fila */
  constructor(filas) {
    this.filas = filas.map((fila) => fila.split(''));
    this.alto = this.filas.length;
    this.ancho = Math.max(...this.filas.map((fila) => fila.length));

    this.inicio = this.buscar('S');
    this.meta = this.buscar('M');
    if (!this.inicio) throw new Error('El mapa no tiene inicio (S).');
    if (!this.meta) throw new Error('El mapa no tiene meta (M).');

    this.reiniciar();
  }

  /** Acepta el mapa como texto multilínea, que es como se lee en el spec. */
  static desdeTexto(texto) {
    const filas = texto
      .trim()
      .split('\n')
      .map((fila) => fila.trim())
      .filter((fila) => fila.length > 0);
    return new Mundo(filas);
  }

  buscar(simbolo) {
    for (let y = 0; y < this.filas.length; y++) {
      const x = this.filas[y].indexOf(simbolo);
      if (x !== -1) return { x, y };
    }
    return null;
  }

  reiniciar() {
    this.x = this.inicio.x;
    this.y = this.inicio.y;
    this.direccion = ESTE;
    this.pasosDados = 0;
  }

  celda(x, y) {
    if (y < 0 || y >= this.alto) return '#';
    const fila = this.filas[y];
    if (x < 0 || x >= fila.length) return '#';
    return fila[x];
  }

  esPared(x, y) {
    return this.celda(x, y) === '#';
  }

  /** Casilla a la que apunta `direccion` desde la posición actual. */
  casillaHacia(direccion) {
    const { dx, dy } = DIRECCIONES[direccion];
    return { x: this.x + dx, y: this.y + dy };
  }

  // --- Sensores (spec §3) --------------------------------------------------
  // En positivo, siempre. La negación lógica es lo primero que tumba a un
  // principiante, así que el lenguaje no la tiene (spec §2).

  caminoLibre() {
    const { x, y } = this.casillaHacia(this.direccion);
    return !this.esPared(x, y);
  }

  caminoLibreDerecha() {
    const { x, y } = this.casillaHacia((this.direccion + 1) % 4);
    return !this.esPared(x, y);
  }

  // --- Acciones ------------------------------------------------------------

  /** @returns {boolean} false si había pared: el intérprete decide qué hacer. */
  avanzar() {
    if (!this.caminoLibre()) return false;
    const { x, y } = this.casillaHacia(this.direccion);
    this.x = x;
    this.y = y;
    this.pasosDados++;
    return true;
  }

  girarDerecha() {
    this.direccion = (this.direccion + 1) % 4;
  }

  girarIzquierda() {
    this.direccion = (this.direccion + 3) % 4;
  }

  enMeta() {
    return this.x === this.meta.x && this.y === this.meta.y;
  }

  clonar() {
    const copia = new Mundo(this.filas.map((fila) => fila.join('')));
    copia.x = this.x;
    copia.y = this.y;
    copia.direccion = this.direccion;
    copia.pasosDados = this.pasosDados;
    return copia;
  }
}
