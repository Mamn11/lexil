/* =============================================
   LexiL — Gerenciador de Autenticação (Auth Manager)
   ============================================= */

const AUTH_ACTIVE_USER_KEY = 'lexil_active_user';
const AUTH_USERS_KEY       = 'lexil_registered_users';

// Inicializa usuários locais com contas padrão caso não existam
function initLocalUsers() {
    let users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || 'null');
    if (!users || !Array.isArray(users) || users.length === 0) {
        users = [
            { username: 'admin', password: 'password123', name: 'Administrador' },
            { username: 'estudante', password: 'password123', name: 'Estudante LexiL' }
        ];
        localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    }
    return users;
}

// Obtém o usuário atualmente logado
function getCurrentUser() {
    const raw = localStorage.getItem(AUTH_ACTIVE_USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// Salva o usuário logado
function setCurrentUser(user) {
    if (!user) {
        localStorage.removeItem(AUTH_ACTIVE_USER_KEY);
    } else {
        localStorage.setItem(AUTH_ACTIVE_USER_KEY, JSON.stringify(user));
    }
}

// Desloga o usuário
async function logoutUser() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });
    } catch (e) {
        // Ignora erro de rede se estiver offline
    }
    setCurrentUser(null);
    window.location.href = 'login.html';
}

// Tenta autenticar via backend Spring Boot ou fallback local
async function loginUser(username, password) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
        throw new Error('Preencha o usuário e a senha.');
    }

    // 1. Tentar autenticação no Spring Boot
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, password: cleanPass })
        });

        if (response.ok) {
            const data = await response.json();
            const userObj = {
                username: data.user.username,
                name: data.user.name || cleanUser
            };
            setCurrentUser(userObj);
            // Sincronizar também no localUsers
            syncLocalUser(userObj.username, cleanPass, userObj.name);
            return userObj;
        } else if (response.status === 401 || response.status === 400) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Usuário ou senha incorretos.');
        }
    } catch (err) {
        // Se foi erro de validação do backend (401), repassar o erro
        if (err.message && err.message !== 'Failed to fetch' && !err.message.includes('NetworkError') && !err.message.includes('fetch')) {
            throw err;
        }
        // Se backend estiver inacessível (ex: Live Server porta 5500), usa autenticação local
        console.warn('Backend indisponível, usando autenticação local:', err.message);
    }

    // 2. Fallback de Autenticação Local (para Live Server ou modo offline)
    const users = initLocalUsers();
    const found = users.find(u => u.username.toLowerCase() === cleanUser && u.password === cleanPass);

    if (!found) {
        throw new Error('Usuário ou senha incorretos.');
    }

    const userObj = {
        username: found.username,
        name: found.name || found.username
    };
    setCurrentUser(userObj);
    return userObj;
}

// Cadastra novo usuário
async function registerUser(name, username, password) {
    const cleanName = (name || '').trim();
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
        throw new Error('Usuário e senha são obrigatórios.');
    }
    if (cleanUser.length < 3) {
        throw new Error('O nome de usuário deve ter pelo menos 3 caracteres.');
    }
    if (cleanPass.length < 4) {
        throw new Error('A senha deve ter pelo menos 4 caracteres.');
    }

    // 1. Tentar cadastro no backend Spring Boot
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: cleanName, username: cleanUser, password: cleanPass })
        });

        if (response.ok) {
            const data = await response.json();
            const userObj = {
                username: data.user.username,
                name: data.user.name || cleanName || cleanUser
            };
            setCurrentUser(userObj);
            syncLocalUser(userObj.username, cleanPass, userObj.name);
            return userObj;
        } else if (response.status === 409 || response.status === 400) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Este usuário já está cadastrado.');
        }
    } catch (err) {
        if (err.message && err.message !== 'Failed to fetch' && !err.message.includes('NetworkError') && !err.message.includes('fetch')) {
            throw err;
        }
        console.warn('Backend indisponível para registro, registrando localmente:', err.message);
    }

    // 2. Fallback Registro Local
    const users = initLocalUsers();
    if (users.some(u => u.username.toLowerCase() === cleanUser)) {
        throw new Error('Este usuário já existe. Escolha outro nome de usuário.');
    }

    const newUser = {
        name: cleanName || cleanUser,
        username: cleanUser,
        password: cleanPass
    };
    users.push(newUser);
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));

    const userObj = { username: newUser.username, name: newUser.name };
    setCurrentUser(userObj);
    return userObj;
}

function syncLocalUser(username, password, name) {
    const users = initLocalUsers();
    const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (idx >= 0) {
        users[idx].name = name;
        if (password) users[idx].password = password;
    } else {
        users.push({ username, password, name });
    }
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

// Proteger rota (usado no index.html)
function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        // Redireciona para login
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// Se estiver no login e já logado, redirecionar para index.html
function redirectIfLoggedIn() {
    const user = getCurrentUser();
    if (user) {
        window.location.href = 'index.html';
    }
}
