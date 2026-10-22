/* =============================================
   LexiL — App Logic
   ============================================= */

// DOM refs
const wordForm         = document.getElementById('word-form');
const englishWordInput = document.getElementById('english-word');
const translationInput = document.getElementById('translation');
const notesInput       = document.getElementById('notes');
const wordsContainer   = document.getElementById('words-container');
const btnAutoTranslate = document.getElementById('btn-auto-translate');
const totalCount       = document.getElementById('total-count');
const searchWrapper    = document.getElementById('search-wrapper');
const searchInput      = document.getElementById('search-input');
const toast            = document.getElementById('toast');

const userNameEl       = document.getElementById('user-name');
const userAvatarEl     = document.getElementById('user-avatar');
const btnLogout        = document.getElementById('btn-logout');

let toastTimer = null;

// ── Auth & User Setup ─────────────────────────────────────────
const currentUser = typeof requireAuth === 'function' ? requireAuth() : null;

if (currentUser) {
    if (userNameEl) {
        userNameEl.textContent = currentUser.name || currentUser.username;
    }
    if (userAvatarEl) {
        const initial = (currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase();
        userAvatarEl.textContent = initial;
    }
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        if (confirm('Deseja realmente sair da sua conta?')) {
            logoutUser();
        }
    });
}

// Inicializar Seletor de Temas
if (typeof setupThemeSelector === 'function') {
    setupThemeSelector('theme-selector-container');
}

// ── Toast helper ──────────────────────────────────────────────
function showToast(message, duration = 2800) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Format date ───────────────────────────────────────────────
function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Render words ──────────────────────────────────────────────
function renderWords(filter = '') {
    const words = getWords();
    const filtered = filter
        ? words.filter(w =>
            w.english.toLowerCase().includes(filter.toLowerCase()) ||
            w.translation.toLowerCase().includes(filter.toLowerCase())
          )
        : words;

    // Update counter
    totalCount.textContent = words.length;

    // Show/hide search bar
    searchWrapper.style.display = words.length > 2 ? 'flex' : 'none';

    wordsContainer.innerHTML = '';

    if (filtered.length === 0) {
        const msg = filter
            ? `Nenhuma palavra encontrada para "<strong>${filter}</strong>".`
            : 'Nenhuma palavra adicionada ainda. Comece os seus estudos!';

        wordsContainer.innerHTML = `
            <div class="empty-message">
                <span class="empty-icon">${filter ? '🔍' : '📖'}</span>
                <p>${msg}</p>
            </div>`;
        return;
    }

    const reversedWords = [...filtered].reverse();

    reversedWords.forEach(word => {
        const card = document.createElement('div');
        card.classList.add('word-card');
        if (word.reviewed) card.classList.add('reviewed');

        const checkedAttr = word.reviewed ? 'checked' : '';
        const notesHtml = word.notes
            ? `<p class="word-notes">${escapeHtml(word.notes)}</p>`
            : '';

        card.innerHTML = `
            <label class="review-checkbox" title="Marcar como revisado" aria-label="Marcar ${escapeHtml(word.english)} como revisado">
                <input type="checkbox" ${checkedAttr} onchange="toggleReviewed('${word.id}', this)">
                <span class="checkmark" aria-hidden="true"></span>
            </label>
            <div class="word-content">
                <strong class="english-text">${escapeHtml(word.english)}</strong>
                <span class="translation-text">${escapeHtml(word.translation)}</span>
                ${notesHtml}
                ${word.dateAdded ? `<span class="word-date">${formatDate(word.dateAdded)}</span>` : ''}
            </div>
            <button class="delete-btn" onclick="deleteWord('${word.id}')" aria-label="Excluir ${escapeHtml(word.english)}">
                Excluir
            </button>
        `;

        wordsContainer.appendChild(card);
    });
}

// ── Escape HTML ───────────────────────────────────────────────
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── Add word ──────────────────────────────────────────────────
wordForm.addEventListener('submit', async function (evento) {
    evento.preventDefault();

    const englishWord     = englishWordInput.value.trim();
    const translationWord = translationInput.value.trim();
    const notesWord       = notesInput.value.trim();

    if (englishWord && translationWord) {
        wordForm.reset();
        englishWordInput.focus();
        await addWordToStorage(englishWord, translationWord, notesWord);
        renderWords(searchInput.value);
        showToast(`"${englishWord}" adicionado ao vocabulário ✓`);
    }
});

// ── Delete word ───────────────────────────────────────────────
async function deleteWord(id) {
    if (confirm('Tem certeza que deseja excluir esta palavra?')) {
        await removeWordFromStorage(id);
        renderWords(searchInput.value);
        showToast('Palavra removida.');
    }
}

// ── Toggle reviewed ───────────────────────────────────────────
async function toggleReviewed(id, checkbox) {
    await toggleReviewedInStorage(id);
    const card = checkbox.closest('.word-card');
    if (checkbox.checked) {
        card.classList.add('reviewed');
        showToast('Palavra marcada como revisada ✓');
    } else {
        card.classList.remove('reviewed');
        showToast('Marcação de revisão removida.');
    }
}

// ── Auto translate ────────────────────────────────────────────
btnAutoTranslate.addEventListener('click', async () => {
    const textToTranslate = englishWordInput.value.trim();

    if (!textToTranslate) {
        showToast('Digite uma palavra em inglês primeiro!');
        englishWordInput.focus();
        return;
    }

    try {
        btnAutoTranslate.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-label">Traduzindo…</span>';
        btnAutoTranslate.disabled = true;

        const translatedText = await translateText(textToTranslate);
        translationInput.value = translatedText;
        translationInput.focus();
        showToast('Tradução concluída ✓');

    } catch (error) {
        showToast('Erro ao traduzir: ' + error.message);
    } finally {
        btnAutoTranslate.innerHTML = '<span class="btn-icon">🪄</span><span class="btn-label">Auto</span>';
        btnAutoTranslate.disabled = false;
    }
});

// ── Search ─────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
    renderWords(searchInput.value);
});

// ── Init ──────────────────────────────────────────────────────
renderWords();

if (typeof fetchWordsFromDatabase === 'function') {
    fetchWordsFromDatabase().then(() => {
        renderWords(searchInput ? searchInput.value : '');
    });
}