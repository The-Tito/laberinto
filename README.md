# Laberinto

Juego para la dinámica de 50 minutos descrita en [SPEC-laberinto.md](SPEC-laberinto.md).

## Los dos entregables

| Archivo | Qué es |
|---|---|
| `dist/index.html` | La app. Un solo archivo, doble clic, sin instalar nada. Es lo que se les pasa. |
| `hoja.html` | La hoja de referencia. Se abre y se manda a imprimir con Cmd+P: una página, blanco y negro. |

## Trabajar en el código

```bash
node --test        # los tests del spec §8
node build.mjs     # regenera dist/index.html
```

Para desarrollar hace falta un servidor local, porque el navegador no carga
módulos ES desde `file://`:

```bash
python3 -m http.server 4173
```

y abrir <http://localhost:4173>. El archivo empaquetado sí funciona con doble
clic: `build.mjs` mete todo en línea y verifica que no quede ninguna referencia
externa.

## Cómo está organizado

El núcleo no toca el DOM. Eso es lo que permite que los tests del spec §8 corran
la lógica real en Node, sin navegador ni simulacros.

```
src/lang/        tokenizer, parser, catálogo de errores, conteo de bloques
src/runtime/     el intérprete
src/game/        mundo, niveles, generador de laberintos
src/ui/          editor, canvas, panel de comandos, marcador, scheduler
src/main.js      el único archivo que conoce los dos lados
```

**El intérprete es un generador** que hace `yield` con la línea antes de
ejecutarla. De ahí salen, sin código extra: el resaltado de la línea en curso, la
cámara lenta, el modo rápido, el límite de pasos contra bucles infinitos, y los
tests sin navegador.

**Los errores son objetos** `{ codigo, linea, mensaje }`. La UI muestra el
mensaje; los tests afirman sobre el código y la línea. El catálogo completo está
en [src/lang/errors.js](src/lang/errors.js) y hay un test que verifica que ningún
mensaje use jerga, inglés ni culpe al usuario (spec §6).

## Una corrección al spec

El spec publica par 6 para el nivel 3, pero su propia solución de referencia
cuesta 7 bloques. El §8.2 resuelve el caso — *"corrige el par, no la solución"* —
así que el nivel 3 va con par 7, y hay un test que lo fija.

## Licencia

[MIT](LICENSE)
