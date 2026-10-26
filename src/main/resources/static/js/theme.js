/* =============================================
   LexiL — Gerenciador de Temas (Theme Manager)
   ============================================= */

const THEMES = [
    {
        id: 'palette1',
        name: 'Paleta 1 (Escuro) — Vaporwave Palms',
        icon: '🌙',
        primary: '#F24B4B',
        secondary: '#280D8C',
        desc: 'Noturno: azul profundo, roxo elétrico e coral neon'
    },
    {
        id: 'palette2',
        name: 'Paleta 2 (Claro) — Emerald Luxury',
        icon: '☀️',
        primary: '#017434',
        secondary: '#02DC4A',
        desc: 'Claro: menta suave, pinheiro e verde esmeralda'
    },
    {
        id: 'palette3',
        name: 'Paleta 3 (Escuro) — Emerald Luxury',
        icon: '🌙',
        primary: '#02DC4A',
        secondary: '#012623',
        desc: 'Noturno: pinheiro profundo, esmeralda e neon mint'
    },
    {
        id: 'palette4',
        name: 'Paleta 4 (Claro) — Digerati Cyber',
        icon: '☀️',
        primary: '#FF3B77',
        secondary: '#52656B',
        desc: 'Claro: branco linho, ardósia, hot pink e cyber lime'
    }
];

const THEME_ALIASES = {
    'violet': 'palette1',
    'emerald': 'palette2',
    'ocean': 'palette3',
    'cyberpunk': 'palette4',
    'sunset': 'palette4',
    'light': 'palette2',
    'sakura': 'palette4'
};

const THEME_STORAGE_KEY = 'lexil_theme';

function getCurrentTheme() {
    let saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEME_ALIASES[saved]) {
        saved = THEME_ALIASES[saved];
        localStorage.setItem(THEME_STORAGE_KEY, saved);
    }
    return THEMES.some(t => t.id === saved) ? saved : 'palette1';
}

function applyTheme(themeId) {
    if (THEME_ALIASES[themeId]) {
        themeId = THEME_ALIASES[themeId];
    }
    const validTheme = THEMES.some(t => t.id === themeId) ? themeId : 'palette1';
    document.documentElement.setAttribute('data-theme', validTheme);
    localStorage.setItem(THEME_STORAGE_KEY, validTheme);

    // Notificar botões/dropdowns se existirem
    updateThemeSelectorUI(validTheme);
}

function initTheme() {
    const saved = getCurrentTheme();
    applyTheme(saved);
}

function updateThemeSelectorUI(currentThemeId) {
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
        const id = btn.getAttribute('data-theme-id');
        if (id === currentThemeId) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        }
    });

    const activeTheme = THEMES.find(t => t.id === currentThemeId);
    if (activeTheme) {
        document.querySelectorAll('.theme-btn-text, #current-theme-label').forEach(label => {
            label.textContent = activeTheme.name;
        });
        document.querySelectorAll('.theme-active-dot').forEach(dot => {
            dot.style.background = activeTheme.primary;
        });
    }
}

// Renderiza o seletor de temas onde for colocado
function setupThemeSelector(target = 'theme-selector-container') {
    const container = typeof target === 'string' ? document.getElementById(target) : target;
    if (!container) return;

    // Se já estiver montado neste container, apenas sincroniza a UI
    if (container.querySelector('.theme-dropdown-wrapper')) {
        updateThemeSelectorUI(getCurrentTheme());
        return;
    }

    const currentTheme = getCurrentTheme();
    const active = THEMES.find(t => t.id === currentTheme) || THEMES[0];

    container.innerHTML = `
        <div class="theme-dropdown-wrapper">
            <button type="button" class="theme-trigger-btn" aria-label="Mudar tema de cores" title="Personalizar Cores do Tema" aria-expanded="false">
                <span class="theme-palette-icon">🎨</span>
                <span class="theme-active-dot" style="background: ${active.primary}"></span>
                <span class="theme-btn-text">${active.name}</span>
                <span class="theme-chevron">▾</span>
            </button>
            <div class="theme-menu" role="listbox" aria-label="Opções de tema">
                <div class="theme-menu-header">
                    <span>Escolha um Tema</span>
                    <span class="theme-count">${THEMES.length} opções</span>
                </div>
                <div class="theme-options-list">
                    ${THEMES.map(t => `
                        <button type="button" class="theme-option-btn ${t.id === currentTheme ? 'active' : ''}" 
                                data-theme-id="${t.id}" role="option" aria-selected="${t.id === currentTheme}">
                            <div class="theme-color-preview">
                                <span class="theme-color-swatch" style="background: ${t.primary};"></span>
                                <span class="theme-color-swatch secondary" style="background: ${t.secondary};"></span>
                            </div>
                            <div class="theme-option-info">
                                <span class="theme-option-name">${t.icon} ${t.name}</span>
                                <span class="theme-option-desc">${t.desc}</span>
                            </div>
                            <span class="theme-check-icon">✓</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const trigger = container.querySelector('.theme-trigger-btn');
    const menu = container.querySelector('.theme-menu');

    if (!trigger || !menu) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Fecha outros menus se houver mais de um na página
        document.querySelectorAll('.theme-menu').forEach(m => {
            if (m !== menu) m.classList.remove('open');
        });
        const isOpen = menu.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen);
    });

    menu.querySelectorAll('.theme-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const themeId = btn.getAttribute('data-theme-id');
            applyTheme(themeId);
            const chosen = THEMES.find(t => t.id === themeId);
            menu.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
            if (typeof showToast === 'function') {
                showToast(`Tema alterado para ${chosen ? chosen.name : themeId} ✨`, 2000);
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            menu.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }
    });
}

// Auto-monta o seletor em qualquer container existente
function autoMountThemeSelector() {
    const containers = document.querySelectorAll('#theme-selector-container, .theme-selector-container');
    containers.forEach(c => setupThemeSelector(c));
}

// Inicializa o tema imediatamente
initTheme();

// Auto-montagem resiliente (roda em qualquer fase do ciclo de vida da página)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMountThemeSelector);
} else {
    autoMountThemeSelector();
}
window.addEventListener('load', autoMountThemeSelector);
