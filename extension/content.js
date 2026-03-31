// Creative OS Extension — Content Script
// Iniettato in: Canva, Google Drive, Gmail, Figma/FigJam

(function () {
    'use strict';

    if (document.getElementById('cos-panel')) return;

    const host = location.hostname;
    let pageContext = 'unknown';
    if (host.includes('canva.com')) pageContext = 'canva';
    else if (host.includes('drive.google.com')) pageContext = 'drive';
    else if (host.includes('mail.google.com')) pageContext = 'gmail';
    else if (host.includes('figma.com')) pageContext = 'figma';

    const contextLabel = { canva: 'Canva', drive: 'Drive', gmail: 'Gmail', figma: 'FigJam', unknown: 'Web' };

    // ── DOM ───────────────────────────────────────────────────────��────────────
    const panel = document.createElement('div');
    panel.id = 'cos-panel';
    panel.innerHTML = `
        <div id="cos-toggle" title="Creative OS">
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="3" fill="white"/>
                <circle cx="8" cy="3" r="1.5" fill="white"/>
                <circle cx="8" cy="13" r="1.5" fill="white"/>
                <circle cx="3" cy="8" r="1.5" fill="white"/>
                <circle cx="13" cy="8" r="1.5" fill="white"/>
            </svg>
        </div>
        <div id="cos-drawer" class="cos-hidden">
            <div class="cos-header">
                <span class="cos-logo">Creative OS</span>
                <span class="cos-context-badge">${contextLabel[pageContext]}</span>
            </div>
            <div id="cos-body" class="cos-body"></div>
            <div class="cos-quick-add">
                <input id="cos-task-input" type="text" placeholder="Nuovo task rapido…" />
                <button id="cos-task-submit" title="Aggiungi">+</button>
            </div>
            <div class="cos-footer">
                <a href="http://localhost:3000" target="_blank">Apri Creative OS →</a>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    const toggle = document.getElementById('cos-toggle');
    const drawer = document.getElementById('cos-drawer');
    const body = document.getElementById('cos-body');
    const taskInput = document.getElementById('cos-task-input');
    const taskSubmit = document.getElementById('cos-task-submit');
    let isOpen = false;

    toggle.addEventListener('click', () => {
        isOpen = !isOpen;
        drawer.classList.toggle('cos-hidden', !isOpen);
        if (isOpen) loadContent();
    });

    document.addEventListener('click', (e) => {
        if (isOpen && !panel.contains(e.target)) {
            isOpen = false;
            drawer.classList.add('cos-hidden');
        }
    });

    // ── AUTH CHECK ─────────────────────────────────────────────────────────────
    function loadContent() {
        chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, ({ token }) => {
            if (!token) { renderAuthPrompt(); return; }
            renderContextContent();
        });
    }

    function renderAuthPrompt() {
        body.innerHTML = `
            <div class="cos-auth-prompt">
                <p class="cos-auth-text">Accedi per usare Creative OS su questo sito.</p>
                <button class="cos-auth-btn" id="cos-login-btn">Accedi a Creative OS</button>
            </div>`;
        document.getElementById('cos-login-btn').addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'LOGIN' }, ({ success }) => {
                if (success) renderContextContent();
                else window.open('http://localhost:3000/login', '_blank');
            });
        });
    }

    // ── CONTEXT RENDERING ────────────────────────────��─────────────────────────
    function renderContextContent() {
        body.innerHTML = `<div class="cos-empty">Caricamento…</div>`;
        chrome.runtime.sendMessage({ type: 'GET_TASKS' }, ({ tasks, error }) => {
            if (error === 'Non autenticato') { renderAuthPrompt(); return; }

            switch (pageContext) {
                case 'canva': renderCanva(tasks || []); break;
                case 'drive': renderDrive(tasks || []); break;
                case 'gmail': renderGmail(tasks || []); break;
                case 'figma': renderFigma(tasks || []); break;
                default: renderGeneric(tasks || []); break;
            }
        });
    }

    // ── CANVA ────────────────���────────────────────────────────────��────────────
    function renderCanva(tasks) {
        const pending = tasks.filter(t => t.status !== 'done').slice(0, 4);
        body.innerHTML = `
            <p class="cos-section-title">Task design attivi</p>
            ${pending.filter(t => t.type === 'design' || t.type === 'social').map(renderTask).join('') || '<div class="cos-empty">Nessun task design</div>'}
            ${pending.filter(t => t.type !== 'design' && t.type !== 'social').length > 0 ? `
                <p class="cos-section-title" style="margin-top:12px">Altri task</p>
                ${pending.filter(t => t.type !== 'design' && t.type !== 'social').map(renderTask).join('')}
            ` : ''}
            <div class="cos-brand-hint">
                <p class="cos-section-title" style="margin-top:12px">Suggerimento</p>
                <p style="font-size:10px;color:rgba(255,255,255,0.3)">Seleziona il soggetto attivo nel portale per caricare il brand kit automaticamente.</p>
                <a href="http://localhost:3000" target="_blank" class="cos-auth-btn" style="margin-top:8px;display:inline-block;font-size:10px;padding:5px 10px">Apri portale →</a>
            </div>
        `;
    }

    // ── DRIVE ──────────────────────────────��─────────────────────────────────��─
    function renderDrive(tasks) {
        const pending = tasks.filter(t => t.status !== 'done').slice(0, 5);
        body.innerHTML = `
            <p class="cos-section-title">Task aperti</p>
            ${pending.length ? pending.map(renderTask).join('') : '<div class="cos-empty">Nessun task attivo</div>'}
            <div style="margin-top:12px">
                <p class="cos-section-title">Azioni rapide</p>
                <a href="http://localhost:3000/assets" target="_blank" style="display:block;font-size:10px;color:rgba(124,58,237,0.8);text-decoration:none;padding:4px 0">→ Asset Library</a>
                <a href="http://localhost:3000/clienti" target="_blank" style="display:block;font-size:10px;color:rgba(124,58,237,0.8);text-decoration:none;padding:4px 0">→ Vault clienti</a>
            </div>
        `;
    }

    // ── GMAIL ──────────────────────────────────────────────────────────────────
    function renderGmail(tasks) {
        // Tenta di estrarre il mittente dall'email aperta
        const fromEl = document.querySelector('[email]') || document.querySelector('.gD');
        const senderEmail = fromEl?.getAttribute('email') || fromEl?.getAttribute('data-hovercard-id') || '';

        const matchingTasks = senderEmail
            ? tasks.filter(t => t.status !== 'done' && t.clients?.name &&
                senderEmail.toLowerCase().includes(t.clients.name.toLowerCase().split(' ')[0]))
            : [];

        body.innerHTML = `
            ${matchingTasks.length > 0 ? `
                <p class="cos-section-title">Incarichi collegati al mittente</p>
                ${matchingTasks.map(renderTask).join('')}
            ` : ''}
            <p class="cos-section-title" style="${matchingTasks.length ? 'margin-top:12px' : ''}">Tutti i task aperti</p>
            ${tasks.filter(t => t.status !== 'done').slice(0, 5).map(renderTask).join('') || '<div class="cos-empty">Nessun task attivo</div>'}
            <div style="margin-top:12px">
                <button id="cos-create-from-email" class="cos-auth-btn" style="font-size:10px;padding:5px 10px">+ Crea incarico da email</button>
            </div>
        `;

        document.getElementById('cos-create-from-email')?.addEventListener('click', () => {
            const subject = document.querySelector('.hP')?.textContent || '';
            taskInput.value = subject ? `Risposta a: ${subject}` : '';
            taskInput.focus();
        });
    }

    // ── FIGMA ──────────────────────────────────────────────────────────────────
    function renderFigma(tasks) {
        const pending = tasks.filter(t => t.status !== 'done').slice(0, 4);
        body.innerHTML = `
            <p class="cos-section-title">Task design attivi</p>
            ${pending.length ? pending.map(renderTask).join('') : '<div class="cos-empty">Nessun task attivo</div>'}
            <div style="margin-top:12px">
                <p class="cos-section-title">Azioni FigJam</p>
                <a href="http://localhost:3000" target="_blank" style="display:block;font-size:10px;color:rgba(124,58,237,0.8);text-decoration:none;padding:4px 0">→ Genera schema dal Co-Pilot</a>
                <a href="http://localhost:3000/clienti" target="_blank" style="display:block;font-size:10px;color:rgba(124,58,237,0.8);text-decoration:none;padding:4px 0">→ Vault cliente attivo</a>
            </div>
        `;
    }

    // ── GENERIC ────────────────────────────────────────────────────────────────
    function renderGeneric(tasks) {
        const pending = tasks.filter(t => t.status !== 'done').slice(0, 6);
        const now = Date.now();
        body.innerHTML = `
            <p class="cos-section-title">Task in sospeso</p>
            ${pending.length ? pending.map(renderTask).join('') : '<div class="cos-empty">Nessun task attivo 🎉</div>'}
        `;
    }

    // ── RENDER TASK ITEM ──────────────────────────��────────────────────────────
    function renderTask(task) {
        const now = Date.now();
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const isOverdue = deadline && deadline.getTime() < now;
        const deadlineStr = deadline
            ? deadline.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
            : '';
        return `
            <div class="cos-task">
                <div class="cos-task-dot ${isOverdue ? 'overdue' : ''}"></div>
                <div>
                    <div class="cos-task-title">${escapeHtml(task.title)}</div>
                    ${deadlineStr ? `<div class="cos-task-meta ${isOverdue ? 'overdue' : ''}">${isOverdue ? '⚠ ' : ''}${deadlineStr}${task.clients?.name ? ` · ${escapeHtml(task.clients.name)}` : ''}</div>` : ''}
                </div>
            </div>
        `;
    }

    // ── QUICK ADD ──────────────────────────────────────────────────────────────
    taskSubmit.addEventListener('click', submitTask);
    taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitTask(); });

    function submitTask() {
        const title = taskInput.value.trim();
        if (!title) return;
        taskSubmit.textContent = '…';
        taskSubmit.disabled = true;
        chrome.runtime.sendMessage({ type: 'CREATE_TASK', title }, ({ success }) => {
            taskSubmit.textContent = success ? '✓' : '!';
            setTimeout(() => { taskSubmit.textContent = '+'; taskSubmit.disabled = false; }, 1500);
            if (success) { taskInput.value = ''; setTimeout(renderContextContent, 500); }
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
