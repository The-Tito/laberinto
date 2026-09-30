# Laberinto — guía para Claude

Juego para enseñar programación a principiantes. `SPEC-laberinto.md` manda; los
cambios de la cohorte 0 están en `docs/CAMBIOS-cohorte-0.md` (fuera de git).

## Flujo de trabajo: gitflow

| Rama | Para qué | Se crea desde | Se fusiona en |
|---|---|---|---|
| `main` | lo publicado; cada merge es una versión | — | — |
| `develop` | integración; siempre en verde | `main` | `main` (vía release) |
| `feature/<nombre>` | un cambio a la vez (p. ej. `feature/metricas`) | `develop` | `develop` |
| `release/<versión>` | preparar una publicación (checklist §10) | `develop` | `main` y `develop` |
| `hotfix/<nombre>` | arreglo urgente de lo publicado | `main` | `main` y `develop` |

- Nunca se hace commit directo en `main`.
- Los merges usan `--no-ff`, para que cada feature quede visible en el historial.
- Al publicar, se etiqueta `main` con la versión (`v1.1.0`).
- Una feature por cambio de `CAMBIOS-cohorte-0.md`, en el orden de su sección de tests.

## Commits periódicos, verificados

Commit al cerrar cada unidad que funcione sola (un módulo con sus tests, una conexión en `main.js`), no al final del día.

Antes de cada commit, sin excepción:

1. `npm test`: todo en verde.
2. `node build.mjs`: termina sin "Quedó una referencia externa".
3. Revisar el diff: nada de `docs/`, `.claude/` ni datos personales. **El repo es público.**

Si algo falla, no se hace commit: se arregla o se reporta.

- Mensajes en español, en imperativo, con el cambio y su porqué (`Agrega módulo de métricas con GoatCounter`).
- Push de `develop` y de la feature tras cada merge verificado.

## Handoff: regla obligatoria

Cada vez que una feature se fusiona en `develop`, o una release en `main`, se agrega una entrada breve arriba del todo en `docs/HANDOFF.md`: qué se hizo, cómo se verificó, qué se decidió y qué quedó pendiente. Una fase no está terminada hasta que tiene su entrada. Lo que va a medias no entra.

`docs/` está fuera de git, así que el handoff es local: no va en el commit.

## Modelos

Subagentes en `.claude/agents/` (locales, fuera de git):

- `arquitecto` (Opus): planear, revisar contra el SPEC, depurar lo difícil.
- `implementador` (Sonnet): escribir un cambio con sus tests.
- `ayudante` (Haiku): búsquedas, correr tests y build, revisar checklists.
