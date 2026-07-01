/**
 * bibliotecaProfesor.js - Biblioteca del Profesor (v2): CRUD, plantillas, categorias, tabla filtrable.
 * Mixin del prototipo de GuitarStudioApp (definido en app.js). Debe cargarse DESPUES de app.js.
 */
Object.assign(GuitarStudioApp.prototype, {
    _bibCatColor(name) {
        const n = String(name || '').toLowerCase().trim();
        const map = {
            'técnica': '#a29bfe', 'tecnica': '#a29bfe',
            'lectura': '#55efc4',
            'repertorio': '#fdcb6e',
            'cont. complementario': '#74b9ff', 'complementario': '#74b9ff', 'contenido complementario': '#74b9ff'
        };
        if (map[n]) return map[n];
        const palette = ['#e17055', '#0984e3', '#00b894', '#6c5ce7', '#e84393', '#00cec9', '#fab1a0', '#81ecec'];
        let h = 0;
        for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
        return palette[h % palette.length];
    },

    _bibCategoriesFor({ profile, group }) {
        if (group && Array.isArray(group.categories) && group.categories.length) return group.categories.slice();
        if (profile && Array.isArray(profile.categories) && profile.categories.length) return profile.categories.slice();
        return this.data.getDefaultCategories();
    },

    _bibEnsurePersonalGroup(profile) {
        const id = 'grp-personal-' + profile.id;
        const groups = this.data.getAllGroups();
        let g = groups.find(x => x.id === id);
        if (!g) {
            g = { id, name: profile.name, memberIds: [profile.id], _personal: true, createdAt: Date.now() };
            groups.push(g);
            this.data.saveGroups(groups);
        }
        return g;
    },

    _bibCursos() { return this.data.getAllGroups().filter(g => !g._personal); },

    _bibLevelLabel(lvl) {
        const map = { beginner: 'Inicial', intermediate: 'Intermedio', advanced: 'Avanzado',
                      inicial: 'Inicial', intermedio: 'Intermedio', avanzado: 'Avanzado' };
        return map[lvl] || lvl || '—';
    },

    _bibStyleLabel(s) {
        const map = { tango: 'Tango', folklore: 'Folklore', classic: 'Clásico', clasico: 'Clásico',
                      jazz: 'Jazz', bossa: 'Bossa Nova', flamenco: 'Flamenco', rock: 'Rock', pop: 'Pop' };
        return map[s] || s || '—';
    },

    _bibTypeLabel(t) {
        const map = { gp: 'Guitar Pro', gpx: 'GPX', pdf: 'PDF', youtube: 'YouTube', spotify: 'Spotify', score: 'Guitar Pro' };
        return map[t] || t || '-';
    },

    _bibTypeIcon(t) {
        if (t === 'youtube') return '▶';
        if (t === 'spotify') return '♫';
        if (t === 'pdf') return '📄';
        return '🎵';
    },

    _bibValueLabel(col, val) {
        if (col === 'level') return this._bibLevelLabel(val);
        if (col === 'style') return this._bibStyleLabel(val);
        if (col === 'type')  return this._bibTypeLabel(val);
        return val; // category = string tal cual
    },

    _bibFilterItems(items, isReadOnly = false) {
        let result = items;
        const q = (isReadOnly ? this._myLibSearch : this._bibSearch).toLowerCase().trim();
        if (q) result = result.filter(it => (it.title || '').toLowerCase().includes(q));
        const filters = isReadOnly ? this._myLibColFilters : this._bibColFilters;
        const { type, category, level, style } = filters;
        if (type.length)     result = result.filter(it => type.includes(it.type));
        if (category.length) result = result.filter(it => category.includes(it.category || it.exerciseType));
        if (level.length)    result = result.filter(it => level.includes(it.level));
        if (style.length)    result = result.filter(it => style.includes(it.style || it.musicalStyle));
        return result;
    },

    _bibFilterPanel2(items) {
        let result = items;
        if (this._bibLibCatFilter !== 'todos')
            result = result.filter(it => (it.category || it.exerciseType) === this._bibLibCatFilter);
        const q = this._bibSearch.toLowerCase().trim();
        if (q) result = result.filter(it => (it.title || '').toLowerCase().includes(q));
        return result;
    },

    _bibRenderMain(profiles, groups, items, isReadOnly = false) {
        const filtered = this._bibFilterItems(items, isReadOnly);
        return `<div class="bib-layout">
  <div class="bib-main-area">
    <div class="bib-toolbar">
      <div class="bib-search-wrap">
        <svg class="bib-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="bib-search-input" id="${isReadOnly ? 'my-lib-search-input' : 'bib-search-input'}" placeholder="Buscar por título..." value="${(isReadOnly ? this._myLibSearch : this._bibSearch).replace(/"/g, '&quot;')}">
      </div>
      <span class="bib-item-count">${filtered.length} ítem${filtered.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="bib-table-wrap">${this._bibRenderTable(filtered, items, isReadOnly)}</div>
    ${isReadOnly ? '' : `
    <div class="bib-bottom-zone">
      ${this._bibRenderUploadZone()}
    </div>`}
  </div>
</div>`;
    },

    _bibRenderSidebarMain(profiles, groups, items = []) {
        const tab = this._bibSidebarTab;
        const cursos = groups.filter(g => !g._personal);
        let listHtml = '';
        if (tab === 'alumnos') {
            listHtml = !profiles.length ? '<p class="bib-empty-list">No hay alumnos creados.</p>' :
                profiles.map(p => {
                    const lastP = this.data.getProfileLastPracticed(p.id) || 'Sin actividad';
                    const streak = this.data.getProfileStreak(p.id);
                    const displayName = p.displayName || p.name || '?';
                    return `<div class="bib-sidebar-item" onclick="app.bibSelectAlumno('${p.id}')">
  <div class="bib-avatar" style="background:${p.color || 'var(--tb-accent)'}">${displayName[0].toUpperCase()}</div>
  <div class="bib-item-info"><div class="bib-item-name">${this._escapeHtml(displayName)}</div><div class="bib-item-sub">${lastP}${streak ? ' · ' + streak + '🔥' : ''}</div></div>
  <svg class="bib-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
</div>`;
                }).join('');
        } else if (tab === 'cursos') {
            listHtml = !cursos.length ? '<p class="bib-empty-list">No hay cursos creados.</p>' :
                cursos.map(g => {
                    const mc = (g.memberIds || []).length;
                    const sc = this.data.getAllClases().filter(c => c.groupId === g.id).length;
                    return `<div class="bib-sidebar-item" onclick="app.bibSelectCurso('${g.id}')">
  <div class="bib-avatar bib-avatar-group">${(g.name||'?')[0].toUpperCase()}</div>
  <div class="bib-item-info"><div class="bib-item-name">${this._escapeHtml(g.name)}</div><div class="bib-item-sub">${mc} alumno${mc !== 1 ? 's' : ''} · ${sc} sesión${sc !== 1 ? 'es' : ''}</div></div>
  <svg class="bib-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
</div>`;
                }).join('');
        }
        return `<div class="bib-sidebar">
  <div class="bib-sidebar-tabs">
    <button class="bib-tab ${tab === 'alumnos' ? 'active' : ''}" onclick="app.bibSetSidebarTab('alumnos')">Alumnos <span class="bib-tab-badge">${profiles.length}</span></button>
    <button class="bib-tab ${tab === 'cursos' ? 'active' : ''}" onclick="app.bibSetSidebarTab('cursos')">Cursos <span class="bib-tab-badge">${cursos.length}</span></button>
  </div>
  <div class="bib-sidebar-list">${listHtml}</div>
  <button class="bib-sidebar-add-btn" onclick="app.bibSidebarAdd()">+ ${tab === 'alumnos' ? 'Nuevo alumno' : 'Nuevo curso'}</button>
</div>`;
    },

    _bibRenderSidebarCargas(profiles, items) {
        const studentIds = [...new Set(items.filter(it => it.isStudentUpload).map(it => it.uploadedBy).filter(Boolean))];
        const studentProfiles = profiles.filter(p => studentIds.includes(p.id));
        
        const allActive = !this._bibSelectedStudentCargaId ? ' active' : '';
        const allItemHtml = `<div class="bib-sidebar-item${allActive}" onclick="app.bibSelectStudentCarga(null)">
            <div class="bib-avatar" style="background:var(--tb-border)">👥</div>
            <div class="bib-item-info"><div class="bib-item-name">Todos los Alumnos</div><div class="bib-item-sub">Ver todas las cargas</div></div>
        </div>`;

        const listHtml = allItemHtml + (!studentProfiles.length ? '<p class="bib-empty-list" style="padding:10px 14px">No hay cargas pendientes.</p>' :
            studentProfiles.map(p => {
                const count = items.filter(it => it.isStudentUpload && it.uploadedBy === p.id).length;
                const active = this._bibSelectedStudentCargaId === p.id ? ' active' : '';
                const displayName = p.displayName || p.name || '?';
                return `<div class="bib-sidebar-item${active}" onclick="app.bibSelectStudentCarga('${p.id}')">
  <div class="bib-avatar" style="background:${p.color || 'var(--tb-accent)'}">${displayName[0].toUpperCase()}</div>
  <div class="bib-item-info"><div class="bib-item-name">${this._escapeHtml(displayName)}</div><div class="bib-item-sub">${count} carga${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}</div></div>
  <svg class="bib-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
</div>`;
            }).join(''));

        return `<div class="bib-sidebar">
  <div class="bib-zone-header" style="padding: 14px 14px 6px 14px; margin-bottom: 0">Alumnos con Cargas</div>
  <div class="bib-sidebar-list">${listHtml}</div>
</div>`;
    },

    _bibRenderCargasAlumnosMain(profiles, items) {
        let uploads = items.filter(it => it.isStudentUpload);
        if (this._bibSelectedStudentCargaId) {
            uploads = uploads.filter(it => it.uploadedBy === this._bibSelectedStudentCargaId);
        }

        if (!uploads.length) {
            return `<div class="bib-layout">
  ${this._bibRenderSidebarCargas(profiles, items)}
  <div class="bib-main-area" style="padding:24px; display:flex; flex-direction:column; justify-content:center; align-items:center; color:var(--tb-text-secondary); text-align:center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3;margin-bottom:12px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <p style="font-size:14px">No hay contenido subido por los alumnos aún.</p>
  </div>
</div>`;
        }

        const studentIds = [...new Set(uploads.map(it => it.uploadedBy).filter(Boolean))];
        const studentBlocks = studentIds.map(studentId => {
            const studentProfile = profiles.find(p => p.id === studentId) || { name: 'Alumno Desconocido', color: 'var(--tb-accent)' };
            const studentItems = uploads.filter(it => it.uploadedBy === studentId);
            
            const types = ['score', 'gp', 'gpx', 'pdf', 'youtube', 'spotify'];
            const typeLabels = { score: 'Guitar Pro', gp: 'Guitar Pro', gpx: 'GPX', pdf: 'Documentos PDF', youtube: 'Videos de YouTube', spotify: 'Canciones de Spotify' };
            const typeIcons = { score: '🎸', gp: '🎸', gpx: '🎸', pdf: '📄', youtube: '▶️', spotify: '🎵' };
            const typeColors = { score: '#a29bfe', gp: '#a29bfe', gpx: '#a29bfe', pdf: '#55efc4', youtube: '#fdcb6e', spotify: '#74b9ff' };
            
            const typeBlocks = types.map(type => {
                const typeItems = studentItems.filter(it => it.type === type);
                if (!typeItems.length) return '';
                
                const rows = typeItems.map(it => {
                    const timeStr = new Date(it.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                    return `
                        <div style="background:var(--tb-bg-primary); border:1px solid var(--tb-border); border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:16px">
                            <div style="flex:1; min-width:0">
                                <div style="font-size:13px; font-weight:600; color:var(--tb-text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap">${this._escapeHtml(it.title)}</div>
                                ${it.observation ? `<div style="font-size:12px; color:var(--tb-text-secondary); margin-top:4px; font-style:italic">"${this._escapeHtml(it.observation)}"</div>` : ''}
                                <div style="font-size:10px; color:var(--tb-text-muted); margin-top:4px">Cargado: ${timeStr}</div>
                            </div>
                            <div style="display:flex; gap:8px; flex-shrink:0">
                                <button class="btn btn-outline btn-sm" onclick="app.openLibraryItemById('${it.id}')" style="padding:4px 8px; font-size:11px">Abrir ↗</button>
                                <button class="btn btn-primary btn-sm" onclick="app.promoteStudentUploadToGeneral('${it.id}')" style="padding:4px 8px; font-size:11px">Subir a Biblioteca General</button>
                                <button class="btn btn-outline btn-sm" onclick="app.deleteStudentUploadByTeacher('${it.id}')" style="color:var(--tb-accent); border-color:var(--tb-accent); padding:4px 8px; font-size:11px">Eliminar</button>
                            </div>
                        </div>
                    `;
                }).join('');
                
                return `
                    <div style="margin-top:12px">
                        <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--tb-text-muted); margin-bottom:6px; display:flex; align-items:center; gap:6px">
                            <span class="bib-type-icon" style="background:${typeColors[type]}1f; width:20px; height:20px; font-size:10px">${typeIcons[type]}</span>
                            <span>${typeLabels[type]}</span>
                        </div>
                        <div>${rows}</div>
                    </div>
                `;
            }).join('');
            
            return `
                <div style="background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:12px; padding:16px; margin-bottom:16px">
                    <div style="display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--tb-border); padding-bottom:10px">
                        <div class="bib-avatar" style="background:${studentProfile.color || 'var(--tb-accent)'}">${((studentProfile.displayName || studentProfile.name || '?')[0]).toUpperCase()}</div>
                        <div style="font-size:15px; font-weight:600; color:var(--tb-text-primary)">${this._escapeHtml(studentProfile.displayName || studentProfile.name)}</div>
                    </div>
                    <div>${typeBlocks}</div>
                </div>
            `;
        }).join('');

        return `<div class="bib-layout">
    ${this._bibRenderSidebarCargas(profiles, items)}
    <div class="bib-main-area" style="overflow-y:auto; padding:24px 32px">
        <div class="bib-zone-header" style="font-size:18px; margin-bottom:16px">Contenido subido por los Alumnos</div>
        <div>${studentBlocks}</div>
    </div>
  </div>`;
    },

    _bibRenderTable(filtered, allItems, isReadOnly = false) {
        const cols = ['type', 'category', 'level', 'style'];
        const colLabels = { type: 'Tipo', category: 'Categoría', level: 'Nivel', style: 'Estilo' };
        const colValues = {
            type:     [...new Set(allItems.map(it => it.type).filter(Boolean))],
            category: [...new Set(allItems.map(it => it.category || it.exerciseType).filter(Boolean))],
            level:    [...new Set(allItems.map(it => it.level).filter(Boolean))],
            style:    [...new Set(allItems.map(it => it.style || it.musicalStyle).filter(Boolean))]
        };
        const activeFilters = isReadOnly ? this._myLibColFilters : this._bibColFilters;
        
        // Ordenar en base a la columna seleccionada
        if (this._bibSortCol) {
            const col = this._bibSortCol;
            const asc = this._bibSortAsc;
            filtered.sort((a, b) => {
                let va = a[col] || '';
                let vb = b[col] || '';
                if (col === 'category') {
                    va = a.category || a.exerciseType || '';
                    vb = b.category || b.exerciseType || '';
                } else if (col === 'style') {
                    va = a.style || a.musicalStyle || '';
                    vb = b.style || b.musicalStyle || '';
                }
                va = String(va).toLowerCase();
                vb = String(vb).toLowerCase();
                if (va < vb) return asc ? -1 : 1;
                if (va > vb) return asc ? 1 : -1;
                return 0;
            });
        }

        const titleSorted = this._bibSortCol === 'title';
        const titleSortIndicator = titleSorted ? (this._bibSortAsc ? ' ▲' : ' ▼') : '';
        const titleClickAction = `app.bibChangeSort('title')`;
        const titleHeader = `<th class="bib-th" style="cursor:pointer; user-select:none" onclick="${titleClickAction}">Título${titleSortIndicator}</th>`;

        const headers = cols.map(col => {
            const hasFilter = activeFilters[col].length > 0;
            const opts = colValues[col].map(v => {
                const chk = activeFilters[col].includes(v) ? 'checked' : '';
                const changeAction = isReadOnly 
                    ? `app.myLibToggleColFilter('${col}','${v}')` 
                    : `app.bibToggleColFilter('${col}','${v}')`;
                return `<label class="bib-filter-opt"><input type="checkbox" ${chk} onchange="${changeAction}"> ${this._bibValueLabel(col, v)}</label>`;
            }).join('');

            const isSorted = this._bibSortCol === col;
            const sortIndicator = isSorted ? (this._bibSortAsc ? ' ▲' : ' ▼') : '';
            const clickHeaderAction = `app.bibChangeSort('${col}')`;

            let configIcon = '';
            if (!isReadOnly) {
                if (col === 'category') {
                    let target = 'global';
                    configIcon = `<span class="bib-cat-config-icon" onclick="event.stopPropagation(); app.bibOpenCatEditor('${target}')" title="Configurar categorías">⚙️</span>`;
                } else if (col === 'level') {
                    configIcon = `<span class="bib-cat-config-icon" onclick="event.stopPropagation(); app.bibOpenCatEditor('level')" title="Configurar niveles">⚙️</span>`;
                } else if (col === 'style') {
                    configIcon = `<span class="bib-cat-config-icon" onclick="event.stopPropagation(); app.bibOpenCatEditor('style')" title="Configurar estilos">⚙️</span>`;
                } else if (col === 'type') {
                    configIcon = `<span class="bib-cat-config-icon" onclick="event.stopPropagation(); app.bibOpenCatEditor('type')" title="Ver tipos de contenido">⚙️</span>`;
                }
            }

            return `<th class="bib-th${hasFilter ? ' has-filter' : ''}">
                <div class="bib-th-inner">
                    <span onclick="${clickHeaderAction}" style="cursor:pointer; user-select:none; flex:1; display:inline-flex; align-items:center">${colLabels[col]}${sortIndicator}${configIcon}</span>
                    <div class="bib-dropdown-wrap">
                        <span class="bib-filter-arrow">▾</span>
                    </div>
                    <div class="bib-col-dropdown">${opts || '<span class="bib-empty-opts">Sin datos</span>'}</div>
                    ${hasFilter ? '<span class="bib-filter-dot"></span>' : ''}
                </div>
            </th>`;
        });

        const rows = filtered.map(it => {
            const cat = it.category || it.exerciseType || '';
            const style = it.style || it.musicalStyle || '';
            const color = this._bibCatColor(cat);
            const sel = (!isReadOnly && this._bibDetailItemId === it.id) ? ' selected' : '';
            const clickAction = isReadOnly 
                ? `app.openLibraryItemById('${it.id}')` 
                : `app.bibSelectItem('${it.id}')`;
            const titleHtml = isReadOnly 
                ? this._escapeHtml(it.title || 'Sin título')
                : `<span class="bib-title-link" onclick="event.stopPropagation(); app.openLibraryItemById('${it.id}')">${this._escapeHtml(it.title || 'Sin título')}</span>`;
            return `<tr class="bib-row${sel}" onclick="${clickAction}">
  <td class="bib-td bib-td-title"><span class="bib-type-icon" style="background:${color}1f">${this._bibTypeIcon(it.type)}</span>${titleHtml}</td>
  <td class="bib-td">${this._bibTypeLabel(it.type)}</td>
  <td class="bib-td">${cat ? `<span class="bib-cat-dot" style="background:${color}"></span>${this._escapeHtml(cat)}` : '—'}</td>
  <td class="bib-td">${this._bibLevelLabel(it.level)}</td>
  <td class="bib-td">${this._bibStyleLabel(style)}</td>
</tr>`;
        }).join('');

        const emptyMsg = isReadOnly 
            ? 'No hay contenido asignado todavía con los filtros seleccionados.' 
            : 'La biblioteca está vacía. Subí archivos o añadí URLs abajo.';

        return `<table class="bib-table">
  <thead><tr>${titleHeader}${headers.join('')}</tr></thead>
  <tbody>${filtered.length ? rows : `<tr><td colspan="5" class="bib-empty-row">${emptyMsg}</td></tr>`}</tbody>
</table>`;
    },

    _bibRenderUploadZone(isStudent = false) {
        const prefix = isStudent ? 'my-bib-' : 'bib-';
        return `<div class="bib-upload-zone">
  <div class="bib-zone-header">Subir contenido</div>
  <div class="bib-droparea" id="${prefix}droparea">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="bib-drop-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    <div><p class="bib-drop-text">Arrastrá archivos aquí<br><span class="bib-drop-hint">.gp · .pdf · .gpx</span></p>
      <button class="btn btn-outline btn-sm" style="margin-top:6px" onclick="document.getElementById('${prefix}file-input').click()">Examinar</button>
    </div>
    <input type="file" id="${prefix}file-input" accept=".gp,.pdf,.gpx,.gp4,.gp5" style="display:none" multiple>
  </div>
  <div class="bib-link-row">
    <input type="text" class="form-input bib-link-input" id="${prefix}link-input" placeholder="YouTube · Spotify (URL)">
    <button class="btn btn-outline btn-sm" onclick="app.bibDetectLink(${isStudent})">Detectar</button>
  </div>
</div>`;
    },

    _bibBindMainEvents() {
        const si = document.getElementById('bib-search-input');
        if (si) si.addEventListener('input', e => { this._bibSearch = e.target.value; this.renderBibliotecaView(); });
        const da = document.getElementById('bib-droparea');
        if (da) {
            da.addEventListener('dragover', e => { e.preventDefault(); da.classList.add('bib-drag-over'); });
            da.addEventListener('dragleave', () => da.classList.remove('bib-drag-over'));
            da.addEventListener('drop', e => { e.preventDefault(); da.classList.remove('bib-drag-over'); Array.from(e.dataTransfer.files).forEach(f => this.bibHandleFileDrop(f)); });
        }
        const fi = document.getElementById('bib-file-input');
        if (fi) fi.addEventListener('change', e => { Array.from(e.target.files).forEach(f => this.bibHandleFileDrop(f)); fi.value = ''; });
    },

    bibSelectStudentCarga(studentId) {
        this._bibSelectedStudentCargaId = studentId;
        this._refreshCargasHostView();
    },

    bibSelectItem(itemId) { this._bibDetailItemId = itemId; this.renderBibliotecaView(); },

    bibChangeSort(col) {
        if (this._bibSortCol === col) {
            this._bibSortAsc = !this._bibSortAsc;
        } else {
            this._bibSortCol = col;
            this._bibSortAsc = true;
        }
        
        const isStudent = document.getElementById('view-my-library')?.classList.contains('active');
        if (isStudent) {
            this.renderMyLibraryView();
        } else {
            this.renderBibliotecaView();
        }
    },

    bibToggleColFilter(col, val) {
        const arr = this._bibColFilters[col];
        const idx = arr.indexOf(val);
        if (idx === -1) arr.push(val); else arr.splice(idx, 1);
        this.renderBibliotecaView();
    },

    _bibFillCatModalCategories(selected) {
        const cont = document.getElementById('bib-cat-category');
        if (!cont) return;
        const cats = this.data.getDefaultCategories();
        cont.innerHTML = cats.map(c =>
            `<button class="bib-toggle${selected === c ? ' active' : ''}" data-val="${this._escapeHtml(c)}" onclick="app.bibCatToggle('category', this.dataset.val)">${this._escapeHtml(c)}</button>`
        ).join('');
    },

    bibHandleFileDrop(file, isStudent = false) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const type = ext === 'pdf' ? 'pdf' : (ext === 'gpx' ? 'gpx' : 'gp');
        this._bibCatModalData = { file, type };
        this._bibCatModalValues = { category: null };
        const titleEl = document.getElementById('bib-cat-title');
        const infoEl  = document.getElementById('bib-cat-file-info');
        if (titleEl) titleEl.value = file.name.replace(/\.[^.]+$/, '');
        if (infoEl)  infoEl.textContent = `${file.name}  ·  ${type.toUpperCase()}`;
        
        const activeIsStudent = isStudent || document.getElementById('view-my-library')?.classList.contains('active');
        this._toggleCategorizeModalFields(activeIsStudent);
        
        document.getElementById('bib-categorize-modal').style.display = 'flex';
    },

    bibDetectLink(isStudent = false) {
        const prefix = isStudent ? 'my-bib-' : 'bib-';
        const url = (document.getElementById(`${prefix}link-input`)?.value || '').trim();
        if (!url) return;
        const isYT = url.includes('youtube') || url.includes('youtu.be');
        const isSP = url.includes('spotify');
        if (!isYT && !isSP) { alert('URL no reconocida. Usá un link de YouTube o Spotify.'); return; }
        const type = isYT ? 'youtube' : 'spotify';
        this._bibCatModalData = { url, type };
        this._bibCatModalValues = { category: null };
        const titleEl = document.getElementById('bib-cat-title');
        const infoEl  = document.getElementById('bib-cat-file-info');
        if (titleEl) titleEl.value = isYT ? 'Video de YouTube' : 'Canción de Spotify';
        if (infoEl)  infoEl.textContent = `${isYT ? 'YouTube' : 'Spotify'}  ·  ${url.slice(0, 60)}`;
        
        const activeIsStudent = isStudent || document.getElementById('view-my-library')?.classList.contains('active');
        this._toggleCategorizeModalFields(activeIsStudent);
        
        document.getElementById('bib-categorize-modal').style.display = 'flex';
    },

    bibCatToggle(field, val) {
        this._bibCatModalValues[field] = val;
        document.querySelectorAll(`#bib-cat-${field} .bib-toggle`).forEach(b => b.classList.toggle('active', b.dataset.val === val));
    },

    bibCloseCatModal() {
        document.getElementById('bib-categorize-modal').style.display = 'none';
        this._bibCatModalData = null;
    },

    async bibSaveLibItem() {
        const title    = document.getElementById('bib-cat-title')?.value?.trim();
        const category = this._bibCatModalValues.category;
        const level    = document.querySelector('input[name="bib-level"]:checked')?.value;
        const style    = document.querySelector('input[name="bib-style"]:checked')?.value;
        const observation = document.getElementById('bib-cat-observation')?.value?.trim() || '';

        if (!title)    { alert('El título es obligatorio.'); return; }
        
        const isStudent = document.getElementById('view-my-library')?.classList.contains('active');
        const d = this._bibCatModalData;

        // Si es docente y no estamos promoviendo, requerir categorización
        if (!isStudent && (!d || !d.promotingItemId)) {
            if (!category) { alert('Seleccioná una categoría.'); return; }
            if (!level)    { alert('Seleccioná un nivel.'); return; }
            if (!style)    { alert('Seleccioná un estilo.'); return; }
        }

        if (d && d.promotingItemId) {
            // Promoción por parte del docente
            if (!category) { alert('Seleccioná una categoría.'); return; }
            if (!level)    { alert('Seleccioná un nivel.'); return; }
            if (!style)    { alert('Seleccioná un estilo.'); return; }

            const item = await this.data.getLibraryItem(d.promotingItemId);
            if (item) {
                item.title = title;
                item.category = category;
                item.level = level;
                item.style = style;
                // Remover campos específicos del alumno
                delete item.isStudentUpload;
                delete item.uploadedBy;
                delete item.claseId;
                delete item.observation;

                await this.data.saveLibraryItem(item);
                this.showToast('Contenido promovido a Biblioteca General', '✓');
            }
        } else if (isStudent && this.activeProfile) {
            // Carga inicial por parte del alumno
            const isGP = d.type === 'gp' || d.type === 'gpx';
            const item = { 
                id: this.data.generateId('lib'), 
                title, 
                type: isGP ? 'score' : d.type, 
                category: 'Consultas', 
                level: '', 
                style: '', 
                observation,
                createdAt: new Date().toISOString(),
                uploadedBy: this.activeProfile.id,
                isStudentUpload: true
            };
            if (d.url)  item.url = d.url;
            if (d.file) {
                const buf = await d.file.arrayBuffer();
                item.fileData = buf;
                item.bytes = buf;
            }

            const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
            const allClases = this.data.getAllClases();
            const myClases = allClases
                .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
                .sort((a, b) => {
                    const ta = b.finalizadaAt || b.date || 0;
                    const tb = a.finalizadaAt || a.date || 0;
                    return ta > tb ? 1 : ta < tb ? -1 : 0;
                }).reverse();
            
            const nextClase = myClases[0];
            if (nextClase) {
                item.claseId = nextClase.id;
            }

            await this.data.saveLibraryItem(item);

            const notif = {
                id: this.data.generateId('notif'),
                studentId: this.activeProfile.id,
                studentName: this.activeProfile.name,
                itemId: item.id,
                itemTitle: item.title,
                claseId: nextClase ? nextClase.id : null,
                timestamp: Date.now(),
                read: false
            };
            this.data.addNotification(notif);

            this.showToast('Contenido cargado para tu próxima clase y notificado al docente', '✓');
        } else {
            // Carga normal del docente
            const isGP = d.type === 'gp' || d.type === 'gpx';
            const item = { id: this.data.generateId('lib'), title, type: isGP ? 'score' : d.type, category, level, style, createdAt: new Date().toISOString() };
            if (d.url)  item.url = d.url;
            if (d.file) {
                const buf = await d.file.arrayBuffer();
                item.fileData = buf;
                item.bytes = buf;
            }
            await this.data.saveLibraryItem(item);
        }

        document.getElementById('bib-categorize-modal').style.display = 'none';
        this._bibCatModalData = null;

        const linkInput = document.getElementById('bib-link-input');
        if (linkInput) linkInput.value = '';
        const myLinkInput = document.getElementById('my-bib-link-input');
        if (myLinkInput) myLinkInput.value = '';

        if (isStudent) {
            await this.renderMyLibraryView();
        } else {
            await this._refreshCargasHostView();
        }
    },

    bibNewTemplate() {
        this._bibTplDraft = { id: this.data.generateId('tpl'), name: '', items: [], createdAt: new Date().toISOString(), _new: true };
        this._bibOpenTplEditor();
    },

    bibEditTemplate(tplId) {
        const tpl = this.data.getTemplates().find(t => t.id === tplId);
        if (!tpl) return;
        this._bibTplDraft = JSON.parse(JSON.stringify(tpl));
        this._bibTplDraft.items = this._bibTplDraft.items || [];
        this._bibOpenTplEditor();
    },

    async _bibOpenTplEditor() {
        const nameEl = document.getElementById('bib-tpl-name');
        if (nameEl) nameEl.value = this._bibTplDraft.name || '';
        // poblar selector de ítems
        const items = await this.data.getLibraryItems();
        const sel = document.getElementById('bib-tpl-item-select');
        if (sel) sel.innerHTML = '<option value="">— Elegir ítem —</option>' + items.map(it => `<option value="${it.id}">${this._escapeHtml(it.title || 'Sin título')}</option>`).join('');
        const catSel = document.getElementById('bib-tpl-cat-select');
        if (catSel) catSel.innerHTML = this.data.getDefaultCategories().map(c => `<option value="${this._escapeHtml(c)}">${this._escapeHtml(c)}</option>`).join('');
        this._bibRenderTplItems();
        const delBtn = document.getElementById('bib-tpl-delete-btn');
        if (delBtn) delBtn.style.display = this._bibTplDraft._new ? 'none' : 'inline-flex';
        document.getElementById('bib-tpl-editor-modal').style.display = 'flex';
    },

    async _bibRenderTplItems() {
        const cont = document.getElementById('bib-tpl-items-list');
        if (!cont) return;
        const items = await this.data.getLibraryItems();
        const list = this._bibTplDraft.items || [];
        cont.innerHTML = list.length ? list.map((ti, idx) => {
            const it = items.find(x => x.id === ti.libraryItemId);
            const title = it ? (it.title || 'Sin título') : '(ítem borrado)';
            const color = this._bibCatColor(ti.cat);
            return `<div class="bib-tpl-item-row"><span class="bib-cat-dot" style="background:${color}"></span><span class="bib-tpl-item-title">${this._escapeHtml(title)}</span><span class="bib-tpl-item-cat">${this._escapeHtml(ti.cat || '')}</span><button class="bib-build-remove" onclick="app.bibTplRemoveItem(${idx})">×</button></div>`;
        }).join('') : '<p class="bib-empty-list" style="padding:8px">Sin ítems. Agregá desde abajo.</p>';
    },

    bibTplAddItem() {
        const libItemId = document.getElementById('bib-tpl-item-select')?.value;
        const cat = document.getElementById('bib-tpl-cat-select')?.value;
        if (!libItemId) { this.showToast('Elegí un ítem', '⚠️'); return; }
        this._bibTplDraft.items = this._bibTplDraft.items || [];
        if (this._bibTplDraft.items.some(ti => ti.libraryItemId === libItemId && ti.cat === cat)) return;
        this._bibTplDraft.items.push({ libraryItemId: libItemId, cat });
        this._bibRenderTplItems();
    },

    bibTplRemoveItem(idx) {
        this._bibTplDraft.items.splice(idx, 1);
        this._bibRenderTplItems();
    },

    async bibSaveTemplate() {
        const name = document.getElementById('bib-tpl-name')?.value?.trim();
        if (!name) { alert('Poné un nombre a la plantilla.'); return; }
        this._bibTplDraft.name = name;
        delete this._bibTplDraft._new;
        this.data.saveTemplate(this._bibTplDraft);
        document.getElementById('bib-tpl-editor-modal').style.display = 'none';
        this._bibTplDraft = null;
        if (this._currentView === 'dashboard') {
            this._renderBibliotecaPanel();
            if (this._currentClaseId) await this._renderClaseDetail(this._currentClaseId);
        } else {
            this.renderBibliotecaView();
        }
    },

    async bibDeleteTemplate() {
        if (!this._bibTplDraft || this._bibTplDraft._new) return;
        if (!confirm('¿Eliminar esta plantilla?')) return;
        this.data.deleteTemplate(this._bibTplDraft.id);
        document.getElementById('bib-tpl-editor-modal').style.display = 'none';
        this._bibTplDraft = null;
        if (this._currentView === 'dashboard') {
            this._renderBibliotecaPanel();
            if (this._currentClaseId) await this._renderClaseDetail(this._currentClaseId);
        } else {
            this.renderBibliotecaView();
        }
    },

    bibCloseTplEditor() {
        document.getElementById('bib-tpl-editor-modal').style.display = 'none';
        this._bibTplDraft = null;
    },

    async bibOpenCatEditor(target) {
        this._bibCatEditorTarget = target;
        let list = [], label = '';
        if (target === 'global') {
            list = this.data.getDefaultCategories();
            label = 'Categorías por defecto (todos los alumnos y cursos nuevos)';
        } else if (target === 'level') {
            list = this.data.getDefaultLevels();
            label = 'Editar niveles de dificultad';
        } else if (target === 'style') {
            list = this.data.getDefaultStyles();
            label = 'Editar estilos musicales';
        } else if (target === 'type') {
            list = ['Guitar Pro', 'PDF', 'YouTube', 'Spotify'];
            label = 'Tipos de contenido (Solo Lectura)';
        } else if (target.startsWith('profile:')) {
            const id = target.slice(8);
            const profiles = await this.data.getProfiles();
            const p = profiles.find(x => x.id === id);
            list = (p && p.categories) ? p.categories : this.data.getDefaultCategories();
            label = `Categorías de ${p ? (p.displayName || p.name) : 'alumno'}`;
        } else if (target.startsWith('clase:')) {
            const id = target.slice(6);
            const clase = this.data.getClase(id);
            list = (clase && clase.categories) ? clase.categories : this.data.getDefaultCategories();
            label = `Categorías de esta clase`;
        } else {
            const id = target.slice(6);
            const groups = this.data.getAllGroups();
            const g = groups.find(x => x.id === id);
            list = (g && g.categories) ? g.categories : this.data.getDefaultCategories();
            label = `Categorías de ${g ? g.name : 'curso'}`;
        }
        this._bibCatEditorList = list.slice();
        const lblEl = document.getElementById('bib-cat-editor-label');
        if (lblEl) lblEl.textContent = label;
        this._bibRenderCatEditor();
        document.getElementById('bib-cat-editor-modal').style.display = 'flex';
    },

    _bibRenderCatEditor() {
        const cont = document.getElementById('bib-cat-editor-list');
        if (!cont) return;
        const isType = this._bibCatEditorTarget === 'type';
        cont.innerHTML = this._bibCatEditorList.map((c, idx) =>
            `<div class="bib-cat-edit-chip" style="border-color:${this._bibCatColor(c)}"><span class="bib-cat-dot" style="background:${this._bibCatColor(c)}"></span><span>${this._escapeHtml(c)}</span>${isType ? '' : `<button onclick="app.bibCatEditorRemove(${idx})">×</button>`}</div>`
        ).join('') || '<p class="bib-empty-list" style="padding:6px">Sin elementos.</p>';
        
        const addRow = document.querySelector('#bib-cat-editor-modal .modal-form-row');
        if (addRow) {
            addRow.style.display = isType ? 'none' : 'flex';
        }
    },

    bibCatEditorAdd() {
        const input = document.getElementById('bib-cat-editor-input');
        const val = (input?.value || '').trim();
        if (!val) return;
        if (this._bibCatEditorList.includes(val)) { input.value = ''; return; }
        this._bibCatEditorList.push(val);
        input.value = '';
        this._bibRenderCatEditor();
    },

    bibCatEditorRemove(idx) {
        this._bibCatEditorList.splice(idx, 1);
        this._bibRenderCatEditor();
    },

    async bibCatEditorSave() {
        const target = this._bibCatEditorTarget;
        const list = this._bibCatEditorList.slice();
        if (!list.length && target !== 'type') { alert('Dejá al menos una categoría.'); return; }
        if (target === 'global') {
            this.data.setDefaultCategories(list);
        } else if (target === 'level') {
            this.data.setDefaultLevels(list);
        } else if (target === 'style') {
            this.data.setDefaultStyles(list);
        } else if (target === 'type') {
            // Do nothing for system types
        } else if (target.startsWith('profile:')) {
            const id = target.slice(8);
            const profiles = await this.data.getProfiles();
            const p = profiles.find(x => x.id === id);
            if (p) { p.categories = list; await this.data.saveProfile(p); }
        } else if (target.startsWith('clase:')) {
            const id = target.slice(6);
            const clase = this.data.getClase(id);
            if (clase) {
                clase.categories = list;
                this.data.saveClase(clase);
            }
        } else if (target.startsWith('group:')) {
            const id = target.slice(6);
            const groups = this.data.getAllGroups();
            const g = groups.find(x => x.id === id);
            if (g) { g.categories = list; this.data.saveGroups(groups); }
        }
        document.getElementById('bib-cat-editor-modal').style.display = 'none';
        
        if (target.startsWith('clase:')) {
            const id = target.slice(6);
            this._renderClaseDetail(id);
        }
        await this.renderBibliotecaView();
    },

    bibCloseCatEditor() { document.getElementById('bib-cat-editor-modal').style.display = 'none'; },

    bibSidebarAdd() {
        if (this._bibSidebarTab === 'alumnos') this.bibOpenAlumnoModal();
        else this.bibOpenCursoModal();
    },

    bibOpenAlumnoModal() {
        const nameEl = document.getElementById('bib-alumno-name');
        const colorEl = document.getElementById('bib-alumno-color');
        if (nameEl) nameEl.value = '';
        if (colorEl) colorEl.value = '#6366f1';
        document.getElementById('bib-alumno-modal').style.display = 'flex';
        if (nameEl) setTimeout(() => nameEl.focus(), 50);
    },

    bibCloseAlumnoModal() { document.getElementById('bib-alumno-modal').style.display = 'none'; },

    async bibSaveAlumno() {
        const name = document.getElementById('bib-alumno-name')?.value?.trim();
        const color = document.getElementById('bib-alumno-color')?.value || '#6366f1';
        if (!name) { alert('Poné un nombre.'); return; }
        await this.data.saveProfile({ id: this.data.generateId('profile'), name, color, createdAt: new Date().toISOString() });
        document.getElementById('bib-alumno-modal').style.display = 'none';
        this._bibSidebarTab = 'alumnos';
        await this.renderBibliotecaView();
    },

    async bibOpenCursoModal() {
        const profiles = await this.data.getProfiles();
        const cont = document.getElementById('bib-curso-members');
        if (cont) cont.innerHTML = profiles.length
            ? profiles.map(p => {
                const displayName = p.displayName || p.name || '?';
                return `<label class="bib-member-check"><input type="checkbox" value="${p.id}"><span class="bib-avatar bib-avatar-xs" style="background:${p.color||'#6366f1'}">${displayName[0].toUpperCase()}</span> ${this._escapeHtml(displayName)}</label>`;
            }).join('')
            : '<p class="bib-empty-list">No hay alumnos. Creá alumnos primero.</p>';
        ['bib-curso-name','bib-curso-time','bib-curso-meet'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const daySel = document.getElementById('bib-curso-day');
        if (daySel) daySel.value = '';
        document.getElementById('bib-curso-modal').style.display = 'flex';
    },

    bibCloseCursoModal() { document.getElementById('bib-curso-modal').style.display = 'none'; },

    bibSaveCurso() {
        const name = document.getElementById('bib-curso-name')?.value?.trim();
        if (!name) { alert('Poné un nombre al curso.'); return; }
        const day = document.getElementById('bib-curso-day')?.value || '';
        const time = document.getElementById('bib-curso-time')?.value || '';
        const meetLink = document.getElementById('bib-curso-meet')?.value?.trim() || '';
        const memberIds = [...document.querySelectorAll('#bib-curso-members input:checked')].map(c => c.value);
        const groups = this.data.getAllGroups();
        groups.push({ id: this.data.generateId('group'), name, day, time, meetLink, memberIds, createdAt: Date.now() });
        this.data.saveGroups(groups);
        document.getElementById('bib-curso-modal').style.display = 'none';
        this._bibSidebarTab = 'cursos';
        this.renderBibliotecaView();
    },
});
