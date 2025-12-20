/**
 * Lux-Meble Admin Panel
 * Zarządzanie zapytaniami klientów
 */

// =====================
// KONFIGURACJA SUPABASE
// =====================
// Uzupełnij poniższe dane po utworzeniu projektu na supabase.com
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Hasło do panelu admin (zmień na własne!)
const ADMIN_PASSWORD = 'luxmeble2024';

// =====================
// INICJALIZACJA
// =====================

let supabaseClient = null;
let submissions = [];
let currentFilter = 'all';
let currentSubmission = null;

// Sprawdź czy Supabase jest skonfigurowany
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
           SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

// Inicjalizacja Supabase
function initSupabase() {
    if (isSupabaseConfigured() && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    }
    return false;
}

// =====================
// AUTORYZACJA
// =====================

function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    if (isLoggedIn) {
        showAdminPanel();
    }
}

function login(password) {
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_logged_in', 'true');
        showAdminPanel();
        return true;
    }
    return false;
}

function logout() {
    sessionStorage.removeItem('admin_logged_in');
    location.reload();
}

function showAdminPanel() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.add('active');

    if (!isSupabaseConfigured()) {
        document.getElementById('setup-notice').classList.remove('hidden');
        showDemoData();
    } else {
        document.getElementById('setup-notice').classList.add('hidden');
        loadSubmissions();
    }
}

function hideSetupNotice() {
    document.getElementById('setup-notice').classList.add('hidden');
}

// =====================
// DANE
// =====================

async function loadSubmissions() {
    showLoading(true);

    try {
        const { data, error } = await supabaseClient
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        submissions = data || [];
        renderSubmissions();
        updateStats();
    } catch (error) {
        console.error('Błąd ładowania:', error);
        showDemoData();
    }

    showLoading(false);
}

async function updateSubmissionStatus(id, contacted) {
    if (!supabaseClient) {
        // Demo mode - update local only
        const submission = submissions.find(s => s.id === id);
        if (submission) {
            submission.contacted = contacted;
            renderSubmissions();
            updateStats();
        }
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('submissions')
            .update({ contacted: contacted })
            .eq('id', id);

        if (error) throw error;

        // Update local
        const submission = submissions.find(s => s.id === id);
        if (submission) {
            submission.contacted = contacted;
            renderSubmissions();
            updateStats();
        }
    } catch (error) {
        console.error('Błąd aktualizacji:', error);
    }
}

function showDemoData() {
    // Dane demonstracyjne
    submissions = [
        {
            id: 1,
            name: 'Jan Kowalski',
            email: 'jan.kowalski@example.com',
            phone: '+48 501 234 567',
            message: 'Dzień dobry, jestem zainteresowany zabudową schodów w moim domu. Schody są drewniane, 15 stopni. Proszę o wycenę i termin realizacji.',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            contacted: false
        },
        {
            id: 2,
            name: 'Anna Nowak',
            email: 'anna.nowak@example.com',
            phone: '+48 602 345 678',
            message: 'Chciałabym zamówić szafę wnękową do sypialni. Wymiary: szerokość 280cm, wysokość 260cm. Preferuję białe fronty z lustrami.',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            contacted: true
        },
        {
            id: 3,
            name: 'Piotr Wiśniewski',
            email: 'piotr.w@example.com',
            phone: '+48 503 456 789',
            message: 'Proszę o kontakt w sprawie mebli kuchennych na wymiar. Kuchnia w kształcie litery L, około 12m2.',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            contacted: false
        }
    ];

    renderSubmissions();
    updateStats();
}

// =====================
// RENDEROWANIE
// =====================

function renderSubmissions() {
    const container = document.getElementById('submissions-container');
    const emptyState = document.getElementById('empty-state');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    // Filter submissions
    let filtered = submissions.filter(sub => {
        // Filter by status
        if (currentFilter === 'pending' && sub.contacted) return false;
        if (currentFilter === 'done' && !sub.contacted) return false;

        // Filter by search
        if (searchTerm) {
            const searchable = `${sub.name} ${sub.email} ${sub.phone} ${sub.message}`.toLowerCase();
            if (!searchable.includes(searchTerm)) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    container.innerHTML = filtered.map(sub => `
        <div class="submission-card ${sub.contacted ? 'contacted' : ''}" data-id="${sub.id}">
            <div class="submission-checkbox">
                <label class="checkbox-label" onclick="event.stopPropagation()">
                    <input type="checkbox" ${sub.contacted ? 'checked' : ''}
                           onchange="toggleContacted(${sub.id}, this.checked)">
                    <span class="checkmark"></span>
                </label>
            </div>
            <div class="submission-info">
                <div class="submission-name">${escapeHtml(sub.name)}</div>
                <div class="submission-preview">${escapeHtml(sub.message.substring(0, 100))}${sub.message.length > 100 ? '...' : ''}</div>
            </div>
            <div class="submission-meta">
                <span class="submission-date">${formatDate(sub.created_at)}</span>
                <span class="submission-status ${sub.contacted ? 'done' : 'pending'}">
                    ${sub.contacted ? 'Załatwione' : 'Do oddzwonienia'}
                </span>
            </div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.submission-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            openDetailModal(id);
        });
    });
}

function updateStats() {
    const total = submissions.length;
    const done = submissions.filter(s => s.contacted).length;
    const pending = total - done;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-done').textContent = done;
}

function showLoading(show) {
    document.getElementById('loading-state').style.display = show ? 'block' : 'none';
    document.getElementById('submissions-container').style.display = show ? 'none' : 'block';
}

// =====================
// MODAL SZCZEGÓŁÓW
// =====================

function openDetailModal(id) {
    const submission = submissions.find(s => s.id === id);
    if (!submission) return;

    currentSubmission = submission;

    document.getElementById('modal-title').textContent = submission.name;
    document.getElementById('modal-date').textContent = formatDate(submission.created_at, true);

    document.getElementById('modal-body').innerHTML = `
        <div class="detail-row">
            <div class="detail-label">Email</div>
            <div class="detail-value">
                <a href="mailto:${escapeHtml(submission.email)}">${escapeHtml(submission.email)}</a>
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Telefon</div>
            <div class="detail-value">
                <a href="tel:${submission.phone.replace(/\s/g, '')}">${escapeHtml(submission.phone)}</a>
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Wiadomość</div>
            <div class="detail-value detail-message">${escapeHtml(submission.message)}</div>
        </div>
    `;

    document.getElementById('modal-contacted').checked = submission.contacted;
    document.getElementById('modal-phone-btn').href = `tel:${submission.phone.replace(/\s/g, '')}`;
    document.getElementById('modal-email-btn').href = `mailto:${submission.email}`;

    document.getElementById('detail-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
    document.body.style.overflow = '';
    currentSubmission = null;
}

// =====================
// AKCJE
// =====================

function toggleContacted(id, contacted) {
    updateSubmissionStatus(id, contacted);
}

function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    renderSubmissions();
}

// =====================
// HELPERS
// =====================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString, full = false) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000 && !full) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        if (hours === 0) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes} min temu`;
        }
        return `${hours} godz. temu`;
    }

    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000 && !full) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        if (days === 1) return 'Wczoraj';
        return `${days} dni temu`;
    }

    // Full date
    const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(full && { hour: '2-digit', minute: '2-digit' })
    };
    return date.toLocaleDateString('pl-PL', options);
}

// =====================
// EVENT LISTENERS
// =====================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    initSupabase();

    // Check authentication
    checkAuth();

    // Login form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;

        if (!login(password)) {
            document.getElementById('login-error').textContent = 'Nieprawidłowe hasło';
        }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', () => {
        if (isSupabaseConfigured()) {
            loadSubmissions();
        } else {
            showDemoData();
        }
    });

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            setFilter(tab.dataset.filter);
        });
    });

    // Search
    document.getElementById('search-input').addEventListener('input', () => {
        renderSubmissions();
    });

    // Modal checkbox
    document.getElementById('modal-contacted').addEventListener('change', (e) => {
        if (currentSubmission) {
            toggleContacted(currentSubmission.id, e.target.checked);
        }
    });

    // Close modal on overlay click
    document.getElementById('detail-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeDetailModal();
        }
    });

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDetailModal();
        }
    });
});
