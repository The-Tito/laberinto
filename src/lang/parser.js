// Tokens → AST.
//
// El parser conoce el set de comandos permitidos en el nivel actual: así
// `repetirHastaLaMeta` sólo existe a partir del nivel 5 (spec §4) sin necesitar
// una gramática distinta por nivel.

import { TIPOS, tokenizar } from './tokenizer.js';
import { CODIGOS, error } from './errors.js';

export const ACCIONES = ['avanzar', 'girarDerecha', 'girarIzquierda'];
export const SENSORES = ['caminoLibre', 'caminoLibreDerecha'];
export const ESTRUCTURAS = ['repetir', 'si', 'mientras', 'repetirHastaLaMeta'];

/** Los 8 comandos del spec §2. `repetirHastaLaMeta` se suma en el nivel 5. */
export const COMANDOS_BASE = [...ACCIONES, ...SENSORES, 'repetir', 'si', 'mientras'];
export const COMANDOS_TODOS = [...COMANDOS_BASE, 'repetirHastaLaMeta'];

const VOCABULARIO = [...COMANDOS_TODOS, 'sino'];

/** Distancia de edición acotada: sólo se usa para sugerir, no para decidir. */
function distancia(a, b) {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  let previa = Array.from({ length: columnas }, (_, j) => j);
  for (let i = 1; i < filas; i++) {
    const actual = [i];
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo);
    }
    previa = actual;
  }
  return previa[columnas - 1];
}

/**
 * Busca el comando más parecido a lo que escribieron. Un chavo de 13 que escribe
 * "Avanzar" o "avansar" merece que le señalen el comando, no que le digan que no
 * existe.
 */
function sugerir(nombre, permitidos) {
  const candidatos = VOCABULARIO.filter((p) => permitidos.has(p) || p === 'sino');
  let mejor = null;
  let mejorDistancia = Infinity;
  for (const candidato of candidatos) {
    const d = distancia(nombre.toLowerCase(), candidato.toLowerCase());
    if (d < mejorDistancia) {
      mejorDistancia = d;
      mejor = candidato;
    }
  }
  const umbral = nombre.length <= 4 ? 1 : 2;
  return mejorDistancia <= umbral ? mejor : null;
}

class Parser {
  constructor(tokens, permitidos) {
    this.tokens = tokens;
    this.i = 0;
    this.permitidos = permitidos;
  }

  get actual() {
    return this.tokens[this.i];
  }

  avanzar() {
    return this.tokens[this.i++];
  }

  aceptar(tipo) {
    if (this.actual.tipo === tipo) return this.avanzar();
    return null;
  }

  exigir(tipo, codigo, datos = {}) {
    const token = this.aceptar(tipo);
    if (!token) throw error(codigo, { linea: this.actual.linea, ...datos });
    return token;
  }

  programa() {
    const cuerpo = this.sentenciasHasta(TIPOS.FIN);
    if (cuerpo.length === 0) throw error(CODIGOS.PROGRAMA_VACIO);
    return { tipo: 'programa', cuerpo };
  }

  sentenciasHasta(tipoFinal) {
    const sentencias = [];
    while (this.actual.tipo !== tipoFinal && this.actual.tipo !== TIPOS.FIN) {
      sentencias.push(this.sentencia());
    }
    return sentencias;
  }

  sentencia() {
    const token = this.actual;

    if (token.tipo === TIPOS.CIERRA_LLAVE) {
      throw error(CODIGOS.SOBRA_LLAVE, { linea: token.linea });
    }

    if (token.tipo !== TIPOS.NOMBRE) {
      throw error(CODIGOS.COMANDO_DESCONOCIDO, {
        nombre: String(token.valor ?? ''),
        linea: token.linea,
        sugerencia: null,
      });
    }

    const nombre = token.valor;

    if (nombre === 'sino') throw error(CODIGOS.SINO_SUELTO, { linea: token.linea });

    if (VOCABULARIO.includes(nombre) && !this.permitidos.has(nombre)) {
      throw error(CODIGOS.COMANDO_BLOQUEADO, { nombre, linea: token.linea });
    }

    if (nombre === 'repetir') return this.repetir();
    if (nombre === 'mientras') return this.bucleCondicional('mientras');
    if (nombre === 'si') return this.condicional();
    if (nombre === 'repetirHastaLaMeta') return this.repetirHastaLaMeta();
    if (ACCIONES.includes(nombre)) return this.accion();

    if (SENSORES.includes(nombre)) {
      throw error(CODIGOS.PREGUNTA_COMO_ACCION, { nombre, linea: token.linea });
    }

    throw error(CODIGOS.COMANDO_DESCONOCIDO, {
      nombre,
      linea: token.linea,
      sugerencia: sugerir(nombre, this.permitidos),
    });
  }

  accion() {
    const token = this.avanzar();
    const nombre = token.valor;
    if (!this.aceptar(TIPOS.ABRE_PAREN)) {
      throw error(CODIGOS.FALTAN_PARENTESIS_LLAMADA, { nombre, linea: token.linea });
    }
    this.exigir(TIPOS.CIERRA_PAREN, CODIGOS.FALTA_PARENTESIS_CIERRE);
    this.exigir(TIPOS.PUNTO_Y_COMA, CODIGOS.FALTA_PUNTO_Y_COMA, { linea: token.linea });
    return { tipo: 'accion', nombre, linea: token.linea };
  }

  repetir() {
    const token = this.avanzar();
    if (!this.aceptar(TIPOS.ABRE_PAREN)) {
      throw error(CODIGOS.FALTA_PARENTESIS_APERTURA, { nombre: 'repetir', linea: token.linea });
    }
    const numero = this.aceptar(TIPOS.NUMERO);
    if (!numero) throw error(CODIGOS.FALTA_NUMERO, { linea: token.linea });
    this.exigir(TIPOS.CIERRA_PAREN, CODIGOS.FALTA_PARENTESIS_CIERRE);
    const cuerpo = this.bloque('repetir');
    return { tipo: 'repetir', veces: numero.valor, cuerpo, linea: token.linea };
  }

  bucleCondicional(nombre) {
    const token = this.avanzar();
    const condicion = this.condicionEntreParentesis(nombre, token.linea);
    const cuerpo = this.bloque(nombre);
    return { tipo: 'mientras', condicion, cuerpo, linea: token.linea };
  }

  condicional() {
    const token = this.avanzar();
    const condicion = this.condicionEntreParentesis('si', token.linea);
    const cuerpo = this.bloque('si');

    let sino = null;
    if (this.actual.tipo === TIPOS.NOMBRE && this.actual.valor === 'sino') {
      this.avanzar();
      sino = this.bloque('sino');
    }
    return { tipo: 'si', condicion, cuerpo, sino, linea: token.linea };
  }

  repetirHastaLaMeta() {
    const token = this.avanzar();
    const cuerpo = this.bloque('repetirHastaLaMeta');
    return { tipo: 'repetirHastaLaMeta', cuerpo, linea: token.linea };
  }

  condicionEntreParentesis(nombreEstructura, lineaEstructura) {
    if (!this.aceptar(TIPOS.ABRE_PAREN)) {
      throw error(CODIGOS.FALTA_PREGUNTA, { nombre: nombreEstructura, linea: lineaEstructura });
    }
    const condicion = this.sensor();
    this.exigir(TIPOS.CIERRA_PAREN, CODIGOS.FALTA_PARENTESIS_CIERRE);
    return condicion;
  }

  sensor() {
    const token = this.actual;
    if (token.tipo !== TIPOS.NOMBRE) {
      throw error(CODIGOS.FALTA_PREGUNTA, { nombre: 'si', linea: token.linea });
    }
    const nombre = token.valor;

    if (ACCIONES.includes(nombre)) {
      throw error(CODIGOS.ACCION_COMO_PREGUNTA, { nombre, linea: token.linea });
    }
    if (!SENSORES.includes(nombre)) {
      throw error(CODIGOS.COMANDO_DESCONOCIDO, {
        nombre,
        linea: token.linea,
        sugerencia: sugerir(nombre, this.permitidos),
      });
    }
    if (!this.permitidos.has(nombre)) {
      throw error(CODIGOS.COMANDO_BLOQUEADO, { nombre, linea: token.linea });
    }

    this.avanzar();
    if (!this.aceptar(TIPOS.ABRE_PAREN)) {
      throw error(CODIGOS.FALTAN_PARENTESIS_LLAMADA, { nombre, linea: token.linea });
    }
    this.exigir(TIPOS.CIERRA_PAREN, CODIGOS.FALTA_PARENTESIS_CIERRE);
    return { tipo: 'sensor', nombre, linea: token.linea };
  }

  bloque(nombreEstructura) {
    const abre = this.aceptar(TIPOS.ABRE_LLAVE);
    if (!abre) {
      throw error(CODIGOS.FALTA_LLAVE_APERTURA, {
        nombre: nombreEstructura,
        linea: this.actual.linea,
      });
    }
    const cuerpo = this.sentenciasHasta(TIPOS.CIERRA_LLAVE);
    if (!this.aceptar(TIPOS.CIERRA_LLAVE)) {
      // La línea que importa es la de la llave que quedó abierta, no el final del archivo.
      throw error(CODIGOS.FALTA_LLAVE_CIERRE, { linea: abre.linea });
    }
    return cuerpo;
  }
}

/**
 * @param {string} texto
 * @param {{ permitidos?: string[] }} opciones comandos desbloqueados en el nivel
 * @returns {{ tipo: 'programa', cuerpo: object[] }}
 */
export function parsear(texto, { permitidos = COMANDOS_TODOS } = {}) {
  const tokens = tokenizar(texto);
  return new Parser(tokens, new Set(permitidos)).programa();
}
