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
            const existing = allClases.filter(c => c.date === dateStr);
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

        // Agenda semanal — franja inferior siempre visible (Pieza 1)
        const weeklyGridHtml = this._renderSemanaCols(allClases, groups, todayStr);

        // Contenido del panel central (Detalles o Creación)
        let middleContentHtml = '';
        if (this._currentClaseId) {
            middleContentHtml = `
            <div class="empty-hint" style="padding: 24px; color: var(--tb-text-secondary); text-align: center;">
                Cargando detalles de la clase...
            </div>`;
        } else {
            const activeTab = this._dashActiveTab || 'clase';
            let tabBodyHtml = '';
            
            if (activeTab === 'clase') {
                const prox = this._proximaClaseInfo(allClases, groups);
                const proxName = prox ? (prox.group.name || (prox.clase && prox.clase.title) || 'Clase') : '';
                const proxMeet = prox && prox.group.meetLink
                    ? (/^https?:/.test(prox.group.meetLink) ? prox.group.meetLink : 'https://' + prox.group.meetLink) : '';
                const proxCardHtml = prox ? `
                    <div id="crear-clase-proxima-card" class="pc3-card">
                        <div class="pc3-icon ${prox.isToday?'hoy':''}">
                            <svg width="28" height="28"><use href="#${prox.isToday?'icon-reloj':'icon-fecha'}"/></svg>
                        </div>
                        <div class="pc3-info">
                            <div class="pc3-label">Próxima clase · ${this._escapeHtml(proxName)}</div>
                            <div class="pc3-when ${prox.isToday?'hoy':''}">${prox.label}</div>
                        </div>
                        ${proxMeet ? `<a class="pc3-btn" href="${this._escapeHtml(proxMeet)}" target="_blank" title="Entrar al Meet"><svg width="17" height="17"><use href="#icon-meet"/></svg> Meet</a>` : ''}
                        ${prox.clase
                            ? `<button id="crear-clase-proxima-editar-btn" class="pc3-btn" onclick="app._openEditClaseModal('${prox.clase.id}')"><svg width="17" height="17"><use href="#icon-editar"/></svg> Editar</button>`
                            : `<button id="crear-clase-proxima-editar-btn" class="pc3-btn" onclick="app.createClase('${prox.group.id}','${prox.dateStr}')"><svg width="17" height="17"><use href="#icon-nuevo"/></svg> Crear</button>`}
                    </div>` : '';
                tabBodyHtml = `
                <div class="dash-tab-content" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
                    <h3 style="margin: 0; font-size: 15px; color: var(--tb-text-primary); font-family: var(--font-heading);">Crear Clase</h3>
                    <p style="margin: 0; font-size: 13px; color: var(--tb-text-secondary);">Seleccioná un alumno o grupo y la fecha de la clase:</p>
                    <div style="display: flex; gap: 8px;">
                        <select id="dash-create-class-select" class="form-select" style="flex: 1; background: var(--tb-bg-primary); border: 1px solid var(--tb-border); color: var(--tb-text-primary); border-radius: 6px; padding: 6px 12px; font-size: 13px;">
                            <option value="">— Seleccionar Alumno/Grupo —</option>
                            ${groups.map(g => `<option value="${g.id}">${this._escapeHtml(g.name)}</option>`).join('')}
                        </select>
                        <input type="date" id="dash-create-class-date" value="${todayStr}" class="form-select" style="background: var(--tb-bg-primary); border: 1px solid var(--tb-border); color: var(--tb-text-primary); border-radius: 6px; padding: 6px 12px; font-size: 13px;">
                        <button class="btn btn-primary" onclick="app.dashCreateClaseFromSelect()">Crear Clase</button>
                    </div>
                    <div style="margin-top: 24px; border-top: 1px solid var(--tb-border); padding-top: 20px;">
                        ${proxCardHtml}
                        <p style="font-size: 12px; max-width: 250px; margin: ${proxCardHtml ? '16px auto 0' : '0 auto'}; text-align: center; color: var(--tb-text-muted);">También podés seleccionar una clase en curso o pendiente desde el panel de la izquierda.</p>
                    </div>
                </div>`;
            } else if (activeTab === 'grupo') {
                // Filas compactas (Pieza 3): una línea por grupo, edición en modal
                const groupsListHtml = groups.map(g => {
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
                
                <!-- BOTTOM AREA: AGENDA SEMANAL (siempre visible, Pieza 1) -->
                <div class="dash-weekly-panel">
                    ${weeklyGridHtml}
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
        this._currentClaseId = claseId;
        this.renderDashboardView();
    },

    closeClasetDetail() {
        this._currentClaseId = null;
        this.renderDashboardView();
    },

    async _renderClaseDetail(claseId) {
        const panel = document.getElementById('dash-class-panel');
        if (!panel) return;

        const clase = this.data.getClase(claseId);
        if (!clase) { this.closeClasetDetail(); return; }

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
                const lastReset = this.data.getProfileLastResetCheck(m.id);
                const raw = this.data.getProfileCompletedSteps(m.id);
                const steps = lastReset === todayStr ? (raw||[false,false,false]) : [false,false,false];
                const done = steps.filter(Boolean).length;
                const pracDot = done === 3 ? 'full' : done > 0 ? 'partial' : 'none';

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
                const firstName = (m.name||'').split(' ')[0];

                const avatarChar = m.avatarChar || (m.name||'?')[0].toUpperCase();
                
                let actionHtml = '';
                if (label === 'Ausentes') {
                    actionHtml = `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); app.rescheduleClassForAbsentStudent('${claseId}', '${m.id}')" style="margin-top: 6px; font-size: 11px; padding: 4px 8px; width: 100%; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; border-color: var(--tb-border); color: var(--tb-text-primary);"><svg width="12" height="12" style="flex-shrink:0"><use href="#icon-fecha"/></svg> Reprogramar</button>`;
                }

                return `<div class="stu3-card-wrapper" style="display: flex; flex-direction: column; gap: 4px; align-items: stretch; flex-shrink: 0; min-width: 70px;">
                    <div class="stu3-card" id="stu3-${m.id}"
                            onclick="app.cycleAttendance('${claseId}','${m.id}')"
                            onmouseenter="app._showHoverCard('${m.id}')"
                            onmouseleave="app._hideHoverCard('${m.id}')"
                            style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 10px 7px;">
                        <div class="stu3-av" style="background:${m.color||'#6366f1'}">${avatarChar}</div>
                        <span class="stu3-cname" style="color:${nameColor}">${this._escapeHtml(firstName)}</span>
                        <button onclick="event.stopPropagation(); app.openTeacherFichaModal('${m.id}')" title="Ver Ficha" style="background:none; border:none; cursor:pointer; font-size:12px; padding:2px; display:flex; align-items:center; justify-content:center; opacity: 0.6; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.6"><svg width="14" height="14" style="color:var(--tb-text-secondary)"><use href="#icon-ficha"/></svg></button>
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
                        <div class="h3-title">${this._escapeHtml(group.name||clase.title||'Clase')}</div>
                        <div class="h3-sub">${timeLabel} · ${type} · ${members.length} alumno${members.length!==1?'s':''}</div>
                    </div>
                    ${meetBarHtml}
                    <button id="clase-detalle-editar-btn" class="h3-btn h3-btn-edit" onclick="app._openEditClaseModal('${claseId}')">
                        <svg width="14" height="14"><use href="#icon-editar"/></svg> Editar
                    </button>
                </div>

                ${resumenAntHtml}

                <!-- ASISTENCIA -->
                <div class="sec3-block">
                    <div class="sec3-label">Asistencia</div>
                    <div class="tab3-wrap" id="tablero-${claseId}">
                        ${tableroHtml}
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

                <!-- H: FINALIZAR -->
                <div class="finalizar3-bar">
                    <span class="finalizar3-hint">${status==='finalizada'?`Publicada para <strong>${members.length} alumno${members.length!==1?'s':''}</strong> · podés actualizar cuando quieras`:`Disponible para <strong>${members.length} alumno${members.length!==1?'s':''}</strong> al publicar`}</span>
                    <button class="finalizar3-btn ${status==='finalizada'?'done':''}" onclick="app.finalizarClase('${claseId}')">${status==='finalizada'?'↑ Actualizar publicación':'✓ Publicar clase'}</button>
                </div>

            </div>`;
    },

    toggleAttendance(claseId, profileId) {
        this.cycleAttendance(claseId, profileId);
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
            <div class="paso3-card ${libItem ? '' : 'consigna'}">
                <div class="paso3-head" onclick="app.pasoToggleExpand('${clase.id}','${p.id}')">
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
        this._refreshPasosList(claseId);
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

    switchDashCreationTab(tab) {
        this._dashActiveTab = tab;
        this.renderDashboardView();
    },

    dashCreateClaseFromSelect() {
        const select = document.getElementById('dash-create-class-select');
        const groupId = select ? select.value : '';
        if (!groupId) {
            alert('Por favor, seleccioná un alumno o grupo.');
            return;
        }
        const dateInput = document.getElementById('dash-create-class-date');
        this.createClase(groupId, dateInput && dateInput.value ? dateInput.value : null);
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
            const displayName = p.displayName || p.name || '?';
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
        cont.innerHTML = fechas.map(f => f.skipped ? `
            <div class="dgf-prox-row salteada">
                <span class="dgf-prox-date">${fmtLabel(f.dateStr)}</span>
                <span class="dgf-prox-tag">Salteada</span>
                <button class="dgf-prox-btn" title="Restaurar esta clase" onclick="app.dgfToggleSkip('${f.dateStr}')"><svg width="11" height="11"><use href="#icon-nuevo"/></svg></button>
            </div>` : `
            <div class="dgf-prox-row">
                <span class="dgf-prox-date">${fmtLabel(f.dateStr)}</span>
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
        await this.renderDashboardView();
        this._openEditClaseModal(clase.id);
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

    shiftWeek(delta) {
        this._weekOffset += delta;
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

        allClases.filter(c => c.status !== 'finalizada').forEach(c => {
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

    _getWeekDates(offset) {
        // La franja visible arranca siempre en HOY (offset 0) y pagina de a 5 días con ‹ ›
        const pad = n => String(n).padStart(2, '0');
        const start = new Date();
        start.setDate(start.getDate() + offset * 5);
        return [0,1,2,3,4].map(i => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        });
    },

    _renderSemanaCols(allClases, groups, todayStr) {
        const weekDates = this._getWeekDates(this._weekOffset);
        const dayAbbrs = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

        const cols = weekDates.map(dateStr => {
            const dayNum = parseInt(dateStr.slice(8), 10);
            const dow = new Date(dateStr+'T12:00').getDay();
            const isToday = dateStr === todayStr;

            // Clases existentes + grupos programados sin clase creada ese día
            const dayClases = allClases.filter(c => c.date === dateStr);
            const existingGroupIds = new Set(dayClases.map(c => c.groupId));
            const items = dayClases.map(c => {
                const g = groups.find(x => x.id === c.groupId) || {};
                const st = c.status==='finalizada'?'finalizada':c.status==='en-curso'?'iniciada':'pendiente';
                return { time:(g.time||c.time||'').slice(0,5), name:g.name||c.title||'Clase', st, sel:c.id===this._currentClaseId, click:`app.openClase('${c.id}')` };
            });
            groups.filter(g => g.day === dayNames[dow] && !existingGroupIds.has(g.id)).forEach(g => {
                items.push({ time:(g.time||'').slice(0,5), name:g.name, st:'new', sel:false, click:`app.createClase('${g.id}','${dateStr}')` });
            });
            items.sort((a,b) => (a.time||'').localeCompare(b.time||''));

            const card = it => `
                <div class="sem3-card ${it.st} ${it.sel?'selected':''}" onclick="${it.click}">
                    <div class="sem3-dot ${it.st}"></div>
                    <span class="sem3-card-txt">
                        <span class="sem3-card-time">${it.time||'—'}</span>
                        <span class="sem3-card-name">${this._escapeHtml(it.name)}</span>
                    </span>
                </div>`;
            const manana = items.filter(it => it.time && it.time < '13:00');
            const tarde  = items.filter(it => !(it.time && it.time < '13:00'));

            const bodyHtml = items.length ? `
                <div class="sem3-day-slots">
                    <div class="sem3-slot manana">
                        <div class="sem3-slot-label">Mañana</div>
                        ${manana.map(card).join('') || '<span class="sem3-slot-empty">—</span>'}
                    </div>
                    <div class="sem3-slot">
                        <div class="sem3-slot-label">Tarde</div>
                        ${tarde.map(card).join('') || '<span class="sem3-slot-empty">—</span>'}
                    </div>
                </div>` : `<div class="sem3-day-empty">Sin clases</div>`;

            return `<div class="sem3-col ${isToday?'today':''}">
                <div class="sem3-col-header">
                    <span class="sem3-day-name">${isToday?'Hoy · ':''}${dayAbbrs[dow]}</span>
                    <span class="sem3-day-num ${isToday?'today':''}">${dayNum}</span>
                </div>
                ${bodyHtml}
            </div>`;
        }).join('');

        // Placeholder para Google Calendar — integración futura vía OAuth
        return `<div class="sem3-wrap">
            <div class="sem3-strip">
                <button class="sem3-nav-btn" onclick="app.shiftWeek(-1)" title="Días anteriores">‹</button>
                <div class="sem3-grid">${cols}</div>
                <button class="sem3-nav-btn" onclick="app.shiftWeek(1)" title="Días siguientes">›</button>
            </div>
            <div class="sem3-gcal-hint">
                <svg width="11" height="11"><use href="#icon-fecha"/></svg>
                Conectar Google Calendar (próximamente)
            </div>
        </div>`;
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
        const claseId = this._currentClaseId;
        const clase = claseId ? this.data.getClase(claseId) : null;
        const addedIds = new Set((clase?.content||[]).map(c => this._pasoLibId(c)).filter(Boolean));

        const q = (this._libSearch||'').toLowerCase().trim();
        const catF = this._libCatFilter || 'todos';

        let items = allItems;
        if (q) items = items.filter(it => (it.title||it.name||'').toLowerCase().includes(q));
        if (catF !== 'todos') {
            items = items.filter(it => (it.category||it.exerciseType||'') === catF);
        }

        const iconFor = ft => this._bibTypeIcon(ft);

        // La categoría es metadata de biblioteca; clase.categories dejó de leerse (modelo de Pasos)
        const panelCats = this.data.getDefaultCategories();
        const catChips = ['todos', ...panelCats].map(c =>
            `<div class="bib3-chip ${catF===c?'active':''}" onclick="app.filterBiblioteca('${this._escapeHtml(c)}')">${c==='todos'?'Todos':this._escapeHtml(c)}</div>`
        ).join('');

        const listHtml = items.length
            ? items.map(it => {
                const added = addedIds.has(it.id);
                return `<div class="bib3-item ${added?'added':''}">
                    <div class="bib3-ico">${iconFor(it.fileType||it.type)}</div>
                    <span class="bib3-title">${this._escapeHtml(it.title||it.name)}</span>
                    ${added
                        ? `<div class="bib3-check">✓</div>`
                        : `<div class="bib3-add" onclick="app.addContentFromBib('${it.id}')">+</div>`}
                </div>`;
              }).join('')
            : '<p class="text3-muted" style="padding:10px 0">Sin resultados</p>';

        body.innerHTML = `
            <div class="bib3-search-wrap">
                <span class="bib3-search-icon"><svg width="13" height="13"><use href="#icon-buscar"/></svg></span>
                <input type="text" class="bib3-search" placeholder="Buscar en biblioteca…" value="${this._escapeHtml(q)}" oninput="app.searchBiblioteca(this.value)">
            </div>
            <div class="bib3-chips">${catChips}</div>
            <div class="bib3-list">${listHtml}</div>
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

    filterBiblioteca(cat) {
        this._libCatFilter = cat;
        this._renderBibliotecaPanel();
    },

    searchBiblioteca(q) {
        this._libSearch = q;
        this._renderBibliotecaPanel();
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

        // Populate date, time, meetUrl
        document.getElementById('modal-edit-date').value = clase.date || '';
        document.getElementById('modal-edit-time').value = clase.time || group.time || '';
        document.getElementById('modal-edit-meeturl').value = clase.meetUrl || '';

        // Populate student list — muestra TODOS los perfiles, pre-marca los activos
        const stuList = document.getElementById('modal-edit-students');
        if (allProfiles.length === 0) {
            stuList.innerHTML = '<div class="modal-students-empty">No hay alumnos creados aún.</div>';
        } else {
            const renderRow = p => {
                const checked = activeIds.has(p.id);
                const initial = (p.name||'?')[0].toUpperCase();
                const color = p.color || '#c0392b';
                return `<div class="modal-stu-row ${checked?'checked':''}" data-pid="${p.id}" onclick="app._toggleModalStu(this)">
                    <div class="modal-stu-cb">${checked?'✓':''}</div>
                    <div class="modal-stu-av" style="background:${color}">${initial}</div>
                    <span class="modal-stu-name">${this._escapeHtml(p.name||p.id)}</span>
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
        clase.meetUrl = newMeet || null;
        clase.memberOverride = sameAsGroup ? null : checkedIds;

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
        this._bibSelectedStudentCargaId = null;
        this.renderTeacherBoardView();
    },

    // Tira de tabs compartida de la vista "Clases": Agenda (dashboard) + tabs del tablero.
    // Se renderiza idéntica arriba de view-dashboard y view-teacher-board para que se
    // sientan una sola vista con sub-secciones (propuesta 1a del handoff UX).
    _renderClasesTabsStrip(active) {
        const tabs = [
            { key: 'agenda', label: 'Planificación', action: "app.navigateToView('dashboard')" },
            { key: 'control', label: 'Alumnos', action: "app.clasesGoToBoardTab('control')" },
            { key: 'cargas', label: 'Cargas de Alumnos', action: "app.clasesGoToBoardTab('cargas')" },
            { key: 'consultas', label: 'Consultas', action: "app.clasesGoToBoardTab('consultas')" }
        ];
        const btns = tabs.map(t => {
            const isActive = t.key === active;
            return `<button class="bib-main-tab ${isActive ? 'active' : ''}" onclick="${t.action}" style="padding:12px 18px; border:none; background:transparent; font-weight:600; font-size:13px; border-bottom:2px solid ${isActive ? 'var(--tb-accent)' : 'transparent'}; color:${isActive ? 'var(--tb-text-primary)' : 'var(--tb-text-secondary)'}; cursor:pointer; font-family:var(--font-primary)">${t.label}</button>`;
        }).join('');
        return `<div class="bib-main-tabs" style="display:flex; border-bottom:1px solid var(--tb-border); background:var(--tb-bg-secondary); padding:0 16px; flex-shrink:0">${btns}</div>`;
    },

    clasesGoToBoardTab(tab) {
        this._teacherBoardMainTab = tab;
        this._bibSelectedStudentCargaId = null;
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
        const completedSteps = this.data.getProfileCompletedSteps(pid) || [false, false, false];
        const lastPracticedTime = this.data.getProfileLastPracticedTime(pid);

        // Mostrar los casilleros de su última práctica registrada
        const stepsToday = completedSteps;

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
        if (minutesToday === 0) {
            // Fallback
            minutesToday = completedSteps.filter(Boolean).length * 15;
        }

        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(pid));
        const groupLabel = groups.length ? groups.map(g => g.name).join(' · ') : (this.lang === 'es' ? 'Individual' : 'Individual');

        // Consultas pendientes: iterar clases de los grupos del alumno (evita escanear localStorage por prefijo)
        const myClaseIds = allClases.filter(c => groups.some(g => g.id === c.groupId)).map(c => c.id);
        let pendingQuestions = 0;
        myClaseIds.forEach(claseId => {
            const preguntas = this.data.getPreguntasAlumno(pid, claseId);
            pendingQuestions += preguntas.filter(p => !p.resolved).length;
        });

        // Objetivos de la última clase finalizada
        const finalizadas = allClases
            .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
            .sort((a, b) => (b.finalizadaAt || 0) - (a.finalizadaAt || 0));
        const lastClase = finalizadas[0] || null;
        const objetivos = lastClase ? (lastClase.objetivos || []) : [];
        const hasObjetivos = objetivos.length > 0;
        let objetivosPct = 100;
        if (hasObjetivos) {
            const completados = this.data.getObjetivosCompletados(pid);
            const done = objetivos.filter(o => completados[`${lastClase.id}__${o.id}`]).length;
            objetivosPct = Math.round((done / objetivos.length) * 100);
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
            const info = { groupId: g.id, groupName: g.name, date: candidateStr, time: g.time, daysAway: diff, claseId: existingClase ? existingClase.id : null, meetLink: g.meetLink };
            if (!nextClase || info.daysAway < nextClase.daysAway) nextClase = info;
        });

        return {
            profile, groupLabel, streak, stepsToday, lastPracticedTime,
            bucket, daysSince, pendingQuestions, objetivosPct, hasObjetivos,
            alertStatus, nextClase, minutesToday
        };
    },

    async renderTeacherBoardView() {
        const container = document.getElementById('teacher-board-content');
        if (!container) return;
        container.innerHTML = '<div style="padding:24px;color:var(--tb-text-secondary)">Cargando...</div>';

        const [profiles, items] = await Promise.all([
            this.data.getProfiles(), this.data.getLibraryItems()
        ]);
        const allClases = this.data.getAllClases();

        let tabHeaderHtml = this._renderClasesTabsStrip(this._teacherBoardMainTab);

        let contentHtml = '';
        if (this._teacherBoardMainTab === 'cargas') {
            contentHtml = this._bibRenderCargasAlumnosMain(profiles, items);
        } else if (this._teacherBoardMainTab === 'consultas') {
            contentHtml = this._tbRenderConsultasTab(profiles, allClases);
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
            if (q && !((s.profile.displayName || s.profile.name || '').toLowerCase().includes(q))) return false;
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
            return (a.profile.displayName || a.profile.name || '').localeCompare(b.profile.displayName || b.profile.name || '');
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
                </div>
                <div class="tb-list-scroll">${listHtml}</div>
            </div>
        </div>`;
    },

    _tbRenderHeaderStrip(studentsData, headerDate, practicedToday) {
        const total = studentsData.length;
        const red = studentsData.filter(s => s.alertStatus.level === 'red').length;
        const yellow = studentsData.filter(s => s.alertStatus.level === 'yellow').length;
        const green = total - red - yellow;

        const inactiveAlerts = studentsData.filter(s => s.alertStatus.level === 'red')
            .map(s => `<div class="tb-alert-item horizontal" onclick="app.tbFocusStudent('${s.profile.id}')">🔴 ${this._escapeHtml(s.profile.displayName || s.profile.name)} — ${s.alertStatus.reason}</div>`).join('');
        const questionAlerts = studentsData.filter(s => s.pendingQuestions > 0)
            .map(s => `<div class="tb-alert-item horizontal" onclick="app.tbFocusStudent('${s.profile.id}')">💬 ${this._escapeHtml(s.profile.displayName || s.profile.name)} — ${s.pendingQuestions} duda${s.pendingQuestions !== 1 ? 's' : ''}</div>`).join('');
        const noObjAlerts = studentsData.filter(s => s.hasObjetivos && s.objetivosPct < 50)
            .map(s => `<div class="tb-alert-item horizontal" onclick="app.tbFocusStudent('${s.profile.id}')">🎯 ${this._escapeHtml(s.profile.displayName || s.profile.name)} — objetivos ${s.objetivosPct}%</div>`).join('');

        const alertsHtml = [inactiveAlerts, questionAlerts, noObjAlerts].filter(Boolean).join('');

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
            ${alertsHtml ? `
            <div class="tb-header-alerts-container">
                <div class="tb-alerts-strip-title">Alertas Rápidas:</div>
                <div class="tb-alerts-strip">${alertsHtml}</div>
            </div>` : ''}
        </div>`;
    },

    _tbRenderStudentRow(s) {
        const p = s.profile;
        const displayName = p.displayName || p.name || '?';
        const expanded = this._teacherBoardExpandedId === p.id;
        const statusColor = s.alertStatus.level === 'green' ? 'var(--tb-success)' : s.alertStatus.level === 'yellow' ? '#f5a623' : 'var(--tb-accent)';

        const stepLbls = ['Técnica', 'Lectura', 'Repertorio'];
        const stepsHtml = s.stepsToday.map((done, i) => `<span class="tb-step-detail">${stepLbls[i] || ''} <span class="tb-step-check${done ? ' done' : ''}">${done ? '✓' : ''}</span></span>`).join('');

        let activityLabel = '—';
        let activityClass = 'inactive';
        if (s.bucket === 'hoy') {
            activityLabel = s.lastPracticedTime && !isNaN(new Date(s.lastPracticedTime))
                ? new Date(s.lastPracticedTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                : 'Hoy';
            activityClass = 'today';
        } else if (s.bucket === 'ayer') {
            activityLabel = 'Ayer';
            activityClass = 'yesterday';
        } else if (s.daysSince !== Infinity) {
            activityLabel = `Hace ${s.daysSince} días`;
            activityClass = 'inactive';
        } else {
            activityLabel = 'Sin actividad';
            activityClass = 'inactive';
        }

        const minutesToday = s.minutesToday;

        const nextClaseHtml = s.nextClase
            ? `<div class="tb-nextclase">
                <span>${s.nextClase.daysAway === 0 ? 'Hoy' : s.nextClase.daysAway === 1 ? 'Mañana' : `En ${s.nextClase.daysAway} días`} · ${s.nextClase.groupName} ${s.nextClase.time ? '· ' + s.nextClase.time : ''}</span>
                ${s.nextClase.claseId ? `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();app.tbGoToClase('${s.nextClase.claseId}')">Ver clase</button>` : ''}
              </div>`
            : `<div class="tb-nextclase tb-nextclase-empty">Sin próxima clase programada</div>`;

        const questionsPanel = expanded ? this._tbRenderQuestionsAccordion(p.id) : '';

        // Fila colapsada = identidad + 1 semáforo (propuesta 3a); el detalle
        // por categoría/racha/minutos se muestra solo al expandir.
        return `<div class="tb-student-row${expanded ? ' expanded' : ''}" data-profile-id="${p.id}">
            <div class="tb-row-header" onclick="app.tbToggleExpand('${p.id}')">
                <div class="tb-avatar" style="background:${p.color || 'var(--tb-accent)'}">${displayName.charAt(0).toUpperCase()}</div>
                <div class="tb-identity">
                    <div class="tb-name">${this._escapeHtml(displayName)}</div>
                    <div class="tb-group">${this._escapeHtml(s.groupLabel)}</div>
                </div>
                <div class="tb-status-dot-wrap" title="${this._escapeHtml(s.alertStatus.reason)}">
                    <span class="tb-status-dot tb-status-${s.alertStatus.level}" style="background:${statusColor}"></span>
                </div>
                <span class="tb-row-chevron">${expanded ? '▴' : '▾'}</span>
            </div>
            ${expanded ? `<div class="tb-row-expanded">
                <div class="tb-expanded-stats">
                    <div class="tb-steps" title="Pasos diarios de hoy">${stepsHtml}</div>
                    <div class="tb-expanded-meta">
                        <span class="tb-streak">${s.streak > 0 ? `🔥 ${s.streak} d` : '— racha'}</span>
                        <span class="tb-minutes">${minutesToday} min hoy</span>
                        <span class="tb-activity ${activityClass}">${activityLabel}</span>
                    </div>
                </div>
                <div class="tb-expanded-actions">
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();app.openTeacherFichaModal('${p.id}')" style="display:inline-flex; align-items:center; gap:5px;"><svg width="12" height="12"><use href="#icon-ficha"/></svg> Ficha</button>
                </div>
                ${nextClaseHtml}
                ${questionsPanel}
            </div>` : ''}
        </div>`;
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

    tbClearFocus() {
        this._tbFocusProfileId = null;
        this.renderTeacherBoardView();
    },

    tbGoToClase(claseId) {
        this.navigateToView('dashboard');
        this.openClase(claseId);
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

    _tbRenderConsultasTab(profiles, allClases) {
        const allPreguntas = [];
        profiles.forEach(p => {
            const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(p.id));
            const classes = allClases.filter(c => groups.some(g => g.id === c.groupId));
            classes.forEach(c => {
                const pregs = this.data.getPreguntasAlumno(p.id, c.id);
                pregs.forEach(preg => {
                    allPreguntas.push({
                        ...preg,
                        profile: p,
                        claseId: c.id,
                        claseTitle: c.title || (this.data.getGroup(c.groupId) || {}).name || 'Clase',
                        claseDate: c.date
                    });
                });
            });
        });

        // Filtrar consultas
        const filtered = allPreguntas.filter(preg => {
            const q = (this._tbConsultasSearch || '').toLowerCase().trim();
            if (q) {
                const nameMatch = (preg.profile.displayName || preg.profile.name || '').toLowerCase().includes(q);
                const textMatch = (preg.text || preg.pregunta || '').toLowerCase().includes(q);
                if (!nameMatch && !textMatch) return false;
            }
            if (this._tbConsultasFilter === 'pendientes' && preg.resolved) return false;
            if (this._tbConsultasFilter === 'respondidas' && !preg.resolved) return false;
            return true;
        });

        // Ordenar consultas por fecha descendente
        filtered.sort((a, b) => (b.claseDate || '').localeCompare(a.claseDate || ''));

        const cardsHtml = filtered.map(preg => {
            const p = preg.profile;
            const displayName = p.displayName || p.name || '?';
            return `
                <div class="tb-question-row${preg.resolved ? ' resolved' : ''}" style="margin-bottom:12px; padding:16px; background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:10px">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px">
                        <div class="tb-avatar" style="background:${p.color || 'var(--tb-accent)'}; width:30px; height:30px; font-size:12px">${displayName.charAt(0).toUpperCase()}</div>
                        <div style="flex:1; min-width:0">
                            <div style="font-weight:600; font-size:13px; color:var(--tb-text-primary)">${this._escapeHtml(displayName)}</div>
                            <div style="font-size:11px; color:var(--tb-text-secondary)">${this._escapeHtml(preg.claseTitle)} · ${preg.claseDate || 'Sin fecha'}</div>
                        </div>
                    </div>
                    <div class="tb-question-text" style="font-size:13px; color:var(--tb-text-primary); line-height:1.4">${preg.itemId ? `<span class="duda-item-badge" style="display:inline-block; font-size:10px; font-weight:600; text-transform:uppercase; color:var(--tb-accent); background:rgba(108,99,255,.12); border-radius:4px; padding:1px 6px; margin-right:4px">${this._escapeHtml(preg.itemTitle || 'ítem')}</span>` : ''}${this._escapeHtml(preg.text || preg.pregunta || '')}</div>
                    
                    ${preg.resolved ? `
                        <div class="tb-question-reply" style="margin-top:12px; font-size:12px; color:var(--tb-success); background:var(--tb-bg-elevated); padding:10px; border-radius:6px">
                            <strong>Tu respuesta:</strong> ${this._escapeHtml(preg.reply)}
                            <div style="margin-top:8px">
                                <button class="btn btn-outline btn-sm" onclick="app.tbEditReplyConsultasTab('${p.id}','${preg.claseId}','${preg.id}')" style="padding:2px 8px; font-size:10px">Editar respuesta</button>
                            </div>
                        </div>
                    ` : `
                        <div class="tb-question-reply-form" style="margin-top:12px">
                            <textarea class="form-input" id="tb-consultas-reply-input-${preg.id}" placeholder="Escribir respuesta..." rows="2" style="width:100%; margin-bottom:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); color:var(--tb-text-primary); border-radius:6px; padding:8px; font-family:inherit; font-size:12px"></textarea>
                            <button class="btn btn-primary btn-sm" onclick="app.tbReplyConsultasTab('${p.id}','${preg.claseId}','${preg.id}')">Responder</button>
                        </div>
                    `}
                </div>
            `;
        }).join('') || `<div style="padding:24px;color:var(--tb-text-secondary)">No hay consultas que coincidan con los filtros.</div>`;

        return `<div class="teacher-board-layout horizontal-layout">
            <div class="tb-main-area">
                <div class="tb-toolbar">
                    <div class="bib-search-wrap">
                        <svg class="bib-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" class="bib-search-input" id="tb-consultas-search" placeholder="Buscar por alumno o consulta..." value="${(this._tbConsultasSearch || '').replace(/"/g, '&quot;')}">
                    </div>
                    <select class="form-control" id="tb-consultas-filter" style="max-width:180px">
                        <option value="todos" ${this._tbConsultasFilter === 'todos' ? 'selected' : ''}>Todas las consultas</option>
                        <option value="pendientes" ${this._tbConsultasFilter === 'pendientes' ? 'selected' : ''}>Pendientes</option>
                        <option value="respondidas" ${this._tbConsultasFilter === 'respondidas' ? 'selected' : ''}>Respondidas</option>
                    </select>
                </div>
                <div class="tb-list-scroll" style="padding:20px">${cardsHtml}</div>
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
