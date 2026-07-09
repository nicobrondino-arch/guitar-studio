# Brief para Claude Design — Pulido UX de la vista Clases

**Contexto:** Guitar Studio, vista "Clases" del profesor (pestañas Planificación / Alumnos / Cargas / Consultas). Este brief sale de la crítica de Nico del 2026-07-09; el plan completo con decisiones está en `PLAN_UX_CLASES.md`. Son 6 piezas independientes — se pueden entregar de a una, **una pantalla por vez de punta a punta**.

## Reglas (no negociables, del workflow del proyecto)
1. Entregar maquetas `.dc.html` de referencia visual. **No tocar `index.html`, `app.js` ni los archivos reales.**
2. Colores SIEMPRE con variables de tema `--tb-*` (hay 4 temas: Neutral, Tango, Folklore claro, Jazz — nada de hex fijos; `--tb-danger` para rojo semántico, nunca `--tb-accent` para estados).
3. No escribir lógica JS. Los `onclick`/hooks los conecta Code después; si un elemento necesita ser interactivo, dejarle un `id` descriptivo.
4. Tipografías: las familias ya cargadas del sistema de temas (`--font-heading`, `--font-primary`).
5. Mantener los IDs funcionales que se listan en cada pieza — Code se engancha ahí.

---

## Pieza 1 — Agenda semanal siempre visible (Planificación)

**Hoy:** panel inferior `.dash-weekly-panel` colapsado detrás de un botón "📅 Ver Agenda Semanal". Nico: "tendría que estar siempre abierta en la parte inferior".
**Diseñar:** franja inferior fija (~200px) siempre abierta, debajo de las 3 columnas (timeline / clase / biblioteca). Header con rango de la semana ("7 – 11 jul") + flechas ‹ › para navegar semanas. Grid lunes–viernes con las clases de cada día; la columna de HOY resaltada con el acento del tema. Click en una clase la abre en la columna central.
**Clases CSS existentes de referencia:** `.dash-weekly-panel`, grid actual en `_renderSemanaCols` (tableroProfesor.js), items `.tl3-*`.

## Pieza 2 — Set de íconos SVG lineal (toda la vista)

**Hoy:** emojis genéricos por todos lados. Nico los marcó explícitamente: 🆕 👥 📋 (tabs de creación), 📅 (fecha), 👤 (alumnos), 🗑️ (borrar), ✏️ (editar), 🗂️ (ficha), 📁 (zona de subida), 🔍 (buscar), el sobre de "Subir nuevo".
**Diseñar:** un set coherente de íconos SVG lineales (stroke, `currentColor`), estilo duotono, consistente con los íconos de tipo de contenido que ya existen (`CONTENT_TYPE_ICONS_SVG` en `bibliotecaProfesor.js`: partitura/pdf/audio/video/spotify/enlace). Entregar como bloque de símbolos SVG en el `.dc.html`, un ícono por concepto de la lista de arriba. Guiño temático bienvenido (es una app de guitarra criolla) pero legible a 16px.

## Pieza 3 — Modal "Editar Grupo" + filas compactas (Planificación → Grupo Nuevo)

**Hoy:** los grupos existentes solo se pueden borrar (🗑️), ocupan mucho espacio horizontal con poca información, y el formulario de creación tiene el horario como campo larguísimo con el picker perdido a la derecha. A Nico le gustó el patrón del modal de "Editar Plantilla" — replicarlo para grupos.
**Diseñar:**
- **Modal de edición de grupo** con: nombre; Meet y WhatsApp (campo nuevo, link al chat del grupo) ARRIBA juntos; día + horario compactos en una fila (horario ~120px, clickeable entero); **campo Duración nuevo**: radio "Hasta fin de año" (default) / "N clases" con input numérico; checklist de alumnos; y una sección "Próximas clases del grupo" (lista de fechas generadas, con posibilidad de saltear/cancelar una).
- **Filas compactas** para "Grupos existentes" y "Plantillas existentes": una línea por ítem (nombre · día/hora · N alumnos · acciones editar/borrar con los íconos de la Pieza 2).
**IDs existentes a respetar:** inputs `#dgf-name`, `#dgf-day`, `#dgf-time`, `#dgf-meet`; checkboxes `name="dgf-member"`.

## Pieza 4 — Modal Plantilla agrandado con mini-biblioteca

**Hoy:** el modal `#bib-tpl-editor-modal` desborda (campos que salen para afuera) y los ítems se agregan con dos `<select>` gigantes.
**Diseñar:** modal más grande con scroll interno; reemplazar los selects por una **mini-biblioteca embebida** (buscador + chips de filtro + lista de ítems con botón "+", mismo lenguaje visual que la columna 3 de Planificación: `.bib3-search`, `.bib3-chips`, `.bib3-item`). Lista de ítems asignados de la plantilla con reordenar (ver Pieza 6 — las plantillas van a ser planes de pasos).
**IDs existentes:** `#bib-tpl-name`, `#bib-tpl-items-list`, `#bib-tpl-delete-btn`.

## Pieza 5 — Detalle de clase: header + card Próxima Clase

**Hoy:** el botón "Cerrar ×" es chiquito y gris (Nico: no es intuitivo salir), "Editar" no tiene ícono ni jerarquía. Y en el tab "Clase Nueva" hay un reloj decorativo gigante que no aporta.
**Diseñar:**
- Header del detalle: **"← Volver"** prominente arriba a la izquierda del panel; **"Editar"** con ícono de lápiz como acción secundaria clara a la derecha. Hooks: `app.closeClasetDetail()` y `app._openEditClaseModal(id)`.
- En el tab Crear Clase, reemplazar el reloj por una **card "Próxima clase"**: nombre del grupo, fecha y hora, tiempo relativo estático ("Hoy · en 3 h" / "Martes 18:00 · en 2 días"), botón Meet. SIN timer con segundos corriendo.

## Pieza 6 — El "Paso" (pieza nueva central — leer la decisión en PLAN_UX_CLASES.md)

El contenido de la clase deja de agruparse por categorías: pasa a ser una **lista ordenada de pasos**. Cada paso: número de orden (automático), contenido de biblioteca vinculado (OPCIONAL — hay pasos que son solo consigna), descripción/consigna, objetivo. Desaparecen los chips de categorías con su ⚙️ y la sección separada de Objetivos.
**Diseñar dos versiones de la card de paso:**
- **Profesor** (detalle de clase): editable — número, título del contenido (o "solo consigna"), consigna, objetivo, puntito de color con la categoría de biblioteca del ítem (solo informativo), controles reordenar (↑↓ o drag) y quitar.
- **Alumno** (Mi Estudio / Próxima clase): **checklist única ordenada, en una sola pestaña** — sin tabs por categoría. Cada paso con checkbox, consigna, objetivo y botón para abrir el contenido. Estado visual de paso completado.
**Clases CSS actuales que reemplaza:** `.ci3-item`, `.cat3-chips`, `.obj3-*`.

## Pieza 7 — "Consultas y Cargas" fusionadas

**Hoy:** son dos pestañas separadas; en Cargas los íconos son muy chicos, los botones "Abrir/Subir/Eliminar" genéricos y mal diagramados, y hay un hueco blanco entre el título/descripción y los botones porque el tipo (Guitar Pro/Spotify/YouTube/PDF) vive como bloque separado.
**Diseñar:** una sola pestaña "Consultas y Cargas" (la tira queda: Planificación · Alumnos · Consultas y Cargas). Cards de carga con el **chip de tipo DENTRO de la card junto al título**, lista única ordenada por fecha (no bloques por tipo), botones con ícono + texto de tamaño decente. Las consultas (preguntas de texto) conviven en la misma vista, diferenciadas visualmente.
