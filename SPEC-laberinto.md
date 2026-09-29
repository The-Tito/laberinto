# Spec — Juego de laberinto para enseñar programación

Documento de handoff. Léelo completo antes de escribir código.

---

## 1. Contexto

Dinámica de ~50 minutos para dos hermanos de **13 años, cero experiencia con código**, a un año de entrar a preparatoria. El objetivo real no es que aprendan a programar: es que **sientan qué se siente programar** para tener información al elegir carrera. Un resultado válido es que descubran que no les gusta.

Cada uno trabaja en su propia computadora, sin ver la pantalla del otro. Al final comparan soluciones.

Referencia conceptual: *The Farmer Was Replaced*. El jugador **no dirige al personaje** — escribe un programa completo y lo suelta. Esa distinción es el corazón del ejercicio.

---

## 2. Principios no negociables

Estos salen del diseño pedagógico, no de preferencia estética. Si algo en la implementación los contradice, gana el principio.

1. **Nunca se controla al personaje en tiempo real.** No hay flechas, no hay teclas. Se escribe programa → se corre.
2. **Cero negaciones.** No existe el operador `!` ni comandos en negativo. Por eso el sensor es `caminoLibre()` y no `hayPared()`. La negación lógica es de las primeras cosas que tumba a un principiante.
3. **Ocho comandos en total.** Ni uno más. Cada comando extra es superficie de confusión, no de poder.
4. **Los errores nunca culpan al usuario.** Ver sección 6.
5. **Teclear no puede ser el cuello de botella.** Botones que insertan el comando al hacer clic. A los 13 años se escribe lento y la frustración de tipeo se confunde con "no soy bueno para esto".
6. **La competencia es contra el puzzle, no entre hermanos.** Ver sección 5.

---

## 3. El lenguaje

Pseudocódigo que **lee en español pero tiene estructura real**: paréntesis, llaves, punto y coma, indentación. Al abrir JavaScript el día de mañana, la forma les va a resultar familiar.

### Acciones
```
avanzar();
girarDerecha();
girarIzquierda();
```

### Sensores (devuelven verdadero/falso)
```
caminoLibre()           // ¿está libre la casilla de enfrente?
caminoLibreDerecha()    // ¿está libre la casilla a mi derecha?
```

### Estructuras
```
repetir (4) { ... }
si ( ... ) { ... } sino { ... }
mientras ( ... ) { ... }
repetirHastaLaMeta { ... }     // solo se desbloquea en el nivel 5
```

### Métrica de "bloques"
La competencia es por programa más corto. Se cuenta **1 por cada instrucción o estructura**; las llaves de cierre no cuentan. Se muestra el contador en vivo junto al par del nivel.

```
repetir (6) {        <- 1
  avanzar();         <- 2
}                    <- no cuenta
```

Contar bloques y no líneas evita que ganen jugando con el formato.

---

## 4. Los cinco niveles

Cada nivel existe para forzar **un** descubrimiento. No agregues niveles intermedios ni cambies el orden: la rampa es el diseño.

Notación: `#` pared, `.` camino, `S` inicio, `M` meta. **El personaje siempre empieza mirando al Este.**

### Nivel 1 — Pasillo recto
*Descubrimiento: el bucle `repetir`.*

```
#########
#S.....M#
#########
```

Van a escribir `avanzar()` seis veces y **va a funcionar**. Déjalos. El par de 2 bloques es lo que los empuja a buscar `repetir(6)`.

Este es el nivel más importante de la sesión: es el momento en que descubren que el código no es "escribir lo que quieres que pase" sino "encontrar la forma más corta de decirlo".

- Ingenuo: 6 bloques · **Par: 2**

### Nivel 2 — Forma de L
*Descubrimiento: los giros, y que `repetir` se puede usar más de una vez.*

```
#######
#S....#
#####.#
#####.#
#####.#
#####M#
#######
```

- Ingenuo: 9 bloques · **Par: 5**

### Nivel 3 — Zigzag de tramos desiguales
*Descubrimiento: `mientras` — el programa averigua solo cuántos pasos dar.*

```
##########
#S...#####
####.#####
####...###
######.###
######...#
########.#
########M#
##########
```

Los tramos miden distinto **a propósito**: contar pasos se vuelve insoportable y `mientras (caminoLibre())` aparece como alivio, no como concepto abstracto. Aquí entienden lo grande: el programa ya no sabe la respuesta de antemano, la descubre corriendo.

Solución de referencia:
```
repetir (3) {
  mientras (caminoLibre()) { avanzar(); }
  girarDerecha();
  mientras (caminoLibre()) { avanzar(); }
  girarIzquierda();
}
```

- Ingenuo: ~13 bloques · **Par: 6**

### Nivel 4 — Laberinto chico con bifurcaciones
*Descubrimiento: `si / sino`, y combinar estructuras.*

Diseña un laberinto **perfecto** (sin ciclos) de aproximadamente 9×9, con al menos dos callejones sin salida que engañen. Debe ser resoluble con la regla de la mano derecha. Valídalo con el test de la sección 8 antes de darlo por bueno.

- **Par: 8**, generoso a propósito.

### Nivel 5 — BONUS: laberinto aleatorio
*Descubrimiento: un programa que resuelve problemas que su autor nunca vio.*

Laberinto distinto **cada vez que le dan a correr**. Imposible hacer trampa contando pasos.

Generador: **recursive backtracker** (produce laberintos perfectos, sin ciclos — requisito para que la regla de la mano derecha funcione siempre). Inicio en la pared exterior.

Solución de referencia:
```
repetirHastaLaMeta {
  si (caminoLibreDerecha()) {
    girarDerecha();
    avanzar();
  } sino {
    si (caminoLibre()) {
      avanzar();
    } sino {
      girarIzquierda();
    }
  }
}
```

**Este nivel es opcional y así debe presentarse.** Con cero experiencia previa y 50 minutos, lo esperable es llegar al 4. Si el nivel 5 se vende como la meta y no llegan, la sesión cierra en derrota. Como bonus, llegar es épico y no llegar no le quita nada a lo logrado.

---

## 5. Competencia

Formato **golf**, no duelo. Cada nivel muestra su par ("este se puede en 5 bloques"). Compiten contra el número, no entre ellos.

Razón: enfrentados directamente, el que va más lento se siente tonto y se apaga — entre hermanos de 13 eso pasa en minutos. Con el par, los dos pueden ganar, y al final igual comparan pantallas y descubren que llegaron por caminos distintos.

**No implementes** marcador comparativo, tabla de posiciones ni nada que ponga a un hermano arriba del otro.

---

## 6. Manejo de errores

El primer error de un principiante define si siente que **el programa está roto** o que **él está roto**. Todo mensaje debe apuntar al código, nunca a la persona, y sugerir la pregunta siguiente.

| Situación | Mensaje |
|---|---|
| Choca con pared | `Chocaste en la línea 4 — ¿el camino seguía libre ahí?` |
| Bucle infinito | `Tu programa lleva 500 pasos y sigue. ¿La condición del mientras alguna vez se vuelve falsa?` |
| Falta un `)` o `}` | `Falta cerrar un paréntesis en la línea 3.` |
| Comando inexistente | `No conozco "saltar". Los comandos disponibles están en el panel de la derecha.` |

Prohibido: "error de sintaxis", stack traces, códigos de error, texto en inglés.

Al terminar sin llegar a la meta, resalta la línea donde se detuvo. Que vean **dónde** falló, no solo **que** falló.

---

## 7. Requisitos de la interfaz

*(El diseño visual es decisión tuya — esto es solo lo funcional.)*

- **Editor** de texto con números de línea. Resaltado de sintaxis si sale barato.
- **Panel de comandos**: los 8 comandos como botones que insertan el texto en el cursor. Doble función: acelera el tipeo y sirve de documentación siempre visible.
- **Canvas 2D** con el laberinto y el personaje, con orientación claramente visible (hacia dónde mira).
- **Dos botones de ejecución**: `Correr` (rápido) y `Cámara lenta` (~1 paso cada 400 ms). La cámara lenta es la herramienta de depuración: ver el programa ejecutarse paso a paso es lo que hace que la ejecución deje de ser magia.
- **Resaltar la línea que se está ejecutando** durante la corrida. Esto vale más que cualquier otra feature de la lista.
- **Contador de bloques en vivo** contra el par del nivel.
- **Botón de reiniciar** nivel.
- Un solo archivo HTML autónomo, sin build ni dependencias — se abre con doble clic o se sube a GitHub Pages y se pasa el link. Ambos hermanos deben poder abrirlo en su propia máquina sin instalar nada.

---

## 8. Validación

Antes de dar el proyecto por terminado, escribe un test automatizado que:

1. Ejecute la solución de referencia de cada nivel y confirme que llega a la meta.
2. Confirme que el conteo de bloques de cada solución de referencia **coincide con el par publicado**. Si no coincide, corrige el par, no la solución.
3. Para el nivel 5: genere 200 laberintos aleatorios y confirme que la regla de la mano derecha los resuelve todos dentro del límite de pasos.

El punto 3 no es opcional. Un generador que ocasionalmente produce un laberinto con ciclos rompe el algoritmo, y eso pasaría en vivo, enfrente de ellos.

---

## 9. Segundo entregable — hoja imprimible

Una página, para imprimir, que les entregas antes de abrir la computadora. Debe contener:

- Los 8 comandos con una línea de explicación cada uno.
- Un ejemplo pequeño de cada estructura, ya escrito.
- Espacio en blanco para que rayen.

Sin explicación de conceptos, sin teoría, sin "qué es una variable". Es una referencia, no un manual. Todo lo que necesiten entender debe salir de chocar contra el problema, no de leerlo antes.

---

## 10. Guion de la sesión

| Tiempo | Qué pasa |
|---|---|
| 0–10 | **Hermano robot**, sin computadora. Uno escribe instrucciones en papel, el otro las ejecuta *literalmente* (hacer un sándwich, o dibujar una figura que solo el que escribe ve). Regla: el robot obedece lo que dice, no lo que se quiso decir. En 10 minutos entienden que programar es pensar con precisión, y que casi siempre el problema es tu instrucción, no la máquina. |
| 10–15 | Les das la hoja, abren la app, nivel 1 en cámara lenta. |
| 15–40 | Niveles 2, 3 y 4 a su ritmo, cada quien en su compu. |
| 40–50 | Bonus si dan los tiempos. Cierre comparando las dos pantallas lado a lado. |

Notas para quien conduce:

- **No expliques nada que no hayan necesitado primero.** El rol es soporte técnico, no maestro.
- **Cierra cuando todavía quieran seguir**, no cuando ya se aburrieron. Que quede la sensación de que faltó tiempo.
- Cuando pregunten "¿por qué no funciona?", la respuesta es "córrelo en cámara lenta y dime dónde se rompe" — no la solución.

---

## 11. Fuera de alcance

No agregues: sonido, sistema de puntos o estrellas, cuentas de usuario, guardado en la nube, más comandos, más niveles, tutorial interactivo, animaciones de celebración elaboradas.

Cada una de esas cosas es tiempo que no se invierte en que el nivel 1 se sienta perfecto.
