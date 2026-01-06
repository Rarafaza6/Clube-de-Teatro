/**
 * ADMIN TUTORIAL SYSTEM v2 ("Story Mode")
 * A passive, guided tour that navigates FOR the user.
 */

const TEACHING_STEPS = [
    {
        title: "Bem-vindo ao Painel de Administração",
        message: "Este painel permite gerir todo o conteúdo do site do Clube de Teatro. Vou guiá-lo pelas funcionalidades principais em alguns passos rápidos.",
        action: () => showSection('dashboard'),
        target: null
    },
    {
        title: "Estado do Site",
        message: "Este widget monitoriza o site. Se estiver <strong>Verde</strong>, a peça em destaque está ativa. Se estiver <strong>Laranja</strong>, significa que o site está sem conteúdo principal e precisa de atenção.",
        action: () => showSection('dashboard'),
        target: "#liveStatusWidget"
    },
    {
        title: "Gestão de Peças",
        message: "Nesta secção, pode criar, editar ou remover peças. Para adicionar um novo cartaz, clique no botão <strong>+ Nova Peça</strong>. O sistema aceita imagens arrastadas diretamente do seu computador.",
        action: () => showSection('pecas'), // AUTO-NAVIGATE
        target: ".btn--primary" // Highlight the add button
    },
    {
        title: "Gestão da Equipa",
        message: "Aqui pode gerir os perfis dos membros. Defina quem são os professores (Encenadores) e quem são os alunos (Atores/Técnicos). Isto organiza a equipa automaticamente no site público.",
        action: () => showSection('membros'), // AUTO-NAVIGATE
        target: ".section-header"
    },
    {
        title: "Gravação Automática",
        message: "Todas as alterações são guardadas e refletidas no site imediatamente. O sistema confirmará cada ação com uma notificação no topo do ecrã.",
        action: () => showSection('dashboard'), // Return home
        target: null
    }
];

function initTutorial(userEmail) {
    // Definir uma chave única baseada no email do utilizador para que cada conta tenha o seu próprio histórico
    const userKey = `tutorial_done_${userEmail || 'guest'}`;

    if (localStorage.getItem(userKey)) {
        return;
    }

    // Guardar a chave atual no window para ser usada no finishTutorial
    window.currentTutorialUserKey = userKey;
    startTutorial();
}

function startTutorial() {
    let currentStepIndex = 0;

    // Create Overlay
    let overlay = document.getElementById('tutorial-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);
    }

    // Create Card
    let card = document.getElementById('tutorial-card');
    if (!card) {
        card = document.createElement('div');
        card.id = 'tutorial-card';
        card.className = 'tutorial-card';
        document.body.appendChild(card);
    }

    function showStep(index) {
        if (index >= TEACHING_STEPS.length) {
            finishTutorial();
            return;
        }

        const step = TEACHING_STEPS[index];

        // EXECUTE AUTO-NAVIGATION ACTION
        if (step.action) {
            step.action();
        }

        // Highlight logic
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

        if (step.target) {
            setTimeout(() => { // Small delay to allow section switch
                let targetEl = document.querySelector(step.target);
                if (targetEl) {
                    targetEl.classList.add('tutorial-highlight');
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }

        // Render Card
        card.innerHTML = `
            <div class="tutorial-header">
                <h3>${step.title}</h3>
            </div>
            <p style="font-size: 1.1rem; margin-bottom: 25px; line-height: 1.6;">${step.message}</p>
            <div class="tutorial-actions" style="justify-content: center;">
                <button class="btn btn-primary" onclick="window.nextStep()" style="font-size: 1.1rem; padding: 15px; width:100%;">
                    ${index === 0 ? 'Iniciar Visita Guiada' : (index === TEACHING_STEPS.length - 1 ? 'Concluir Tutorial' : 'Seguinte')}
                </button>
            </div>
            ${index === 0 ? `<button class="btn-skip" onclick="window.finishTutorial()" style="margin-top:15px; display:block; width:100%;">Saltar Tutorial</button>` : ''}
        `;
    }

    // Navigation Globals
    window.nextStep = () => {
        currentStepIndex++;
        showStep(currentStepIndex);
    };

    window.finishTutorial = finishTutorial;

    // Start
    showStep(0);
}

function finishTutorial() {
    // Usar a chave específica do utilizador que guardámos no init
    const userKey = window.currentTutorialUserKey || 'tutorial_done_guest';
    localStorage.setItem(userKey, 'true');

    const overlay = document.getElementById('tutorial-overlay');
    const card = document.getElementById('tutorial-card');

    if (overlay) overlay.remove();
    if (card) card.remove();

    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

    // Ensure we end on dashboard
    if (window.showSection) window.showSection('dashboard');

    if (window.showToast) window.showToast("Tutorial concluído!", "success");
}
