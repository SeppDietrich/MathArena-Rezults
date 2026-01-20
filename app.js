// DOM Elements
const participantsContainer = document.getElementById('participantsContainer');
const loadingElement = document.getElementById('loading');
const noResultsElement = document.getElementById('noResults');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortFilter = document.getElementById('sortFilter');
const statsContainer = document.getElementById('statsContainer');

// State
let allParticipants = [];
let filteredParticipants = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadParticipants();
    
    // Event listeners for filters
    searchInput.addEventListener('input', filterParticipants);
    categoryFilter.addEventListener('change', filterParticipants);
    sortFilter.addEventListener('change', filterParticipants);
});

// Load participants from Firestore
async function loadParticipants() {
    try {
        const snapshot = await db.collection('participanti_matharena_2025').get();
        
        allParticipants = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Convert Firestore timestamps
        allParticipants = allParticipants.map(p => ({
            ...p,
            timestamp: p.timestamp ? p.timestamp.toDate() : null
        }));
        
        filterParticipants();
    } catch (error) {
        console.error('Error loading participants:', error);
        showError('Eroare la încărcarea datelor. Vă rugăm să încercați din nou.');
    } finally {
        loadingElement.style.display = 'none';
    }
}

// Filter and sort participants
function filterParticipants() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    const sortOption = sortFilter.value;
    
    // Filter
    filteredParticipants = allParticipants.filter(participant => {
        const matchesSearch = 
            participant.participant?.toLowerCase().includes(searchTerm) ||
            participant.institutia?.toLowerCase().includes(searchTerm) ||
            participant.localitate?.toLowerCase().includes(searchTerm) ||
            participant.coordonator?.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !selectedCategory || participant.categorie === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    // Sort
    switch (sortOption) {
        case 'puncte_desc':
            filteredParticipants.sort((a, b) => b.puncte - a.puncte);
            break;
        case 'puncte_asc':
            filteredParticipants.sort((a, b) => a.puncte - b.puncte);
            break;
        case 'participant_asc':
            filteredParticipants.sort((a, b) => 
                (a.participant || '').localeCompare(b.participant || '')
            );
            break;
        case 'participant_desc':
            filteredParticipants.sort((a, b) => 
                (b.participant || '').localeCompare(a.participant || '')
            );
            break;
    }
    
    updateStatistics();
    displayParticipants();
}

// Update statistics
function updateStatistics() {
    const total = filteredParticipants.length;
    const categories = {};
    let totalPoints = 0;
    
    filteredParticipants.forEach(p => {
        categories[p.categorie] = (categories[p.categorie] || 0) + 1;
        totalPoints += p.puncte || 0;
    });
    
    const averagePoints = total > 0 ? (totalPoints / total).toFixed(1) : 0;
    
    statsContainer.innerHTML = `
        <div class="col-md-4 col-sm-6 mb-3">
            <div class="stats-card">
                <h3 class="text-primary">${total}</h3>
                <p class="text-muted mb-0">Total participanți</p>
            </div>
        </div>
        <div class="col-md-4 col-sm-6 mb-3">
            <div class="stats-card">
                <h3 class="text-success">${averagePoints}</h3>
                <p class="text-muted mb-0">Punctaj mediu</p>
            </div>
        </div>
        <div class="col-md-4 col-sm-6 mb-3">
            <div class="stats-card">
                <h3 class="text-warning">${categories['Premiul Mare'] || 0}</h3>
                <p class="text-muted mb-0">Premii Mari</p>
            </div>
        </div>
        
    `;
}

// Display participants
function displayParticipants() {
    if (filteredParticipants.length === 0) {
        noResultsElement.classList.remove('d-none');
        participantsContainer.innerHTML = '';
        return;
    }
    
    noResultsElement.classList.add('d-none');
    
    participantsContainer.innerHTML = filteredParticipants.map(participant => `
        <div class="col">
            <div class="card participant-card h-100 ${getCardClass(participant.categorie)}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <span class="badge ${getBadgeClass(participant.categorie)} mb-2">
                                ${participant.categorie}
                            </span>
                            <h5 class="card-title mb-1">${escapeHtml(participant.participant || 'Nespecificat')}</h5>
                            ${participant.coordonator ? `
                                <p class="card-text text-muted small mb-1">
                                    <i class="bi bi-person-badge"></i> ${escapeHtml(participant.coordonator)}
                                </p>
                            ` : ''}
                        </div>
                        <div class="text-end">
                            <span class="badge bg-primary points-badge">
                                ${participant.puncte > 30 ? 30 : (participant.puncte || 0)} puncte
                            </span>
                        </div>
                    </div>
                    
                    <div class="participant-details">
                        ${participant.institutia ? `
                            <p class="card-text mb-1">
                                <i class="bi bi-building"></i> ${escapeHtml(participant.institutia)}
                            </p>
                        ` : ''}
                        
                        ${participant.clasa ? `
                            <p class="card-text mb-1">
                                <i class="bi bi-mortarboard"></i> ${escapeHtml(participant.clasa)}
                            </p>
                        ` : ''}
                        
                        ${participant.localitate ? `
                            <p class="card-text mb-1">
                                <i class="bi bi-geo-alt"></i> ${escapeHtml(participant.localitate)}
                            </p>
                        ` : ''}
                        
                        
                    </div>
                    
                    ${participant.link ? `
                        <div class="mt-3">
                            <a href="${participant.link}" 
                               target="_blank" 
                               class="btn btn-outline-primary btn-sm w-100">
                                <i class="bi bi-box-arrow-up-right"></i> Vezi proiectul
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Helper functions
function getCardClass(category) {
    switch (category) {
        case 'Premiul Mare': return 'card-premiu-mare';
        case 'Locul 1': return 'card-locul-1';
        case 'Locul 2': return 'card-locul-2';
        case 'Locul 3': return 'card-locul-3';
        case 'Mențiune': return 'card-mentiune';
        default: return '';
    }
}

function getBadgeClass(category) {
    switch (category) {
        case 'Premiul Mare': return 'badge-premium';
        case 'Locul 1': return 'bg-secondary';
        case 'Locul 2': return 'bg-warning text-dark';
        case 'Locul 3': return 'bg-light text-dark';
        case 'Mențiune': return 'bg-success';
        default: return 'bg-info';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    participantsContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle"></i> ${message}
            </div>
        </div>
    `;
}