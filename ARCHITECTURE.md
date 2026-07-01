# Patrón: convertir una maqueta `.dc.html` en la app real

Guía para que **Claude Code** (o cualquiera) replique de forma sistemática lo que se
hizo manualmente con la pantalla **Clases**. La idea: una maqueta es un *plano*, no
la casa. Hay que **traducir**, no copiar.

---

## 0. Las dos tecnologías (por qué no se puede copiar y pegar)

| | Maqueta (`Guitar Studio - *.dc.html`) | App real (`index.html` + `app.js` + `styles.css`) |
|---|---|---|
| Motor | Design Component (`support.js`, `<x-dc>`, `{{ holes }}`, `<sc-for>`) | JavaScript "a mano" (vanilla), DOM + `innerHTML` |
| Estilos | Inline + `<style>` en `<helmet>` | Clases CSS en `styles.css` |
| Datos | `state = { … }` de mentira, fijo | `dataService.js` (localStorage + IndexedDB), real |
| Lógica | `renderVals()` devuelve valores | métodos de la clase `app` que arman HTML (repartidos en 9 archivos — ver [§6](#6-modularización-js--arquitectura-y-convenciones-etapa-2-2026-07-01)) |

**La maqueta sirve para mirar el diseño. La app real es la única fuente de verdad.**

---

## 1. Una sola fuente de verdad

- App real = los archivos en la **raíz** del proyecto: `index.html`, `styles.css`,
  y la lógica JS repartida en 9 archivos desde la modularización de Etapa 2
  (`core.js`, `dataService.js`, `metronome.js`, `exercisesData.js`, `i18n.js`,
  `alphatabPlayer.js`, `bibliotecaProfesor.js`, `tableroProfesor.js`,
  `miEstudioPractica.js`) + `bootstrap.js`. **Ya no existe un `app.js` único** —
  ver [§6](#6-modularización-js--arquitectura-y-convenciones-etapa-2-2026-07-01).
- Borrá las copias con sufijos raros (`app-e8e3c3f0…`, `index-bffd19da…`,
  `styles-8c517827…`). Generan descoordinación: cada quien edita una copia distinta.
- Las maquetas `.dc.html` quedan **solo como referencia visual** (acá guardadas como
  `_maqueta_*.dc.html`). Nunca se "ponen en funcionamiento": se traducen.

---

## 2. Receta de traducción (maqueta → app real)

### a) Mapear estructura visual → clases CSS
La maqueta ya nombra los bloques con clases (`.prof-layout`, `.timeline-sidebar`,
`.timeline-item`, `.class-panel`, `.student-row`, `.meet-bar`, …). En la app real
**se reutilizan esos mismos nombres de clase** en `styles.css`. Así el diseño viaja
1:1 y el CSS queda comparable lado a lado.

→ Copiá los selectores y reglas del `<style>` de la maqueta a `styles.css`,
adaptando colores a las variables del tema (`var(--tb-accent)`, `var(--tb-border)`,
etc.) en lugar de hex fijos como `#C8304A`.

### b) Mapear `state` de mentira → datos reales
Cada array fijo de la maqueta tiene su equivalente real:

| Maqueta (`state`) | App real (`dataService` / localStorage) |
|---|---|
| `classes[]` | `gs-clases` (`getAllClases`, `saveClase`) + `gs-groups` (`_getGroups`) |
| `students[]` | perfiles (`data.getProfiles()`, IndexedDB) |
| `content{}` | biblioteca (`data.getLibraryItems()`) asociada a la clase |
| `streak`, `last` | `getProfileStreak`, `getProfileLastPracticed` |

→ Donde la maqueta lee `cls.group`, la app real lee `group.name`. Donde la maqueta
inventa `streak:45`, la app real llama `this.data.getProfileStreak(m.id)`.

### c) Mapear `renderVals()` → método `render…View()`
- La maqueta hace `<sc-for list="{{ classes }}">…</sc-for>`.
- La app real hace `items.map(it => \`<div class="timeline-item">…</div>\`).join('')`
  dentro de `renderDashboardView()` y lo inyecta con `innerHTML`.

→ Cada `{{ hole }}` de la maqueta se vuelve una interpolación `${…}` en el template
string del método correspondiente.

### d) Mapear handlers `onClick="{{ fn }}"` → `onclick="app.metodo(...)"`
La maqueta usa funciones de `renderVals`. La app real usa `onclick="app.iniciarClase('id')"`
apuntando a métodos públicos de la instancia global `app`.

---

## 3. Checklist para portar UNA pantalla

1. [ ] Abrir la maqueta `_maqueta_<Pantalla>.dc.html` y listar sus bloques visuales.
2. [ ] Ver si la vista ya existe en `index.html` (`<section id="view-…">`) y en `app.js`
       (`render…View()`). **Clases ya estaba hecha** — no rehacer, completar.
3. [ ] Pasar selectores/estilos faltantes de la maqueta a `styles.css` (con variables de tema).
4. [ ] Conectar cada bloque a datos reales de `dataService` (no inventar).
5. [ ] Convertir `{{ holes }}` → `${interpolaciones}` y `onClick={{fn}}` → `onclick="app.x()"`.
6. [ ] Sembrar datos de prueba para VER la pantalla (sin datos parece "que no hizo nada").
7. [ ] Limpiar los datos de prueba al terminar.

---

## 4. Estado actual de "Clases" (ex–"Tablero del profesor")

**Ya portada y funcionando** en la app real:
- Renombre en la navegación: "Tablero" → **"Clases"** (`data-view="dashboard"`). ✓
- Timeline de "Clases de hoy" con estados (pendiente / en curso / finalizada). ✓
- Panel de detalle: encabezado, fecha editable, Iniciar/Finalizar clase. ✓
- Barra de Meet (Entrar al Meet + WhatsApp). ✓
- Filas de alumnos: avatar, categorías, racha, última práctica, **asistencia** (extra). ✓
- Contenido de la clase + buscador de biblioteca (extra). ✓
- Objetivos (extra) y Resumen privado del profesor. ✓

**Diferencias que la maqueta tiene y la app real todavía NO** (decidir si se portan):
1. Contenido en **3 pestañas** por categoría (Técnica / Lectura / Repertorio).
   La app real usa una lista única + buscador de biblioteca.
2. **"Nota para el alumno"** (texto que el alumno ve). La app real solo tiene el
   resumen privado del profesor.
3. **Canal de preguntas / "Dudas del alumno"** (ida y vuelta alumno↔profesor).
   No existe todavía; tocaría también la vista del alumno.

> Nota: en varios puntos la app real **mejoró** la maqueta (asistencia, biblioteca,
> objetivos, título y fecha editables). No tomar la maqueta como verdad absoluta:
> es un plano, la app puede ir más allá.

---

## 5. Filosofía Arquitectónica Funcional (Core Flow)

Para evitar el "Síndrome de Frankenstein" (mezclar todo en una súper pantalla como pasó con `view-notebook`), la app debe respetar estrictamente esta separación de responsabilidades:

1. **`view-biblioteca` (Taller Global del Docente):**
   - **Propósito:** Lugar exclusivo para **subir archivos** (GP, PDF), vincular media (YouTube, Spotify), clasificar contenido y armar **Plantillas de Clase**.
   - **Regla de oro:** No hay alumnos ni asignaciones aquí. Es un repositorio global.

2. **`view-dashboard` (Gestión de Clases del Docente):**
   - **Propósito:** Seleccionar un alumno/grupo y crear o editar sus clases.
   - **Interacción:** Aquí se **visualiza la Biblioteca** (mediante un buscador/modal o panel embebido) única y exclusivamente para **asignar** material rápido a la clase de un alumno específico.

3. **`view-my-library` (Biblioteca del Alumno):**
   - **Propósito:** El alumno visualiza los archivos y ejercicios que se le asignaron.
   - **Regla de oro:** Reutiliza el mismo componente visual de la Biblioteca del profesor, pero es **100% de solo lectura**. No hay botones de editar, eliminar ni subir contenido. Está filtrado solo para el ID del alumno.

**Cualquier nuevo desarrollo debe encajar en estos 3 pilares sin inventar vistas híbridas u ocultas.**

---

## 6. Modularización JS — Arquitectura y convenciones (Etapa 2, 2026-07-01)

`app.js` (8.402 líneas, todo en una sola clase `GuitarStudioApp`) se partió en **9
archivos**, mediante split mecánico sin cambios de lógica (cada extracción fue un
commit separado, auditado y confirmado sin alterar comportamiento).

### Patrón: mixins sobre el prototipo

Salvo `dataService.js`, `exercisesData.js` y `core.js`, cada archivo hace:

```js
Object.assign(GuitarStudioApp.prototype, { metodo1() {...}, metodo2() {...} });
```

Esto preserva 1:1 todas las llamadas cruzadas (`this.metodo()`) y los handlers
inline en el HTML (`onclick="app.metodo()"`) sin tener que tocar ni reescribir
ninguno de los dos.

### ⚠️ Regla crítica: orden de `<script>`

`core.js` (donde vive `class GuitarStudioApp`) **tiene que cargar antes** que
cualquier mixin, y `bootstrap.js` (`window.app = new GuitarStudioApp()`) **va
último**. Este orden está replicado en dos lugares — **si se agrega un archivo
mixin nuevo, actualizar los dos**:
- `index.html`
- `check.html` (harness mínimo para detectar errores de sintaxis/orden sin
  levantar toda la app — abre esto en el navegador y mirá el `<title>` del tab:
  si dice `ERROR: <línea>: <mensaje>` hay un problema de carga)

Orden actual: `metronome → dataService → exercisesData → core → i18n →
alphatabPlayer → bibliotecaProfesor → tableroProfesor → miEstudioPractica →
bootstrap`.

### Mapa de archivos

| Archivo | Rol |
| :--- | :--- |
| `metronome.js` | Clase independiente (metrónomo, desactivado — ver §Metronome en memoria del proyecto) |
| `dataService.js` | Persistencia: `DataService` + `TabDatabase` (IndexedDB) + localStorage |
| `exercisesData.js` | `EXERCISES_DATABASE` (datos estáticos) |
| `core.js` | Constructor, ruteo/SPA, perfiles, PIN, `bindEvents()`, helpers compartidos |
| `i18n.js` | Traducciones y actualización dinámica de UI |
| `alphatabPlayer.js` | Init de AlphaTab, tempo, volumen, repetición |
| `bibliotecaProfesor.js` | Biblioteca v2: CRUD, categorías, plantillas (métodos `bib*`/`_bib*`) |
| `tableroProfesor.js` | Clases/asistencia/agenda (métodos `tb*`/`_tb*`) |
| `miEstudioPractica.js` | Vista alumno: racha, heatmap, Modo Práctica |
| `bootstrap.js` | `window.app = new GuitarStudioApp()` + `DOMContentLoaded` |

Al tocar código: **biblioteca del profesor → `bibliotecaProfesor.js`**, **clases/
tablero → `tableroProfesor.js`**, **vista alumno/práctica → `miEstudioPractica.js`**,
**visor Guitar Pro → `alphatabPlayer.js`**.

### Riesgos conocidos (y por qué no se resolvieron todavía)

Una auditoría externa (2026-07-01) señaló tres riesgos estructurales del patrón
mixin, verificados y confirmados:
1. **Orden de carga crítico** (ver regla arriba).
2. **Colisión de nombres silenciosa**: si dos archivos definen un método con el
   mismo nombre, el segundo pisa al primero sin error. Ya pasó una vez en el
   monolito (bug de "duplicate method header" — fue parte de lo que motivó
   modularizar). Hoy no hay colisiones (verificado), pero no hay ningún guard
   que lo prevenga hacia adelante.
3. **Estado compartido implícito**: los mixins mutan las mismas propiedades de
   `this` (`this._currentClaseId`, `this._bibState`, etc.) sin encapsulamiento.

**Decisión:** no se migra a ES6 modules + composición de subsistemas (propuesta
de Etapa 3) por ahora. Costo evaluado: `type="module"` rompe los ~28
`onclick="app.metodo()"` inline en `index.html` (habría que exponer
`window.app` a mano) y componer en subsistemas (`this.board`, `this.library`,
etc.) obliga a reescribir cada llamada cruzada entre los métodos de los 6
mixins — una migración grande para un riesgo hoy manejable. Si se necesita
mitigar el riesgo #2 sin ese costo, la opción liviana pendiente es un guard de
pocas líneas en `bootstrap.js` que detecte si `Object.assign` pisa una key ya
existente del prototype y tire un warning en consola (no implementado aún,
evaluar si en algún momento se vuelve necesario).
