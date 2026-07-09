# Plan de pulido UX — Vista Clases

**Origen:** crítica completa de Nico + análisis de Claude Code, 2026-07-09.
**Este archivo es la fuente de verdad del plan.** Actualizar el estado de cada punto al completarlo. El brief para Claude Design correspondiente está en `BRIEF_DESIGN_CLASES.md`.

---

## Decisión central: modelo de "Pasos" (reemplaza categorías por clase + objetivos G)

Acordado el 2026-07-09. La clase deja de ser una "bolsa de contenido clasificado por categoría" y pasa a ser un **plan ordenado de pasos**:

- `clase.content` → lista ordenada de **pasos**: `{ id, libraryItemId (OPCIONAL), descripcion, objetivo }`. El orden es la posición en el array (sin campo numérico editable; UI con flechas ↑↓ o drag).
- **La sección G (Objetivos) desaparece**: un objetivo sin material es simplemente un paso sin `libraryItemId`. Una sola lista, no dos secciones desconectadas.
- **El editor de categorías por clase desaparece** (chips + ⚙️ en el detalle de clase). La categoría queda SOLO como metadata del ítem de biblioteca (para filtrar/organizar la biblioteca); en el paso se muestra como puntito de color informativo, sin editor ni lógica de asignación.
- **Vista del alumno (Mi Estudio / Próxima clase / Modo Práctica):** checklist única ordenada — paso 1, 2, 3 con consigna, objetivo, checkbox y botón para abrir el contenido. Desaparecen las pestañas por categoría.
- **Plantillas** pasan a ser planes de clase reutilizables (pasos con consigna y objetivo pre-escritos).

### Fases (el tracking se migra después, NO junto)
1. **Fase A:** modelo de pasos + vistas profesor/alumno. El tracking diario viejo (3 casilleros = 3 categorías) sigue funcionando por debajo.
2. **Fase B (pasada propia):** migrar semáforo Completo/Parcial/Sin práctica, racha y heatmap de "3 pasos por categoría" a "pasos de la clase completados". Toca `dataService` (`completedSteps`), tablero, hover cards, heatmap.

### Migración de datos existentes
- `clase.content` actual (`{id, cat}`): el orden del array se conserva; `cat` se ignora (queda la categoría del ítem en biblioteca).
- `clase.objetivos` viejos: se convierten en pasos sin archivo al final de la lista.
- `clase.categories`: deja de leerse (no borrar el campo, compat con registros viejos).

---

## Backlog en orden de ataque

| # | Punto | Camino | Estado |
|---|-------|--------|--------|
| 1 | Textos y limpieza (ver detalle abajo) | Code directo | **HECHO 2026-07-09** |
| 2 | Agenda semanal siempre abierta + card Próxima Clase | Design → Code | **HECHO 2026-07-09** (24b8734) |
| 3 | Set de íconos SVG lineal (reemplaza todos los emoji) | Design → Code | **HECHO 2026-07-09** (sprite 24b8734 + barrido). Emojis restantes viven en bloques que rediseñan los puntos 5/6/7/9 y en toasts |
| 4 | Modal editor de Grupo (duración, horario compacto, Meet+WhatsApp arriba, próximas clases del grupo) + modal Plantilla agrandado con mini-biblioteca + filas compactas de "existentes" | Design → Code | Pendiente (brief listo) |
| 5 | Modelo de Pasos (decisión central de arriba) — Fase A | Code (layout del paso lo diseña Design) | Pendiente (brief listo) |
| 6 | Alertas Rápidas → campana de notificaciones (sección "Alertas" de estado vivo + config de tipos; NO convertir alertas en eventos). Fila de alumno gana racha+minutos inline; historial/métrica en hover reusando `hc-card` (fallback click en touch). Alta de alumno con "+ Nuevo alumno" | Code | Pendiente |
| 7 | Fusionar pestañas Consultas + Cargas en "Consultas y Cargas" (chip de tipo dentro de la card, botones decentes, lista única por fecha) | Design → Code | Pendiente (brief listo) |
| 8 | Migración del tracking — Fase B del modelo de Pasos | Code | Pendiente |
| 9 | Rediseño ficha del alumno (`openTeacherFichaModal`) | Aparte, más adelante | Pendiente |

### Detalle del punto 1 (hecho)
- "Iniciar Sesión de Clase" / botón "Iniciar Clase" → **"Crear Clase"**, con campo de fecha (default hoy) — `createClase(groupId, date)` acepta fecha opcional.
- Letras de especificación eliminadas de los títulos: "C — Tablero de control" → "Asistencia", "E — Contenido de la clase" → "Contenido de la clase", "F —" y "G —" removidas.
- Leyenda de círculos (Completo/Parcial/Sin práctica) eliminada del detalle de clase (info triplicada: ya está en color de nombre + hover card).
- Sección "Próximas clases" del tab Alumnos eliminada (`_tbRenderProximasClases` + CSS + `copyMeetLink` huérfano) — duplicaba la agenda con otro cálculo.
- Pestaña "Agenda" renombrada a **"Planificación"**.
- Header de la columna biblioteca ahora contextual: "Biblioteca" sin clase abierta, "Agregar a: {grupo}" con clase abierta.
- Botón "Cargar datos de ejemplo" solo visible sin grupos creados.

---

## División de trabajo Design / Code (workflow del proyecto)

- **Design** maqueta en `.dc.html` (solo referencia visual): puntos 2, 3, 4, 7 y el layout del Paso (5). Ver `BRIEF_DESIGN_CLASES.md`.
- **Code** implementa directo sin pasar por Design: modelo de datos de pasos, lógica de duración de grupo, alertas→campana, alta de alumnos, migraciones.
- Protocolo al recibir maquetas de Design: chequear bug de saltos de línea literales en strings JS → recuperar lógica pisada → reimplementar solo en JS respetando HTML/CSS de Design.

## Nota transversal
Los templates de `tableroProfesor.js` tienen cientos de `style="..."` inline. Al tocar cada bloque, migrar sus estilos a clases en `styles.css`.
