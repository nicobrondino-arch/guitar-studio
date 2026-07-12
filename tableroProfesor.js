/**
 * tableroProfesor.js - Tablero de Control del Docente: gestion y CRUD de clases, asistencia, objetivos, consultas.
 * Mixin del prototipo de GuitarStudioApp (definido en core.js). Debe cargarse DESPUES de core.js.
 */
Object.assign(GuitarStudioApp.prototype, {
    async renderDashboardView() {
        const content = document.getElementById("dashboard-content");
        if (!content) return;

        const profiles = await this.data.getProfiles();

        if (profiles.length === 0) {
            content.innerHTML = `<div class="dashboard-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3;margin-bottom:12px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <p>Todavía no hay alumnos.<br>Creá perfiles desde el selector de perfiles.</p>
            </div>`;
            return;
        }

        const todayStr = this.getTodayString();
        const allClases = this.data.getAllClases();
        const groups = this.data.getAllGroups();
        const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const todayName = dayNames[new Date(todayStr+'T12:00').getDay()];

        const buildTlItems = (dateStr, dayName) => {
            const now = new Date();
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const existing = allClases.filter(c => c.date === dateStr && !c._draft);
            const existingGroupIds = new Set(existing.map(c => c.groupId));
            const items = [];
            existing.forEach(c => {
                const g = groups.find(x => x.id === c.groupId) || {};
                // Auto-start: si la fecha es hoy, la hora ya pasó y la clase no está finalizada ni en-curso
                if (dateStr === todayStr && c.status !== 'finalizada' && c.status !== 'en-curso') {
                    const [h, m] = (g.time || c.time || '').split(':').map(Number);
                    if (!isNaN(h) && !isNaN(m) && nowMins >= h * 60 + m) {
                        c.status = 'en-curso';
                        this.data.saveClase(c);
                    }
                }
                const st = c.status === 'finalizada' ? 'finalizada' : c.status === 'en-curso' ? 'iniciada' : 'pendiente';
                const count = (g.memberIds||[]).length;
                items.push({ claseId:c.id, click:`app.openClase('${c.id}')`, time:(g.time||c.time||'').slice(0,5)||'—', name:g.name||c.title||'Clase', count, type:count>1?'Grupal':'Individual', status:st, sel:c.id===this._currentClaseId, isNew:false });
            });
            groups.filter(g => g.day === dayName && !existingGroupIds.has(g.id)).forEach(g => {
                const count = (g.memberIds||[]).length;
                items.push({ claseId:null, click:`app.createClase('${g.id}')`, time:(g.time||'').slice(0,5)||'—', name:g.name, count, type:count>1?'Grupal':'Individual', status:'pendiente', sel:false, isNew:true });
            });
            items.sort((a,b) => String(a.time).localeCompare(String(b.time)));
            return items;
        };

        // El timeline de la barra lateral izquierda SIEMPRE muestra hoy
        const todayItems = buildTlItems(todayStr, todayName);
        const tlTodayHtml = todayItems.length
            ? todayItems.map(it => `
                <div class="tl3-item ${it.sel?'selected':''} ${it.status}" onclick="${it.click}">
                    <div class="tl3-time-col">
                        <span class="tl3-time ${it.status==='iniciada'?'active':''}">${it.time}</span>
                        <div class="tl3-dot ${it.status} ${it.status==='iniciada'?'pulse':''}"></div>
                        <div class="tl3-line"></div>
                    </div>
                    <div class="tl3-info">
                        <div class="tl3-group">${this._escapeHtml(it.name)}</div>
                        <div class="tl3-meta">${it.type} · ${it.count} alumno${it.count!==1?'s':''}</div>
                        <span class="tl3-pill ${it.isNew?'new':it.status}">${it.isNew?'+ Crear clase':it.status==='iniciada'?'En curso':it.status==='finalizada'?'Finalizada':'Pendiente'}</span>
                    </div>
                </div>`).join('')
            : `<div class="dash-tl-empty">No hay clases hoy.<br><span>Asigná un día a tus grupos en el Cuaderno.</span></div>`;

        // Contenido del panel central (Detalle de clase o tabs de creación).
        // Crear Clase abre una clase BORRADOR y cae en el detalle real (ver dashStartCreateClase),
        // así que no hay un panel de creación aparte: siempre es _currentClaseId o los tabs.
        let middleContentHtml = '';
        if (this._currentClaseId) {
            // Placeholder vacío: el detalle real lo pinta _renderClaseDetail enseguida y un
            // cartel de texto acá solo se percibía como parpadeo
            middleContentHtml = `<div class="empty-hint" style="padding: 24px;"></div>`;
        } else {
            const activeTab = this._dashActiveTab || 'clase';
            let tabBodyHtml = '';
            
            if (activeTab === 'clase') {
                const prox = this._proximaClaseInfo(allClases, groups);
                const proxName = prox ? (prox.group.name || (prox.clase && prox.clase.title) || 'Clase') : '';
                const proxMeet = prox && prox.group.meetLink
                    ? (/^https?:/.test(prox.group.meetLink) ? prox.group.meetLink : 'https://' + prox.group.meetLink) : '';
                // Toda la card lleva a la clase (se crea si aún no existe) — "editar" = entrar a la clase
                const proxClick = prox
                    ? (prox.clase ? `app.openClase('${prox.clase.id}')` : `app.createClase('${prox.group.id}','${prox.dateStr}')`)
                    : '';
                const proxCardHtml = prox ? `
                    <div id="crear-clase-proxima-card" class="pc3-card pc3-clickable" onclick="${proxClick}" title="Abrir esta clase">
                        <div class="pc3-icon ${prox.isToday?'hoy':''}">
                            <svg width="28" height="28"><use href="#${prox.isToday?'icon-reloj':'icon-fecha'}"/></svg>
                        </div>
                        <div class="pc3-info">
                            <div class="pc3-label">Próxima clase · ${this._escapeHtml(proxName)}</div>
                            <div class="pc3-when ${prox.isToday?'hoy':''}">${prox.label}</div>
                        </div>
                        <div class="pc3-actions">
                            ${proxMeet
                                ? `<a class="pc3-btn pc3-btn-meet" href="${this._escapeHtml(proxMeet)}" target="_blank" title="Entrar al Meet" onclick="event.stopPropagation()"><svg width="17" height="17"><use href="#icon-meet"/></svg> Meet</a>`
                                : `<button class="pc3-btn pc3-btn-meet pc3-btn-addmeet" title="Cargar el link de Meet de esta clase" onclick="event.stopPropagation();app.dashSetProxMeet('${prox.group.id}')"><svg width="17" height="17"><use href="#icon-meet"/></svg> + Meet</button>`}
                            <button class="pc3-btn pc3-btn-wa" title="Escribir por WhatsApp" onclick="event.stopPropagation();app.sendMeetWhatsApp('${prox.group.id}')">W</button>
                        </div>
                    </div>` : '';
                tabBodyHtml = `
                <div class="dash-tab-content" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
                    <h3 style="margin: 0; font-size: 15px; color: var(--tb-text-primary); font-family: var(--font-heading);">Crear Clase individual</h3>
                    <p style="margin: 0; font-size: 13px; color: var(--tb-text-secondary);">Caés directo en la página de la clase y elegís el alumno ahí mismo. Para clases de un grupo, usá la pestaña <strong>Grupo Nuevo</strong> (cada grupo arma sus clases desde su cronograma).</p>
                    <button class="btn btn-primary" onclick="app.dashStartCreateClase()" style="align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;"><svg width="14" height="14"><use href="#icon-nuevo"/></svg> Crear Clase</button>
                    <div style="margin-top: 24px; border-top: 1px solid var(--tb-border); padding-top: 20px;">
                        ${proxCardHtml}
                        <p style="font-size: 12px; max-width: 250px; margin: ${proxCardHtml ? '16px auto 0' : '0 auto'}; text-align: center; color: var(--tb-text-muted);">También podés seleccionar una clase en curso o pendiente desde el panel de la izquierda.</p>
                    </div>
                </div>`;
            } else if (activeTab === 'grupo') {
                // Filas compactas (Pieza 3): una línea por grupo, edición en modal.
                // Solo grupos reales: con 0-1 integrantes es una clase individual, no un grupo.
                const realGroups = groups.filter(g => !g._personal && (g.memberIds || []).length > 1);
                const groupsListHtml = realGroups.map(g => {
                    const memberCount = (g.memberIds || []).length;
                    const dayTime = g.day ? `${g.day} · ${(g.time||'').slice(0,5) || '—'}` : 'Sin horario';
                    return `
                    <div class="row3">
                        <div class="row3-name">${this._escapeHtml(g.name)}</div>
                        <div class="row3-meta">${this._escapeHtml(dayTime)}</div>
                        <div class="row3-count"><svg width="12" height="12"><use href="#icon-alumno"/></svg>${memberCount}</div>
                        <button class="row3-btn" onclick="app.openGroupModal('${g.id}')" title="Editar grupo"><svg width="13" height="13"><use href="#icon-editar"/></svg></button>
                        <button class="row3-btn danger" onclick="app.dashDeleteGroup('${g.id}')" title="Eliminar grupo"><svg width="13" height="13"><use href="#icon-borrar"/></svg></button>
                    </div>`;
                }).join('') || '<p style="color:var(--tb-text-muted); font-size:12px; font-style:italic; margin:0;">No hay grupos de clase creados.</p>';

                tabBodyHtml = `
                <div class="dash-tab-content" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
                    <h3 style="margin: 0; font-size: 15px; color: var(--tb-text-primary); font-family: var(--font-heading);">Grupos y Cursos</h3>
                    <button class="btn btn-primary" onclick="app.openGroupModal()" style="align-self:flex-start; display:flex; align-items:center; gap:6px;"><svg width="14" height="14"><use href="#icon-nuevo"/></svg> Nuevo Grupo</button>
                    <h4 style="margin: 8px 0 0 0; font-size: 13px; color: var(--tb-text-primary); font-family: var(--font-heading);">Grupos Existentes</h4>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        ${groupsListHtml}
                    </div>
                </div>`;
            } else if (activeTab === 'plantilla') {
                const templates = this.data.getTemplates();
                const templatesListHtml = templates.map(t => {
                    const itemCount = (t.items || []).length;
                    return `
                    <div class="row3">
                        <div class="row3-name">${this._escapeHtml(t.name)}</div>
                        <div class="row3-count">${itemCount} paso${itemCount!==1?'s':''}</div>
                        <button class="row3-btn" onclick="app.bibEditTemplate('${t.id}')" title="Editar plantilla"><svg width="13" height="13"><use href="#icon-editar"/></svg></button>
                        <button class="row3-btn danger" onclick="app.bibDeleteTemplateById('${t.id}')" title="Eliminar plantilla"><svg width="13" height="13"><use href="#icon-borrar"/></svg></button>
                    </div>`;
                }).join('') || '<p style="color:var(--tb-text-muted); font-size:12px; font-style:italic; margin:0;">No hay plantillas creadas.</p>';

                tabBodyHtml = `
                <div class="dash-tab-content" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
                    <div style="background:color-mix(in srgb, var(--tb-text-primary) 2%, transparent); border:1px solid var(--tb-border); padding:16px; border-radius:8px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:10px;">
                        <svg width="26" height="26" style="color:var(--tb-accent); display:block;"><use href="#icon-plantilla"/></svg>
                        <h4 style="margin:0; font-size:14px; color:var(--tb-text-primary);">Planificá con Plantillas</h4>
                        <p style="margin:0; font-size:12px; color:var(--tb-text-secondary); max-width:280px;">Una plantilla es un plan de clase reutilizable: una secuencia de pasos con consigna y objetivo, con o sin material de la biblioteca.</p>
                        <button class="btn btn-primary btn-sm" onclick="app.bibNewTemplate()" style="margin-top:4px;">+ Crear Nueva Plantilla</button>
                    </div>

                    <h4 style="margin: 8px 0 0 0; font-size: 13px; color: var(--tb-text-primary); font-family: var(--font-heading);">Plantillas Existentes</h4>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        ${templatesListHtml}
                    </div>
                </div>`;
            }

            middleContentHtml = `
            <div style="height:100%; display:flex; flex-direction:column; overflow:hidden;">
                <div class="dash-creation-tabs" style="display:flex; border-bottom: 1px solid var(--tb-border); background: rgba(0,0,0,0.15); flex-shrink:0;">
                    <button class="dash-creation-tab ${activeTab === 'clase' ? 'active' : ''}" onclick="app.switchDashCreationTab('clase')" style="flex:1; padding: 10px; background:none; border:none; border-bottom: 2px solid ${activeTab === 'clase' ? 'var(--tb-accent)' : 'transparent'}; color: ${activeTab === 'clase' ? 'var(--tb-text-primary)' : 'var(--tb-text-muted)'}; font-weight:600; cursor:pointer; font-size:11px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px;"><svg width="14" height="14" style="flex-shrink:0"><use href="#icon-nuevo"/></svg> Clase Nueva</button>
                    <button class="dash-creation-tab ${activeTab === 'grupo' ? 'active' : ''}" onclick="app.switchDashCreationTab('grupo')" style="flex:1; padding: 10px; background:none; border:none; border-bottom: 2px solid ${activeTab === 'grupo' ? 'var(--tb-accent)' : 'transparent'}; color: ${activeTab === 'grupo' ? 'var(--tb-text-primary)' : 'var(--tb-text-muted)'}; font-weight:600; cursor:pointer; font-size:11px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px;"><svg width="14" height="14" style="flex-shrink:0"><use href="#icon-grupo"/></svg> Grupo Nuevo</button>
                    <button class="dash-creation-tab ${activeTab === 'plantilla' ? 'active' : ''}" onclick="app.switchDashCreationTab('plantilla')" style="flex:1; padding: 10px; background:none; border:none; border-bottom: 2px solid ${activeTab === 'plantilla' ? 'var(--tb-accent)' : 'transparent'}; color: ${activeTab === 'plantilla' ? 'var(--tb-text-primary)' : 'var(--tb-text-muted)'}; font-weight:600; cursor:pointer; font-size:11px; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px;"><svg width="14" height="14" style="flex-shrink:0"><use href="#icon-plantilla"/></svg> Plantilla Nueva</button>
                </div>
                <div style="flex:1; overflow-y:auto; background: var(--tb-bg-secondary);">
                    ${tabBodyHtml}
                </div>
            </div>`;
        }

        // Renderizar el layout dividido verticalmente
        content.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; overflow:hidden;">
                ${this._renderClasesTabsStrip('agenda')}

                <!-- TOP AREA: 3 COLUMNS -->
                <div style="flex:1; display:flex; min-height:0; overflow:hidden;">
                    
                    <!-- COL 1: TIMELINE (Hoy) -->
                    <div class="tl3-col">
                        <div class="tl3-tabs" style="border-bottom: 1px solid var(--tb-border);">
                            <div class="tl3-tab active" style="cursor: default; font-weight:600; text-align:left; padding-left:14px; color:var(--tb-accent); border-bottom:none;">Clases de Hoy</div>
                        </div>
                        <div class="tl3-list">
                            ${groups.length === 0 ? `<button class="btn-demo-seed" onclick="app.seedDemoData()">Cargar datos de ejemplo</button>` : ''}
                            ${tlTodayHtml}
                        </div>
                        ${groups.some(g => g._isDemo) ? `<button class="btn-demo-clear" onclick="app.clearDemoData()">× Borrar datos de prueba</button>` : ''}
                    </div>
                    
                    <!-- COL 2: PANEL DE CLASE (Detalles / Creación) -->
                    <div class="clase3-col" id="dash-class-panel">
                        ${middleContentHtml}
                    </div>
                    
                    <!-- COL 3: BIBLIOTECA (Asignación rápida) -->
                    <div class="bib3-col" id="dash-bib-panel">
                        <div class="bib3-header">${(() => {
                            if (!this._currentClaseId) return 'Biblioteca';
                            const cc = allClases.find(c => c.id === this._currentClaseId);
                            const cg = cc ? groups.find(g => g.id === cc.groupId) : null;
                            const nm = (cg && cg.name) || (cc && cc.title) || '';
                            return nm ? `Agregar a: ${this._escapeHtml(nm)}` : 'Biblioteca';
                        })()}</div>
                        <div class="bib3-body" id="dash-bib-body">
                            <div class="bib3-loading">Cargando…</div>
                        </div>
                    </div>
                    
                </div>

            </div>`;

        const libRender = this._renderBibliotecaPanel();
        if (this._currentClaseId) await this._renderClaseDetail(this._currentClaseId);
        await libRender;
    },

    // ── Modelo de Pasos (Pieza 6, Fase A) ──
    // clase.content = lista ordenada de pasos { id, libraryItemId (opcional), descripcion, objetivo }.
    // Ítems viejos {id: <libId>, cat} y clase.objetivos migran acá; categories/objetivos no se borran (compat) pero dejan de leerse.
    _pasoLibId(c) {
        return ('libraryItemId' in c) ? c.libraryItemId : c.id;
    },

    _ensurePasosV2(clase) {
        if (!clase || clase.pasosV2) return clase;
        const pasos = (clase.content || []).map(c => ('libraryItemId' in c) ? c : ({
            id: this.data.generateId('paso'), libraryItemId: c.id, descripcion: '', objetivo: ''
        }));
        (clase.objetivos || []).forEach(o => {
            pasos.push({ id: this.data.generateId('paso'), libraryItemId: null, descripcion: o.text || '', objetivo: '' });
        });
        clase.content = pasos;
        clase.pasosV2 = true;
        this.data.saveClase(clase);
        return clase;
    },

    // Número de orden de la clase dentro de su grupo (1 = la más antigua por fecha).
    // Es dinámico: si se crea una clase con fecha anterior, las siguientes se renumeran.
    _claseNumero(clase) {
        const list = this.data.getAllClases()
            .filter(c => c.groupId === clase.groupId)
            .sort((a, b) => (a.date || '').localeCompare(b.date || '') || String(a.id).localeCompare(String(b.id)));
        return list.findIndex(c => c.id === clase.id) + 1;
    },

    createClase(groupId, date) {
        const group = this.data.getGroup(groupId);
        if (!group) return;
        const claseDate = date || new Date().toISOString().slice(0, 10);
        const clase = {
            id: this.data.generateId('clase'),
            groupId,
            title: `Clase ${new Date(claseDate + 'T12:00').toLocaleDateString('es-AR', { day:'numeric', month:'short' })}`,
            date: claseDate,
            status: 'programada',
            attendance: {},
            content: [],
            objetivos: [],
            resumen: '',
            pasosV2: true
        };
        this.data.saveClase(clase);
        this.openClase(clase.id);
    },

    openClase(claseId) {
        this._purgeDraftClases(claseId); // descartar borradores sin elegir grupo que hayan quedado
        this._currentClaseId = claseId;
        this._claseReturnTo = null; // quien quiera volver a otro lado lo setea DESPUÉS de llamar openClase
        this.renderDashboardView();
    },

    // "+ Meet" de la card Próxima clase: carga el link de Meet del grupo (o del grupo personal
    // en clases individuales) ahí mismo, sin pasar por el modal de grupo. Cubre la deuda de que
    // los alumnos individuales no tenían dónde editar su Meet.
    dashSetProxMeet(groupId) {
        const groups = this.data.getAllGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        const next = prompt('Pegá el link de la videollamada para esta clase (Google Meet, Zoom, etc.):', group.meetLink || '');
        if (next === null) return;
        group.meetLink = next.trim();
        this.data.saveGroups(groups);
        this.renderDashboardView();
    },

    closeClasetDetail() {
        this._purgeDraftClases(null); // si se sale de una clase borrador sin elegir grupo, se descarta
        this._currentClaseId = null;
        const ret = this._claseReturnTo;
        this._claseReturnTo = null;
        this.renderDashboardView();
        // Si se entró desde "Próximas clases del grupo", la flecha devuelve a ese modal
        if (ret && ret.groupId) this.openGroupModal(ret.groupId);
    },

    // Borra las clases borrador (sin grupo elegido) menos la que se está por abrir.
    // Un borrador solo existe mientras su detalle está abierto sin grupo; al elegirlo pierde _draft.
    _purgeDraftClases(exceptId) {
        this.data.getAllClases()
            .filter(c => c._draft && c.id !== exceptId)
            .forEach(c => this.data.deleteClase(c.id));
    },

    async _renderClaseDetail(claseId) {
        const panel = document.getElementById('dash-class-panel');
        if (!panel) return;

        const clase = this.data.getClase(claseId);
        if (!clase) { this.closeClasetDetail(); return; }

        const isDraft = !clase.groupId; // clase recién creada, todavía sin alumno/grupo
        const group = this.data.getGroup(clase.groupId) || {};
        const [profiles, libraryItems] = await Promise.all([
            this.data.getProfiles(),
            this.data.getLibraryItems()
        ]);
        const templates = this.data.getTemplates();
        const memberIds = (clase.memberOverride != null) ? clase.memberOverride : (group.memberIds || []);
        const members = profiles.filter(p => memberIds.includes(p.id));
        const type = members.length > 1 ? 'Grupal' : 'Individual';
        const timeLabel = (group.time||'').slice(0,5) || '—';
        const status = clase.status === 'finalizada' ? 'finalizada' : clase.status === 'en-curso' ? 'iniciada' : 'pendiente';
        const todayStr = this.getTodayString();

        // Modelo de Pasos: migra content viejo + objetivos → lista ordenada de pasos
        this._ensurePasosV2(clase);

        // ── A) HEADER ──
        const meetUrl = clase.meetUrl || group.meetLink || '';
        const meetHref = meetUrl ? (/^https?:/.test(meetUrl) ? meetUrl : 'https://'+meetUrl) : '';
        const meetBarHtml = meetUrl ? `
            <div class="h3-meet-bar">
                <span class="h3-meet-icon">▣</span>
                <span class="h3-meet-url">${this._escapeHtml(meetUrl)}</span>
                <a href="${this._escapeHtml(meetHref)}" target="_blank" class="h3-btn h3-btn-meet">Entrar</a>
                <button class="h3-btn h3-btn-wa" onclick="app.sendMeetWhatsApp('${group.id}')">W</button>
            </div>` : `<div class="h3-meet-bar h3-meet-empty"></div>`;

        // ── B) RESUMEN CLASE ANTERIOR ──
        const claseAnt = this.data.getClaseAnterior(clase.groupId, clase.date);
        const resumenAntHtml = (claseAnt && claseAnt.resumenProfesor) ? `
            <div class="sec3-resumen-ant">
                <div class="sec3-resumen-ant-title">${this._escapeHtml(group.name||'Clase')} · Clase del ${new Date(claseAnt.date+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</div>
                <div class="sec3-resumen-ant-body">${this._escapeHtml(claseAnt.resumenProfesor)}</div>
            </div>` : '';

        // ── C) TABLERO DE CONTROL ──
        const buildAttGroup = (label, colorKey, mlist) => {
            if (!mlist.length) return '';
            const cards = mlist.map(m => {
                const streak = this.data.getProfileStreak(m.id);
                // Semáforo por pasos de la rutina completados hoy (Fase B)
                const pracDot = this._getPasosProgress(m.id).dot;

                const claseAntAtt = claseAnt ? (claseAnt.attendance||{})[m.id] : null;
                const claseAntAttLabel = claseAntAtt === 'presente' ? 'Asistió' : claseAntAtt === 'ausente' ? 'Faltó' : '—';
                const claseAntAttDot = claseAntAtt === 'presente' ? 'present' : claseAntAtt === 'ausente' ? 'absent' : '';

                const dudas = claseAnt ? this.data.getPreguntasAlumno(m.id, claseAnt.id) : [];
                const lastDuda = dudas.sort((a,b)=>b.timestamp-a.timestamp)[0];
                const dudaHtml = lastDuda ? `
                    <div class="hc-duda">
                        <div class="hc-duda-label">💬 Duda pendiente</div>
                        <div class="hc-duda-text">"${this._escapeHtml(lastDuda.text)}"</div>
                    </div>` : '';

                const hoverCard = `
                    <div class="hc-card" id="hc-${m.id}">
                        <div class="hc-meta-row">
                            <div class="hc-prac-dot ${pracDot}"></div>
                            <span class="hc-prac-label ${pracDot}">${pracDot==='full'?'Completo':pracDot==='partial'?'Parcial':'Sin práctica'}</span>
                            <span class="hc-sep">·</span>
                            <span class="hc-streak">${streak>0?'🔥 '+streak+'d':'—'}</span>
                            <span class="hc-sep">·</span>
                            <div class="hc-att-dot ${claseAntAttDot}"></div>
                            <span class="hc-att-label">${claseAntAttLabel}</span>
                        </div>
                        ${dudaHtml}
                    </div>`;

                const nameColor = pracDot === 'full' ? 'var(--tb-success)' : pracDot === 'partial' ? '#f5a623' : 'var(--tb-danger)';
                const firstName = this._teacherDisplayName(m).split(' ')[0];

                const avatarChar = m.avatarChar || this._teacherDisplayName(m)[0].toUpperCase();
                
                let actionHtml = '';
                if (label === 'Ausentes') {
                    actionHtml = `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); app.rescheduleClassForAbsentStudent('${claseId}', '${m.id}')" style="margin-top: 6px; font-size: 11px; padding: 4px 8px; width: 100%; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; border-color: var(--tb-border); color: var(--tb-text-primary);"><svg width="12" height="12" style="flex-shrink:0"><use href="#icon-fecha"/></svg> Reprogramar</button>`;
                }

                // Click cicla la asistencia (presente → ausente → sin marcar); doble click abre la Ficha
                const att = (clase.attendance||{})[m.id] || '';
                const attState = att === 'presente' ? 'present' : att === 'ausente' ? 'absent' : 'unmarked';
                const attLabel = att === 'presente' ? '✓ Presente' : att === 'ausente' ? '✕ Ausente' : '○ Marcar';

                return `<div class="stu3-card-wrapper" style="display: flex; flex-direction: column; gap: 4px; align-items: stretch; flex-shrink: 0; min-width: 70px;">
                    <div class="stu3-card" id="stu3-${m.id}"
                            onclick="app.attCardClick('${claseId}','${m.id}')"
                            ondblclick="app.attCardDblClick('${claseId}','${m.id}')"
                            title="Click: asistencia · Doble click: ficha"
                            onmouseenter="app._showHoverCard('${m.id}')"
                            onmouseleave="app._hideHoverCard('${m.id}')"
                            style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 10px 7px;">
                        <div class="stu3-av" style="background:${m.color||'#6366f1'}">${avatarChar}</div>
                        <span class="stu3-cname" style="color:${nameColor}">${this._escapeHtml(firstName)}</span>
                        <button class="stu3-att-btn ${attState}" title="Cambiar asistencia" onclick="event.stopPropagation(); app.cycleAttendance('${claseId}','${m.id}')" ondblclick="event.stopPropagation()">${attLabel}</button>
                        ${hoverCard}
                    </div>
                    ${actionHtml}
                </div>`;
            }).join('');
            return `<div class="tab3-group">
                <div class="tab3-group-header ${colorKey}">${label} — ${mlist.length}</div>
                <div class="tab3-group-body tab3-cards">${cards}</div>
            </div>`;
        };

        const presentes = members.filter(m => (clase.attendance||{})[m.id] === 'presente');
        const ausentes  = members.filter(m => (clase.attendance||{})[m.id] === 'ausente');
        const sinMarcar = members.filter(m => !(clase.attendance||{})[m.id]);

        const tableroHtml = [
            buildAttGroup('Presentes', 'green', presentes),
            buildAttGroup('Ausentes', 'red', ausentes),
            buildAttGroup('Sin marcar', 'gray', sinMarcar),
        ].join('') || '<p class="text3-muted">Sin alumnos en este grupo</p>';

        // ── E) PLAN DE LA CLASE: lista ordenada de pasos (Pieza 6A) ──
        const pasosHtml = this._renderPasosListHtml(clase, libraryItems);
        const iconFor = ft => this._bibTypeIcon(ft);

        // ── DUDAS Y CONSULTAS DEL ALUMNO ──
        const currentPreguntas = this.data.getAllPreguntasForClase(claseId, memberIds);
        const classUploadedItems = await this.data.getLibraryItemsForClase(claseId);

        const textDudasHtml = currentPreguntas.map(p => {
            const m = members.find(student => student.id === p.profileId) || {};
            const timeStr = new Date(p.timestamp).toLocaleString('es-AR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            return `
                <div style="background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:8px; padding:10px; margin-bottom:8px">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px; color:var(--tb-text-muted)">
                        <strong>${this._escapeHtml(m.name || 'Alumno')}</strong>
                        <span>${timeStr}</span>
                    </div>
                    <p style="margin:0; font-size:13px; color:var(--tb-text-primary)">"${this._escapeHtml(p.text)}"</p>
                </div>
            `;
        }).join('');

        const fileDudasHtml = classUploadedItems.map(item => {
            const m = members.find(student => student.id === item.uploadedBy) || {};
            const color = this._bibCatColor(item.category || '');
            const fileIcon = iconFor(item.type);
            return `
                <div onclick="app.openLibraryItemById('${item.id}')" style="cursor:pointer; background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:8px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center">
                    <div>
                        <div style="font-size:13px; font-weight:500; display:flex; align-items:center; gap:6px; color:var(--tb-text-primary)">
                            <span>${fileIcon}</span>
                            <span>${this._escapeHtml(item.title)}</span>
                        </div>
                        <div style="font-size:11px; color:var(--tb-text-muted); margin-top:2px">
                            Subido por <strong>${this._escapeHtml(m.name || 'Alumno')}</strong> · ${this._escapeHtml(item.category || '')} · ${this._bibLevelLabel(item.level)}
                        </div>
                    </div>
                    <span style="font-size:11px; color:var(--tb-text-muted)">Hacé clic para abrir ↗</span>
                </div>
            `;
        }).join('');

        const hasAnyDudas = currentPreguntas.length > 0 || classUploadedItems.length > 0;
        const dudasSectionHtml = `
            <div class="sec3-block" style="border-top:1px solid var(--tb-border); padding-top:20px; margin-top:20px">
                <div class="sec3-label" style="display:flex; align-items:center; gap:6px">
                    <span>💬 Consultas / Dudas del Alumno</span>
                    ${hasAnyDudas ? `<span class="bib-tab-badge" style="background:var(--tb-accent); color:#fff; font-size:10px; padding:2px 6px">${currentPreguntas.length + classUploadedItems.length}</span>` : ''}
                </div>
                ${!hasAnyDudas ? `
                    <p class="text3-muted" style="font-style:italic; font-size:13px">No hay consultas de los alumnos cargadas para esta clase aún.</p>
                ` : `
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:16px; margin-top:10px">
                        <div>
                            <div style="font-size:12px; font-weight:600; color:var(--tb-text-muted); margin-bottom:8px">Preguntas por texto</div>
                            ${textDudasHtml || '<p class="text3-muted" style="font-size:12px; font-style:italic">Sin preguntas escritas.</p>'}
                        </div>
                        <div>
                            <div style="font-size:12px; font-weight:600; color:var(--tb-text-muted); margin-bottom:8px">Archivos y videos adjuntos</div>
                            ${fileDudasHtml || '<p class="text3-muted" style="font-size:12px; font-style:italic">Sin archivos de consulta.</p>'}
                        </div>
                    </div>
                `}
            </div>
        `;

        panel.className = 'clase3-col';
        panel.innerHTML = `
            <div class="clase3-scroll">

                <!-- A: HEADER (Pieza 5) -->
                <div class="h3-header">
                    <button id="clase-detalle-volver-btn" class="h3-back-btn" onclick="app.closeClasetDetail()" title="Volver">
                        <svg width="26" height="26"><use href="#icon-volver"/></svg>
                    </button>
                    <div class="h3-title-block">
                        ${isDraft ? `
                            <div class="cc-eyebrow">Nueva clase individual</div>
                            <div class="cc-pickers">
                                <select class="cc-select" onchange="if(this.value)app.dashPickDraftStudent('${claseId}', this.value)">
                                    <option value="">Elegí un alumno…</option>
                                    ${profiles.map(p => `<option value="${p.id}">${this._escapeHtml(this._teacherDisplayName(p))}</option>`).join('')}
                                </select>
                            </div>
                        ` : `
                            <button id="clase-detalle-titulo-btn" class="h3-title h3-title-btn" onclick="app._openEditClaseModal('${claseId}')" title="Editar clase">
                                <span class="h3-title-txt">Clase ${this._claseNumero(clase)}${clase.nombre ? ` — ${this._escapeHtml(clase.nombre)}` : ''}</span>
                                <svg class="h3-title-edit-ico" width="14" height="14"><use href="#icon-editar"/></svg>
                            </button>
                            <div class="h3-sub">${this._escapeHtml(group.name||clase.title||'')} · ${timeLabel} · ${type} · ${members.length} alumno${members.length!==1?'s':''}</div>
                        `}
                    </div>
                    ${isDraft ? '' : meetBarHtml}
                </div>

                ${resumenAntHtml}

                <!-- ASISTENCIA -->
                <div class="sec3-block">
                    <div class="sec3-label">Asistencia</div>
                    <div class="tab3-wrap" id="tablero-${claseId}">
                        ${isDraft ? '<p class="cc-ph">Elegí el alumno o grupo arriba para ver la asistencia.</p>' : tableroHtml}
                    </div>
                </div>

                <!-- PLAN DE LA CLASE: PASOS (Pieza 6A) -->
                <div class="sec3-block">
                    <div class="sec3-label" style="display:flex; align-items:center; gap:8px;">
                        <span>Plan de la clase <span class="sec3-hint">pasos en orden · agregá material desde Biblioteca →</span></span>
                        <select class="form-select" onchange="if(this.value){app.applyTemplateToClase(this.value); this.value='';}" style="font-size:11px; padding:4px 8px; border-radius:4px; height:auto; width:auto; max-width:135px; margin:0 0 0 auto; outline:none; background:var(--tb-bg-primary); border:1px solid var(--tb-border); color:var(--tb-text-primary); cursor:pointer;">
                            <option value="">— Aplicar Plantilla —</option>
                            ${templates.map(t => `<option value="${t.id}">${this._escapeHtml(t.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="paso3-list" id="paso3-list-${claseId}">${pasosHtml}</div>
                    <button class="paso3-add-btn" onclick="app.pasoAdd('${claseId}')">+ Agregar paso</button>
                </div>

                <!-- RESUMEN PRIVADO -->
                <div class="sec3-block">
                    <div class="sec3-label">Resumen privado</div>
                    <textarea class="sec3-ta" id="resumen-prof-${claseId}" placeholder="¿Qué se trabajó hoy?…" rows="4" onblur="app.saveResumenProfesor('${claseId}',this.value)">${this._escapeHtml(clase.resumenProfesor||clase.resumen||'')}</textarea>
                </div>

                ${dudasSectionHtml}

                <!-- H: FINALIZAR (oculto en borrador: no se puede publicar sin alumno/grupo) -->
                ${isDraft ? '' : `<div class="finalizar3-bar">
                    <span class="finalizar3-hint">${status==='suspendida'?`Clase <strong>suspendida</strong> · no se dictó`:status==='finalizada'?`Publicada para <strong>${members.length} alumno${members.length!==1?'s':''}</strong> · podés actualizar cuando quieras`:`Disponible para <strong>${members.length} alumno${members.length!==1?'s':''}</strong> al publicar`}</span>
                    <button class="finalizar3-suspend ${status==='suspendida'?'active':''}" onclick="app.suspenderClase('${claseId}')" title="${status==='suspendida'?'Reactivar la clase':'Marcar como suspendida (no se dictó)'}">${status==='suspendida'?'↩ Reactivar':'⏸ Suspender'}</button>
                    <button class="finalizar3-btn ${status==='finalizada'?'done':''}" onclick="app.finalizarClase('${claseId}')">${status==='finalizada'?'↑ Actualizar publicación':'✓ Publicar clase'}</button>
                </div>`}

            </div>`;
    },

    toggleAttendance(claseId, profileId) {
        this.cycleAttendance(claseId, profileId);
    },

    // El primer click espera un instante antes de ciclar: si en ese lapso llega el segundo
    // click, se cancela el ciclo (la card no se mueve de grupo) y se abre la Ficha.
    // Sin esta espera el doble click era casi imposible: la card cambiaba de posición al primer click.
    attCardClick(claseId, profileId) {
        clearTimeout(this._attClickTimer);
        this._attClickTimer = setTimeout(() => this.cycleAttendance(claseId, profileId), 280);
    },

    attCardDblClick(claseId, profileId) {
        clearTimeout(this._attClickTimer);
        this.openTeacherFichaModal(profileId);
    },

    // ── Pasos (Pieza 6A): render + CRUD en el detalle de clase ──
    _renderPasosListHtml(clase, libraryItems) {
        const pasos = clase.content || [];
        if (!pasos.length) return '<p class="text3-muted">Sin pasos. Agregá material desde la Biblioteca → o un paso de consigna.</p>';
        return pasos.map((p, idx) => {
            const libItem = p.libraryItemId ? libraryItems.find(it => it.id === p.libraryItemId) : null;
            const title = libItem ? (libItem.title || 'Sin título') : (p.descripcion || 'Paso sin contenido');
            // El puntito de categoría siempre reserva su espacio, aunque no haya material (Pieza 6)
            const dotColor = libItem ? this._bibCatColor(libItem.category || '') : 'transparent';
            const expanded = this._pasoExpandedId === p.id;
            const showPreview = !expanded && libItem && p.descripcion;
            return `
            <div class="paso3-card ${libItem ? '' : 'consigna'}" data-paso-id="${p.id}"
                 ondragstart="app.pasoDragStart(event,'${clase.id}','${p.id}')"
                 ondragend="app.pasoDragEnd(event)"
                 ondragover="app.pasoDragOver(event)"
                 ondragleave="app.pasoDragLeave(event)"
                 ondrop="app.pasoDrop(event,'${clase.id}','${p.id}')">
                <div class="paso3-head" draggable="true" onclick="app.pasoToggleExpand('${clase.id}','${p.id}')">
                    <span class="paso3-drag" title="Arrastrar para reordenar" onclick="event.stopPropagation()">
                        <svg width="14" height="14"><use href="#icon-drag"/></svg>
                    </span>
                    <span class="paso3-num">${idx + 1}</span>
                    <span class="paso3-dot" style="background:${dotColor}"></span>
                    <span class="paso3-txt">
                        <span class="paso3-title ${libItem ? '' : 'consigna'}">${this._escapeHtml(title)}</span>
                        ${showPreview ? `<span class="paso3-preview">${this._escapeHtml(p.descripcion)}</span>` : ''}
                    </span>
                    <button class="paso3-btn" title="Subir" onclick="event.stopPropagation(); app.pasoMove('${clase.id}','${p.id}',-1)"><svg width="18" height="18"><use href="#icon-arriba"/></svg></button>
                    <button class="paso3-btn" title="Bajar" onclick="event.stopPropagation(); app.pasoMove('${clase.id}','${p.id}',1)"><svg width="18" height="18"><use href="#icon-abajo"/></svg></button>
                    <button class="paso3-btn danger" title="Quitar paso" onclick="event.stopPropagation(); app.pasoRemove('${clase.id}','${p.id}')"><svg width="18" height="18"><use href="#icon-borrar"/></svg></button>
                </div>
                ${expanded ? `
                <div class="paso3-body">
                    <div>
                        <label class="paso3-field-label">Consigna <span class="opt">(opcional)</span></label>
                        <textarea class="tpl3-ta" rows="2" placeholder="¿Qué tiene que hacer el alumno?…" onblur="app.pasoField('${clase.id}','${p.id}','descripcion',this.value)">${this._escapeHtml(p.descripcion || '')}</textarea>
                    </div>
                    <div>
                        <label class="paso3-field-label">Objetivo <span class="opt">(opcional)</span></label>
                        <textarea class="tpl3-ta" rows="2" style="min-height:36px;" placeholder="¿Para qué?…" onblur="app.pasoField('${clase.id}','${p.id}','objetivo',this.value)">${this._escapeHtml(p.objetivo || '')}</textarea>
                    </div>
                </div>` : ''}
            </div>`;
        }).join('');
    },

    async _refreshPasosList(claseId) {
        const listEl = document.getElementById(`paso3-list-${claseId}`);
        const clase = this.data.getClase(claseId);
        if (!listEl || !clase) return;
        const libraryItems = await this.data.getLibraryItems();
        listEl.innerHTML = this._renderPasosListHtml(clase, libraryItems);
    },

    pasoToggleExpand(claseId, pasoId) {
        this._pasoExpandedId = this._pasoExpandedId === pasoId ? null : pasoId;
        this._refreshPasosList(claseId);
    },

    pasoMove(claseId, pasoId, dir) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        const list = clase.content || [];
        const i = list.findIndex(p => p.id === pasoId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        this.data.saveClase(clase);
        this._refreshPasosList(claseId).then(() => this._pasoFlashMoved(claseId, pasoId));
    },

    // Perceptibilidad del movimiento (maqueta "Clases ajustes"): destello verde en la card
    // recién movida, tanto al soltar el drag como al usar las flechas
    _pasoFlashMoved(claseId, pasoId) {
        const el = document.querySelector(`#paso3-list-${claseId} .paso3-card[data-paso-id="${pasoId}"]`);
        if (!el) return;
        el.classList.add('moved');
        setTimeout(() => el.classList.remove('moved'), 900);
    },

    // ── Drag & drop de pasos: se agarra desde cualquier punto de la fila (draggable en .paso3-head,
    //    así los textareas del cuerpo expandido siguen seleccionables); las flechas siguen vivas ──
    pasoDragStart(e, claseId, pasoId) {
        this._pasoDragging = { claseId, pasoId };
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', pasoId); } catch (err) {}
        e.currentTarget.classList.add('dragging');
    },

    pasoDragOver(e) {
        if (!this._pasoDragging) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const card = e.currentTarget;
        if (!card.classList.contains('dragging')) card.classList.add('drag-over');
    },

    pasoDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    },

    pasoDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.paso3-card.drag-over').forEach(el => el.classList.remove('drag-over'));
        this._pasoDragging = null;
    },

    async pasoDrop(e, claseId, targetPasoId) {
        e.preventDefault();
        const drag = this._pasoDragging;
        this._pasoDragging = null;
        if (!drag || drag.claseId !== claseId || drag.pasoId === targetPasoId) return;
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        const list = clase.content || [];
        const from = list.findIndex(p => p.id === drag.pasoId);
        const to = list.findIndex(p => p.id === targetPasoId);
        if (from < 0 || to < 0) return;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        this.data.saveClase(clase);
        await this._refreshPasosList(claseId);
        this._pasoFlashMoved(claseId, drag.pasoId);
    },

    pasoRemove(claseId, pasoId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.content = (clase.content || []).filter(p => p.id !== pasoId);
        this.data.saveClase(clase);
        if (this._pasoExpandedId === pasoId) this._pasoExpandedId = null;
        this._refreshPasosList(claseId);
        this._renderBibliotecaPanel();
    },

    pasoField(claseId, pasoId, field, value) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        const paso = (clase.content || []).find(p => p.id === pasoId);
        if (!paso) return;
        paso[field] = value;
        this.data.saveClase(clase);
    },

    pasoAdd(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        this._ensurePasosV2(clase);
        const paso = { id: this.data.generateId('paso'), libraryItemId: null, descripcion: '', objetivo: '' };
        clase.content.push(paso);
        this.data.saveClase(clase);
        this._pasoExpandedId = paso.id;
        this._refreshPasosList(claseId);
    },

    saveResumenClase(claseId, text) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.resumen = text;
        this.data.saveClase(clase);
    },

    saveClaseTitle(claseId, text) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.title = text.trim() || clase.title;
        this.data.saveClase(clase);
    },

    saveClaseDate(claseId, date) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.date = date;
        this.data.saveClase(clase);
    },

    iniciarClase(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.status = 'en-curso';
        this.data.saveClase(clase);
        this.showToast('Clase iniciada', '▶️');
        this.renderDashboardView();
    },

    finalizarClase(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.status = 'finalizada';
        clase.finalizadaAt = Date.now();
        this.data.saveClase(clase);
        this.showToast('Clase publicada ✓', '✅');
        this.renderDashboardView();
    },

    // Suspender = la clase no se dictó (feriado, cancelación). Estado propio 'suspendida'
    // que el calendario pinta en naranja. Reactivar la devuelve a 'programada'.
    suspenderClase(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        const suspendida = clase.status === 'suspendida';
        clase.status = suspendida ? 'programada' : 'suspendida';
        this.data.saveClase(clase);
        this.showToast(suspendida ? 'Clase reactivada' : 'Clase suspendida', suspendida ? '↩️' : '⏸️');
        this.renderDashboardView();
    },

    switchDashCreationTab(tab) {
        this._dashActiveTab = tab;
        this.renderDashboardView();
    },

    // ── Crear Clase = clase INDIVIDUAL, cae DIRECTO en la página real de la clase ──
    // Crea una clase borrador (sin grupo) y la abre: el detalle se renderiza igual que
    // siempre, pero con un selector de solo-alumnos en el encabezado. Al elegir el alumno
    // (dashPickDraftStudent) la clase se ata a su grupo personal y queda completa en el lugar.
    dashStartCreateClase(dateStr) {
        this._purgeDraftClases(null); // no acumular borradores si ya había uno abierto
        const clase = {
            id: this.data.generateId('clase'),
            groupId: '',
            title: '',
            date: dateStr || this.getTodayString(),
            status: 'programada',
            attendance: {},
            content: [],
            objetivos: [],
            resumen: '',
            pasosV2: true,
            _draft: true
        };
        this.data.saveClase(clase);
        this.openClase(clase.id);
    },

    // Elegir el alumno del borrador (Crear Clase = individual): usa/crea su grupo personal
    // oculto, completa la clase y la re-renderiza como detalle real. Las clases de grupo se
    // crean desde el editor de grupos (lista "Próximas clases" + "Agregar clase suelta").
    async dashPickDraftStudent(claseId, profileId) {
        const clase = this.data.getClase(claseId);
        if (!clase || !profileId) return;
        const profiles = await this.data.getProfiles();
        const profile = profiles.find(p => p.id === profileId);
        if (!profile) return;
        const group = this._bibEnsurePersonalGroup(profile); // grupo personal oculto del alumno
        clase.groupId = group.id;
        delete clase._draft;
        clase.title = `Clase ${new Date((clase.date || this.getTodayString()) + 'T12:00').toLocaleDateString('es-AR', { day:'numeric', month:'short' })}`;
        this.data.saveClase(clase);
        this.openClase(claseId);
    },

    // ── Modal Editar Grupo (Pieza 3) ──
    async openGroupModal(groupId) {
        const overlay = document.getElementById('modal-edit-group');
        if (!overlay) return;
        const existing = groupId ? this.data.getGroup(groupId) : null;
        const d = existing ? JSON.parse(JSON.stringify(existing)) : {
            id: this._genGroupId(), name: '', day: '', time: '', meetLink: '', whatsapp: '',
            frecuencia: 'Semanal', duracionTipo: 'fin', duracionN: 8, skippedDates: [],
            memberIds: [], createdAt: Date.now(), _new: true
        };
        d.skippedDates = d.skippedDates || [];
        d.frecuencia = d.frecuencia || 'Semanal';
        d.duracionTipo = d.duracionTipo || 'fin';
        d.duracionN = d.duracionN || 8;
        this._dgfDraft = d;

        const profiles = await this.data.getProfiles();
        const memberSet = new Set(d.memberIds || []);
        const memberRows = profiles.map(p => {
            const displayName = this._teacherDisplayName(p);
            return `
            <label class="dgf-member-row" data-name="${this._escapeHtml(displayName.toLowerCase())}">
                <input type="checkbox" name="dgf-member" value="${p.id}" ${memberSet.has(p.id) ? 'checked' : ''}>
                <span class="dgf-member-av" style="background:${p.color || 'var(--tb-accent)'}">${displayName[0].toUpperCase()}</span>
                <span class="dgf-member-name">${this._escapeHtml(displayName)}</span>
            </label>`;
        }).join('') || '<p style="color:var(--tb-text-muted); font-size:12px; margin:0;">No hay alumnos creados aún.</p>';

        const days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
        const frecs = ['Semanal','Cada 15 días','Mensual'];

        overlay.innerHTML = `
        <div class="big3-modal dgf-modal">
            <div class="big3-modal-header">
                <div class="big3-modal-title">${existing ? 'Editar Grupo' : 'Nuevo Grupo'}</div>
                <button class="big3-modal-close" onclick="app.closeGroupModal()"><svg width="18" height="18"><use href="#icon-cerrar"/></svg></button>
            </div>
            <div class="big3-modal-body">
                <div class="dgf-col">
                    <div>
                        <label class="dgf-label">Nombre del grupo</label>
                        <input id="dgf-name" class="dgf-input" type="text" placeholder="Ej. Técnica Martes 16hs" value="${this._escapeHtml(d.name || '')}">
                    </div>
                    <div>
                        <label class="dgf-label inline"><svg width="12" height="12"><use href="#icon-meet"/></svg>Meet</label>
                        <input id="dgf-meet" class="dgf-input" type="text" placeholder="https://meet.google.com/…" value="${this._escapeHtml(d.meetLink || '')}">
                    </div>
                    <div>
                        <label class="dgf-label inline"><svg width="12" height="12" style="color:#25d366;"><use href="#icon-whatsapp"/></svg>WhatsApp</label>
                        <input id="dgf-whatsapp" class="dgf-input" type="text" placeholder="Link al chat del grupo" value="${this._escapeHtml(d.whatsapp || '')}">
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1; min-width:0;">
                            <label class="dgf-label">Día</label>
                            <select id="dgf-day" class="dgf-input" onchange="app.dgfRefreshProximas()">
                                <option value="">Sin definir</option>
                                ${days.map(x => `<option value="${x}" ${d.day === x ? 'selected' : ''}>${x}</option>`).join('')}
                            </select>
                        </div>
                        <div style="flex-shrink:0; width:120px;">
                            <label class="dgf-label" for="dgf-time" style="cursor:pointer;">Horario</label>
                            <input id="dgf-time" class="dgf-input" type="time" value="${this._escapeHtml(d.time || '')}" onchange="app.dgfRefreshProximas()">
                        </div>
                    </div>
                    <div>
                        <label class="dgf-label" style="margin-bottom:7px;">Duración</label>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <label class="dgf-radio-row"><input type="radio" name="dgf-duracion" value="fin" ${d.duracionTipo !== 'n' ? 'checked' : ''} onchange="app.dgfRefreshProximas()">Hasta fin de año</label>
                            <label class="dgf-radio-row"><input type="radio" name="dgf-duracion" value="n" ${d.duracionTipo === 'n' ? 'checked' : ''} onchange="app.dgfRefreshProximas()">N clases
                                <input id="dgf-duracion-n" class="dgf-duracion-n" type="number" min="1" value="${d.duracionN}" onchange="app.dgfRefreshProximas()">
                            </label>
                        </div>
                    </div>
                    <div>
                        <label class="dgf-label">Frecuencia</label>
                        <select id="dgf-frecuencia" class="dgf-input" onchange="app.dgfRefreshProximas()">
                            ${frecs.map(x => `<option value="${x}" ${d.frecuencia === x ? 'selected' : ''}>${x}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:7px;">
                            <label class="dgf-label" style="margin-bottom:0;">Alumnos</label>
                            <div class="dgf-member-search">
                                <svg width="11" height="11" style="flex-shrink:0;"><use href="#icon-buscar"/></svg>
                                <input id="dgf-member-search" type="text" placeholder="Buscar alumno…" oninput="app.dgfFilterMembers(this.value)">
                            </div>
                        </div>
                        <div class="dgf-member-list" id="dgf-member-list">${memberRows}</div>
                    </div>
                </div>
                <div class="dgf-prox-col">
                    <label class="dgf-label" style="margin-bottom:7px;">Próximas clases del grupo</label>
                    <div class="dgf-prox-list" id="dgf-prox-list"></div>
                    <div class="dgf-suelta-row">
                        <input type="date" id="dgf-suelta-date" class="dgf-input dgf-suelta-date">
                        <button class="dgf-suelta-btn" onclick="app.dgfAddClaseSuelta()" title="Crear una clase extra en una fecha fuera del cronograma (ej. recuperación)">+ Agregar clase suelta</button>
                    </div>
                </div>
            </div>
            <div class="big3-modal-footer">
                <button class="big3-btn" onclick="app.closeGroupModal()">Cancelar</button>
                <button class="big3-btn pri" onclick="app.dashSaveGroup()">Guardar</button>
            </div>
        </div>`;
        overlay.style.display = 'flex';
        this.dgfRefreshProximas();
    },

    closeGroupModal() {
        const overlay = document.getElementById('modal-edit-group');
        if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
        this._dgfDraft = null;
    },

    dgfFilterMembers(q) {
        const query = (q || '').toLowerCase().trim();
        document.querySelectorAll('#dgf-member-list .dgf-member-row').forEach(row => {
            row.style.display = !query || (row.dataset.name || '').includes(query) ? '' : 'none';
        });
    },

    _dgfCollectForm() {
        const d = this._dgfDraft;
        if (!d) return null;
        d.name = document.getElementById('dgf-name')?.value?.trim() || '';
        d.meetLink = document.getElementById('dgf-meet')?.value?.trim() || '';
        d.whatsapp = document.getElementById('dgf-whatsapp')?.value?.trim() || '';
        d.day = document.getElementById('dgf-day')?.value || '';
        d.time = document.getElementById('dgf-time')?.value || '';
        d.frecuencia = document.getElementById('dgf-frecuencia')?.value || 'Semanal';
        d.duracionTipo = document.querySelector('input[name="dgf-duracion"]:checked')?.value || 'fin';
        d.duracionN = Math.max(1, parseInt(document.getElementById('dgf-duracion-n')?.value, 10) || 8);
        d.memberIds = [...document.querySelectorAll('input[name="dgf-member"]:checked')].map(c => c.value);
        return d;
    },

    // Fechas futuras del grupo según día/frecuencia/duración, respetando salteadas (lógica nueva, Pieza 3)
    _getProximasClasesGrupo(d) {
        const dayIdx = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].indexOf(d.day);
        if (dayIdx < 0) return [];
        const pad = n => String(n).padStart(2, '0');
        const fmt = x => `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`;
        const step = d.frecuencia === 'Cada 15 días' ? 14 : d.frecuencia === 'Mensual' ? 28 : 7;
        const endOfYear = new Date(new Date().getFullYear(), 11, 31);
        const cur = new Date(); cur.setHours(0, 0, 0, 0);
        while (cur.getDay() !== dayIdx) cur.setDate(cur.getDate() + 1);
        const out = [];
        let usable = 0;
        while (out.length < 60) {
            if (d.duracionTipo === 'n') { if (usable >= d.duracionN) break; }
            else if (cur > endOfYear) break;
            const dateStr = fmt(cur);
            const skipped = (d.skippedDates || []).includes(dateStr);
            out.push({ dateStr, skipped });
            if (!skipped) usable++;
            cur.setDate(cur.getDate() + step);
        }
        return out;
    },

    dgfRefreshProximas() {
        const d = this._dgfCollectForm();
        const cont = document.getElementById('dgf-prox-list');
        if (!d || !cont) return;
        const todayStr = this.getTodayString();
        const fechas = this._getProximasClasesGrupo(d);
        if (!fechas.length) {
            cont.innerHTML = '<p class="dgf-prox-empty">Definí un día de clase para ver las próximas fechas.</p>';
            return;
        }
        const fmtLabel = ds => {
            const s = new Date(ds+'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '').replace(/\./g, '');
            return s.charAt(0).toUpperCase() + s.slice(1);
        };
        // Designación de las clases ya creadas: número de orden + nombre específico si tiene
        const groupClases = this.data.getAllClases().filter(c => c.groupId === d.id);
        const claseTag = ds => {
            const c = groupClases.find(x => x.date === ds);
            if (!c) return '';
            return `<span class="dgf-prox-num">Clase ${this._claseNumero(c)}${c.nombre ? ' — ' + this._escapeHtml(c.nombre) : ''}</span>`;
        };
        cont.innerHTML = fechas.map(f => f.skipped ? `
            <div class="dgf-prox-row salteada">
                <span class="dgf-prox-date">${fmtLabel(f.dateStr)}</span>
                <span class="dgf-prox-tag">Salteada</span>
                <button class="dgf-prox-btn" title="Restaurar esta clase" onclick="app.dgfToggleSkip('${f.dateStr}')"><svg width="11" height="11"><use href="#icon-nuevo"/></svg></button>
            </div>` : `
            <div class="dgf-prox-row">
                <span class="dgf-prox-date">${fmtLabel(f.dateStr)}</span>
                ${claseTag(f.dateStr)}
                ${f.dateStr === todayStr ? '<span class="dgf-prox-hoy">Hoy</span>' : ''}
                <button class="dgf-prox-btn" title="Editar esta clase" onclick="app.dgfEditProximaClase('${f.dateStr}')"><svg width="11" height="11"><use href="#icon-editar"/></svg></button>
                <button class="dgf-prox-btn" title="Saltear esta clase" onclick="app.dgfToggleSkip('${f.dateStr}')"><svg width="11" height="11"><use href="#icon-saltear"/></svg></button>
            </div>`).join('');
    },

    dgfToggleSkip(dateStr) {
        const d = this._dgfDraft;
        if (!d) return;
        d.skippedDates = d.skippedDates || [];
        const i = d.skippedDates.indexOf(dateStr);
        if (i >= 0) d.skippedDates.splice(i, 1); else d.skippedDates.push(dateStr);
        this.dgfRefreshProximas();
    },

    async dgfEditProximaClase(dateStr) {
        // Guarda el grupo con lo cargado en el form y abre la clase de esa fecha (creándola si no existe)
        const d = this._dgfCollectForm();
        if (!d) return;
        if (!d.name) { alert('Poné un nombre al grupo antes de editar sus clases.'); return; }
        this._dgfPersistDraft();
        let clase = this.data.getAllClases().find(c => c.groupId === d.id && c.date === dateStr);
        if (!clase) {
            clase = {
                id: this.data.generateId('clase'), groupId: d.id,
                title: `Clase ${new Date(dateStr+'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
                date: dateStr, status: 'programada', attendance: {}, content: [], objetivos: [], resumen: '',
                pasosV2: true
            };
            this.data.saveClase(clase);
        }
        this.closeGroupModal();
        // Editar = entrar a la clase: se abre la página de la clase, no el modal chico.
        // La flecha de volver devuelve al modal del grupo desde el que se entró.
        this.openClase(clase.id);
        this._claseReturnTo = { groupId: d.id };
    },

    // Clase "suelta": una clase extra en una fecha fuera del cronograma regular (ej. recuperación).
    // Reusa dgfEditProximaClase, que la crea si no existe y la abre (con volver al modal del grupo).
    dgfAddClaseSuelta() {
        const inp = document.getElementById('dgf-suelta-date');
        const dateStr = inp && inp.value;
        if (!dateStr) { alert('Elegí una fecha para la clase suelta.'); return; }
        this.dgfEditProximaClase(dateStr);
    },

    _dgfPersistDraft() {
        const d = this._dgfDraft;
        if (!d) return;
        delete d._new;
        const groups = this.data.getAllGroups();
        const idx = groups.findIndex(g => g.id === d.id);
        if (idx >= 0) groups[idx] = d; else groups.push(d);
        this.data.saveGroups(groups);
    },

    dashSaveGroup() {
        const d = this._dgfCollectForm();
        if (!d) return;
        if (!d.name) { alert('Por favor, ingresá un nombre para el grupo.'); return; }
        const isNew = !!d._new;
        this._dgfPersistDraft();
        this.closeGroupModal();
        this.showToast(isNew ? '¡Grupo de clase creado con éxito!' : 'Grupo actualizado.', '✓');
        this.renderDashboardView();
    },

    async dashDeleteGroup(groupId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este grupo de clase?')) return;
        const groups = this.data.getAllGroups().filter(g => g.id !== groupId);
        this.data.saveGroups(groups);
        this.showToast('Grupo eliminado.', '✓');
        this.renderDashboardView();
    },

    // Próxima clase (Pieza 5B): la más cercana entre clases creadas y horarios semanales de grupos
    _proximaClaseInfo(allClases, groups) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const candidates = [];

        const pushCand = (dateStr, time, group, clase) => {
            const dt = new Date(`${dateStr}T${time || '23:59'}`);
            if (isNaN(dt) || dt < now) return;
            candidates.push({ dt, dateStr, time, group, clase });
        };

        allClases.filter(c => c.status !== 'finalizada' && !c._draft).forEach(c => {
            const g = groups.find(x => x.id === c.groupId) || {};
            pushCand(c.date, (g.time||c.time||'').slice(0,5), g, c);
        });
        groups.filter(g => g.day && g.time).forEach(g => {
            for (let i = 0; i <= 7; i++) {
                const d = new Date(now); d.setDate(now.getDate() + i);
                if (dayNames[d.getDay()] !== g.day) continue;
                const dateStr = fmtDate(d);
                if (!allClases.some(c => c.groupId === g.id && c.date === dateStr)) pushCand(dateStr, g.time.slice(0,5), g, null);
                break;
            }
        });
        if (!candidates.length) return null;
        candidates.sort((a,b) => a.dt - b.dt);
        const c = candidates[0];

        // Valor estático, se recalcula al re-renderizar (sin timer corriendo)
        const diffMin = Math.round((c.dt - now) / 60000);
        const isToday = c.dateStr === fmtDate(now);
        let label;
        if (isToday) {
            label = diffMin < 60 ? `Hoy · en ${Math.max(diffMin,1)} min` : `Hoy · en ${Math.round(diffMin/60)} h`;
        } else {
            const days = Math.round((new Date(c.dateStr+'T12:00') - new Date(fmtDate(now)+'T12:00')) / 86400000);
            const dayLabel = days === 1 ? 'Mañana' : dayNames[c.dt.getDay()];
            label = `${dayLabel}${c.time ? ' ' + c.time : ''} · en ${days} día${days!==1?'s':''}`;
        }
        return { ...c, label, isToday };
    },

    // ── Pestaña Calendario (handoff Design, opción 2a: chips de color por estado) ──
    // Estado en core.js: _calMode ('mes'|'semana'), _calMonthOffset, _calWeekOffset.
    _CAL_WD: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
    _CAL_MONTHS: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    _CAL_MON_ABBR: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],

    _calPad(n) { return String(n).padStart(2, '0'); },
    _calFmt(d) { return `${d.getFullYear()}-${this._calPad(d.getMonth()+1)}-${this._calPad(d.getDate())}`; },
    _calMondayIndex(d) { return (d.getDay() + 6) % 7; }, // 0 = lunes

    // Estado de una clase para el color del chip. "Suspendida/Faltó" (naranja) se deriva de:
    //   grupal → status:'suspendida' (lo setea el profe con "Suspender clase")
    //   individual → asistencia del único alumno en 'ausente' (faltó)
    _calStatus(clase, group) {
        if (clase.status === 'suspendida') return 'suspendida';
        const isIndividual = group && (group._personal || (group.memberIds || []).length <= 1);
        if (isIndividual) {
            const vals = Object.values(clase.attendance || {});
            if (vals.length && vals.every(v => v === 'ausente')) return 'suspendida';
        }
        return clase.status === 'finalizada' ? 'finalizada'
             : clase.status === 'en-curso'   ? 'iniciada'
             : 'pendiente';
    },

    // Descriptores de chip para las clases de un día, ordenados por hora
    _calDayItems(dateStr, allClases, groups) {
        return allClases.filter(c => c.date === dateStr && !c._draft).map(c => {
            const g = groups.find(x => x.id === c.groupId) || {};
            return {
                id: c.id,
                time: (g.time || c.time || '').slice(0, 5),
                name: g.name || c.title || 'Clase',
                st: this._calStatus(c, g)
            };
        }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    },

    _calRangeLabel(todayStr) {
        const today = new Date(todayStr + 'T12:00');
        if (this._calMode === 'mes') {
            const d = new Date(today.getFullYear(), today.getMonth() + this._calMonthOffset, 1);
            return `${this._CAL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        }
        const monday = new Date(today);
        monday.setDate(today.getDate() - this._calMondayIndex(today) + this._calWeekOffset * 7);
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        return monday.getMonth() === sunday.getMonth()
            ? `${monday.getDate()} — ${sunday.getDate()} ${this._CAL_MON_ABBR[sunday.getMonth()]}`
            : `${monday.getDate()} ${this._CAL_MON_ABBR[monday.getMonth()]} — ${sunday.getDate()} ${this._CAL_MON_ABBR[sunday.getMonth()]}`;
    },

    _calMonthGrid(allClases, groups, todayStr) {
        const MAX = 3;
        const today = new Date(todayStr + 'T12:00');
        const base = new Date(today.getFullYear(), today.getMonth() + this._calMonthOffset, 1);
        const gridStart = new Date(base); gridStart.setDate(1 - this._calMondayIndex(base));

        const wd = this._CAL_WD.map(w => `<div class="cal3-wd">${w}</div>`).join('');
        let cells = '';
        for (let i = 0; i < 42; i++) {
            const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
            const key = this._calFmt(d);
            const inMonth = d.getMonth() === base.getMonth();
            const isToday = key === todayStr;
            const items = this._calDayItems(key, allClases, groups);
            const shown = items.slice(0, MAX);
            const overflow = items.length - shown.length;
            const chips = shown.map(it => `
                <div class="cal3-chip ${it.st}" onclick="event.stopPropagation();app.tbGoToClase('${it.id}')" title="${this._escapeHtml((it.time ? it.time + ' ' : '') + it.name)}">
                    <span class="cal3-chip-txt">${it.time ? it.time + ' ' : ''}${this._escapeHtml(it.name)}</span>
                </div>`).join('');
            const hover = items.length ? ` onmouseenter="app.calDayHover(event,'${key}')" onmouseleave="app.calDayHoverOut()"` : '';
            cells += `<div class="cal3-cell ${isToday ? 'today' : ''} ${inMonth ? '' : 'out'}" onclick="app.calCreateOnDate('${key}')" title="Crear clase el ${key}"${hover}>
                <span class="cal3-cell-num">${d.getDate()}</span>
                ${chips}
                ${overflow > 0 ? `<span class="cal3-more">+${overflow} más</span>` : ''}
            </div>`;
        }
        return `<div class="cal3-grid cal3-month">${wd}${cells}</div>`;
    },

    _calWeekGrid(allClases, groups, todayStr) {
        const today = new Date(todayStr + 'T12:00');
        const monday = new Date(today);
        monday.setDate(today.getDate() - this._calMondayIndex(today) + this._calWeekOffset * 7);

        const cols = [0,1,2,3,4,5,6].map(i => {
            const d = new Date(monday); d.setDate(monday.getDate() + i);
            const key = this._calFmt(d);
            const isToday = key === todayStr;
            const items = this._calDayItems(key, allClases, groups);
            const chips = items.map(it => `
                <div class="cal3-wchip ${it.st}" onclick="event.stopPropagation();app.tbGoToClase('${it.id}')">
                    <span class="cal3-wchip-time">${it.time || '—'}</span>
                    <span class="cal3-wchip-name">${this._escapeHtml(it.name)}</span>
                </div>`).join('');
            return `<div class="cal3-wcol" onclick="app.calCreateOnDate('${key}')" title="Crear clase el ${key}">
                <div class="cal3-wcol-head ${isToday ? 'today' : ''}">
                    <span class="cal3-wd">${this._CAL_WD[i]}</span>
                    <span class="cal3-wnum ${isToday ? 'today' : ''}">${d.getDate()}</span>
                </div>
                ${items.length ? chips : '<div class="cal3-wempty">Sin clases</div>'}
            </div>`;
        }).join('');
        return `<div class="cal3-grid cal3-week">${cols}</div>`;
    },

    _renderCalendario(allClases, groups, todayStr, profiles = []) {
        // Cerrar cualquier popover de día que haya quedado abierto de un render anterior
        const pop = document.getElementById('cal3-daypop');
        if (pop) pop.style.display = 'none';

        // Filtros por alumno / curso (arriba del calendario). Se aplican una vez acá y se
        // guardan en _calCache para que el popover de hover use exactamente el mismo set.
        let clases = allClases;
        if (this._calFilterGroup !== 'todos') {
            clases = clases.filter(c => c.groupId === this._calFilterGroup);
        }
        if (this._calFilterStudent !== 'todos') {
            const sid = this._calFilterStudent;
            clases = clases.filter(c => {
                const g = groups.find(x => x.id === c.groupId);
                return g && (g.memberIds || []).includes(sid);
            });
        }
        this._calCache = { clases, groups };

        const isMes = this._calMode === 'mes';
        const grid = isMes
            ? this._calMonthGrid(clases, groups, todayStr)
            : this._calWeekGrid(clases, groups, todayStr);

        const cursos = groups.filter(g => !g._personal);
        const studentOpts = ['<option value="todos">Todos los alumnos</option>'].concat(
            (profiles || []).map(p => `<option value="${p.id}"${this._calFilterStudent === p.id ? ' selected' : ''}>${this._escapeHtml(this._teacherDisplayName ? this._teacherDisplayName(p) : (p.displayName || p.name || '?'))}</option>`)
        ).join('');
        const groupOpts = ['<option value="todos">Todos los cursos</option>'].concat(
            cursos.map(g => `<option value="${g.id}"${this._calFilterGroup === g.id ? ' selected' : ''}>${this._escapeHtml(g.name)}</option>`)
        ).join('');

        return `<div class="cal3-wrap">
            <div class="cal3-toolbar">
                <div class="cal3-toggle">
                    <button class="cal3-toggle-btn ${isMes ? 'active' : ''}" onclick="app.calSetMode('mes')">Mes</button>
                    <button class="cal3-toggle-btn ${!isMes ? 'active' : ''}" onclick="app.calSetMode('semana')">Semana</button>
                </div>
                <div class="cal3-nav">
                    <button class="cal3-nav-btn" onclick="app.calPrev()" title="Anterior">‹</button>
                    <span class="cal3-range">${this._calRangeLabel(todayStr)}</span>
                    <button class="cal3-nav-btn" onclick="app.calNext()" title="Siguiente">›</button>
                </div>
                <button class="cal3-today" onclick="app.calToday()">Hoy</button>
                <div class="cal3-filters">
                    <select class="cal3-filter" onchange="app.calSetFilterStudent(this.value)" title="Filtrar por alumno">${studentOpts}</select>
                    <select class="cal3-filter" onchange="app.calSetFilterGroup(this.value)" title="Filtrar por curso">${groupOpts}</select>
                </div>
                <div class="cal3-legend">
                    <span class="cal3-leg"><span class="cal3-dot pendiente"></span>Pendiente</span>
                    <span class="cal3-leg"><span class="cal3-dot iniciada"></span>En curso</span>
                    <span class="cal3-leg"><span class="cal3-dot finalizada"></span>Finalizada</span>
                    <span class="cal3-leg"><span class="cal3-dot suspendida"></span>Suspendida/Faltó</span>
                </div>
            </div>
            <div class="cal3-body">${grid}</div>
        </div>`;
    },

    calSetMode(mode) { this._calMode = mode; this.renderTeacherBoardView(); },
    calPrev() { if (this._calMode === 'mes') this._calMonthOffset--; else this._calWeekOffset--; this.renderTeacherBoardView(); },
    calNext() { if (this._calMode === 'mes') this._calMonthOffset++; else this._calWeekOffset++; this.renderTeacherBoardView(); },
    calToday() { this._calMonthOffset = 0; this._calWeekOffset = 0; this.renderTeacherBoardView(); },
    calSetFilterStudent(id) { this._calFilterStudent = id; this.renderTeacherBoardView(); },
    calSetFilterGroup(id) { this._calFilterGroup = id; this.renderTeacherBoardView(); },
    calCreateOnDate(dateStr) { this.navigateToView('dashboard'); this.dashStartCreateClase(dateStr); },

    // Popover de hover: overview completo del día partido en Mañana / Tarde (criterio < '13:00').
    // Es informativo (pointer-events:none) y position:fixed para escapar el overflow del calendario.
    _calDayPopInner(dateStr, items) {
        const manana = items.filter(it => (it.time || '00:00') < '13:00');
        const tarde  = items.filter(it => (it.time || '00:00') >= '13:00');
        const sec = (label, arr) => `
            <div class="cal3-pop-sec">
                <div class="cal3-pop-sec-hd">${label}</div>
                ${arr.length ? arr.map(it => `
                    <div class="cal3-pop-item ${it.st}">
                        <span class="cal3-pop-time">${it.time || '—'}</span>
                        <span class="cal3-pop-name">${this._escapeHtml(it.name)}</span>
                    </div>`).join('') : '<div class="cal3-pop-empty">— sin clases —</div>'}
            </div>`;
        const d = new Date(dateStr + 'T12:00');
        return `<div class="cal3-pop-date">${d.getDate()} ${this._CAL_MON_ABBR[d.getMonth()]}</div>${sec('Mañana', manana)}${sec('Tarde', tarde)}`;
    },

    calDayHover(ev, dateStr) {
        const cache = this._calCache || {};
        const items = this._calDayItems(dateStr, cache.clases || [], cache.groups || []);
        if (!items.length) return;
        let host = document.getElementById('cal3-daypop');
        if (!host) { host = document.createElement('div'); host.id = 'cal3-daypop'; document.body.appendChild(host); }
        host.innerHTML = this._calDayPopInner(dateStr, items);
        host.style.display = 'block';
        const r = ev.currentTarget.getBoundingClientRect();
        const pw = host.offsetWidth || 210;
        const ph = host.offsetHeight || 120;
        let left = r.right + 8;
        if (left + pw > window.innerWidth - 8) left = r.left - pw - 8;
        if (left < 8) left = 8;
        let top = r.top;
        if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
        if (top < 8) top = 8;
        host.style.left = left + 'px';
        host.style.top = top + 'px';
    },

    calDayHoverOut() {
        const host = document.getElementById('cal3-daypop');
        if (host) host.style.display = 'none';
    },

    cycleAttendance(claseId, profileId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.attendance = clase.attendance || {};
        const cur = clase.attendance[profileId] || null;
        clase.attendance[profileId] = cur === null ? 'presente' : cur === 'presente' ? 'ausente' : null;
        this.data.saveClase(clase);
        this._moveAttCard(claseId, profileId, clase.attendance[profileId]);
    },

    _moveAttCard(claseId, profileId, newStatus) {
        const tablero = document.getElementById(`tablero-${claseId}`);
        const card    = document.getElementById(`stu3-${profileId}`);
        if (!tablero || !card) { this._renderClaseDetail(claseId); return; }

        const ORDER  = ['Presentes', 'Ausentes', 'Sin marcar'];
        const COLORS = { 'Presentes': 'green', 'Ausentes': 'red', 'Sin marcar': 'gray' };
        const targetLabel = newStatus === 'presente' ? 'Presentes' : newStatus === 'ausente' ? 'Ausentes' : 'Sin marcar';

        // Buscar o crear el grupo destino
        const allGroups = () => Array.from(tablero.querySelectorAll(':scope > .tab3-group'));
        let targetGroup = allGroups().find(g =>
            g.querySelector('.tab3-group-header')?.textContent.trimStart().startsWith(targetLabel)
        );
        if (!targetGroup) {
            targetGroup = document.createElement('div');
            targetGroup.className = 'tab3-group';
            targetGroup.innerHTML = `
                <div class="tab3-group-header ${COLORS[targetLabel]}">${targetLabel} — 0</div>
                <div class="tab3-group-body tab3-cards"></div>`;
            const targetIdx = ORDER.indexOf(targetLabel);
            let inserted = false;
            for (const g of allGroups()) {
                const txt = g.querySelector('.tab3-group-header')?.textContent.trimStart() || '';
                if (ORDER.indexOf(ORDER.find(l => txt.startsWith(l))) > targetIdx) {
                    tablero.insertBefore(targetGroup, g); inserted = true; break;
                }
            }
            if (!inserted) tablero.appendChild(targetGroup);
        }

        const sourceGroup = card.closest('.tab3-group');
        targetGroup.querySelector('.tab3-group-body').appendChild(card);

        // El chip de estado (punto 2) vive dentro de la card: actualizarlo al mover, no solo el grupo
        const chip = card.querySelector('.stu3-att-btn');
        if (chip) {
            const st = newStatus === 'presente' ? 'present' : newStatus === 'ausente' ? 'absent' : 'unmarked';
            chip.className = `stu3-att-btn ${st}`;
            chip.textContent = newStatus === 'presente' ? '✓ Presente' : newStatus === 'ausente' ? '✕ Ausente' : '○ Marcar';
        }

        const refreshHeader = g => {
            const hdr   = g.querySelector('.tab3-group-header');
            const count = g.querySelectorAll('.stu3-card').length;
            if (!count) { g.remove(); return; }
            const label = ORDER.find(l => hdr?.textContent.trimStart().startsWith(l)) || '';
            if (hdr) hdr.textContent = `${label} — ${count}`;
        };
        if (sourceGroup && sourceGroup !== targetGroup) refreshHeader(sourceGroup);
        refreshHeader(targetGroup);
    },

    saveResumenProfesor(claseId, text) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.resumenProfesor = text;
        clase.resumen = text; // backward compat
        this.data.saveClase(clase);
    },

    _showHoverCard(profileId) {
        const card = document.getElementById(`hc-${profileId}`);
        if (card) card.classList.add('visible');
    },

    _hideHoverCard(profileId) {
        const card = document.getElementById(`hc-${profileId}`);
        if (card) card.classList.remove('visible');
    },

    async _renderBibliotecaPanel() {
        const body = document.getElementById('dash-bib-body');
        if (!body) return;

        const allItems = await this.data.getLibraryItems();
        this._bibAllItems = allItems; // cache para refrescar solo la lista al buscar (sin re-fetch)

        const q = (this._libSearch||'').toLowerCase().trim();
        const catF = this._libCatFilter || 'todos';

        // La categoría es metadata de biblioteca; clase.categories dejó de leerse (modelo de Pasos)
        const panelCats = this.data.getDefaultCategories();
        const catChips = ['todos', ...panelCats].map(c =>
            `<div class="bib3-chip ${catF===c?'active':''}" onclick="app.filterBiblioteca('${this._escapeHtml(c)}')">${c==='todos'?'Todos':this._escapeHtml(c)}</div>`
        ).join('');

        body.innerHTML = `
            <div class="bib3-search-wrap">
                <span class="bib3-search-icon"><svg width="13" height="13"><use href="#icon-buscar"/></svg></span>
                <input type="text" class="bib3-search" placeholder="Buscar en biblioteca…" value="${this._escapeHtml(q)}" oninput="app.searchBiblioteca(this.value)">
            </div>
            <div class="bib3-chips">${catChips}</div>
            <div class="bib3-list" id="dash-bib-list">${this._bibPanelListHtml()}</div>
            <div class="bib3-upload">
                <div class="bib3-upload-title">Subir nuevo</div>
                <div class="bib3-dz" ondragover="event.preventDefault()" ondrop="app._handleLibDrop(event)">
                    <div class="bib3-dz-icon"><svg width="22" height="22"><use href="#icon-carpeta"/></svg></div>
                    <div class="bib3-dz-label">Arrastrá .gp · .pdf · .gpx</div>
                    <div class="bib3-dz-sub">o <label style="color:var(--tb-accent);cursor:pointer"><input type="file" style="display:none" accept=".gp,.gp4,.gp5,.gpx,.pdf" onchange="app._handleLibFileInput(event)">elegir archivo</label></div>
                </div>
                <div class="bib3-link-row">
                    <input type="text" class="bib3-link-input" id="bib3-link-input" placeholder="Link YouTube / Spotify…">
                    <button class="h3-btn" onclick="app._detectLibLink()">Detectar</button>
                </div>
            </div>`;
    },

    // Solo el HTML de la lista (usa el cache _bibAllItems). Se re-genera al buscar sin tocar
    // el <input>, para no perder el foco del buscador en cada tecla.
    _bibPanelListHtml() {
        const allItems = this._bibAllItems || [];
        const claseId = this._currentClaseId;
        const clase = claseId ? this.data.getClase(claseId) : null;
        const addedIds = new Set((clase?.content||[]).map(c => this._pasoLibId(c)).filter(Boolean));

        const q = (this._libSearch||'').toLowerCase().trim();
        const catF = this._libCatFilter || 'todos';

        let items = allItems;
        if (q) items = items.filter(it => (it.title||it.name||'').toLowerCase().includes(q));
        if (catF !== 'todos') items = items.filter(it => (it.category||it.exerciseType||'') === catF);

        return items.length
            ? items.map(it => {
                const added = addedIds.has(it.id);
                return `<div class="bib3-item ${added?'added':''}">
                    <div class="bib3-ico">${this._bibTypeIcon(it.fileType||it.type)}</div>
                    <span class="bib3-title">${this._escapeHtml(it.title||it.name)}</span>
                    ${added
                        ? `<div class="bib3-check">✓</div>`
                        : `<div class="bib3-add" onclick="app.addContentFromBib('${it.id}')">+</div>`}
                </div>`;
              }).join('')
            : '<p class="text3-muted" style="padding:10px 0">Sin resultados</p>';
    },

    filterBiblioteca(cat) {
        this._libCatFilter = cat;
        this._renderBibliotecaPanel();
    },

    searchBiblioteca(q) {
        this._libSearch = q;
        // Refrescar SOLO la lista: el <input> queda intacto y no pierde el foco al tipear.
        const list = document.getElementById('dash-bib-list');
        if (list) list.innerHTML = this._bibPanelListHtml();
        else this._renderBibliotecaPanel();
    },

    async addContentFromBib(libItemId) {
        if (!this._currentClaseId) { this.showToast('Seleccioná una clase primero', '⚠️'); return; }
        const claseId = this._currentClaseId;
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        this._ensurePasosV2(clase);
        if (clase.content.some(p => this._pasoLibId(p) === libItemId)) return;
        const item = await this.data.getLibraryItem(libItemId);
        if (!item) return;
        clase.content.push({ id: this.data.generateId('paso'), libraryItemId: item.id, descripcion: '', objetivo: '' });
        this.data.saveClase(clase);

        const group = clase.groupId ? this.data.getGroup(clase.groupId) : null;
        if (group && group.memberIds && group.memberIds.length) {
            this.notifyStudents(group.memberIds, { type: 'carga_docente', claseId, itemId: item.id, itemTitle: item.title });
        }

        await this._refreshPasosList(claseId);
        this._renderBibliotecaPanel();
        this.showToast('Paso agregado al plan', '📎');
    },

    async applyTemplateToClase(tplId) {
        if (!this._currentClaseId) { this.showToast('Seleccioná una clase primero', '⚠️'); return; }
        const tpl = this.data.getTemplates().find(t => t.id === tplId);
        if (!tpl) return;
        const clase = this.data.getClase(this._currentClaseId);
        if (!clase) return;

        // La plantilla es un plan de pasos: se agregan como pasos de la clase (ids nuevos)
        this._ensurePasosV2(clase);
        let addedCount = 0;
        for (const paso of (tpl.items || [])) {
            const yaEsta = paso.libraryItemId
                ? clase.content.some(p => this._pasoLibId(p) === paso.libraryItemId)
                : clase.content.some(p => !this._pasoLibId(p) && (p.descripcion || '').trim() === (paso.descripcion || '').trim());
            if (yaEsta) continue;
            clase.content.push({
                id: this.data.generateId('paso'),
                libraryItemId: paso.libraryItemId || null,
                descripcion: paso.descripcion || '',
                objetivo: paso.objetivo || ''
            });
            addedCount++;
        }
        if (addedCount > 0) {
            this.data.saveClase(clase);
            const group = clase.groupId ? this.data.getGroup(clase.groupId) : null;
            if (group && group.memberIds && group.memberIds.length) {
                this.notifyStudents(group.memberIds, { type: 'carga_docente', claseId: clase.id, itemTitle: tpl.name });
            }
            if (this._currentClaseId) await this._renderClaseDetail(this._currentClaseId);
            this._renderBibliotecaPanel();
            this.showToast(`Plantilla "${tpl.name}" aplicada. Se agregaron ${addedCount} paso${addedCount!==1?'s':''}.`, '📋');
        } else {
            this.showToast('Todos los ítems de la plantilla ya estaban agregados.', 'ℹ️');
        }
    },

    async _openEditClaseModal(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        const overlay = document.getElementById('modal-edit-clase');
        if (!overlay) return;

        const group = this.data.getGroup(clase.groupId) || {};
        const allProfiles = await this.data.getProfiles();
        const groupMemberIds = group.memberIds || [];
        const override = clase.memberOverride; // null | [profileId, ...]
        const activeIds = new Set(override !== null && override !== undefined ? override : groupMemberIds);

        // Designación fija en el título del modal: grupo + número de orden
        const titleEl = document.querySelector('#modal-edit-clase .modal-edit-title');
        if (titleEl) titleEl.textContent = `${group.name || 'Clase'} · Clase ${this._claseNumero(clase)}`;

        // Populate nombre, date, time, meetUrl, whatsapp (el contacto vive en el grupo)
        document.getElementById('modal-edit-nombre').value = clase.nombre || '';
        document.getElementById('modal-edit-date').value = clase.date || '';
        document.getElementById('modal-edit-time').value = clase.time || group.time || '';
        document.getElementById('modal-edit-meeturl').value = clase.meetUrl || '';
        document.getElementById('modal-edit-whatsapp').value = group.whatsapp || '';

        // Populate student list — muestra TODOS los perfiles, pre-marca los activos
        const stuList = document.getElementById('modal-edit-students');
        if (allProfiles.length === 0) {
            stuList.innerHTML = '<div class="modal-students-empty">No hay alumnos creados aún.</div>';
        } else {
            const renderRow = p => {
                const checked = activeIds.has(p.id);
                const displayName = this._teacherDisplayName(p);
                const initial = displayName[0].toUpperCase();
                const color = p.color || '#c0392b';
                return `<div class="modal-stu-row ${checked?'checked':''}" data-pid="${p.id}" onclick="app._toggleModalStu(this)">
                    <div class="modal-stu-cb">${checked?'✓':''}</div>
                    <div class="modal-stu-av" style="background:${color}">${initial}</div>
                    <span class="modal-stu-name">${this._escapeHtml(displayName)}</span>
                </div>`;
            };
            // Checked → "Del grupo", unchecked → "Otros alumnos"
            const checked   = allProfiles.filter(p => activeIds.has(p.id));
            const unchecked = allProfiles.filter(p => !activeIds.has(p.id));
            stuList.innerHTML = `
                <div class="modal-stu-section" id="ms-in-label" ${!checked.length ? 'style="display:none"' : ''}>Del grupo</div>
                <div id="ms-in">${checked.map(renderRow).join('')}</div>
                <div class="modal-stu-section" id="ms-out-label" ${!unchecked.length ? 'style="display:none"' : ''}>Otros alumnos</div>
                <div id="ms-out">${unchecked.map(renderRow).join('')}</div>`;
        }

        overlay.dataset.claseId = claseId;
        overlay.style.display = 'flex';
    },

    _toggleModalStu(row) {
        row.classList.toggle('checked');
        const cb = row.querySelector('.modal-stu-cb');
        const isChecked = row.classList.contains('checked');
        if (cb) cb.textContent = isChecked ? '✓' : '';

        const inContainer  = document.getElementById('ms-in');
        const outContainer = document.getElementById('ms-out');
        const inLabel      = document.getElementById('ms-in-label');
        const outLabel     = document.getElementById('ms-out-label');
        if (!inContainer || !outContainer) return;

        if (isChecked) {
            inContainer.appendChild(row);
        } else {
            outContainer.appendChild(row);
        }
        if (inLabel)  inLabel.style.display  = inContainer.children.length  ? '' : 'none';
        if (outLabel) outLabel.style.display = outContainer.children.length ? '' : 'none';
    },

    closeEditClaseModal() {
        const overlay = document.getElementById('modal-edit-clase');
        if (overlay) overlay.style.display = 'none';
    },

    saveEditClase() {
        const overlay = document.getElementById('modal-edit-clase');
        if (!overlay) return;
        const claseId = overlay.dataset.claseId;
        const clase = this.data.getClase(claseId);
        if (!clase) return;

        const newDate = document.getElementById('modal-edit-date').value;
        const newMeet = document.getElementById('modal-edit-meeturl').value.trim();
        const checkedRows = overlay.querySelectorAll('.modal-stu-row.checked');
        const checkedIds = Array.from(checkedRows).map(r => r.dataset.pid).filter(Boolean);

        const group = this.data.getGroup(clase.groupId) || {};
        const groupMemberIds = group.memberIds || [];
        // Si la selección coincide exactamente con los miembros del grupo, limpiamos el override
        const sameAsGroup = checkedIds.length === groupMemberIds.length &&
            checkedIds.every(id => groupMemberIds.includes(id));

        const newTime = document.getElementById('modal-edit-time').value;
        if (newDate) clase.date = newDate;
        if (newTime) clase.time = newTime;
        clase.nombre = document.getElementById('modal-edit-nombre').value.trim();
        clase.meetUrl = newMeet || null;
        clase.memberOverride = sameAsGroup ? null : checkedIds;

        // El contacto de WhatsApp pertenece al grupo (también al personal de un alumno individual)
        const newWa = document.getElementById('modal-edit-whatsapp').value.trim();
        if (group.id && newWa !== (group.whatsapp || '')) {
            const groups = this.data.getAllGroups();
            const gi = groups.findIndex(g => g.id === group.id);
            if (gi >= 0) {
                groups[gi].whatsapp = newWa;
                this.data.saveGroups(groups);
            }
        }

        this.data.saveClase(clase);
        this.closeEditClaseModal();
        this.renderDashboardView();
        this.showToast('Clase actualizada.', '✓');
    },

    saveNotaAlumnoClase(claseId, text) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.notaAlumno = text;
        this.data.saveClase(clase);
    },

    _canalPreguntasHtml(claseId, preguntas) {
        const prevHtml = preguntas.map(p => {
            const timeStr = new Date(p.timestamp || p.date || Date.now()).toLocaleString('es-AR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            const itemBadge = p.itemId ? `<span class="duda-item-badge" style="display:inline-block; font-size:10px; font-weight:600; text-transform:uppercase; color:var(--tb-accent); background:rgba(108,99,255,.12); border-radius:4px; padding:1px 6px; margin-right:6px">${this._escapeHtml(p.itemTitle || 'ítem')}</span>` : '';
            return `<div class="duda-item">
                <p class="duda-text">${itemBadge}"${this._escapeHtml(p.text)}"</p>
                <div class="duda-meta">
                    <svg viewBox="0 0 16 16" fill="none" style="width:12px;height:12px" stroke="var(--tb-success)" stroke-width="1.5"><path d="M3 8l3 3 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>Enviada · ${timeStr}</span>
                    <button class="duda-delete" onclick="app.deletePreguntaAlumno('${claseId}','${p.id}')">×</button>
                </div>
            </div>`;
        }).join('');
        return prevHtml + `<div class="canal-form">
            <textarea id="preg-alumno-input" class="canal-ta" rows="2" placeholder="¿Qué no quedó claro? ¿Algo que quieras repasar la próxima clase?…"></textarea>
            <div class="canal-form-actions">
                <button class="btn-pill btn-meet-pill" onclick="app.sendPreguntaAlumno('${claseId}')">
                    <svg viewBox="0 0 16 16" fill="none" style="width:11px;height:11px" stroke="currentColor" stroke-width="1.5"><path d="M14 2L2 7l5 2 2 5 5-12z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Enviar pregunta
                </button>
            </div>
        </div>`;
    },

    sendPreguntaAlumno(claseId) {
        if (!this.activeProfile) return;
        const ta = document.getElementById('preg-alumno-input');
        if (!ta) return;
        const text = ta.value.trim();
        if (!text) return;
        const preg = { id: this.data.generateId('preg'), text, timestamp: Date.now() };
        this.data.savePreguntaAlumno(this.activeProfile.id, claseId, preg);
        ta.value = '';
        const container = document.getElementById(`canal-preg-${claseId}`);
        if (container) {
            const preguntas = this.data.getPreguntasAlumno(this.activeProfile.id, claseId);
            container.innerHTML = this._canalPreguntasHtml(claseId, preguntas);
        }
        this.showToast('Pregunta enviada', '✓');
    },

    deletePreguntaAlumno(claseId, pregId) {
        if (!this.activeProfile) return;
        this.data.deletePreguntaAlumno(this.activeProfile.id, claseId, pregId);
        const container = document.getElementById(`canal-preg-${claseId}`);
        if (container) {
            const preguntas = this.data.getPreguntasAlumno(this.activeProfile.id, claseId);
            container.innerHTML = this._canalPreguntasHtml(claseId, preguntas);
        }
    },

    teacherBoardSetMainTab(tab) {
        this._teacherBoardMainTab = tab;
        this.renderTeacherBoardView();
    },

    // Tira de tabs compartida de la vista "Clases": Agenda (dashboard) + tabs del tablero.
    // Se renderiza idéntica arriba de view-dashboard y view-teacher-board para que se
    // sientan una sola vista con sub-secciones (propuesta 1a del handoff UX).
    _renderClasesTabsStrip(active) {
        const tabs = [
            { key: 'agenda', label: 'Planificación', action: "app.navigateToView('dashboard')" },
            { key: 'calendario', label: 'Calendario', action: "app.clasesGoToBoardTab('calendario')" },
            { key: 'control', label: 'Alumnos', action: "app.clasesGoToBoardTab('control')" },
            { key: 'consultas', label: 'Consultas y Cargas', action: "app.clasesGoToBoardTab('consultas')" }
        ];
        const btns = tabs.map(t => {
            const isActive = t.key === active;
            return `<button class="bib-main-tab ${isActive ? 'active' : ''}" onclick="${t.action}" style="padding:12px 18px; border:none; background:transparent; font-weight:600; font-size:13px; border-bottom:2px solid ${isActive ? 'var(--tb-accent)' : 'transparent'}; color:${isActive ? 'var(--tb-text-primary)' : 'var(--tb-text-secondary)'}; cursor:pointer; font-family:var(--font-primary)">${t.label}</button>`;
        }).join('');
        return `<div class="bib-main-tabs" style="display:flex; border-bottom:1px solid var(--tb-border); background:var(--tb-bg-secondary); padding:0 16px; flex-shrink:0">${btns}</div>`;
    },

    clasesGoToBoardTab(tab) {
        this._teacherBoardMainTab = tab;
        if (this._currentView === 'teacher-board') this.renderTeacherBoardView();
        else this.navigateToView('teacher-board');
    },

    _tbActivityBucket(profileId) {
        const lastDate = this.data.getProfileLastPracticed(profileId);
        if (!lastDate) return { bucket: 'inactivo', daysSince: Infinity };
        const todayStr = this.getTodayString();
        const yesterdayStr = new Date(new Date(todayStr + 'T12:00').getTime() - 86400000).toISOString().slice(0, 10);
        const daysSince = Math.round((new Date(todayStr + 'T12:00') - new Date(lastDate + 'T12:00')) / 86400000);
        if (lastDate === todayStr) return { bucket: 'hoy', daysSince: 0 };
        if (lastDate === yesterdayStr) return { bucket: 'ayer', daysSince: 1 };
        return { bucket: 'inactivo', daysSince };
    },

    _tbAlertStatus(profileId, { daysSince, pendingQuestions, objetivosPct, hasObjetivos }) {
        if (daysSince === Infinity || daysSince > 7) {
            return { level: 'red', reason: daysSince === Infinity ? 'Sin historial de práctica' : `Inactivo hace ${daysSince} días` };
        }
        if (pendingQuestions > 0) {
            return { level: 'yellow', reason: `${pendingQuestions} consulta${pendingQuestions !== 1 ? 's' : ''} sin responder` };
        }
        if (daysSince > 3) {
            return { level: 'yellow', reason: `Sin practicar hace ${daysSince} días` };
        }
        if (hasObjetivos && objetivosPct < 50) {
            return { level: 'yellow', reason: `Objetivos de la última clase: ${objetivosPct}% completados` };
        }
        return { level: 'green', reason: 'Al día' };
    },

    async _tbGetStudentData(profile, allClases) {
        const pid = profile.id;
        const { bucket, daysSince } = this._tbActivityBucket(pid);
        const streak = this.data.getProfileStreak(pid);
        const lastPracticedTime = this.data.getProfileLastPracticedTime(pid);

        // Progreso del día con los pasos de la rutina (Fase B, reemplaza los 3 casilleros)
        const pasosProgress = this._getPasosProgress(pid);

        // Calcular minutos de práctica reales leyendo de IndexedDB
        let minutesToday = 0;
        const lastDate = this.data.getProfileLastPracticed(pid);
        if (lastDate) {
            try {
                const log = await this.data.getPracticeLog(lastDate);
                if (log && (log.profileId === pid || !log.profileId)) {
                    minutesToday = Math.round((log.totalSeconds || 0) / 60);
                }
            } catch (e) {
                console.warn('Error reading practice log for teacher board:', e);
            }
        }

        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(pid));
        // El grupo personal oculto (grp-personal-*) se llama igual que el alumno; mostrarlo como
        // "Individual" en vez de repetir el nombre (evita el subtítulo "Nico · Rock Viernes · Nico").
        const labelParts = groups.filter(g => !g._personal).map(g => g.name);
        if (groups.some(g => g._personal)) labelParts.push('Individual');
        const groupLabel = labelParts.length ? labelParts.join(' · ') : 'Individual';
        // Cuando hay más de un contexto (grupo + individual, o varios grupos) las clases se mezclan:
        // ahí cada chip lleva su designación de grupo/individual. Con un solo contexto es redundante.
        const multiContext = labelParts.length > 1;

        // Consultas pendientes: iterar clases de los grupos del alumno (evita escanear localStorage por prefijo)
        const myClaseIds = allClases.filter(c => groups.some(g => g.id === c.groupId)).map(c => c.id);
        let pendingQuestions = 0;
        myClaseIds.forEach(claseId => {
            const preguntas = this.data.getPreguntasAlumno(pid, claseId);
            pendingQuestions += preguntas.filter(p => !p.resolved).length;
        });

        // Avance con la tarea: pasos de la última clase publicada marcados alguna vez (persistente, no diario)
        const finalizadas = allClases
            .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
            .sort((a, b) => (b.finalizadaAt || 0) - (a.finalizadaAt || 0));
        const lastClase = finalizadas[0] || null;
        let hasObjetivos = false;
        let objetivosPct = 100;
        if (lastClase) {
            this._ensurePasosV2(lastClase);
            const pasos = lastClase.content || [];
            if (pasos.length) {
                hasObjetivos = true;
                const mine = (lastClase.pasosDone || {})[pid] || {};
                const done = pasos.filter(p => mine[p.id]).length;
                objetivosPct = Math.round((done / pasos.length) * 100);
            }
        }

        const alertStatus = this._tbAlertStatus(pid, { daysSince, pendingQuestions, objetivosPct, hasObjetivos });

        // Próxima clase: próximo grupo por día de la semana entre los grupos del alumno
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const now = new Date();
        let nextClase = null;
        groups.forEach(g => {
            const targetDay = dayNames.indexOf(g.day);
            if (targetDay < 0) return;
            let diff = (targetDay - now.getDay() + 7) % 7;
            const candidateDate = new Date(now);
            candidateDate.setDate(now.getDate() + diff);
            const candidateStr = candidateDate.toISOString().slice(0, 10);
            const existingClase = allClases.find(c => c.groupId === g.id && c.date === candidateStr);
            const info = { groupId: g.id, groupName: g.name, label: g._personal ? 'Individual' : g.name, date: candidateStr, time: g.time, daysAway: diff, claseId: existingClase ? existingClase.id : null, meetLink: g.meetLink, resumen: existingClase ? (existingClase.resumenProfesor || existingClase.resumen || '') : '' };
            if (!nextClase || info.daysAway < nextClase.daysAway) nextClase = info;
        });

        // Clases pasadas del alumno (hasta 3, la más reciente primero) para los chips de la fila
        const todayStr = this.getTodayString();
        const pastClases = allClases
            .filter(c => groups.some(g => g.id === c.groupId) && c.date < todayStr)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 3)
            .map(c => {
                const g = groups.find(gg => gg.id === c.groupId);
                return {
                    date: c.date,
                    claseId: c.id,
                    label: g && g._personal ? 'Individual' : (g ? g.name : ''),
                    resumen: c.resumenProfesor || c.resumen || ''
                };
            });

        return {
            profile, groupLabel, multiContext, streak, pasosProgress, lastPracticedTime,
            bucket, daysSince, pendingQuestions, objetivosPct, hasObjetivos,
            alertStatus, nextClase, pastClases, minutesToday
        };
    },

    async renderTeacherBoardView() {
        const container = document.getElementById('teacher-board-content');
        if (!container) return;
        // No pisar el contenido con "Cargando..." mientras se esperan los datos: los awaits tardan
        // milisegundos y el cartel solo se percibía como un parpadeo al cambiar de pestaña.

        const [profiles, items] = await Promise.all([
            this.data.getProfiles(), this.data.getLibraryItems()
        ]);
        const allClases = this.data.getAllClases();

        // Compat: la vieja pestaña "cargas" se fusionó en "consultas" (Consultas y Cargas, Pieza 7)
        if (this._teacherBoardMainTab === 'cargas') this._teacherBoardMainTab = 'consultas';
        let tabHeaderHtml = this._renderClasesTabsStrip(this._teacherBoardMainTab);

        let contentHtml = '';
        if (this._teacherBoardMainTab === 'consultas') {
            contentHtml = this._tbRenderConsultasCargasTab(profiles, allClases, items);
        } else if (this._teacherBoardMainTab === 'calendario') {
            // Calendario definitivo (handoff Design 2a): vista Mes/Semana con chips de color por estado.
            const groups = this.data.getAllGroups();
            contentHtml = `<div class="tb-cal-wrap">${this._renderCalendario(allClases, groups, this.getTodayString(), profiles)}</div>`;
        } else {
            if (!profiles.length) {
                contentHtml = `<div style="padding:24px;color:var(--tb-text-secondary)">Todavía no hay alumnos.</div>`;
            } else {
                const studentsData = await Promise.all(profiles.map(p => this._tbGetStudentData(p, allClases)));
                contentHtml = this._tbRenderControlTab(studentsData, allClases);
            }
        }

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; overflow:hidden">
                ${tabHeaderHtml}
                <div style="flex:1; overflow:hidden">${contentHtml}</div>
            </div>
        `;

        if (this._teacherBoardMainTab === 'control') this._tbBindToolbarEvents();
        if (this._teacherBoardMainTab === 'consultas') this._tbBindConsultasEvents();
    },

    _tbFormatDateEs(dateStr) {
        const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
        const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const d = new Date(dateStr + 'T12:00');
        return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
    },

    _tbRenderControlTab(studentsData, allClases) {
        const todayStr = this.getTodayString();
        const headerDate = this._tbFormatDateEs(todayStr);
        const practicedToday = studentsData.filter(s => s.bucket === 'hoy').length;

        const filtered = studentsData.filter(s => {
            const q = (this._tbSearch || '').toLowerCase().trim();
            if (q && !(`${s.profile.teacherAlias || ''} ${s.profile.displayName || s.profile.name || ''}`.toLowerCase().includes(q))) return false;
            if (this._tbGroupFilter && this._tbGroupFilter !== 'todos' && s.groupLabel !== this._tbGroupFilter) return false;
            if (this._tbStatusFilter && this._tbStatusFilter !== 'todos' && s.alertStatus.level !== this._tbStatusFilter) return false;
            if (this._tbFocusProfileId && s.profile.id !== this._tbFocusProfileId) return false;
            return true;
        });

        const sortKey = this._tbSort || 'nombre';
        filtered.sort((a, b) => {
            if (sortKey === 'racha') return b.streak - a.streak;
            if (sortKey === 'actividad') return a.daysSince - b.daysSince;
            if (sortKey === 'clase') {
                const da = a.nextClase ? a.nextClase.daysAway : Infinity;
                const db = b.nextClase ? b.nextClase.daysAway : Infinity;
                return da - db;
            }
            return this._teacherDisplayName(a.profile).localeCompare(this._teacherDisplayName(b.profile));
        });

        const buckets = [
            { key: 'hoy', label: 'PRACTICARON HOY', color: 'var(--tb-success)' },
            { key: 'ayer', label: 'PRACTICARON AYER', color: '#f5a623' },
            { key: 'inactivo', label: 'INACTIVOS 2+ DÍAS', color: 'var(--tb-text-muted)' }
        ];

        const listHtml = buckets.map(b => {
            const group = filtered.filter(s => s.bucket === b.key);
            if (!group.length) return '';
            const rows = group.map(s => this._tbRenderStudentRow(s)).join('');
            return `<div class="tb-bucket">
                <div class="tb-bucket-header"><span class="tb-bucket-dot" style="background:${b.color}"></span>${b.label} (${group.length})</div>
                <div class="tb-bucket-rows">${rows}</div>
            </div>`;
        }).join('') || `<div style="padding:24px;color:var(--tb-text-secondary)">Ningún alumno coincide con los filtros.</div>`;

        const groupLabels = [...new Set(studentsData.map(s => s.groupLabel))];

        return `<div class="teacher-board-layout horizontal-layout">
            <div class="tb-main-area">
                ${this._tbRenderHeaderStrip(studentsData, headerDate, practicedToday)}
                <div class="tb-toolbar">
                    <div class="bib-search-wrap">
                        <svg class="bib-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" class="bib-search-input" id="tb-search-input" placeholder="Buscar por nombre..." value="${(this._tbSearch || '').replace(/"/g, '&quot;')}">
                    </div>
                    <select class="form-control" id="tb-group-filter" style="max-width:180px">
                        <option value="todos">Todos los grupos</option>
                        ${groupLabels.map(g => `<option value="${this._escapeHtml(g)}" ${this._tbGroupFilter === g ? 'selected' : ''}>${this._escapeHtml(g)}</option>`).join('')}
                    </select>
                    <select class="form-control" id="tb-status-filter" style="max-width:160px">
                        <option value="todos">Todos los estados</option>
                        <option value="green" ${this._tbStatusFilter === 'green' ? 'selected' : ''}>Va bien</option>
                        <option value="yellow" ${this._tbStatusFilter === 'yellow' ? 'selected' : ''}>Necesita atención</option>
                        <option value="red" ${this._tbStatusFilter === 'red' ? 'selected' : ''}>Inactivo</option>
                    </select>
                    <select class="form-control" id="tb-sort" style="max-width:160px">
                        <option value="nombre" ${this._tbSort === 'nombre' ? 'selected' : ''}>Ordenar: Nombre</option>
                        <option value="racha" ${this._tbSort === 'racha' ? 'selected' : ''}>Ordenar: Racha</option>
                        <option value="actividad" ${this._tbSort === 'actividad' ? 'selected' : ''}>Ordenar: Actividad</option>
                        <option value="clase" ${this._tbSort === 'clase' ? 'selected' : ''}>Ordenar: Próxima clase</option>
                    </select>
                    ${this._tbFocusProfileId ? `<button class="btn btn-outline btn-sm" onclick="app.tbClearFocus()">Quitar filtro de alerta</button>` : ''}
                    <button class="btn btn-primary btn-sm" onclick="app.bibOpenAlumnoModal()" style="margin-left:auto; display:inline-flex; align-items:center; gap:5px; white-space:nowrap;"><svg width="13" height="13"><use href="#icon-nuevo"/></svg> Nuevo alumno</button>
                </div>
                <div class="tb-list-scroll">${listHtml}</div>
            </div>
        </div>`;
    },

    // Las "Alertas Rápidas" viven ahora en la campana de notificaciones (punto 6) — acá queda solo el resumen
    _tbRenderHeaderStrip(studentsData, headerDate, practicedToday) {
        const total = studentsData.length;
        const red = studentsData.filter(s => s.alertStatus.level === 'red').length;
        const yellow = studentsData.filter(s => s.alertStatus.level === 'yellow').length;
        const green = total - red - yellow;

        return `<div class="tb-header-strip">
            <div class="tb-header-main-row">
                <div class="tb-header-title-wrap">
                    <h2 class="tb-header-title">${headerDate.charAt(0).toUpperCase() + headerDate.slice(1)}</h2>
                    <div class="tb-header-subtitle">${practicedToday} de ${total} practicaron hoy</div>
                </div>
                <div class="tb-header-badges">
                    <span class="tb-header-badge status-green">● ${green} al día</span>
                    <span class="tb-header-badge status-yellow">● ${yellow} ayer / atención</span>
                    <span class="tb-header-badge status-red">● ${red} inactivos</span>
                </div>
            </div>
        </div>`;
    },

    _tbRenderStudentRow(s) {
        const p = s.profile;
        const displayName = this._teacherDisplayName(p);
        const realName = p.displayName || p.name || '';
        const hasAlias = !!(p.teacherAlias || '').trim() && displayName !== realName;
        const expanded = this._teacherBoardExpandedId === p.id;
        const statusColor = s.alertStatus.level === 'green' ? 'var(--tb-success)' : s.alertStatus.level === 'yellow' ? '#f5a623' : 'var(--tb-accent)';
        const minutesToday = s.minutesToday;

        // Rutina de hoy visible sin expandir (la hover card se eliminó por redundante)
        const prog = s.pasosProgress || { hechos: 0, total: 0, dot: 'none' };
        const rutinaChip = prog.total
            ? `<span class="tb-rutina-inline ${prog.dot === 'full' ? 'done' : ''}" title="Pasos de la rutina de hoy">Rutina ${prog.hechos}/${prog.total}</span>`
            : `<span class="tb-rutina-inline empty">Sin rutina</span>`;

        // Chips de clases: la próxima primero, las pasadas al costado en orden descendente.
        // Hover = resumen privado del profesor (tooltip via data-resumen); click = ir a la clase.
        const fmtCorta = d => new Date(d + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
        const tip = r => r ? ` data-resumen="${this._escapeHtml(r)}"` : '';
        // Designación de grupo/individual: solo si el alumno mezcla contextos (si no, es redundante).
        const grpTag = l => (s.multiContext && l) ? `<span class="tb-chip-grp">${this._escapeHtml(l)}</span>` : '';
        const proxChip = s.nextClase
            ? `<button class="tb-clase-chip prox"${tip(s.nextClase.resumen)}
                    onclick="event.stopPropagation();${s.nextClase.claseId ? `app.tbGoToClase('${s.nextClase.claseId}')` : `app.tbCreateClaseAndGo('${s.nextClase.groupId}','${s.nextClase.date}')`}"
                    >${grpTag(s.nextClase.label)}${s.nextClase.daysAway === 0 ? 'Hoy' : s.nextClase.daysAway === 1 ? 'Mañana' : fmtCorta(s.nextClase.date)}${s.nextClase.time ? ' · ' + s.nextClase.time.slice(0, 5) : ''}</button>`
            : `<span class="tb-clase-chip empty">Sin próxima</span>`;
        const pastChips = (s.pastClases || []).map(c =>
            `<button class="tb-clase-chip past"${tip(c.resumen)} onclick="event.stopPropagation();app.tbGoToClase('${c.claseId}')">${grpTag(c.label)}${fmtCorta(c.date)}</button>`
        ).join('');
        const claseChipsHtml = `<div class="tb-clase-chips">${proxChip}${pastChips}</div>`;

        const questionsPanel = expanded ? this._tbRenderQuestionsAccordion(p.id) : '';

        // Fila colapsada = identidad (lápiz = editar SOLO el alias) + rutina + racha/minutos + semáforo
        // + botón de Ficha (amarillo, recuadro a la derecha; accesible sin expandir).
        // Al expandir: próxima clase (verde) + pasadas + consultas.
        return `<div class="tb-student-row${expanded ? ' expanded' : ''}" data-profile-id="${p.id}">
            <div class="tb-row-header" onclick="app.tbToggleExpand('${p.id}')">
                <div class="tb-avatar" style="background:${p.color || 'var(--tb-accent)'}">${displayName.charAt(0).toUpperCase()}</div>
                <div class="tb-identity">
                    <div class="tb-name-row">
                        <div class="tb-name">${this._escapeHtml(displayName)}</div>
                        <button class="tb-alias-edit" title="Editar alias" onclick="event.stopPropagation();app.tbEditAlias('${p.id}')"><svg width="11" height="11"><use href="#icon-editar"/></svg></button>
                    </div>
                    <div class="tb-group">${hasAlias ? `${this._escapeHtml(realName)} · ` : ''}${this._escapeHtml(s.groupLabel)}</div>
                </div>
                ${rutinaChip}
                <span class="tb-inline-stats">${s.streak > 0 ? `🔥 ${s.streak}d` : '— racha'} · ${minutesToday} min</span>
                <div class="tb-status-dot-wrap" title="${this._escapeHtml(s.alertStatus.reason)}">
                    <span class="tb-status-dot tb-status-${s.alertStatus.level}" style="background:${statusColor}"></span>
                </div>
                <button class="tb-ficha-icon" title="Ver ficha del alumno" onclick="event.stopPropagation();app.openTeacherFichaModal('${p.id}')"><svg width="20" height="20"><use href="#icon-ficha"/></svg></button>
                <span class="tb-row-chevron">${expanded ? '▴' : '▾'}</span>
            </div>
            ${expanded ? `<div class="tb-row-expanded">
                <div class="tb-expanded-actions">
                    ${claseChipsHtml}
                </div>
                ${questionsPanel}
            </div>` : ''}
        </div>`;
    },

    // Lápiz junto al nombre: edita SOLO el alias interno (la Ficha completa vive en el botón rojo)
    async tbEditAlias(profileId) {
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === profileId);
        if (!p) return;
        const next = prompt('Alias interno (solo lo ves vos; dejalo vacío para usar el nombre real):', (p.teacherAlias || '').trim());
        if (next === null) return;
        p.teacherAlias = next.trim();
        await this.data.saveProfile(p);
        this.renderTeacherBoardView();
    },

    _tbRenderQuestionsAccordion(profileId) {
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(profileId));
        const allClases = this.data.getAllClases().filter(c => groups.some(g => g.id === c.groupId));
        const allPreguntas = [];
        allClases.forEach(c => {
            this.data.getPreguntasAlumno(profileId, c.id).forEach(preg => allPreguntas.push({ ...preg, claseId: c.id, claseTitle: c.title || (this.data.getGroup(c.groupId) || {}).name || 'Clase' }));
        });

        if (!allPreguntas.length) {
            return `<div class="tb-questions-block"><p class="tb-questions-empty">Sin consultas registradas.</p></div>`;
        }

        const rows = allPreguntas.map(preg => `
            <div class="tb-question-row${preg.resolved ? ' resolved' : ''}">
                <div class="tb-question-text"><strong>${this._escapeHtml(preg.claseTitle)}:</strong> ${preg.itemId ? `<span class="duda-item-badge" style="display:inline-block; font-size:10px; font-weight:600; text-transform:uppercase; color:var(--tb-accent); background:rgba(108,99,255,.12); border-radius:4px; padding:1px 6px; margin-right:4px">${this._escapeHtml(preg.itemTitle || 'ítem')}</span>` : ''}${this._escapeHtml(preg.text || preg.pregunta || '')}</div>
                ${preg.reply ? `<div class="tb-question-reply">Tu respuesta: ${this._escapeHtml(preg.reply)}</div>` : `
                <div class="tb-question-reply-form">
                    <input type="text" class="form-control" id="tb-reply-input-${preg.id}" placeholder="Escribir respuesta...">
                    <button class="btn btn-primary btn-sm" onclick="app.tbReplyQuestion('${profileId}','${preg.claseId}','${preg.id}')">Responder</button>
                </div>`}
            </div>
        `).join('');

        return `<div class="tb-questions-block"><div class="tb-zone-header">Consultas</div>${rows}</div>`;
    },

    tbToggleExpand(profileId) {
        this._teacherBoardExpandedId = this._teacherBoardExpandedId === profileId ? null : profileId;
        this.renderTeacherBoardView();
    },

    tbFocusStudent(profileId) {
        this._tbFocusProfileId = profileId;
        this._teacherBoardExpandedId = profileId;
        this.renderTeacherBoardView();
    },

    // ── Alertas en la campana (punto 6): estado calculado en vivo al abrir el panel, NO eventos persistidos ──
    _getAlertConfig() {
        const defaults = { inactivos: true, dudas: true, objetivos: true };
        try { return { ...defaults, ...JSON.parse(localStorage.getItem('gs-alert-config') || '{}') }; }
        catch { return defaults; }
    },

    toggleAlertConfig(tipo) {
        const cfg = this._getAlertConfig();
        cfg[tipo] = !cfg[tipo];
        localStorage.setItem('gs-alert-config', JSON.stringify(cfg));
        this.renderNotificationsPanel();
    },

    async _renderNotifAlertsSection() {
        const profiles = await this.data.getProfiles();
        if (!profiles.length) return '';
        const allClases = this.data.getAllClases();
        const studentsData = await Promise.all(profiles.map(p => this._tbGetStudentData(p, allClases)));
        const cfg = this._getAlertConfig();

        const rows = [];
        const nameOf = s => this._escapeHtml(s.profile.displayName || s.profile.name || '?');
        if (cfg.inactivos) studentsData.filter(s => s.alertStatus.level === 'red').forEach(s =>
            rows.push(`<div class="notif-alert-item" onclick="app.notifAlertClick('${s.profile.id}')"><span class="notif-alert-dot red"></span><span class="notif-alert-text"><strong>${nameOf(s)}</strong> — ${s.alertStatus.reason}</span></div>`));
        if (cfg.dudas) studentsData.filter(s => s.pendingQuestions > 0).forEach(s =>
            rows.push(`<div class="notif-alert-item" onclick="app.notifAlertClick('${s.profile.id}')"><svg width="13" height="13" style="color:var(--tb-accent); flex-shrink:0"><use href="#icon-consulta"/></svg><span class="notif-alert-text"><strong>${nameOf(s)}</strong> — ${s.pendingQuestions} duda${s.pendingQuestions !== 1 ? 's' : ''} sin responder</span></div>`));
        if (cfg.objetivos) studentsData.filter(s => s.hasObjetivos && s.objetivosPct < 50).forEach(s =>
            rows.push(`<div class="notif-alert-item" onclick="app.notifAlertClick('${s.profile.id}')"><span class="notif-alert-dot yellow"></span><span class="notif-alert-text"><strong>${nameOf(s)}</strong> — tarea de la clase al ${s.objetivosPct}%</span></div>`));

        const chip = (tipo, label) => `<button class="notif-alert-cfg-chip ${cfg[tipo] ? 'on' : ''}" onclick="app.toggleAlertConfig('${tipo}')">${label}</button>`;

        return `<div class="notif-alerts-section">
            <div class="notif-alerts-header">
                <span>Alertas · estado actual</span>
                <span class="notif-alert-cfg">${chip('inactivos', 'Inactivos')}${chip('dudas', 'Dudas')}${chip('objetivos', 'Tarea')}</span>
            </div>
            ${rows.join('') || '<div class="notif-alerts-empty">Sin alertas por ahora ✓</div>'}
        </div>`;
    },

    notifAlertClick(profileId) {
        this.closeNotificationsPanel();
        this._tbFocusProfileId = profileId;
        this._teacherBoardExpandedId = profileId;
        this.clasesGoToBoardTab('control');
    },

    tbClearFocus() {
        this._tbFocusProfileId = null;
        this.renderTeacherBoardView();
    },

    tbGoToClase(claseId) {
        this.navigateToView('dashboard');
        this.openClase(claseId);
    },

    tbCreateClaseAndGo(groupId, dateStr) {
        this.navigateToView('dashboard');
        this.createClase(groupId, dateStr);
    },

    tbReplyQuestion(profileId, claseId, pregId) {
        const input = document.getElementById(`tb-reply-input-${pregId}`);
        const reply = input ? input.value.trim() : '';
        if (!reply) return;
        const preguntas = this.data.getPreguntasAlumno(profileId, claseId);
        const preg = preguntas.find(p => p.id === pregId);
        if (!preg) return;
        preg.reply = reply;
        preg.resolved = true;
        this.data.savePreguntaAlumno(profileId, claseId, preg);
        this.showToast('Respuesta enviada', '✓');
        this.renderTeacherBoardView();
    },

    _tbBindToolbarEvents() {
        const si = document.getElementById('tb-search-input');
        if (si) si.addEventListener('input', e => { this._tbSearch = e.target.value; this.renderTeacherBoardView(); });
        const gf = document.getElementById('tb-group-filter');
        if (gf) gf.addEventListener('change', e => { this._tbGroupFilter = e.target.value; this.renderTeacherBoardView(); });
        const sf = document.getElementById('tb-status-filter');
        if (sf) sf.addEventListener('change', e => { this._tbStatusFilter = e.target.value; this.renderTeacherBoardView(); });
        const so = document.getElementById('tb-sort');
        if (so) so.addEventListener('change', e => { this._tbSort = e.target.value; this.renderTeacherBoardView(); });
    },

    // Fecha relativa compacta para las cards de Consultas y Cargas: "Hoy · 14:20" / "Ayer · 19:40" / "Lun 7 jul · 20:15"
    _tbFechaRelativa(ts) {
        const d = new Date(ts);
        if (isNaN(d)) return '';
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const dia = new Date(d); dia.setHours(0, 0, 0, 0);
        const diff = Math.round((hoy - dia) / 86400000);
        const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        if (diff === 0) return `Hoy · ${hora}`;
        if (diff === 1) return `Ayer · ${hora}`;
        const fecha = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '').replace(/\./g, '');
        return `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · ${hora}`;
    },

    // Pestaña fusionada "Consultas y Cargas" (Pieza 7): lista única ordenada por fecha
    _tbRenderConsultasCargasTab(profiles, allClases, items) {
        const entries = [];

        // Consultas de todos los alumnos
        profiles.forEach(p => {
            const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(p.id));
            const classes = allClases.filter(c => groups.some(g => g.id === c.groupId));
            classes.forEach(c => {
                this.data.getPreguntasAlumno(p.id, c.id).forEach(preg => {
                    const ts = new Date(preg.timestamp || preg.date || (c.date ? c.date + 'T12:00' : 0)).getTime() || 0;
                    entries.push({ kind: 'consulta', ts, preg, profile: p, claseId: c.id });
                });
            });
        });

        // Cargas de alumnos
        items.filter(it => it.isStudentUpload).forEach(it => {
            const p = profiles.find(x => x.id === it.uploadedBy) || { name: 'Alumno', color: 'var(--tb-accent)' };
            entries.push({ kind: 'carga', ts: new Date(it.createdAt || 0).getTime() || 0, item: it, profile: p });
        });

        // Búsqueda + filtro único
        const q = (this._tbConsultasSearch || '').toLowerCase().trim();
        const f = this._tbConsultasFilter || 'todos';
        const filtered = entries.filter(e => {
            const name = `${e.profile.teacherAlias || ''} ${e.profile.displayName || e.profile.name || ''}`.toLowerCase();
            const text = e.kind === 'consulta'
                ? (e.preg.text || e.preg.pregunta || '').toLowerCase()
                : `${e.item.title || ''} ${e.item.observation || ''}`.toLowerCase();
            if (q && !name.includes(q) && !text.includes(q)) return false;
            if (f === 'pendientes')  return e.kind === 'consulta' && !e.preg.resolved;
            if (f === 'respondidas') return e.kind === 'consulta' && !!e.preg.resolved;
            if (f === 'cargas')      return e.kind === 'carga';
            return true;
        });

        filtered.sort((a, b) => b.ts - a.ts);

        const typeColors = { score: '#a29bfe', gp: '#a29bfe', gpx: '#a29bfe', pdf: '#55efc4', youtube: '#fdcb6e', spotify: '#74b9ff', audio: '#74b9ff' };
        const avatar = p => {
            const displayName = this._teacherDisplayName(p);
            return `<div class="cc3-avatar" style="background:${p.color || 'var(--tb-accent)'}">${displayName.charAt(0).toUpperCase()}</div>
                <span class="cc3-name">${this._escapeHtml(displayName)}</span>`;
        };

        const cardsHtml = filtered.map(e => {
            const timeLabel = e.ts ? this._tbFechaRelativa(e.ts) : '';
            if (e.kind === 'consulta') {
                const preg = e.preg, p = e.profile;
                const itemBadge = preg.itemId ? `<span class="cc3-item-badge">${this._escapeHtml(preg.itemTitle || 'ítem')}</span>` : '';
                return `
                <div class="cc3-card consulta ${preg.resolved ? 'respondida' : 'pendiente'}">
                    <div class="cc3-head">
                        ${avatar(p)}
                        <span class="cc3-chip ${preg.resolved ? 'ok' : 'pend'}"><svg width="16" height="16"><use href="#icon-consulta"/></svg>${preg.resolved ? 'Respondida' : 'Sin responder'}</span>
                        <span class="cc3-time">${timeLabel}</span>
                    </div>
                    <div class="cc3-pregunta">${itemBadge}"${this._escapeHtml(preg.text || preg.pregunta || '')}"</div>
                    ${preg.resolved ? `
                    <div class="cc3-respuesta"><strong>Tu respuesta:</strong> ${this._escapeHtml(preg.reply)}</div>
                    <div class="cc3-actions" style="margin-top:8px">
                        <button class="cc3-btn" onclick="app.tbEditReplyConsultasTab('${p.id}','${e.claseId}','${preg.id}')"><svg width="14" height="14"><use href="#icon-editar"/></svg>Editar respuesta</button>
                    </div>` : `
                    <textarea class="cc3-reply-ta" id="tb-consultas-reply-input-${preg.id}" placeholder="Escribir respuesta…" rows="2"></textarea>
                    <button class="cc3-responder-btn" onclick="app.tbReplyConsultasTab('${p.id}','${e.claseId}','${preg.id}')"><svg width="14" height="14"><use href="#icon-responder"/></svg>Responder</button>`}
                </div>`;
            }
            const it = e.item;
            const color = typeColors[it.type] || 'var(--tb-accent)';
            return `
            <div class="cc3-card carga" style="border-color: color-mix(in srgb, ${color} 40%, var(--tb-border)); box-shadow: inset 4px 0 0 ${color};">
                <div class="cc3-head">
                    ${avatar(e.profile)}
                    <div class="cc3-head-right">
                        <span class="cc3-time">${timeLabel}</span>
                        <span class="cc3-chip cc3-type" style="background:color-mix(in srgb, ${color} 20%, transparent); color:${color}">${this._bibTypeIcon(it.type)}${this._bibTypeLabel(it.type)}</span>
                    </div>
                </div>
                <div class="cc3-carga-title">${this._escapeHtml(it.title || 'Sin título')}</div>
                ${it.observation ? `<div class="cc3-carga-obs">"${this._escapeHtml(it.observation)}"</div>` : ''}
                <div class="cc3-actions">
                    <button class="cc3-btn" onclick="app.openLibraryItemById('${it.id}')"><svg width="14" height="14"><use href="#icon-abrir"/></svg>Abrir</button>
                    <button class="cc3-btn" onclick="app.promoteStudentUploadToGeneral('${it.id}')"><svg width="14" height="14"><use href="#icon-subir-bib"/></svg>Subir a Biblioteca</button>
                    <button class="cc3-btn muted" onclick="app.deleteStudentUploadByTeacher('${it.id}')"><svg width="14" height="14"><use href="#icon-borrar"/></svg>Eliminar</button>
                </div>
            </div>`;
        }).join('') || `<div style="padding:24px;color:var(--tb-text-secondary)">No hay consultas ni cargas que coincidan con los filtros.</div>`;

        return `<div class="teacher-board-layout horizontal-layout">
            <div class="tb-main-area">
                <div class="tb-toolbar">
                    <div class="bib-search-wrap">
                        <svg class="bib-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" class="bib-search-input" id="tb-consultas-search" placeholder="Buscar por alumno o contenido…" value="${(this._tbConsultasSearch || '').replace(/"/g, '&quot;')}">
                    </div>
                    <select class="form-control" id="tb-consultas-filter" style="max-width:200px">
                        <option value="todos" ${f === 'todos' ? 'selected' : ''}>Todo</option>
                        <option value="pendientes" ${f === 'pendientes' ? 'selected' : ''}>Consultas pendientes</option>
                        <option value="respondidas" ${f === 'respondidas' ? 'selected' : ''}>Consultas respondidas</option>
                        <option value="cargas" ${f === 'cargas' ? 'selected' : ''}>Solo cargas</option>
                    </select>
                </div>
                <div class="tb-list-scroll" style="padding:20px"><div class="cc3-list">${cardsHtml}</div></div>
            </div>
        </div>`;
    },

    _tbBindConsultasEvents() {
        const si = document.getElementById('tb-consultas-search');
        if (si) si.addEventListener('input', e => { this._tbConsultasSearch = e.target.value; this.renderTeacherBoardView(); });
        const fl = document.getElementById('tb-consultas-filter');
        if (fl) fl.addEventListener('change', e => { this._tbConsultasFilter = e.target.value; this.renderTeacherBoardView(); });
    },

    tbReplyConsultasTab(profileId, claseId, pregId) {
        const input = document.getElementById(`tb-consultas-reply-input-${pregId}`);
        const reply = input ? input.value.trim() : '';
        if (!reply) return;
        const preguntas = this.data.getPreguntasAlumno(profileId, claseId);
        const preg = preguntas.find(p => p.id === pregId);
        if (!preg) return;
        preg.reply = reply;
        preg.resolved = true;
        this.data.savePreguntaAlumno(profileId, claseId, preg);
        this.showToast('Respuesta enviada', '✓');
        this.renderTeacherBoardView();
    },

    tbEditReplyConsultasTab(profileId, claseId, pregId) {
        const preguntas = this.data.getPreguntasAlumno(profileId, claseId);
        const preg = preguntas.find(p => p.id === pregId);
        if (!preg) return;
        preg.resolved = false;
        preg.reply = '';
        this.data.savePreguntaAlumno(profileId, claseId, preg);
        this.renderTeacherBoardView();
    },

    rescheduleClassForAbsentStudent(claseId, studentId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        
        // Cargar alumnos y buscar nombre
        this.data.getProfiles().then(profiles => {
            const p = profiles.find(x => x.id === studentId);
            const studentName = p ? p.name : 'Alumno';
            
            // Sugerir fecha dentro de 7 días
            const curDate = new Date(clase.date + 'T12:00');
            const reschedDateObj = new Date(curDate.getTime() + 7 * 86400000);
            const defaultDate = reschedDateObj.toISOString().slice(0, 10);
            
            const newDate = prompt(`Fecha para reprogramar clase individual con ${studentName} (AAAA-MM-DD):`, defaultDate);
            if (!newDate) return;
            
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(newDate)) {
                alert("Formato de fecha inválido. Usá AAAA-MM-DD.");
                return;
            }

            const newClase = {
                id: this.data.generateId('clase'),
                groupId: clase.groupId,
                title: `Reprog. - ${studentName}`,
                date: newDate,
                status: 'programada',
                attendance: {},
                content: JSON.parse(JSON.stringify(clase.content || [])), // clonar contenido
                objetivos: JSON.parse(JSON.stringify(clase.objetivos || [])), // clonar objetivos
                resumenProfesor: `Reprogramación por ausencia en la clase del ${clase.date}.`,
                resumen: `Reprogramación por ausencia en la clase del ${clase.date}.`,
                memberOverride: [studentId] // Override para que sea clase individual
            };
            
            this.data.saveClase(newClase);
            this.showToast(`Clase reprogramada para el ${newDate}`, "✓");
            this.renderDashboardView();
        });
    },
});
