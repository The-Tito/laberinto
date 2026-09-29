// Catálogo de errores.
//
// Regla del spec §6: todo mensaje apunta al código, nunca a la persona, y sugiere
// la pregunta siguiente. Prohibido "error de sintaxis", stack traces, códigos de
// error visibles e inglés.
//
// Los errores viajan como objetos { codigo, linea, mensaje }: la UI muestra el
// mensaje, los tests afirman sobre el código y la línea.

export const CODIGOS = {
  // Lectura del texto
  SIMBOLO_DESCONOCIDO: 'SIMBOLO_DESCONOCIDO',
  COMANDO_DESCONOCIDO: 'COMANDO_DESCONOCIDO',
  COMANDO_BLOQUEADO: 'COMANDO_BLOQUEADO',

  // Forma del programa
  FALTA_PARENTESIS_CIERRE: 'FALTA_PARENTESIS_CIERRE',
  FALTA_PARENTESIS_APERTURA: 'FALTA_PARENTESIS_APERTURA',
  FALTAN_PARENTESIS_LLAMADA: 'FALTAN_PARENTESIS_LLAMADA',
  FALTA_LLAVE_CIERRE: 'FALTA_LLAVE_CIERRE',
  FALTA_LLAVE_APERTURA: 'FALTA_LLAVE_APERTURA',
  SOBRA_LLAVE: 'SOBRA_LLAVE',
  FALTA_PUNTO_Y_COMA: 'FALTA_PUNTO_Y_COMA',
  FALTA_NUMERO: 'FALTA_NUMERO',
  FALTA_PREGUNTA: 'FALTA_PREGUNTA',
  ACCION_COMO_PREGUNTA: 'ACCION_COMO_PREGUNTA',
  PREGUNTA_COMO_ACCION: 'PREGUNTA_COMO_ACCION',
  SINO_SUELTO: 'SINO_SUELTO',
  PROGRAMA_VACIO: 'PROGRAMA_VACIO',

  // Ejecución
  CHOQUE: 'CHOQUE',
  LIMITE_PASOS: 'LIMITE_PASOS',
};

const MENSAJES = {
  [CODIGOS.SIMBOLO_DESCONOCIDO]: ({ simbolo, linea }) =>
    `No conozco el símbolo "${simbolo}" de la línea ${linea}. En este lenguaje no se usa.`,

  [CODIGOS.COMANDO_DESCONOCIDO]: ({ nombre, linea, sugerencia }) =>
    sugerencia
      ? `No conozco "${nombre}" en la línea ${linea}. ¿Querías escribir "${sugerencia}"?`
      : `No conozco "${nombre}". Los comandos disponibles están en el panel de la derecha.`,

  [CODIGOS.COMANDO_BLOQUEADO]: ({ nombre, linea }) =>
    `"${nombre}" todavía no se desbloquea en este nivel (línea ${linea}). Los comandos disponibles están en el panel de la derecha.`,

  [CODIGOS.FALTA_PARENTESIS_CIERRE]: ({ linea }) =>
    `Falta cerrar un paréntesis en la línea ${linea}.`,

  [CODIGOS.FALTA_PARENTESIS_APERTURA]: ({ nombre, linea }) =>
    `Falta abrir un paréntesis después de "${nombre}" en la línea ${linea}.`,

  [CODIGOS.FALTAN_PARENTESIS_LLAMADA]: ({ nombre, linea }) =>
    `A "${nombre}" le faltan los paréntesis en la línea ${linea}. Se escribe ${nombre}();`,

  [CODIGOS.FALTA_LLAVE_CIERRE]: ({ linea }) =>
    `Falta cerrar con } la llave que abriste en la línea ${linea}.`,

  [CODIGOS.FALTA_LLAVE_APERTURA]: ({ nombre, linea }) =>
    `Falta abrir la llave { de "${nombre}" en la línea ${linea}.`,

  [CODIGOS.SOBRA_LLAVE]: ({ linea }) =>
    `Hay una llave } de más en la línea ${linea}: no quedó ninguna abierta.`,

  [CODIGOS.FALTA_PUNTO_Y_COMA]: ({ linea }) =>
    `Falta el punto y coma al final de la línea ${linea}.`,

  [CODIGOS.FALTA_NUMERO]: ({ linea }) =>
    `A "repetir" de la línea ${linea} le falta el número de veces. Se escribe repetir (4) { ... }`,

  [CODIGOS.FALTA_PREGUNTA]: ({ nombre, linea }) =>
    `A "${nombre}" de la línea ${linea} le falta la pregunta entre paréntesis. Por ejemplo: ${nombre} (caminoLibre()) { ... }`,

  [CODIGOS.ACCION_COMO_PREGUNTA]: ({ nombre, linea }) =>
    `"${nombre}" es una acción, no una pregunta. Dentro del paréntesis de la línea ${linea} va caminoLibre() o caminoLibreDerecha().`,

  [CODIGOS.PREGUNTA_COMO_ACCION]: ({ nombre, linea }) =>
    `"${nombre}" es una pregunta, no una acción. Va dentro de un "si" o un "mientras", como en la línea ${linea}: si (${nombre}()) { ... }`,

  [CODIGOS.SINO_SUELTO]: ({ linea }) =>
    `El "sino" de la línea ${linea} no tiene un "si" antes.`,

  [CODIGOS.PROGRAMA_VACIO]: () =>
    `Todavía no hay programa. Usa los botones del panel de la derecha para escribir el primero.`,

  [CODIGOS.CHOQUE]: ({ linea }) =>
    `Chocaste en la línea ${linea} — ¿el camino seguía libre ahí?`,

  [CODIGOS.LIMITE_PASOS]: ({ limite, estructura }) =>
    estructura === 'repetirHastaLaMeta'
      ? `Tu programa lleva ${limite} pasos y sigue. ¿El robot llega a la meta con esas instrucciones?`
      : `Tu programa lleva ${limite} pasos y sigue. ¿La condición del mientras alguna vez se vuelve falsa?`,
};

/** Construye un error del catálogo. `datos.linea` viaja aparte para la UI. */
export function error(codigo, datos = {}) {
  const construir = MENSAJES[codigo];
  if (!construir) throw new Error(`Código de error sin mensaje: ${codigo}`);
  return {
    esErrorDelJuego: true,
    codigo,
    linea: datos.linea ?? null,
    mensaje: construir(datos),
  };
}

/** Distingue un error nuestro de un fallo real del programa. */
export function esErrorDelJuego(valor) {
  return Boolean(valor && valor.esErrorDelJuego);
}
