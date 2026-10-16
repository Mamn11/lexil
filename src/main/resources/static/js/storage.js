const STORAGE_KEY = 'wordvault_words';

function getWords() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function addWordToStorage(english, translation, notes = '') {
    const words = getWords();

    const newWord = {
        id: Date.now().toString(),
        english: english,
        translation: translation,
        notes: notes.trim(),
        reviewed: false,
        dateAdded: new Date().toISOString()
    };

    words.push(newWord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function removeWordFromStorage(id) {
    let words = getWords();
    words = words.filter(word => word.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function toggleReviewedInStorage(id) {
    let words = getWords();
    words = words.map(word =>
        word.id === id ? { ...word, reviewed: !word.reviewed } : word
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}