// Texto → tokens. Cada token recuerda su línea, porque todos los mensajes de
// error del spec §6 nombran una línea.

import { CODIGOS, error } from './errors.js';

export const TIPOS = {
  NOMBRE: 'NOMBRE',
  NUMERO: 'NUMERO',
  ABRE_PAREN: 'ABRE_PAREN',
  CIERRA_PAREN: 'CIERRA_PAREN',
  ABRE_LLAVE: 'ABRE_LLAVE',
  CIERRA_LLAVE: 'CIERRA_LLAVE',
  PUNTO_Y_COMA: 'PUNTO_Y_COMA',
  FIN: 'FIN',
};

const SIMBOLOS = {
  '(': TIPOS.ABRE_PAREN,
  ')': TIPOS.CIERRA_PAREN,
  '{': TIPOS.ABRE_LLAVE,
  '}': TIPOS.CIERRA_LLAVE,
  ';': TIPOS.PUNTO_Y_COMA,
};

const esLetra = (c) => /[A-Za-zÁÉÍÓÚÑáéíóúñ_]/.test(c);
const esDigito = (c) => c >= '0' && c <= '9';

export function tokenizar(texto) {
  const tokens = [];
  let i = 0;
  let linea = 1;

  while (i < texto.length) {
    const c = texto[i];

    if (c === '\n') {
      linea++;
      i++;
      continue;
    }

    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }

    // Comentarios de línea: aparecen en la hoja impresa como anotaciones.
    if (c === '/' && texto[i + 1] === '/') {
      while (i < texto.length && texto[i] !== '\n') i++;
      continue;
    }

    if (SIMBOLOS[c]) {
      tokens.push({ tipo: SIMBOLOS[c], valor: c, linea });
      i++;
      continue;
    }

    if (esLetra(c)) {
      let inicio = i;
      while (i < texto.length && (esLetra(texto[i]) || esDigito(texto[i]))) i++;
      tokens.push({ tipo: TIPOS.NOMBRE, valor: texto.slice(inicio, i), linea });
      continue;
    }

    if (esDigito(c)) {
      let inicio = i;
      while (i < texto.length && esDigito(texto[i])) i++;
      tokens.push({
        tipo: TIPOS.NUMERO,
        valor: Number(texto.slice(inicio, i)),
        linea,
      });
      continue;
    }

    // Cualquier otra cosa. Cae aquí, entre otros, el "!" que el spec §2 prohíbe.
    throw error(CODIGOS.SIMBOLO_DESCONOCIDO, { simbolo: c, linea });
  }

  tokens.push({ tipo: TIPOS.FIN, valor: null, linea });
  return tokens;
}
