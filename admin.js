/**
 * Lux-Meble Admin Panel
 * Zarządzanie zapytaniami klientów
 */

// =====================
// KONFIGURACJA SUPABASE
// =====================
// Uzupełnij poniższe dane po utworzeniu projektu na supabase.com
const SUPABASE_URL = 'https://tizciyilckwicjexlzgr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6YR_Zq0dMCoMZtvC08c4iw_8H0lT6KZ';

// Hasło do panelu admin (zmień na własne!)
const ADMIN_PASSWORD = 'luxmeble2024';

// =====================
// INICJALIZACJA
// =====================

let supabaseClient = null;
let submissions = [];
let currentFilter = 'all';
let currentSubmission = null;

// Gallery state
let galleryImages = [];
let currentCategory = 'kuchnie';
let imageToDelete = null;

const CATEGORY_NAMES = {
    kuchnie: 'Kuchnie',
    szafy: 'Szafy',
    garderoby: 'Garderoby',
    lazienki: 'Łazienki'
};

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
// GALLERY MANAGEMENT
// =====================

function switchSection(section) {
    // Update tabs
    document.querySelectorAll('.admin-nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`section-${section}`).classList.add('active');

    // Load gallery if switching to it
    if (section === 'gallery') {
        loadGalleryImages();
    }
}

function setCategory(category) {
    currentCategory = category;

    // Update tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });

    // Update header
    document.getElementById('current-category-name').textContent = CATEGORY_NAMES[category];

    // Load images
    loadGalleryImages();
}

async function loadGalleryImages() {
    if (!supabaseClient) {
        showDemoGallery();
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('gallery')
            .select('*')
            .eq('category', currentCategory)
            .order('created_at', { ascending: false });

        if (error) throw error;

        galleryImages = data || [];
        renderGallery();
        updateCategoryCounts();
    } catch (error) {
        console.error('Błąd ładowania galerii:', error);
        showDemoGallery();
    }
}

async function updateCategoryCounts() {
    if (!supabaseClient) return;

    for (const category of Object.keys(CATEGORY_NAMES)) {
        try {
            const { count, error } = await supabaseClient
                .from('gallery')
                .select('*', { count: 'exact', head: true })
                .eq('category', category);

            if (!error) {
                document.getElementById(`count-${category}`).textContent = count || 0;
            }
        } catch (e) {
            console.error(e);
        }
    }
}

function showDemoGallery() {
    // Demo images for display
    galleryImages = [
        { id: 1, url: 'images/kuchania-1.jpg', filename: 'kuchania-1.jpg', category: 'kuchnie' },
        { id: 2, url: 'images/kuchania-2.jpg', filename: 'kuchania-2.jpg', category: 'kuchnie' }
    ].filter(img => img.category === currentCategory);

    renderGallery();

    // Set demo counts
    document.getElementById('count-kuchnie').textContent = '4';
    document.getElementById('count-szafy').textContent = '3';
    document.getElementById('count-garderoby').textContent = '2';
    document.getElementById('count-lazienki').textContent = '4';
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');
    const info = document.getElementById('gallery-info');

    if (galleryImages.length === 0) {
        grid.innerHTML = '';
        grid.style.display = 'none';
        empty.style.display = 'block';
        info.textContent = '0 zdjęć';
        return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';
    info.textContent = `${galleryImages.length} ${galleryImages.length === 1 ? 'zdjęcie' : galleryImages.length < 5 ? 'zdjęcia' : 'zdjęć'}`;

    grid.innerHTML = galleryImages.map(img => `
        <div class="gallery-item" data-id="${img.id}">
            <img src="${img.url}" alt="${img.filename}" loading="lazy">
            <div class="gallery-item-overlay">
                <span class="gallery-item-name">${img.filename}</span>
                <button class="gallery-item-delete" onclick="event.stopPropagation(); confirmDelete(${img.id}, '${img.url}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// File Upload
async function handleFileUpload(files) {
    if (!files || files.length === 0) return;

    const dropzone = document.getElementById('upload-dropzone');
    const progress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    dropzone.style.display = 'none';
    progress.style.display = 'block';

    let uploaded = 0;
    const total = files.length;

    for (const file of files) {
        // Validate file
        if (!file.type.startsWith('image/')) {
            alert(`${file.name} nie jest obrazem`);
            continue;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name} przekracza limit 5MB`);
            continue;
        }

        progressText.textContent = `Przesyłanie ${uploaded + 1}/${total}: ${file.name}`;

        try {
            await uploadImage(file);
            uploaded++;
            progressFill.style.width = `${(uploaded / total) * 100}%`;
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Błąd przesyłania ${file.name}`);
        }
    }

    progressText.textContent = `Przesłano ${uploaded} z ${total} plików`;

    setTimeout(() => {
        progress.style.display = 'none';
        dropzone.style.display = 'block';
        progressFill.style.width = '0%';
        loadGalleryImages();
    }, 1500);
}

async function uploadImage(file) {
    if (!supabaseClient) {
        // Demo mode - just simulate upload
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentCategory}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('gallery')
        .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseClient.storage
        .from('gallery')
        .getPublicUrl(fileName);

    // Save to database
    const { error: dbError } = await supabaseClient
        .from('gallery')
        .insert({
            category: currentCategory,
            filename: file.name,
            url: urlData.publicUrl,
            storage_path: fileName
        });

    if (dbError) throw dbError;
}

// Delete Image
function confirmDelete(id, url) {
    imageToDelete = { id, url };
    document.getElementById('delete-preview-img').src = url;
    document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    imageToDelete = null;
}

async function deleteImage() {
    if (!imageToDelete) return;

    const { id } = imageToDelete;

    if (!supabaseClient) {
        // Demo mode
        galleryImages = galleryImages.filter(img => img.id !== id);
        renderGallery();
        closeDeleteModal();
        return;
    }

    try {
        // Get storage path
        const image = galleryImages.find(img => img.id === id);

        if (image && image.storage_path) {
            // Delete from storage
            await supabaseClient.storage
                .from('gallery')
                .remove([image.storage_path]);
        }

        // Delete from database
        const { error } = await supabaseClient
            .from('gallery')
            .delete()
            .eq('id', id);

        if (error) throw error;

        galleryImages = galleryImages.filter(img => img.id !== id);
        renderGallery();
        updateCategoryCounts();
    } catch (error) {
        console.error('Delete error:', error);
        alert('Błąd usuwania zdjęcia');
    }

    closeDeleteModal();
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
            closeDeleteModal();
        }
    });

    // =====================
    // GALLERY EVENT LISTENERS
    // =====================

    // Admin navigation tabs
    document.querySelectorAll('.admin-nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchSection(tab.dataset.section);
        });
    });

    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            setCategory(tab.dataset.category);
        });
    });

    // File input
    const fileInput = document.getElementById('file-input');
    const dropzone = document.getElementById('upload-dropzone');

    if (fileInput && dropzone) {
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files);
            e.target.value = ''; // Reset input
        });

        // Drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            handleFileUpload(e.dataTransfer.files);
        });
    }

    // Delete confirmation
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', deleteImage);
    }

    // Close delete modal on overlay click
    const deleteModal = document.getElementById('delete-modal');
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeDeleteModal();
            }
        });
    }
});
