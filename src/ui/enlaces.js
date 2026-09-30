// Enlaces hacia afuera: el formulario de opinión y el canal (CAMBIOS-cohorte-0
// §5 y §6). Viven aquí para que cambiar un link sea tocar una sola línea.

export const URL_FORMULARIO = 'https://tally.so/r/kdMyER';

// Invitación al canal de Instagram. Si se vacía, "Ir al canal" deja de
// mostrarse: mejor no ofrecerlo que mandar a alguien a un lugar equivocado.
export const URL_CANAL = 'https://www.instagram.com/channel/aJUxgoM_pkdEi1lK/';

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
