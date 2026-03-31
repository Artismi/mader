// Creative OS Extension — Popup Script

const COS_BASE_URL = 'http://localhost:3000';

const loadingEl = document.getElementById('loading');
const authView = document.getElementById('auth-view');
const tasksView = document.getElementById('tasks-view');
const statusDot = document.getElementById('status-dot');
const tasksList = document.getElementById('tasks-list');
const userEmailEl = document.getElementById('user-email');
const quickInput = document.getElementById('quick-input');
const quickSubmit = document.getElementById('quick-submit');
const btnLogin = document.getElementById('btn-login');
const btnOpenPortal = document.getElementById('btn-open-portal');

function show(view) {
    loadingEl.style.display = 'none';
    authView.style.display = 'none';
    tasksView.style.display = 'none';
    if (view === 'loading') loadingEl.style.display = '';
    else if (view === 'auth') authView.style.display = '';
    else if (view === 'tasks') tasksView.style.display = '';
}

// Initialize popup
async function init() {
    show('loading');

    chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, ({ token }) => {
        if (!token) {
            statusDot.classList.add('offline');
            show('auth');
            return;
        }

        statusDot.classList.remove('offline');
        loadTasks();
    });
}

function loadTasks() {
    show('loading');

    chrome.runtime.sendMessage({ type: 'GET_TASKS' }, ({ tasks, error }) => {
        if (error === 'Non autenticato' || !tasks) {
            show('auth');
            return;
        }

        show('tasks');
        renderTasks(tasks || []);
    });
}

function renderTasks(tasks) {
    const pending = tasks.filter(t => t.status !== 'done').slice(0, 8);
    const now = Date.now();

    if (pending.length === 0) {
        tasksList.innerHTML = '<div class="empty">Nessun task attivo 🎉</div>';
        return;
    }

    tasksList.innerHTML = pending.map(task => {
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const isOverdue = deadline && deadline.getTime() < now;
        const deadlineStr = deadline
            ? deadline.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
            : '';

        return `
            <div class="task-item">
                <div class="task-dot ${isOverdue ? 'overdue' : ''}"></div>
                <div class="task-info">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    ${deadlineStr ? `<div class="task-meta ${isOverdue ? 'overdue' : ''}">${isOverdue ? '⚠ ' : ''}${deadlineStr}${task.clients?.name ? ` · ${escapeHtml(task.clients.name)}` : ''}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Auth buttons
btnLogin.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOGIN' }, ({ success }) => {
        if (success) loadTasks();
        else chrome.tabs.create({ url: `${COS_BASE_URL}/login` });
    });
});

btnOpenPortal.addEventListener('click', () => {
    chrome.tabs.create({ url: COS_BASE_URL });
});

// Quick add
quickSubmit.addEventListener('click', submitQuickTask);
quickInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitQuickTask();
});

function submitQuickTask() {
    const title = quickInput.value.trim();
    if (!title) return;

    quickSubmit.textContent = '…';
    quickSubmit.disabled = true;

    chrome.runtime.sendMessage({ type: 'CREATE_TASK', title }, ({ success }) => {
        quickSubmit.textContent = success ? '✓' : '!';
        quickInput.value = '';
        setTimeout(() => {
            quickSubmit.textContent = '+';
            quickSubmit.disabled = false;
            if (success) loadTasks();
        }, 1200);
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Start
init();
