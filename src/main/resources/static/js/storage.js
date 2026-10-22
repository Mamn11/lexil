/* =============================================
   LexiL — Gerenciador de Armazenamento Híbrido
   (Spring Data JPA + H2 Database + Local Cache)
   ============================================= */

const LEGACY_STORAGE_KEY = 'wordvault_words';

function getActiveUsername() {
    if (typeof getCurrentUser === 'function') {
        const user = getCurrentUser();
        if (user && user.username) {
            return user.username.toLowerCase();
        }
    }
    return 'guest';
}

function getStorageKey() {
    return `wordvault_words_${getActiveUsername()}`;
}

// ── Obter palavras em cache local (síncrono para render imediato) ─
function getWords() {
    const key = getStorageKey();
    const data = localStorage.getItem(key);

    if (data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    }

    // Migra palavras legadas caso existam
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
        try {
            const parsed = JSON.parse(legacy);
            if (Array.isArray(parsed) && parsed.length > 0) {
                localStorage.setItem(key, JSON.stringify(parsed));
                return parsed;
            }
        } catch (e) {}
    }

    return [];
}

function saveWordsToLocalCache(words) {
    localStorage.setItem(getStorageKey(), JSON.stringify(words));
}

// ── Sincronizar com o Banco de Dados H2 (Backend) ─────────────
async function fetchWordsFromDatabase() {
    const username = getActiveUsername();
    if (!username || username === 'guest') return getWords();

    try {
        const response = await fetch(`/api/words?username=${encodeURIComponent(username)}`, {
            credentials: 'same-origin',
            headers: { 'X-User-Username': username }
        });

        if (response.ok) {
            const dbWords = await response.json();
            // Se o banco estiver vazio mas temos palavras locais, sincroniza para o banco!
            const localWords = getWords();
            if (dbWords.length === 0 && localWords.length > 0) {
                await syncWordsToDatabase(localWords);
                return localWords;
            }

            saveWordsToLocalCache(dbWords);
            return dbWords;
        }
    } catch (err) {
        console.warn('Backend JPA indisponível, usando cache local:', err.message);
    }

    return getWords();
}

async function syncWordsToDatabase(words) {
    const username = getActiveUsername();
    if (!username || username === 'guest' || !words || words.length === 0) return;

    try {
        await fetch('/api/words/sync', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Username': username
            },
            body: JSON.stringify({
                username: username,
                words: words.map(w => ({
                    english: w.english,
                    translation: w.translation,
                    notes: w.notes || '',
                    reviewed: !!w.reviewed
                }))
            })
        });
    } catch (e) {
        console.warn('Erro ao sincronizar palavras para o banco H2:', e);
    }
}

// ── Adicionar palavra ─────────────────────────────────────────
async function addWordToStorage(english, translation, notes = '') {
    const username = getActiveUsername();
    const cleanNotes = (notes || '').trim();

    // Cria otimista no cache local
    const localId = 'temp_' + Date.now();
    const newWord = {
        id: localId,
        english: english,
        translation: translation,
        notes: cleanNotes,
        reviewed: false,
        dateAdded: new Date().toISOString()
    };

    const words = getWords();
    words.push(newWord);
    saveWordsToLocalCache(words);

    // Persiste no Banco de Dados H2
    try {
        const response = await fetch('/api/words', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Username': username
            },
            body: JSON.stringify({
                english: english,
                translation: translation,
                notes: cleanNotes,
                username: username
            })
        });

        if (response.ok) {
            const savedDbWord = await response.json();
            // Atualiza com o ID real do banco H2
            const currentWords = getWords().map(w => w.id === localId ? savedDbWord : w);
            saveWordsToLocalCache(currentWords);
            return savedDbWord;
        }
    } catch (err) {
        console.warn('Salvo apenas no cache local (modo offline):', err.message);
    }

    return newWord;
}

// ── Excluir palavra ───────────────────────────────────────────
async function removeWordFromStorage(id) {
    const username = getActiveUsername();

    // Remove do cache local
    let words = getWords().filter(word => word.id !== id && String(word.id) !== String(id));
    saveWordsToLocalCache(words);

    // Remove do Banco H2
    if (!String(id).startsWith('temp_')) {
        try {
            await fetch(`/api/words/${id}?username=${encodeURIComponent(username)}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: { 'X-User-Username': username }
            });
        } catch (err) {
            console.warn('Erro ao deletar no banco H2:', err.message);
        }
    }
}

// ── Alternar revisado ─────────────────────────────────────────
async function toggleReviewedInStorage(id) {
    const username = getActiveUsername();

    // Atualiza no cache local
    let words = getWords().map(word =>
        (word.id === id || String(word.id) === String(id))
            ? { ...word, reviewed: !word.reviewed }
            : word
    );
    saveWordsToLocalCache(words);

    // Atualiza no Banco H2
    if (!String(id).startsWith('temp_')) {
        try {
            await fetch(`/api/words/${id}/toggle-reviewed?username=${encodeURIComponent(username)}`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: { 'X-User-Username': username }
            });
        } catch (err) {
            console.warn('Erro ao atualizar reviewed no banco H2:', err.message);
        }
    }
}