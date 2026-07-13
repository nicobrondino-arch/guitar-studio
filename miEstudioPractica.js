/**
 * miEstudioPractica.js - Vista del alumno: Mi Estudio (racha, heatmap, proxima clase), Mi Biblioteca y Modo Practica (timers, wizard, visor PDF/YouTube).
 * Mixin del prototipo de GuitarStudioApp (definido en core.js). Debe cargarse DESPUES de core.js.
 */
Object.assign(GuitarStudioApp.prototype, {
    _getNextClaseForStudent(groups, allClases) {
        const myClases = allClases.filter(c => groups.some(g => g.id === c.groupId));
        const enCurso = myClases.filter(c => c.status === 'en-curso').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        if (enCurso.length) return enCurso[0];
        const pendientes = myClases
            .filter(c => c.status !== 'finalizada' && c.status !== 'en-curso')
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        return pendientes[0] || null;
    },

    async _buildClaseCardBodyHtml(clase, group, opts) {
        opts = opts || {};
        const label = opts.label || 'Próxima Clase';

        const dateLabel = clase.date ? new Date(clase.date + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
        const capDate = dateLabel ? dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1) : '';
        const timePart = group.time ? ' · ' + group.time.slice(0, 5) : '';

        const meetHref = /^https?:/.test(group.meetLink || '') ? group.meetLink : 'https://' + (group.meetLink || '');
        const meetEl = (!opts.readonly && group.meetLink) ? `
            <div class="proxima-meet" style="margin-top: 8px">
                <a href="${this._escapeHtml(meetHref)}" target="_blank" class="btn-pill btn-meet-pill">
                    <svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    Entrar al Meet
                </a>
            </div>` : '';

        // Checklist única de pasos, sin pestañas por categoría (Pieza 6B)
        this._ensurePasosV2(clase);
        const libraryItems = await this.data.getLibraryItems();
        const doneMap = ((clase.pasosDone || {})[this.activeProfile?.id] || {});
        const pasosChecklist = (clase.content || []).map((p, idx) => {
            const libItem = p.libraryItemId ? libraryItems.find(it => it.id === p.libraryItemId) : null;
            const done = !!doneMap[p.id];
            const catColor = libItem ? this._bibCatColor(libItem.category || '') : null;
            const contentTitle = libItem ? (libItem.title || 'Sin título') : 'Sin material';
            const checkBtn = opts.readonly
                ? `<span class="ck3-box ${done ? 'done' : ''}">${done ? '<svg width="18" height="18"><use href="#icon-check"/></svg>' : ''}</span>`
                : `<button class="ck3-box ${done ? 'done' : ''}" onclick="app.pasoToggleDone('${clase.id}','${p.id}')" title="${done ? 'Marcar pendiente' : 'Marcar completado'}">${done ? '<svg width="18" height="18"><use href="#icon-check"/></svg>' : ''}</button>`;
            const doubtBtn = (!opts.readonly && libItem) ? `<button class="ck3-duda" onclick="app.sendItemDoubt('${clase.id}','${libItem.id}')" title="¿Duda con esto?">💬</button>` : '';
            const abrirBtn = libItem ? `<button class="ck3-abrir" onclick="app.openLibraryItemById('${libItem.id}')"><svg width="13" height="13"><use href="#icon-abrir"/></svg> Abrir</button>` : '';
            return `
            <div class="ck3-row ${done ? 'done' : ''}">
                ${checkBtn}
                <div class="ck3-info">
                    <div class="ck3-meta">
                        <span class="ck3-num">Paso ${idx + 1}</span>
                        <span class="ck3-dot" style="background:${catColor || 'transparent'}"></span>
                        <span class="ck3-content-title">${this._escapeHtml(contentTitle)}</span>
                    </div>
                    ${p.descripcion ? `<div class="ck3-consigna">${this._escapeHtml(p.descripcion)}</div>` : ''}
                    ${p.objetivo ? `<div class="ck3-objetivo">🎯 ${this._escapeHtml(p.objetivo)}</div>` : ''}
                </div>
                <div class="ck3-actions">${abrirBtn}${doubtBtn}</div>
            </div>`;
        }).join('');
        const contentByCat = pasosChecklist ? `<div class="ck3-list">${pasosChecklist}</div>` : '';

        const notaAlumno = clase.notaAlumno ? `
            <div class="proxima-nota-prof">
                <div class="proxima-nota-label">Nota del Profesor</div>
                <p class="proxima-nota-text">"${this._escapeHtml(clase.notaAlumno)}"</p>
            </div>` : '';

        const hasContent = contentByCat || notaAlumno;

        return `
            <div class="proxima-header">
                <div>
                    <div class="proxima-label">${label}</div>
                    <div class="proxima-title" style="font-size:16px; margin: 2px 0">${this._escapeHtml(group.name || clase.title || 'Clase')}</div>
                    <div class="proxima-meta">${capDate}${timePart}</div>
                </div>
                ${meetEl}
            </div>
            <div class="proxima-body">
                ${contentByCat}
                ${notaAlumno}
                ${!hasContent ? '<p class="text-muted" style="font:italic 13px var(--font-heading,serif); margin:0; padding: 8px 0">El profesor no asignó contenido específico en esta clase.</p>' : ''}
            </div>
        `;
    },

    async renderStudioSelectorAndDetails() {
        const detailsContainer = document.getElementById('studio-class-details-container');
        if (!detailsContainer) return;
        if (!this.activeProfile) return;

        const practiceBtn = `<button class="btn btn-primary" onclick="app.navigateToPractice()" style="width:100%; padding:14px; font-size:15px; font-weight:700; border-radius:10px; background:linear-gradient(135deg, var(--tb-accent), var(--tb-accent-hover)); border:none; box-shadow:0 4px 15px rgba(108,99,255,0.25); display:flex; align-items:center; justify-content:center; gap:8px">
            🚀 Comenzar Práctica Diaria
        </button>`;

        // 1. Obtener TODOS los grupos del alumno (particular + cursos)
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
        if (groups.length === 0) {
            detailsContainer.innerHTML = '<p class="text-muted" style="padding:16px; text-align:center">No estás asignado a ningún grupo o curso aún.</p>';
            const timeValEl = document.getElementById("studio-total-time-value");
            if (timeValEl) timeValEl.textContent = "0 min";
            this.renderStudioHistoryList();
            return;
        }

        // 2. Calcular la próxima clase entre todos los espacios del alumno
        const allClases = this.data.getAllClases();
        const clase = this._getNextClaseForStudent(groups, allClases);

        if (!clase) {
            detailsContainer.innerHTML = `
                <div class="card hero-card proxima-card" style="margin-bottom:0">
                    <div class="proxima-label">Próxima Clase</div>
                    <p class="text-muted" style="padding:8px 0 0 0; margin:0">No tenés ninguna clase programada por ahora. Mientras tanto, seguí con tu Rutina Diaria.</p>
                </div>
                ${practiceBtn}
            `;
            const timeValEl = document.getElementById("studio-total-time-value");
            if (timeValEl) timeValEl.textContent = "0 min";
            this.renderStudioHistoryList();
            return;
        }

        const group = groups.find(g => g.id === clase.groupId) || {};

        // 3. Tiempo total de estudio para esta clase
        const totalPracticeSeconds = await this.getPracticeTimeForClass(clase);
        const totalMinutes = Math.round(totalPracticeSeconds / 60);
        const timeValEl = document.getElementById("studio-total-time-value");
        if (timeValEl) timeValEl.textContent = `${totalMinutes} min`;

        // 4. Renderizar la próxima clase (automática, sin selección manual)
        const bodyHtml = await this._buildClaseCardBodyHtml(clase, group, { label: 'Próxima Clase' });
        detailsContainer.innerHTML = `
            <div class="card hero-card proxima-card" style="margin-bottom:0">${bodyHtml}</div>
            ${practiceBtn}
        `;

        this.renderStudioHistoryList();
    },

    toggleStudioHistory() {
        const listEl = document.getElementById('studio-history-list');
        const chevron = document.getElementById('studio-history-chevron');
        if (!listEl) return;
        const opening = listEl.style.display === 'none';
        listEl.style.display = opening ? 'block' : 'none';
        if (chevron) chevron.style.transform = opening ? 'rotate(180deg)' : '';
        if (opening) this.renderStudioHistoryList();
    },

    toggleStudioHeatmap() {
        const bodyEl = document.getElementById('studio-heatmap-body');
        const chevron = document.getElementById('studio-heatmap-chevron');
        if (!bodyEl) return;
        const opening = bodyEl.style.display === 'none';
        bodyEl.style.display = opening ? 'block' : 'none';
        if (chevron) chevron.style.transform = opening ? 'rotate(180deg)' : '';
    },

    toggleStudioHistoryClase(claseId) {
        this._studioHistoryOpenClaseId = this._studioHistoryOpenClaseId === claseId ? null : claseId;
        this.renderStudioHistoryList();
    },

    async renderStudioHistoryList() {
        const listEl = document.getElementById('studio-history-list');
        if (!listEl || !this.activeProfile) return;
        if (listEl.style.display === 'none') return; // colapsado: no hace falta renderizar

        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
        const groupById = {};
        groups.forEach(g => { groupById[g.id] = g; });

        const finalizadas = this.data.getAllClases()
            .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
            .sort((a, b) => (b.finalizadaAt || 0) - (a.finalizadaAt || 0));

        if (!finalizadas.length) {
            listEl.innerHTML = '<p class="text-muted" style="font-size:12px; padding:8px 0; margin:0">Todavía no hay clases finalizadas para repasar.</p>';
            return;
        }

        const itemsHtml = await Promise.all(finalizadas.map(async c => {
            const group = groupById[c.groupId] || {};
            const dateLabel = c.date ? new Date(c.date + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : 'Clase';
            const isOpen = this._studioHistoryOpenClaseId === c.id;
            const detailHtml = isOpen ? await this._buildClaseCardBodyHtml(c, group, { label: 'Repaso', readonly: true }) : '';
            return `<div class="studio-history-item" style="margin-top:6px">
                <button onclick="app.toggleStudioHistoryClase('${c.id}')" style="width:100%; display:flex; justify-content:space-between; align-items:center; gap:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); border-radius:8px; padding:8px 12px; cursor:pointer; font-size:12px; color:var(--tb-text-primary)">
                    <span>${this._escapeHtml(group.name || 'Clase')} — ${dateLabel}</span>
                    <span style="opacity:.5; flex-shrink:0">${isOpen ? '▲' : '▼'}</span>
                </button>
                ${isOpen ? `<div class="card" style="margin-top:6px; padding:12px">${detailHtml}</div>` : ''}
            </div>`;
        }));
        listEl.innerHTML = itemsHtml.join('');
    },

    async getPracticeTimeForClass(clase) {
        if (!clase || !this.activeProfile) return 0;
        
        const groupId = clase.groupId;
        const claseAnterior = this.data.getClaseAnterior(groupId, clase.date);
        
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
        const allClases = this.data.getAllClases();
        const myClases = allClases
            .filter(c => c.groupId === groupId && c.status === 'finalizada')
            .sort((a, b) => {
                const ta = b.finalizadaAt || b.date || '';
                const tb = a.finalizadaAt || a.date || '';
                return tb.localeCompare(ta);
            });
            
        const isLatest = myClases.length > 0 && myClases[0].id === clase.id;
        
        const startDate = claseAnterior ? claseAnterior.date : '1970-01-01';
        const endDate = isLatest ? this.getTodayString() : clase.date;
        
        try {
            const logs = await this.data.getPracticeLogsInRange(startDate, endDate);
            const myLogs = logs.filter(log => log.profileId === this.activeProfile.id || !log.profileId);
            
            let totalSecs = 0;
            myLogs.forEach(log => {
                if (claseAnterior && log.date === claseAnterior.date) return;
                totalSecs += log.totalSeconds || 0;
            });
            
            if (isLatest) {
                const todayStr = this.getTodayString();
                const alreadyLoggedToday = myLogs.find(l => l.date === todayStr);
                if (!alreadyLoggedToday) {
                    const currentSessionSeconds = this.timerSeconds.reduce((a, b) => a + b, 0);
                    totalSecs += currentSessionSeconds;
                }
            }
            
            return totalSecs;
        } catch(e) {
            console.warn("Error calculando tiempo total de estudio:", e);
            return 0;
        }
    },

    async handleDirectUpload(input, type, claseId) {
        const file = input.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const buffer = e.target.result;
            const itemId = this.data.generateId('lib');
            const item = {
                id: itemId,
                title: file.name.replace(/\.[^.]+$/, ''),
                filename: file.name,
                bytes: buffer,
                type: type,
                uploadedAt: Date.now(),
                uploadedBy: this.activeProfile.id,
                claseId: claseId,
                category: 'Técnica', // default
                level: 'inicial',
                style: 'otro'
            };
            
            await this.data.saveLibraryItem(item);

            this.notifyTeacher({
                type: 'carga_alumno',
                claseId: claseId,
                studentId: this.activeProfile.id,
                studentName: this.activeProfile.name,
                itemId: itemId,
                itemTitle: item.title
            });

            this.showToast('Archivo subido correctamente', '✓');
            input.value = '';
            await this.renderStudioSelectorAndDetails();
        };
        
        reader.readAsArrayBuffer(file);
    },

    showDirectLinkModal(claseId) {
        const url = prompt("Pegá la URL del video de YouTube o canción de Spotify:");
        if (!url) return;
        
        const isYT = url.includes('youtube') || url.includes('youtu.be');
        const isSpotify = url.includes('spotify');
        
        if (!isYT && !isSpotify) {
            alert("Por favor ingresá un link válido de YouTube o Spotify.");
            return;
        }
        
        const type = isYT ? 'youtube' : 'spotify';
        const itemId = this.data.generateId('lib');
        const item = {
            id: itemId,
            title: type === 'youtube' ? 'Video de YouTube (Alumno)' : 'Canción de Spotify (Alumno)',
            url: url.trim(),
            type: type,
            uploadedAt: Date.now(),
            uploadedBy: this.activeProfile.id,
            claseId: claseId,
            category: 'Técnica',
            level: 'inicial',
            style: 'otro'
        };
        
        const title = prompt("Título para este link:", item.title);
        if (title !== null) {
            if (title.trim()) item.title = title.trim();
        }
        
        this.data.saveLibraryItem(item).then(() => {
            this.data.addNotification({
                id: this.data.generateId('notif'),
                claseId: claseId,
                studentId: this.activeProfile.id,
                studentName: this.activeProfile.name,
                itemId: itemId,
                itemTitle: item.title,
                type: 'carga_alumno',
                read: false,
                timestamp: new Date().toISOString()
            });
            this.showToast('Enlace agregado', '✓');
            this.renderStudioSelectorAndDetails();
        });
    },

    async deleteStudentUploadFromClass(claseId, itemId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este contenido?')) return;
        const notifications = this.data.getNotifications().filter(n => n.itemId !== itemId);
        this.data.saveNotifications(notifications);

        await this.data.deleteLibraryItem(itemId);
        this.showToast('Contenido eliminado', '✓');
        await this.renderStudioSelectorAndDetails();
    },

    navigateToPractice() {
        this.navigateToView('practice');
    },

    async sendPracticeDoubt() {
        const txtEl = document.getElementById('practice-doubt-textarea');
        if (!txtEl || !txtEl.value.trim()) return;
        
        if (!this.activeProfile) {
            alert("Iniciá sesión como alumno para enviar consultas.");
            return;
        }
        
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
        if (groups.length === 0) return;
        const allClases = this.data.getAllClases();
        const myClases = allClases
            .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
            .sort((a, b) => {
                const ta = b.finalizadaAt || b.date || '';
                const tb = a.finalizadaAt || a.date || '';
                return tb.localeCompare(ta);
            });
            
        if (myClases.length === 0) {
            alert("No hay una clase activa donde registrar tu consulta.");
            return;
        }
        
        const clase = myClases[0];
        const text = txtEl.value.trim();
        
        const preg = {
            id: this.data.generateId('preg'),
            text: text,
            date: new Date().toISOString(),
            author: this.activeProfile.name,
            replies: []
        };
        
        this.data.savePreguntaAlumno(this.activeProfile.id, clase.id, preg);
        this.notifyTeacher({
            type: 'duda_alumno',
            claseId: clase.id,
            studentId: this.activeProfile.id,
            studentName: this.activeProfile.name
        });
        txtEl.value = '';
        this.showToast('Pregunta enviada al canal de la clase', '✓');
        await this.renderPracticeView();
    },

    // Checkbox de paso completado (Pieza 6B) — solo estado visual por alumno; el tracking migra en Fase B
    pasoToggleDone(claseId, pasoId) {
        if (!this.activeProfile) return;
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.pasosDone = clase.pasosDone || {};
        const mine = clase.pasosDone[this.activeProfile.id] = clase.pasosDone[this.activeProfile.id] || {};
        mine[pasoId] = !mine[pasoId];
        this.data.saveClase(clase);
        this.renderStudioSelectorAndDetails();
    },

    async sendItemDoubt(claseId, itemId) {
        if (!this.activeProfile) {
            alert("Iniciá sesión como alumno para enviar consultas.");
            return;
        }
        const libItems = await this.data.getLibraryItems();
        const item = libItems.find(i => i.id === itemId);
        const itemTitle = item ? item.title : 'este ejercicio';
        const text = prompt(`¿Cuál es tu duda sobre "${itemTitle}"?`);
        if (!text || !text.trim()) return;

        const preg = {
            id: this.data.generateId('preg'),
            text: text.trim(),
            date: new Date().toISOString(),
            author: this.activeProfile.name,
            itemId: itemId,
            itemTitle: itemTitle,
            replies: []
        };
        this.data.savePreguntaAlumno(this.activeProfile.id, claseId, preg);
        this.notifyTeacher({
            type: 'duda_alumno',
            claseId: claseId,
            studentId: this.activeProfile.id,
            studentName: this.activeProfile.name,
            itemId: itemId,
            itemTitle: itemTitle
        });
        this.showToast('Consulta enviada sobre este ejercicio', '✓');
    },

    renderMotivationalPhrase() {
        const phrases = [
            { text: "La práctica no hace la perfección. La práctica consciente hace la perfección.", author: "Vince Lombardi" },
            { text: "Cada nota que tocas hoy es una nota que mañana saldrá sola.", author: "Anónimo" },
            { text: "No practiques hasta que lo hagas bien. Practica hasta que no puedas hacerlo mal.", author: "Harold Craxton" },
            { text: "La música es la aritmética de los sonidos, como la óptica es la geometría de la luz.", author: "Claude Debussy" },
            { text: "Dime y lo olvido. Enséñame y lo recuerdo. Involúcrame y lo aprendo.", author: "Benjamin Franklin" },
            { text: "El talento es más barato que la sal de mesa. Lo que separa al talentoso del exitoso es el trabajo duro.", author: "Stephen King" },
            { text: "Un guitarrista sin disciplina es como una guitarra sin cuerdas.", author: "Anónimo" },
            { text: "La perseverancia es la madre de la buena suerte.", author: "Benjamin Franklin" },
        ];
        const idx = Math.floor(Date.now() / 86400000) % phrases.length; // Cambia cada día
        const p = phrases[idx];
        const textEl = document.getElementById("studio-phrase-text");
        const authorEl = document.getElementById("studio-phrase-author");
        if (textEl) textEl.textContent = `"${p.text}"`;
        if (authorEl) authorEl.textContent = `— ${p.author}`;
    },

    saveStreak() {
        const pid = this.activeProfile ? this.activeProfile.id : null;
        if (pid) {
            this.data.setProfileStreak(pid, this.streak);
            this.data.setProfileLastPracticed(pid, this.lastPracticedDate);
            if (this.lastPracticedDate === this.getTodayString()) {
                this.data.setProfileLastPracticedTime(pid, new Date().toISOString());
            }
            this.data.setProfileHistory(pid, this.history);
        } else {
            this.data.saveStreakData(this.streak, this.lastPracticedDate, this.history);
        }
        this.updateStreakUI();
    },

    updateStreakUI() {
        const countEls = document.querySelectorAll("#streak-count");
        countEls.forEach(el => el.textContent = this.streak);

        const unitEls = document.querySelectorAll(".studio-streak-unit-b");
        unitEls.forEach(el => el.textContent = "días seguidos");

        const todayStr = this.getTodayString();
        const practicedToday = this.lastPracticedDate === todayStr;
        const daysSince = this.lastPracticedDate
            ? Math.round((new Date(todayStr + 'T12:00') - new Date(this.lastPracticedDate + 'T12:00')) / 86400000)
            : Infinity;

        const descEl = document.getElementById("studio-streak-desc");
        if (descEl) {
            if (practicedToday) {
                descEl.textContent = "¡Excelente trabajo! Ya practicaste hoy. Nos vemos pronto. 🎸";
            } else if (this.streak > 0 && daysSince >= 2) {
                descEl.textContent = "🧊 Tu racha está congelada: completá tu rutina hoy para no perderla.";
            } else if (this.streak > 0) {
                descEl.textContent = `Llevas ${this.streak} ${this.streak === 1 ? 'día' : 'días'} seguidos. ¡No pares!`;
            } else {
                descEl.textContent = "Completá todos los pasos de tu rutina para encender la racha.";
            }
        }
    },

    async updateProgressUI() {
        const pid = this.activeProfile ? this.activeProfile.id : null;
        const prog = pid ? this._getPasosProgress(pid) : { hechos: 0, total: 0 };
        const percentage = prog.total ? Math.round((prog.hechos / prog.total) * 100) : 0;

        const pctEl = document.getElementById("progress-percentage");
        if (pctEl) pctEl.textContent = `${percentage}%`;

        const barEl = document.getElementById("studio-progress-bar");
        if (barEl) barEl.style.width = `${percentage}%`;

        // Lista de pasos del día en la card "Progreso de Hoy" (Mi Estudio)
        const cont = document.getElementById("studio-pasos-summary");
        if (!cont) return;
        if (!pid || !prog.total) {
            cont.innerHTML = '<p class="text-muted" style="font-size:12px; font-style:italic; margin:0;">Tu rutina aparece acá cuando el profesor publica una clase.</p>';
            return;
        }
        const pasos = this._getRutinaPasosFor(pid);
        const done = this.data.getProfileDailyPasos(pid, this.getTodayString());
        const libraryItems = await this.data.getLibraryItems();
        cont.innerHTML = pasos.map((x, idx) => {
            const isDone = !!done[x.paso.id];
            const libItem = x.paso.libraryItemId ? libraryItems.find(it => it.id === x.paso.libraryItemId) : null;
            const title = libItem ? (libItem.title || 'Sin título') : (x.paso.descripcion || `Paso ${idx + 1}`);
            return `<div class="sps3-row ${isDone ? 'done' : ''}">
                <span class="sps3-dot"></span>
                <span class="sps3-title">${this._escapeHtml(title)}</span>
                <span class="sps3-estado">${isDone ? 'Completado' : 'Pendiente'}</span>
            </div>`;
        }).join('');
    },

    // Modo Práctica de una sola página (Fase B): checklist de pasos + timer + meta, todo junto
    async renderPracticeView() {
        const area = document.getElementById("practice-content-area");
        const playerView = document.getElementById("step-view-4");
        if (!area) return;

        // Si el player está activo, no renderizar el área de contenido
        if (this.playerActiveItemId) {
            area.style.display = "none";
            if (playerView) playerView.style.display = "flex";
            return;
        }

        area.style.display = "block";
        if (playerView) playerView.style.display = "none";
        this._updatePracticeBreadcrumb();

        const pid = this.activeProfile ? this.activeProfile.id : null;
        const t = (key) => TRANSLATIONS[this.lang][key] || key;

        // ── Timer único + meta diaria ──
        const timerSecs = this.timerSeconds[0] || 0;
        const goalMins = this._getPracticeGoal();
        const goalSecs = goalMins * 60;
        const remainingSecs = Math.max(0, goalSecs - timerSecs);
        const mm = String(Math.floor(remainingSecs / 60)).padStart(2, '0');
        const ss = String(remainingSecs % 60).padStart(2, '0');
        const isTimerRunning = !!this.timerIntervals[0];
        const goalReached = timerSecs >= goalSecs;
        const r = 80; const circ = +(2 * Math.PI * r).toFixed(1);
        const dashOffset = +(circ * (1 - Math.min(timerSecs / Math.max(goalSecs, 1), 1))).toFixed(1);

        // ── Checklist de pasos de la rutina ──
        const rutina = pid ? this._getRutinaPasosFor(pid) : [];
        const dailyDone = pid ? this.data.getProfileDailyPasos(pid, this.getTodayString()) : {};
        const libraryItems = await this.data.getLibraryItems();
        const multiGroup = new Set(rutina.map(x => x.group.id)).size > 1;
        const prog = pid ? this._getPasosProgress(pid) : { hechos: 0, total: 0 };

        const checklistHtml = rutina.map((x, idx) => {
            const p = x.paso;
            const done = !!dailyDone[p.id];
            const libItem = p.libraryItemId ? libraryItems.find(it => it.id === p.libraryItemId) : null;
            const catColor = libItem ? this._bibCatColor(libItem.category || '') : null;
            const contentTitle = libItem ? (libItem.title || 'Sin título') : 'Sin material';
            const originBadge = multiGroup ? `<span style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; color:var(--tb-text-muted); margin-right:6px">${this._escapeHtml(x.group.name)}</span>` : '';
            const abrirBtn = libItem ? `<button class="ck3-abrir" onclick="app.openLibraryItemById('${libItem.id}')"><svg width="13" height="13"><use href="#icon-abrir"/></svg> Abrir</button>` : '';
            const doubtBtn = libItem ? `<button class="ck3-duda" onclick="app.sendItemDoubt('${x.clase.id}','${libItem.id}')" title="¿Duda con esto?">💬</button>` : '';
            return `
            <div class="ck3-row ${done ? 'done' : ''}">
                <button class="ck3-box ${done ? 'done' : ''}" onclick="app.pasoDailyToggle('${x.clase.id}','${p.id}')" title="${done ? 'Marcar pendiente' : 'Marcar completado'}">${done ? '<svg width="18" height="18"><use href="#icon-check"/></svg>' : ''}</button>
                <div class="ck3-info">
                    <div class="ck3-meta">
                        <span class="ck3-num">Paso ${idx + 1}</span>
                        <span class="ck3-dot" style="background:${catColor || 'transparent'}"></span>
                        <span class="ck3-content-title">${originBadge}${this._escapeHtml(contentTitle)}</span>
                    </div>
                    ${p.descripcion ? `<div class="ck3-consigna">${this._escapeHtml(p.descripcion)}</div>` : ''}
                    ${p.objetivo ? `<div class="ck3-objetivo">🎯 ${this._escapeHtml(p.objetivo)}</div>` : ''}
                </div>
                <div class="ck3-actions">${abrirBtn}${doubtBtn}</div>
            </div>`;
        }).join('');

        // ── Material complementario (opcional, no cuenta para la rutina) ──
        const suppItems = libraryItems.filter(item => item.category === 'supplementary');
        const suppHtml = suppItems.length ? `
            <div class="practice-supp-card">
                <div class="practice-supp-title">Material complementario <span>opcional · no cuenta en tus estadísticas</span></div>
                ${suppItems.map(item => `
                <div class="practice-supp-item" onclick="app.openLibraryItemById('${item.id}')">
                    <span class="bib-type-icon" style="background:${this._bibCatColor(item.category)}1f; color:${this._bibCatColor(item.category)}; width:20px; height:20px;">${this._bibTypeIcon(item.type)}</span>
                    <span>${this._escapeHtml(item.title || 'Sin título')}</span>
                </div>`).join('')}
            </div>` : '';

        area.innerHTML = `<div class="practice-split-layout">
          <div class="practice-timer-panel">
            <div class="practice-ring-wrap${isTimerRunning ? ' ring-running' : ''}">
              <svg viewBox="0 0 180 180" style="width:180px;height:180px">
                <circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--tb-border)" stroke-width="8"/>
                <circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--tb-accent)" stroke-width="8"
                  stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"
                  style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)"/>
              </svg>
              <div class="practice-ring-center">
                <div class="practice-ring-time" style="color:var(--tb-accent)">${mm}:${ss}</div>
                <div class="practice-ring-label" style="color:var(--tb-accent)">${goalReached ? '¡Meta!' : 'meta ' + goalMins + ' min'}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;width:100%">
              <button class="btn btn-primary" id="btn-cat-timer-toggle" style="flex:1">
                ${isTimerRunning ? '⏸ Pausar' : (timerSecs > 0 ? '▶ Continuar' : '▶ Iniciar')}
              </button>
              <button class="btn btn-outline btn-sm" id="btn-timer-reset" title="Reiniciar">↺</button>
            </div>
            <div class="practice-goal-row">
              <span>Meta diaria:</span><span>${goalMins} min</span>
              <button onclick="app.editPracticeGoal()" class="btn-goal-edit" title="Editar meta">✎</button>
            </div>
            <div style="width:100%; height:4px; border-radius:2px; background:var(--tb-border); overflow:hidden">
              <div style="width:${prog.total ? Math.round((prog.hechos / prog.total) * 100) : 0}%; height:100%; background:rgba(52,199,89,.7); transition:width .3s"></div>
            </div>
            <div style="font:400 10px var(--font-primary);color:var(--tb-text-muted);text-align:center;margin-bottom:12px">${prog.hechos}/${prog.total} pasos de tu rutina</div>

            <!-- Espacio para escribir dudas -->
            <div class="card practice-doubt-card" style="width:100%; border:1px solid var(--tb-border); padding:12px; border-radius:8px; background:var(--tb-bg-secondary); box-sizing:border-box">
                <h4 style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--tb-text-muted); margin:0 0 6px 0; text-align:left">¿Tenés dudas?</h4>
                <textarea id="practice-doubt-textarea" placeholder="Escribí tu consulta aquí..." rows="2" style="width:100%; background:var(--tb-bg-primary); border:1px solid var(--tb-border); border-radius:6px; color:var(--tb-text-primary); padding:6px; font-size:12px; font-family:var(--font-primary); resize:vertical; box-sizing:border-box; outline:none"></textarea>
                <button class="btn btn-primary btn-sm" onclick="app.sendPracticeDoubt()" style="width:100%; margin-top:8px; font-size:11px; padding:6px">Enviar Consulta</button>
            </div>
          </div>
          <div class="practice-content-right">
            ${rutina.length
                ? `<div class="ck3-list">${checklistHtml}</div>`
                : `<div class="practice-empty-state"><p class="text-muted">${t('practice-empty-state')}</p></div>`}
            ${suppHtml}
          </div>
        </div>`;

        // Bind timer toggle + reset (timer único: stepIndex 1)
        const timerBtn = document.getElementById("btn-cat-timer-toggle");
        if (timerBtn) timerBtn.addEventListener("click", () => this.toggleTimer(1));
        const resetBtn = document.getElementById("btn-timer-reset");
        if (resetBtn) resetBtn.addEventListener("click", () => {
            this.timerSeconds[0] = 0;
            this.renderPracticeView();
        });
    },

    // Breadcrumb de la barra de práctica: "Rutina Diaria › Ejercicio"
    _updatePracticeBreadcrumb(leafTitle) {
        const el = document.getElementById('practice-breadcrumb');
        if (!el) return;
        const parts = ['Rutina Diaria'];
        if (leafTitle) parts.push(leafTitle);
        el.textContent = parts.join(' › ');
    },

    _getLatestFinalizedClasesPerGroup() {
        if (!this.activeProfile) return [];
        const groups = this.data.getAllGroups().filter(g => (g.memberIds||[]).includes(this.activeProfile.id));
        const allClases = this.data.getAllClases();
        return groups.map(group => {
            const clases = allClases
                .filter(c => c.groupId === group.id && c.status === 'finalizada')
                .sort((a,b) => (b.finalizadaAt||0) - (a.finalizadaAt||0));
            return clases.length ? { group, clase: clases[0] } : null;
        }).filter(Boolean);
    },

    // ── Fase B (punto 8): la rutina diaria son los pasos de la última clase publicada de cada grupo ──
    _getRutinaPasosFor(profileId) {
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(profileId));
        const allClases = this.data.getAllClases();
        const pasos = [];
        groups.forEach(group => {
            const clases = allClases
                .filter(c => c.groupId === group.id && c.status === 'finalizada' && (c.memberOverride == null || c.memberOverride.includes(profileId)))
                .sort((a, b) => (b.finalizadaAt || 0) - (a.finalizadaAt || 0));
            if (!clases.length) return;
            const clase = this._ensurePasosV2(clases[0]);
            (clase.content || []).forEach(p => pasos.push({ paso: p, clase, group }));
        });
        return pasos;
    },

    // Semáforo del día: Completo = TODOS los pasos de la rutina marcados hoy (decisión 2026-07-10)
    _getPasosProgress(profileId) {
        const pasos = this._getRutinaPasosFor(profileId);
        const done = this.data.getProfileDailyPasos(profileId, this.getTodayString());
        const total = pasos.length;
        const hechos = pasos.filter(x => done[x.paso.id]).length;
        return { hechos, total, dot: total > 0 && hechos === total ? 'full' : hechos > 0 ? 'partial' : 'none' };
    },

    pasoDailyToggle(claseId, pasoId) {
        if (!this.activeProfile) return;
        const pid = this.activeProfile.id;
        const todayStr = this.getTodayString();
        const done = this.data.getProfileDailyPasos(pid, todayStr);
        done[pasoId] = !done[pasoId];
        this.data.setProfileDailyPasos(pid, todayStr, done);

        // Registro persistente por clase — el profesor lo ve como avance con la tarea
        const clase = this.data.getClase(claseId);
        if (clase) {
            clase.pasosDone = clase.pasosDone || {};
            const mine = clase.pasosDone[pid] = clase.pasosDone[pid] || {};
            mine[pasoId] = !!done[pasoId];
            this.data.saveClase(clase);
        }

        this.updateProgressUI();
        const prog = this._getPasosProgress(pid);
        if (prog.total > 0 && prog.hechos === prog.total) {
            this.finalizeDailyPractice();
        } else {
            this.renderPracticeView();
        }
    },

    // Meta diaria única de práctica (reemplaza las metas por categoría)
    _getPracticeGoal() {
        const key = `gs-pgoal-${this.activeProfile?.id || 'def'}`;
        const stored = parseInt(localStorage.getItem(key), 10);
        if (stored) return stored;
        // Migración: la meta vieja era la suma de las 3 metas por categoría
        try {
            const old = JSON.parse(localStorage.getItem(`gs-pgoals-${this.activeProfile?.id || 'def'}`) || 'null');
            if (Array.isArray(old)) return Math.max(5, old.reduce((a, b) => a + (b || 0), 0));
        } catch (e) { /* default */ }
        return 30;
    },

    editPracticeGoal() {
        const val = prompt('Meta diaria de práctica (minutos):', this._getPracticeGoal());
        if (!val) return;
        const mins = Math.max(1, Math.min(240, parseInt(val, 10) || 30));
        localStorage.setItem(`gs-pgoal-${this.activeProfile?.id || 'def'}`, String(mins));
        this.renderPracticeView();
    },

    async openPlayerForItem(libraryItemId) {
        this.closePDFViewer();
        const item = await this.data.getLibraryItem(libraryItemId);
        if (!item || (item.type !== 'score' && item.type !== 'gp' && item.type !== 'gpx')) return;

        this.playerActiveItemId = libraryItemId;

        // Mostrar back button y anotar el ejercicio en el breadcrumb
        const backBtn = document.getElementById("btn-back-to-exercises");
        if (backBtn) backBtn.style.display = "flex";
        this._updatePracticeBreadcrumb(item.title || '');

        // Cambiar a step-view-4
        const contentArea = document.getElementById("practice-content-area");
        const playerView = document.getElementById("step-view-4");
        if (contentArea) contentArea.style.display = "none";
        if (playerView) {
            playerView.style.display = "flex";
            playerView.classList.add("active");
        }

        // Inicializar y cargar
        await this.initAlphaTabPlayerIfNeeded(item);
        if (this.atApi && this.atCurrentItemId !== libraryItemId) {
            const bytes = item.bytes || item.fileData || item.data;
            this.atApi.load(new Uint8Array(bytes));
            this.atCurrentItemId = libraryItemId;
        }

        // Render si ya estaba inicializado
        if (this.atApi) {
            setTimeout(() => this.atApi.render(), 100);
        }
    },

    exitPlayer() {
        this.playerActiveItemId = null;

        const backBtn = document.getElementById("btn-back-to-exercises");
        if (backBtn) backBtn.style.display = "none";

        const playerView = document.getElementById("step-view-4");
        if (playerView) {
            playerView.style.display = "none";
            playerView.classList.remove("active");
        }

        const contentArea = document.getElementById("practice-content-area");
        if (contentArea) contentArea.style.display = "block";

        if (this.atApi) this.atApi.stop();

        this.renderPracticeView();
    },

    async openPDF(libraryItemId) {
        if (this.playerActiveItemId) this.exitPlayer();
        const item = await this.data.getLibraryItem(libraryItemId);
        const bytes = item ? (item.bytes || item.fileData || item.data) : null;
        if (!item || !bytes) return;

        // Revocar el blob URL anterior antes de crear uno nuevo
        if (this._pdfBlobUrl) {
            try {
                URL.revokeObjectURL(this._pdfBlobUrl);
            } catch(e) { console.warn(e); }
        }

        // Convertir bytes a Blob de forma ultra resiliente
        let blob = null;
        if (bytes instanceof Blob) {
            blob = bytes;
        } else if (bytes instanceof ArrayBuffer) {
            blob = new Blob([bytes], { type: 'application/pdf' });
        } else if (ArrayBuffer.isView(bytes)) {
            blob = new Blob([bytes], { type: 'application/pdf' });
        } else if (typeof bytes === 'string') {
            let base64 = bytes;
            if (base64.startsWith('data:')) {
                const parts = base64.split(',');
                base64 = parts[1] || '';
            }
            try {
                const binStr = atob(base64);
                const len = binStr.length;
                const arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    arr[i] = binStr.charCodeAt(i);
                }
                blob = new Blob([arr], { type: 'application/pdf' });
            } catch (e) {
                console.error("Error al decodificar PDF en formato base64", e);
            }
        } else if (bytes && typeof bytes === 'object') {
            if (bytes.type === 'Buffer' && Array.isArray(bytes.data)) {
                blob = new Blob([new Uint8Array(bytes.data)], { type: 'application/pdf' });
            } else if (Array.isArray(bytes)) {
                blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
            } else {
                try {
                    const vals = Object.keys(bytes)
                        .filter(k => !isNaN(k))
                        .sort((a,b) => Number(a) - Number(b))
                        .map(k => bytes[k]);
                    if (vals.length > 0) {
                        blob = new Blob([new Uint8Array(vals)], { type: 'application/pdf' });
                    }
                } catch (e) {
                    console.error("Error al procesar objeto de bytes del PDF", e);
                }
            }
        }

        if (!blob) {
            alert("No se pudo previsualizar el PDF: el formato del archivo es inválido o está corrupto.");
            return;
        }

        this._pdfBlobUrl = URL.createObjectURL(blob);

        const iframe = document.getElementById('pdf-iframe');
        const fallback = document.getElementById('pdf-mobile-fallback');
        const pdfViewerEnabled = navigator.pdfViewerEnabled || false;

        if (pdfViewerEnabled) {
            if (iframe) {
                iframe.style.display = 'block';
                iframe.src = this._pdfBlobUrl;
            }
            if (fallback) fallback.style.display = 'none';
        } else {
            if (iframe) {
                iframe.style.display = 'none';
                iframe.src = '';
            }
            if (fallback) {
                fallback.style.display = 'flex';
                const fallbackBtn = document.getElementById('btn-pdf-fallback-open');
                if (fallbackBtn) {
                    fallbackBtn.onclick = () => window.open(this._pdfBlobUrl, '_blank');
                }
            } else {
                window.open(this._pdfBlobUrl, '_blank');
                return;
            }
        }

        const titleEl = document.getElementById('pdf-viewer-title');
        if (titleEl) titleEl.textContent = item.title || 'Documento';

        // Enlazar botón de apertura en nueva pestaña
        const openTabBtn = document.getElementById('btn-pdf-open-tab');
        if (openTabBtn) {
            openTabBtn.onclick = () => window.open(this._pdfBlobUrl, '_blank');
        }

        const panel = document.getElementById('pdf-viewer-panel');
        if (panel) panel.style.display = 'flex';
        this._pdfViewerOpen = true;
    },

    closePDFViewer() {
        const panel = document.getElementById('pdf-viewer-panel');
        if (panel) panel.style.display = 'none';
        const iframe = document.getElementById('pdf-iframe');
        if (iframe) iframe.src = '';
        this._pdfViewerOpen = false;
        // NOTA: No revocamos URL.revokeObjectURL(this._pdfBlobUrl) inmediatamente
        // para permitir que siga cargada si el usuario la abrió en una pestaña externa.
        // Será revocada al abrir el siguiente PDF.
    },

    async openYouTube(libraryItemId) {
        const item = await this.data.getLibraryItem(libraryItemId);
        if (!item || !item.url) return;
        window.open(item.url, '_blank');
    },

    _buildYouTubeEmbedUrl(url) {
        try {
            const u = new URL(url);
            const origin = encodeURIComponent(location.origin);

            // Playlist sin video específico
            const listId = u.searchParams.get('list');
            const videoId = u.searchParams.get('v')
                || url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)?.[1]
                || url.match(/\/shorts\/([A-Za-z0-9_-]{11})/)?.[1]
                || url.match(/\/embed\/([A-Za-z0-9_-]{11})/)?.[1];

            if (videoId && listId) {
                return `https://www.youtube.com/embed/${videoId}?list=${listId}&autoplay=1&origin=${origin}`;
            }
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&origin=${origin}`;
            }
            if (listId) {
                return `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1&origin=${origin}`;
            }
            return null;
        } catch {
            return null;
        }
    },

    closeYouTubeViewer() {
        document.getElementById('yt-viewer-panel').style.display = 'none';
        document.getElementById('yt-player-wrap').innerHTML = '';
        document.getElementById('yt-embed-error').style.display = 'none';
    },

    async openSpotify(libraryItemId) {
        const item = await this.data.getLibraryItem(libraryItemId);
        if (!item || !item.url) return;
        window.open(item.url, '_blank');
    },

    startStepTimer(stepIndex) {
        if (this.activeTimerStep !== null && this.activeTimerStep !== stepIndex) {
            this.pauseStepTimer(this.activeTimerStep);
        }

        const timerId = stepIndex - 1;
        if (this.timerIntervals[timerId]) return;

        this.activeTimerStep = stepIndex;

        // Timer único de práctica (Fase B): la meta es motivacional, el tiempo sigue contando después
        this.timerIntervals[timerId] = setInterval(() => {
            this.timerSeconds[timerId]++;
            if (this.timerSeconds[timerId] === this._getPracticeGoal() * 60) this.playTimerAlert();
            this.updateTimerDisplay(stepIndex);

            if (this.timerSeconds[timerId] % 30 === 0) {
                this.savePracticeProgress();
            }
        }, 1000);

        const btn = document.getElementById("btn-cat-timer-toggle");
        if (btn) btn.textContent = '⏸ Pausar';
    },

    pauseStepTimer(stepIndex) {
        const timerId = stepIndex - 1;
        if (this.timerIntervals[timerId]) {
            clearInterval(this.timerIntervals[timerId]);
            this.timerIntervals[timerId] = null;
        }
        if (this.activeTimerStep === stepIndex) {
            this.activeTimerStep = null;
        }

        const btn = document.getElementById("btn-cat-timer-toggle");
        if (btn) {
            const timerSecs = this.timerSeconds[timerId] || 0;
            btn.textContent = timerSecs > 0 ? '▶ Continuar' : '▶ Iniciar';
        }

        this.savePracticeProgress();
    },

    toggleTimer(stepIndex) {
        const timerId = stepIndex - 1;
        if (this.timerIntervals[timerId]) {
            this.pauseStepTimer(stepIndex);
        } else {
            this.startStepTimer(stepIndex);
        }
    },

    resetTimer(stepIndex) {
        const timerId = stepIndex - 1;
        this.pauseStepTimer(stepIndex);
        this.timerSeconds[timerId] = 0;
        this.updateTimerDisplay(stepIndex);
    },

    updateTimerDisplay(stepIndex) {
        const timerId = stepIndex - 1;
        const totalSecs = this.timerSeconds[timerId];

        const goalMins = this._getPracticeGoal();
        const goalSecs = goalMins * 60;

        const remainingSecs = Math.max(0, goalSecs - totalSecs);
        const minutes = Math.floor(remainingSecs / 60);
        const seconds = remainingSecs % 60;
        const displayStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const practiceDisplay = document.querySelector(".practice-ring-time");
        if (practiceDisplay) {
            practiceDisplay.textContent = displayStr;

            const circle = document.querySelector(".practice-ring-wrap svg circle:nth-child(2)");
            if (circle) {
                const r = 80;
                const circ = +(2 * Math.PI * r).toFixed(1);
                const dashOffset = +(circ * (1 - Math.min(totalSecs / goalSecs, 1))).toFixed(1);
                circle.setAttribute("stroke-dashoffset", dashOffset);
            }

            const label = document.querySelector(".practice-ring-label");
            if (label) label.textContent = totalSecs >= goalSecs ? '¡Meta!' : 'meta ' + goalMins + ' min';

            const timerBtn = document.getElementById("btn-cat-timer-toggle");
            if (timerBtn) {
                const isTimerRunning = !!this.timerIntervals[timerId];
                timerBtn.textContent = isTimerRunning ? '⏸ Pausar' : (totalSecs > 0 ? '▶ Continuar' : '▶ Iniciar');
            }
        }
    },

    async savePracticeProgress() {
        const todayStr = this.getTodayString();
        const totalSeconds = this.timerSeconds[0] || 0;

        if (totalSeconds > 0) {
            try {
                const logData = { entries: [{ category: 'practica', seconds: totalSeconds }], totalSeconds };
                if (this.activeProfile) {
                    logData.profileId = this.activeProfile.id;
                }
                await this.data.savePracticeLog(todayStr, logData);
            } catch (e) {
                console.warn('Error saving practice log:', e);
            }
        }
    },

    getTodayTotalSeconds() {
        return this.timerSeconds.reduce((sum, s) => sum + s, 0);
    },

    playTimerAlert() {
        const alertAudio = document.getElementById("audio-tick");
        if (alertAudio) {
            alertAudio.play().catch(() => {});
        }
    },

    // Día practicado = TODOS los pasos de la rutina completados (Fase B)
    finalizeDailyPractice() {
        const todayStr = this.getTodayString();

        this.pauseStepTimer(1);
        this.savePracticeProgress();
        
        if (this.lastPracticedDate !== todayStr) {
            this.streak++;
            this.lastPracticedDate = todayStr;
            
            // Añadir al historial si no existe
            if (!this.history.includes(todayStr)) {
                this.history.push(todayStr);
            }
            
            this.saveStreak();
            this.renderHeatmap();
            
            // Celebración con toast
            this.showToast(TRANSLATIONS[this.lang]["practice-complete-congrats"], '🔥');
        } else {
            this.showToast(
                this.lang === "es"
                    ? "¡Rutina completada de nuevo! Ya habías registrado tu práctica de hoy."
                    : "Routine completed again! You already registered your practice today.",
                '✓'
            );
        }
        
        this.navigateToView("studio");
    },

    renderHeatmap() {
        const grid = document.getElementById("heatmap-grid");
        if (!grid) return;
        grid.innerHTML = "";
        
        const today = new Date();
        // Mostrar los últimos 30 días
        for (let i = 29; i >= 0; i--) {
            const day = new Date();
            day.setDate(today.getDate() - i);
            
            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const date = String(day.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${date}`;
            
            const dayEl = document.createElement("div");
            dayEl.className = "heatmap-day";
            
            if (this.history.includes(dateStr)) {
                dayEl.classList.add("completed");
            }
            if (dateStr === this.getTodayString()) {
                dayEl.classList.add("today");
            }
            
            // Tooltip sencillo para el usuario
            dayEl.title = `${day.toLocaleDateString(this.lang === "es" ? "es-ES" : "en-US")} - ${this.history.includes(dateStr) ? 'Practicado' : 'No practicado'}`;
            
            grid.appendChild(dayEl);
        }
    },

    async renderMyLibraryView() {
        const container = document.getElementById("view-my-library");
        if (!container) return;

        try {
            if (!this.activeProfile) {
                container.innerHTML = `<p class="text-muted" style="padding:24px">Seleccioná un perfil de alumno para ver tu biblioteca.</p>`;
                return;
            }

        const [allItems, allWeekItems, profileWeeks] = await Promise.all([
            this.data.getLibraryItems(),
            this.data.getAllWeekItems(),
            this.data.getProfileWeeks(this.activeProfile.id),
        ]);

        // 1. Obtener ítems asignados por semanas de práctica
        const assignedWeekIds = new Set(profileWeeks.map(pw => pw.weekId));
        const assignedItemIds = new Set(
            allWeekItems.filter(wi => assignedWeekIds.has(wi.weekId)).map(wi => wi.libraryItemId)
        );

        // 2. Obtener ítems asignados a través de clases/sesiones del alumno (personales o de cursos)
        const studentGroupIds = new Set(
            this.data.getAllGroups()
                .filter(g => (g.memberIds || []).includes(this.activeProfile.id))
                .map(g => g.id)
        );

        const assignedClasses = this.data.getAllClases().filter(clase => {
            if (clase.memberOverride != null) {
                return clase.memberOverride.includes(this.activeProfile.id);
            }
            return clase.groupId === `grp-personal-${this.activeProfile.id}` || studentGroupIds.has(clase.groupId);
        });

        const classItemIds = new Set();
        assignedClasses.forEach(clase => {
            (clase.content || []).forEach(item => {
                const libId = this._pasoLibId(item);
                if (libId) classItemIds.add(libId);
            });
        });

        // 3. Unir ambos conjuntos de IDs asignados
        const allAssignedIds = new Set([...assignedItemIds, ...classItemIds]);

        const assignedItems = allItems.filter(i => allAssignedIds.has(i.id) && !i.uploadedBy);
        const myUploadedItems = allItems.filter(i => i.uploadedBy === this.activeProfile.id);

        const searchVal = (this._myLibSearch || '').toLowerCase().trim();
        const matchesSearch = (item) => {
            if (!searchVal) return true;
            return String(item.title || '').toLowerCase().includes(searchVal) ||
                   String(item.category || '').toLowerCase().includes(searchVal) ||
                   String(item.level || '').toLowerCase().includes(searchVal) ||
                   String(item.style || '').toLowerCase().includes(searchVal);
        };

        const generalAssignedItems = assignedItems.filter(it => !classItemIds.has(it.id));
        const filteredGeneralAssigned = generalAssignedItems.filter(matchesSearch);

        // Separar cargas del alumno por clase
        const uploadsByClass = {};
        myUploadedItems.forEach(it => {
            if (it.claseId) {
                if (!uploadsByClass[it.claseId]) uploadsByClass[it.claseId] = [];
                uploadsByClass[it.claseId].push(it);
            }
        });
        const generalUploads = myUploadedItems.filter(it => !it.claseId);

        // Clases con contenido
        const classesWithContent = assignedClasses
            .filter(c => (c.content && c.content.length > 0) || (uploadsByClass[c.id] && uploadsByClass[c.id].length > 0))
            .sort((a, b) => {
                // finalizadaAt es epoch ms (número) y date es 'YYYY-MM-DD' — normalizar a timestamp
                const ts = c => c.finalizadaAt ? new Date(c.finalizadaAt).getTime() : (c.date ? new Date(c.date + 'T12:00').getTime() : 0);
                return ts(b) - ts(a);
            });

        // Generar HTML de las clases
        const classesHtml = classesWithContent.map(clase => {
            const resolvedTeacherItems = (clase.content || []).map(c => {
                const libItem = allItems.find(it => it.id === this._pasoLibId(c));
                if (!libItem) return null;
                return { ...libItem, category: c.cat || libItem.category };
            }).filter(Boolean);
            const filteredTeacher = resolvedTeacherItems.filter(matchesSearch);
            const filteredStudent = (uploadsByClass[clase.id] || []).filter(matchesSearch);

            // Si hay búsqueda y no coincide nada, no mostrar la clase
            if (searchVal && !filteredTeacher.length && !filteredStudent.length) {
                return '';
            }

            const teacherItemsHtml = filteredTeacher.map(it => {
                const color = this._bibCatColor(it.category || '');
                return `
                    <div onclick="app.openLibraryItemById('${it.id}')" style="cursor:pointer; display:flex; align-items:center; gap:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); padding:8px 12px; border-radius:6px; transition: border-color 0.1s" onmouseover="this.style.borderColor='var(--tb-border-hover)'" onmouseout="this.style.borderColor='var(--tb-border)'">
                        <span class="bib-type-icon" style="background:${color}1f; color:${color}; width:20px; height:20px; font-size:10px">${this._bibTypeIcon(it.type)}</span>
                        <span style="font-size:13px; font-weight:500; color:var(--tb-text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap">${this._escapeHtml(it.title)}</span>
                        <span style="font-size:10px; color:var(--tb-text-muted); background:color-mix(in srgb, var(--tb-text-primary) 10%, transparent); padding:2px 6px; border-radius:4px; margin-left:auto; flex-shrink:0">${this._escapeHtml(it.category || 'Material')}</span>
                    </div>
                `;
            }).join('') || '<p style="font-size:12px; color:var(--tb-text-muted); margin:0; font-style:italic">Sin material asignado por el docente.</p>';

            const studentItemsHtml = filteredStudent.map(it => {
                const color = this._bibCatColor(it.category || '');
                return `
                    <div onclick="app.openLibraryItemById('${it.id}')" style="cursor:pointer; display:flex; align-items:center; gap:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); padding:8px 12px; border-radius:6px; transition: border-color 0.1s" onmouseover="this.style.borderColor='var(--tb-border-hover)'" onmouseout="this.style.borderColor='var(--tb-border)'">
                        <span class="bib-type-icon" style="background:${color}1f; color:${color}; width:20px; height:20px; font-size:10px">${this._bibTypeIcon(it.type)}</span>
                        <div style="flex:1; min-width:0">
                            <div style="font-size:13px; font-weight:500; color:var(--tb-text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap">${this._escapeHtml(it.title)}</div>
                            ${it.observation ? `<div style="font-size:11px; color:var(--tb-text-secondary); margin-top:2px; font-style:italic; text-overflow:ellipsis; overflow:hidden; white-space:nowrap">"${this._escapeHtml(it.observation)}"</div>` : ''}
                        </div>
                        <button onclick="event.stopPropagation(); app.deleteStudentUpload('${it.id}')" style="background:none; border:none; color:var(--tb-accent); cursor:pointer; font-size:16px; font-weight:bold; padding:0 4px; line-height:1" title="Eliminar">×</button>
                    </div>
                `;
            }).join('') || '<p style="font-size:12px; color:var(--tb-text-muted); margin:0; font-style:italic">Sin consultas subidas.</p>';

            return `
                <div style="background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:10px; padding:16px; margin-bottom:16px">
                    <div style="font-weight:600; font-size:14px; color:var(--tb-text-primary); border-bottom:1px solid var(--tb-border); padding-bottom:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center">
                        <span>📚 Clase: ${this._escapeHtml(clase.title || 'Clase')}</span>
                        <span style="font-size:11px; font-weight:normal; color:var(--tb-text-muted)">${clase.date}</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px">
                        <div>
                            <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--tb-text-muted); margin-bottom:8px">Asignado por el Docente</div>
                            <div style="display:flex; flex-direction:column; gap:6px">${teacherItemsHtml}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--tb-text-muted); margin-bottom:8px">Mis subidas / Consultas</div>
                            <div style="display:flex; flex-direction:column; gap:6px">${studentItemsHtml}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        let generalUploadsCardHtml = '';
        const filteredGeneralUploads = generalUploads.filter(matchesSearch);
        if (filteredGeneralUploads.length > 0 || (generalUploads.length > 0 && !searchVal)) {
            const generalStudentItemsHtml = filteredGeneralUploads.map(it => {
                const color = this._bibCatColor(it.category || '');
                return `
                    <div onclick="app.openLibraryItemById('${it.id}')" style="cursor:pointer; display:flex; align-items:center; gap:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); padding:8px 12px; border-radius:6px; transition: border-color 0.1s" onmouseover="this.style.borderColor='var(--tb-border-hover)'" onmouseout="this.style.borderColor='var(--tb-border)'">
                        <span class="bib-type-icon" style="background:${color}1f; color:${color}; width:20px; height:20px; font-size:10px">${this._bibTypeIcon(it.type)}</span>
                        <div style="flex:1; min-width:0">
                            <div style="font-size:13px; font-weight:500; color:var(--tb-text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap">${this._escapeHtml(it.title)}</div>
                            ${it.observation ? `<div style="font-size:11px; color:var(--tb-text-secondary); margin-top:2px; font-style:italic; text-overflow:ellipsis; overflow:hidden; white-space:nowrap">"${this._escapeHtml(it.observation)}"</div>` : ''}
                        </div>
                        <button onclick="event.stopPropagation(); app.deleteStudentUpload('${it.id}')" style="background:none; border:none; color:var(--tb-accent); cursor:pointer; font-size:16px; font-weight:bold; padding:0 4px; line-height:1" title="Eliminar">×</button>
                    </div>
                `;
            }).join('') || '<p style="font-size:12px; color:var(--tb-text-muted); margin:0; font-style:italic">Sin consultas generales.</p>';

            generalUploadsCardHtml = `
                <div style="background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:10px; padding:16px; margin-bottom:16px">
                    <div style="font-weight:600; font-size:14px; color:var(--tb-text-primary); border-bottom:1px solid var(--tb-border); padding-bottom:8px; margin-bottom:12px">
                        <span>💬 Consultas fuera de clase / Generales</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px">${generalStudentItemsHtml}</div>
                </div>
            `;
        }

        let switcherHtml = `
            <div class="my-lib-view-switcher" style="display:flex; gap:8px; align-items:center">
                <button class="btn ${this._myLibViewMode === 'clases' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="app.myLibSetViewMode('clases')" style="font-size:12px; padding:6px 12px; font-weight:600; font-family:var(--font-primary)">📅 Vista por Clases</button>
                <button class="btn ${this._myLibViewMode === 'catalogo' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="app.myLibSetViewMode('catalogo')" style="font-size:12px; padding:6px 12px; font-weight:600; font-family:var(--font-primary)">🗂 Vista de Catálogo</button>
            </div>
        `;

        let leftColHtml = '';
        if (this._myLibViewMode === 'catalogo') {
            leftColHtml = `
                <!-- Sector 1: Contenido Asignado por el Docente -->
                <div style="margin-bottom:28px">
                    <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center">
                        <span>Material asignado por el docente</span>
                        <span class="bib-item-count" style="font-size:12px; font-weight:normal; color:var(--tb-text-muted)">${assignedItems.length} ítem${assignedItems.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="bib-table-wrap">
                        ${this._bibRenderTable(this._bibFilterItems(assignedItems, true), allItems, true)}
                    </div>
                </div>

                <!-- Sector 2: Mis Subidas / Consultas -->
                <div>
                    <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center">
                        <span>Mis subidas / Consultas</span>
                        <span class="bib-item-count" style="font-size:12px; font-weight:normal; color:var(--tb-text-muted)">${myUploadedItems.length} ítem${myUploadedItems.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="bib-table-wrap">
                        ${this._renderStudentUploadsTable(myUploadedItems)}
                    </div>
                </div>
            `;
        } else {
            leftColHtml = `
                <!-- Sector 1: Material General (Práctica Semanal) -->
                ${filteredGeneralAssigned.length > 0 || (generalAssignedItems.length > 0 && !searchVal) ? `
                <div style="margin-bottom:24px">
                    <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center">
                        <span>Material General de Práctica</span>
                    </div>
                    <div class="bib-table-wrap">
                        ${this._bibRenderTable(filteredGeneralAssigned, allItems, true)}
                    </div>
                </div>
                ` : ''}

                <!-- Sector 2: Contenido Organizado por Clases -->
                <div>
                    <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px">Mi Contenido por Clases</div>
                    ${classesHtml || generalUploadsCardHtml ? `
                        <div>
                            ${classesHtml}
                            ${generalUploadsCardHtml}
                        </div>
                    ` : `
                        <div style="padding:32px; text-align:center; color:var(--tb-text-muted); border:1px dashed var(--tb-border); border-radius:8px; font-size:13px">
                            No hay clases con material asignado o consultas cargadas.
                        </div>
                    `}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="bib-layout">
                <div class="bib-main-area" style="overflow-y:auto; padding:24px 32px 40px 32px; height:100%">
                    
                    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px">
                        <!-- Switcher de Vista -->
                        ${switcherHtml}

                        <!-- Buscador -->
                        <div class="bib-toolbar" style="margin-bottom:0; max-width:320px">
                            <div class="bib-search-wrap" style="width: 100%">
                                <svg class="bib-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                <input type="text" class="bib-search-input" id="my-lib-search-input" placeholder="Buscar material o consultas..." value="${this._myLibSearch.replace(/"/g, '&quot;')}">
                            </div>
                        </div>
                    </div>

                    <!-- Layout de Dos Columnas -->
                    <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:24px">
                        
                        <!-- Columna Izquierda: Alternada por vista -->
                        <div>
                            ${leftColHtml}
                        </div>

                        <!-- Columna Derecha: Zona de Subida de Contenido -->
                        <div>
                            <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px">Subir Consulta / Material</div>
                            <div class="bib-bottom-zone" style="display:block; border-top:none">
                                ${this._bibRenderUploadZone(true)}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        `;
            this._myLibBindEvents();
        } catch (error) {
            console.error("Error en renderMyLibraryView:", error);
            container.innerHTML = `
                <div style="padding: 24px; color: var(--tb-accent); background: rgba(229, 62, 62, 0.1); border: 1px solid var(--tb-accent); border-radius: 8px; margin: 20px">
                    <h3>⚠️ Error en la Biblioteca del Alumno</h3>
                    <p style="font-family: monospace; font-size: 13px; white-space: pre-wrap">${error.stack || error.message || error}</p>
                </div>
            `;
        }
    },

    myLibSetViewMode(mode) {
        this._myLibViewMode = mode;
        this.renderMyLibraryView();
    },

    _renderStudentUploadsTable(items) {
        if (!items.length) {
            return `<div style="padding:20px; text-align:center; color:var(--tb-text-muted); font-size:13px; border:1px dashed var(--tb-border); border-radius:8px">
                No has subido consultas aún. Utilizá la zona de la derecha para cargar.
            </div>`;
        }

        const rows = items.map(it => {
            const color = this._bibCatColor(it.category || '');
            const clickAction = `app.openLibraryItemById('${it.id}')`;
            const dateStr = new Date(it.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
            return `<tr class="bib-row" onclick="${clickAction}">
  <td class="bib-td bib-td-title"><span class="bib-type-icon" style="background:${color}1f; color:${color}">${this._bibTypeIcon(it.type)}</span>${this._escapeHtml(it.title || 'Sin título')}</td>
  <td class="bib-td">${this._bibTypeLabel(it.type)}</td>
  <td class="bib-td" style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-style:italic; color:var(--tb-text-secondary)" title="${this._escapeHtml(it.observation || '')}">${it.observation ? this._escapeHtml(it.observation) : '—'}</td>
  <td class="bib-td">${dateStr}</td>
  <td class="bib-td" style="text-align:right; width:48px; padding-right:12px" onclick="event.stopPropagation()">
    <button class="btn btn-outline btn-sm" style="color:var(--tb-accent); padding:2px 6px; border-color:var(--tb-accent)" onclick="app.deleteStudentUpload('${it.id}')" title="Eliminar">×</button>
  </td>
</tr>`;
        }).join('');

        return `<table class="bib-table">
  <thead>
    <tr>
      <th class="bib-th">Título</th>
      <th class="bib-th">Tipo</th>
      <th class="bib-th">Observación</th>
      <th class="bib-th">Fecha</th>
      <th class="bib-th" style="text-align:right; padding-right:12px">Acción</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
    },

    _myLibBindEvents() {
        const si = document.getElementById('my-lib-search-input');
        if (si && !si.dataset.bound) {
            si.dataset.bound = 'true';
            si.addEventListener('input', async e => {
                this._myLibSearch = e.target.value;
                const caret = e.target.selectionStart;
                await this.renderMyLibraryView();
                // Restaurar foco y posición del cursor: el re-render reemplaza el <input>
                const ni = document.getElementById('my-lib-search-input');
                if (ni) { ni.focus(); try { ni.setSelectionRange(caret, caret); } catch (_) {} }
            });
        }
        const da = document.getElementById('my-bib-droparea');
        if (da && !da.dataset.bound) {
            da.dataset.bound = 'true';
            da.addEventListener('dragover', e => { e.preventDefault(); da.classList.add('bib-drag-over'); });
            da.addEventListener('dragleave', () => da.classList.remove('bib-drag-over'));
            da.addEventListener('drop', e => {
                e.preventDefault();
                da.classList.remove('bib-drag-over');
                Array.from(e.dataTransfer.files).forEach(f => this.bibHandleFileDrop(f, true));
            });
        }
        const fi = document.getElementById('my-bib-file-input');
        if (fi && !fi.dataset.bound) {
            fi.dataset.bound = 'true';
            fi.addEventListener('change', e => {
                Array.from(e.target.files).forEach(f => this.bibHandleFileDrop(f, true));
                fi.value = '';
            });
        }
    },

    myLibToggleColFilter(col, val) {
        const arr = this._myLibColFilters[col];
        const idx = arr.indexOf(val);
        if (idx === -1) arr.push(val); else arr.splice(idx, 1);
        this.renderMyLibraryView();
    },

    async deleteStudentUpload(itemId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este contenido?')) return;
        const notifications = this.data.getNotifications().filter(n => n.itemId !== itemId);
        this.data.saveNotifications(notifications);

        await this.data.deleteLibraryItem(itemId);
        this.showToast('Contenido eliminado', '✓');
        await this.renderMyLibraryView();
    },
});
