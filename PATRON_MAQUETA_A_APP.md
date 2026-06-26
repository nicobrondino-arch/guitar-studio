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
| Lógica | `renderVals()` devuelve valores | métodos de la clase `app` que arman HTML |

**La maqueta sirve para mirar el diseño. La app real es la única fuente de verdad.**

---

## 1. Una sola fuente de verdad

- App real = los archivos en la **raíz** del proyecto: `index.html`, `app.js`,
  `styles.css`, `dataService.js`, `metronome.js`.
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
