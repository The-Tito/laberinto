// Conteo de bloques (spec §3).
//
// Se cuenta 1 por cada instrucción o cabecera de estructura; las llaves de cierre
// no cuentan. Se cuenta sobre el AST y no sobre el texto: así nadie gana jugando
// con el formato, que es exactamente lo que el spec busca evitar.
//
// `sino` cuenta 0: es parte de la estructura `si`, no una estructura aparte. Con
// esa regla la solución de mano derecha cuesta 7 y el par 8 del nivel 4 queda
// "generoso a propósito" como dice el spec §4.

export function contarBloques(nodo) {
  if (!nodo) return 0;

  if (nodo.tipo === 'programa') return contarLista(nodo.cuerpo);

  switch (nodo.tipo) {
    case 'accion':
      return 1;
    case 'repetir':
    case 'repetirHastaLaMeta':
      return 1 + contarLista(nodo.cuerpo);
    case 'mientras':
      return 1 + contarLista(nodo.cuerpo);
    case 'si':
      return 1 + contarLista(nodo.cuerpo) + contarLista(nodo.sino);
    default:
      return 0;
  }
}

function contarLista(sentencias) {
  if (!sentencias) return 0;
  return sentencias.reduce((total, sentencia) => total + contarBloques(sentencia), 0);
}
