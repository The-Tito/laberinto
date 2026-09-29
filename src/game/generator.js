// Generador de laberintos: recursive backtracker (spec §4, nivel 5).
//
// Produce laberintos PERFECTOS — exactamente un camino entre cualesquiera dos
// celdas, sin ciclos. Ese es el requisito duro: la regla de la mano derecha sólo
// funciona siempre si las paredes forman una sola pieza conectada, y un ciclo
// suelto rompería el algoritmo en vivo, enfrente de ellos (spec §8.3).
//
// El azar entra por parámetro para que un laberinto pueda congelarse con semilla
// (así se eligió el del nivel 4) y para que los tests sean reproducibles.

/** PRNG pequeño y determinista. No hay dependencias en este proyecto. */
export function crearAleatorio(semilla) {
  let estado = semilla >>> 0;
  return function aleatorio() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {{ celdasAncho?: number, celdasAlto?: number, aleatorio?: () => number }} opciones
 * @returns {string[]} filas del mapa en ASCII, con S en una esquina y M en la opuesta
 */
export function generarLaberinto({
  celdasAncho = 5,
  celdasAlto = 5,
  aleatorio = Math.random,
} = {}) {
  const ancho = celdasAncho * 2 + 1;
  const alto = celdasAlto * 2 + 1;

  // Todo pared; el algoritmo va tallando.
  const grid = Array.from({ length: alto }, () => Array.from({ length: ancho }, () => '#'));

  const enGrid = (cx, cy) => ({ x: cx * 2 + 1, y: cy * 2 + 1 });
  const visitadas = Array.from({ length: celdasAlto }, () =>
    Array.from({ length: celdasAncho }, () => false),
  );

  const vecinos = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  let cx = 0;
  let cy = 0;
  visitadas[cy][cx] = true;
  const inicio = enGrid(cx, cy);
  grid[inicio.y][inicio.x] = '.';

  const pila = [[cx, cy]];

  while (pila.length > 0) {
    [cx, cy] = pila[pila.length - 1];

    const disponibles = vecinos.filter(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return (
        nx >= 0 && nx < celdasAncho && ny >= 0 && ny < celdasAlto && !visitadas[ny][nx]
      );
    });

    if (disponibles.length === 0) {
      pila.pop();
      continue;
    }

    const [dx, dy] = disponibles[Math.floor(aleatorio() * disponibles.length)];
    const nx = cx + dx;
    const ny = cy + dy;

    // Tallar la celda nueva y el muro que la separaba de la actual.
    const desde = enGrid(cx, cy);
    const hasta = enGrid(nx, ny);
    grid[hasta.y][hasta.x] = '.';
    grid[desde.y + dy][desde.x + dx] = '.';

    visitadas[ny][nx] = true;
    pila.push([nx, ny]);
  }

  // Inicio pegado a la pared exterior (esquina), meta en la esquina opuesta.
  const s = enGrid(0, 0);
  const m = enGrid(celdasAncho - 1, celdasAlto - 1);
  grid[s.y][s.x] = 'S';
  grid[m.y][m.x] = 'M';

  return grid.map((fila) => fila.join(''));
}

/**
 * Celdas sin salida: sirven para elegir un laberinto que engañe de verdad
 * (spec §4, nivel 4 pide al menos dos callejones que engañen).
 */
export function contarCallejones(filas) {
  let total = 0;
  for (let y = 1; y < filas.length; y += 2) {
    for (let x = 1; x < filas[y].length; x += 2) {
      const salidas = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ].filter(([dx, dy]) => filas[y + dy]?.[x + dx] !== '#').length;
      if (salidas === 1) total++;
    }
  }
  return total;
}
