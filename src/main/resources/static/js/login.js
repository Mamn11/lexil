/* =============================================
   LexiL — Lógica da Tela de Login & Registro
   ============================================= */

function initLoginPage() {
    // Se o usuário já estiver logado, redireciona diretamente para o app
    if (typeof redirectIfLoggedIn === 'function') {
        redirectIfLoggedIn();
    }

    // Inicializa o seletor de temas na barra superior
    if (typeof setupThemeSelector === 'function') {
        setupThemeSelector('theme-selector-container');
    }

    // Elementos DOM
    const tabLogin       = document.getElementById('tab-login');
    const tabRegister    = document.getElementById('tab-register');
    const formLogin      = document.getElementById('form-login');
    const formRegister   = document.getElementById('form-register');
    const authAlert      = document.getElementById('auth-alert');

    const loginUserInp   = document.getElementById('login-username');
    const loginPassInp   = document.getElementById('login-password');
    const btnLoginSubmit = document.getElementById('btn-login-submit');

    const regNameInp     = document.getElementById('reg-name');
    const regUserInp     = document.getElementById('reg-username');
    const regPassInp     = document.getElementById('reg-password');
    const regConfirmInp  = document.getElementById('reg-confirm-password');
    const btnRegSubmit   = document.getElementById('btn-reg-submit');

    // ── Alertas ──────────────────────────────────────────────────
    function showAlert(msg, isError = true) {
        authAlert.textContent = msg;
        authAlert.className = `auth-alert show ${isError ? 'error' : 'success'}`;
    }

    function clearAlert() {
        authAlert.textContent = '';
        authAlert.className = 'auth-alert';
    }

    // ── Alternância de Abas ──────────────────────────────────────
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabLogin.setAttribute('aria-selected', 'true');
        tabRegister.classList.remove('active');
        tabRegister.setAttribute('aria-selected', 'false');

        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
        clearAlert();
        loginUserInp.focus();
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabRegister.setAttribute('aria-selected', 'true');
        tabLogin.classList.remove('active');
        tabLogin.setAttribute('aria-selected', 'false');

        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
        clearAlert();
        regNameInp.focus();
    });

    // ── Mostrar / Ocultar Senha ─────────────────────────────────
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else {
                input.type = 'password';
                btn.textContent = '👁️';
            }
        });
    });

    // ── Chips de Teste Rápido ───────────────────────────────────
    document.querySelectorAll('.demo-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const user = btn.getAttribute('data-user');
            const pass = btn.getAttribute('data-pass');
            loginUserInp.value = user;
            loginPassInp.value = pass;
            clearAlert();
            btnLoginSubmit.click();
        });
    });

    // ── Submit Login ────────────────────────────────────────────
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        const username = loginUserInp.value.trim();
        const password = loginPassInp.value;

        if (!username || !password) {
            showAlert('Por favor, informe seu usuário e senha.');
            return;
        }

        try {
            btnLoginSubmit.disabled = true;
            btnLoginSubmit.innerHTML = '<span>Verificando…</span> ⏳';

            const user = await loginUser(username, password);
            showAlert(`Bem-vindo de volta, ${user.name}! Entrando…`, false);

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);

        } catch (err) {
            showAlert(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
            btnLoginSubmit.disabled = false;
            btnLoginSubmit.innerHTML = '<span>Acessar Meu Vocabulário</span> <span aria-hidden="true">→</span>';
        }
    });

    // ── Submit Cadastro ─────────────────────────────────────────
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        const name     = regNameInp.value.trim();
        const username = regUserInp.value.trim();
        const password = regPassInp.value;
        const confirm  = regConfirmInp.value;

        if (!name || !username || !password) {
            showAlert('Preencha todos os campos obrigatórios.');
            return;
        }

        if (username.length < 3) {
            showAlert('O nome de usuário precisa ter pelo menos 3 caracteres.');
            return;
        }

        if (password.length < 4) {
            showAlert('A senha deve ter pelo menos 4 caracteres.');
            return;
        }

        if (password !== confirm) {
            showAlert('As senhas digitadas não coincidem. Verifique e tente novamente.');
            return;
        }

        try {
            btnRegSubmit.disabled = true;
            btnRegSubmit.innerHTML = '<span>Criando conta…</span> ⏳';

            const user = await registerUser(name, username, password);
            showAlert(`Conta de ${user.name} criada com sucesso! Entrando…`, false);

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (err) {
            showAlert(err.message || 'Erro ao criar conta. Tente outro nome de usuário.');
            btnRegSubmit.disabled = false;
            btnRegSubmit.innerHTML = '<span>Criar Minha Conta</span> <span aria-hidden="true">🚀</span>';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}
