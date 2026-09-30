// Enlaces hacia afuera: el formulario de opinión y el canal (CAMBIOS-cohorte-0
// §5 y §6). Viven aquí para que cambiar un link sea tocar una sola línea.

export const URL_FORMULARIO = 'https://tally.so/r/kdMyER';

// Invitación al canal de Instagram. Vacía a propósito: probado en v1.1.0, el
// link de un canal no abre ni desde el navegador interno de Instagram (siempre
// pide "usa la app"). Vacía, "Ir al canal" no se muestra; quienes juegan ya
// están en el canal. La invitación era:
// https://www.instagram.com/channel/aJUxgoM_pkdEi1lK/
export const URL_CANAL = '';

/**
 * Link que abre en otra pestaña, para no sacarlos del juego a media partida.
 * @param {string} texto
 * @param {string} url
 * @param {() => void} alTocar
 */
export function crearEnlace(texto, url, alTocar) {
  const enlace = document.createElement('a');
  enlace.className = 'enlace';
  enlace.href = url;
  enlace.target = '_blank';
  enlace.rel = 'noopener';
  enlace.textContent = texto;
  enlace.addEventListener('click', alTocar);
  return enlace;
}
