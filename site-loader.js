// ============================================
// SITE LOADER - Carrega dados do Firebase para o site
// ============================================

// Verifica se Firebase já foi inicializado
if (typeof firebase === 'undefined') {
    console.error('CRITICAL: Firebase SDK não carregado. Adicione os scripts do Firebase antes deste ficheiro.');
    document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML += '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);color:white;display:flex;justify-content:center;align-items:center;z-index:9999;flex-direction:column;text-align:center;padding:20px;"><h2>Erro Técnico</h2><p>Serviços de dados não encontrados. Por favor admita o administrador.</p></div>';
    });
    // Interrompe a execução para não causar ReferenceError
    throw new Error('Firebase SDK is missing');
}

// Referência ao Firestore
const siteDb = firebase.firestore();

// ============================================
// HELPERS UI (Optimização Visual)
// ============================================

function showSkeleton(container, type = 'card', count = 3) {
    if (!container) return;

    let skeletonHTML = '';

    if (type === 'card') {
        const skeletonCard = `
            <article class="card skeleton-card" style="opacity:0.7;">
                <div style="width:100%; height:300px; background:#eee; animation: pulse 1.5s infinite;"></div>
                <div class="card__content">
                    <div style="height:24px; width:70%; background:#ddd; margin-bottom:10px; animation: pulse 1.5s infinite;"></div>
                    <div style="height:16px; width:100%; background:#eee; margin-bottom:5px;"></div>
                    <div style="height:16px; width:80%; background:#eee; margin-bottom:15px;"></div>
                    <div style="height:40px; width:120px; background:#ddd; border-radius:25px;"></div>
                </div>
            </article>
        `;
        skeletonHTML = Array(count).fill(skeletonCard).join('');
    } else if (type === 'member') {
        const skeletonMember = `
            <article class="member-card" style="opacity:0.7;">
                <div style="height:30px; width:70%; background:#ddd; margin-bottom:10px; animation: pulse 1.5s infinite;"></div>
                <div style="height:14px; width:40%; background:#eee; margin-bottom:20px;"></div>
                <div style="height:14px; width:90%; background:#eee; margin-bottom:5px;"></div>
                <div style="height:14px; width:80%; background:#eee; margin-bottom:20px;"></div>
                <div style="height:40px; width:100px; background:#ddd; border-radius:4px;"></div>
            </article>
        `;
        skeletonHTML = Array(count).fill(skeletonMember).join('');
    }

    container.innerHTML = skeletonHTML;
}

// styles for skeleton pulse
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
    .nav__link.active { color: var(--accent) !important; font-weight: 800; }
    .nav__link.active::after { width: 100% !important; }
`;
document.head.appendChild(styleSheet);

// Auto-highlighter de Navegação
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav__link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});


// ============================================
// FUNÇÕES DE CARREGAMENTO (COM CACHE/RETRY)
// ============================================

// Carrega todas as peças
async function loadPecasFromFirebase() {
    console.log('[Loader] A carregar peças...');
    try {
        const snapshot = await siteDb.collection('pecas').orderBy('ano', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('[Loader] Erro ao carregar peças:', error);
        throw error;
    }
}

// Carrega todos os membros
async function loadMembrosFromFirebase() {
    console.log('[Loader] A carregar membros...');
    try {
        const snapshot = await siteDb.collection('membros').orderBy('nome').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('[Loader] Erro ao carregar membros:', error);
        throw error;
    }
}

// Carrega config do site
async function loadSiteConfig() {
    try {
        const doc = await siteDb.collection('config').doc('site').get();
        return doc.exists ? doc.data() : {};
    } catch (error) {
        console.error('[Loader] Erro ao carregar configurações:', error);
        return {};
    }
}

// Carrega peça em cartaz
async function loadPecaEmCartaz() {
    try {
        const snapshot = await siteDb.collection('pecas')
            .where('emCartaz', '==', true)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('[Loader] Erro ao carregar peça em cartaz:', error);
        throw error;
    }
}

// Carrega participações de uma peça
async function loadParticipacoesPeca(pecaId) {
    try {
        const snapshot = await siteDb.collection('participacoes').where('pecaId', '==', pecaId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('[Loader] Erro ao carregar participações:', error);
        return [];
    }
}

// ============================================
// RENDERIZAÇÃO - PÁGINA INICIAL (index.html)
// ============================================

async function renderHomePecas() {
    const container = document.getElementById('pecas-grid');
    if (!container) return;

    showSkeleton(container, 'card', 3);

    try {
        const pecas = await loadPecasFromFirebase();

        if (pecas.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Ainda não há peças registadas.</p></div>';
            return;
        }

        container.innerHTML = pecas.slice(0, 4).map(peca => `
            <article class="card fade-in">
                <a href="peca.html?id=${peca.id}">
                    <img src="${peca.imagem || 'placeholder.jpg'}" alt="${escapeHtmlSite(peca.nome)}" class="card__image" onerror="this.src='placeholder.jpg'">
                </a>
                <div class="card__content">
                    <h3 class="card__title">${escapeHtmlSite(peca.nome)}</h3>
                    <p class="card__text">${peca.sinopse ? escapeHtmlSite(peca.sinopse.substring(0, 100)) + '...' : ''}</p>
                    <div style="margin-bottom: 10px; font-size: 0.85em; color: #666;">
                        ${peca.autor ? 'Autor: ' + escapeHtmlSite(peca.autor) : ''}
                    </div>
                    <a href="peca.html?id=${peca.id}" class="btn btn--primary">Ver mais</a>
                </div>
            </article>
        `).join('');

    } catch (error) {
        renderError(container, 'Ocorreu um erro ao carregar as peças.', error);
    }
}

// ============================================
// RENDERIZAÇÃO - PÁGINA MEMBROS (membros.html)
// ============================================

async function renderMembros() {
    const professoresContainer = document.getElementById('professores-grid');
    const alunosContainer = document.getElementById('alunos-grid');

    if (!professoresContainer && !alunosContainer) return;

    if (professoresContainer) showSkeleton(professoresContainer, 'member', 2);
    if (alunosContainer) showSkeleton(alunosContainer, 'member', 4);

    try {
        const membros = await loadMembrosFromFirebase();

        const professores = membros.filter(m => m.tipo === 'professor' && m.ativo !== false);
        const alunos = membros.filter(m => m.tipo !== 'professor' && m.ativo !== false);

        if (professoresContainer) {
            if (professores.length === 0) {
                professoresContainer.innerHTML = '<p>Nenhum encenador registado.</p>';
            } else {
                professoresContainer.innerHTML = professores.map(m => renderMembroCard(m, true)).join('');
            }
        }

        if (alunosContainer) {
            if (alunos.length === 0) {
                alunosContainer.innerHTML = '<p>Nenhum aluno registado.</p>';
            } else {
                alunosContainer.innerHTML = alunos.map(m => renderMembroCard(m, false)).join('');
            }
        }

    } catch (error) {
        if (professoresContainer) renderError(professoresContainer, 'Erro ao carregar encenadores.', error);
        if (alunosContainer) renderError(alunosContainer, 'Erro ao carregar alunos.', error);
    }
}

function renderMembroCard(membro, isProfessor) {
    const cardClass = isProfessor ? 'member-card' : 'member-card member-card--student';
    return `
        <article class="${cardClass} fade-in">
            <h3 class="member-card__name">${escapeHtmlSite(membro.nome)}</h3>
            <span class="member-card__role">${escapeHtmlSite(membro.funcao || (isProfessor ? 'Encenador' : 'Ator'))}</span>
            <p class="member-card__bio">${membro.bio ? escapeHtmlSite(membro.bio.substring(0, 90)) + '...' : 'Membro dedicado do nosso clube de teatro.'}</p>
            <a href="membro.html?id=${membro.id}" class="btn btn--secondary">Ver Perfil</a>
        </article>
    `;
}

// ============================================
// RENDERIZAÇÃO - PÁGINA CARTAZ (cartaz.html)
// ============================================

async function renderCartaz() {
    const container = document.getElementById('cartaz-container');
    if (!container) return;

    // Skeleton customizado para cartaz (Matches Standard Size)
    container.innerHTML = `
        <div class="cartaz-atual" style="opacity:0.7;">
             <div style="width:400px; height:560px; background:#eee; border-radius: 8px; animation: pulse 1.5s infinite;"></div>
             <div style="flex:1;">
                <div style="height:45px; width:70%; background:#ddd; margin-bottom:20px; animation: pulse 1.5s infinite;"></div>
                <div style="height:16px; width:100%; background:#eee; margin-bottom:10px;"></div>
                <div style="height:16px; width:90%; background:#eee; margin-bottom:10px;"></div>
                <div style="height:16px; width:95%; background:#eee; margin-bottom:40px;"></div>
                <div style="height:50px; width:180px; background:#ddd; border-radius:4px;"></div>
             </div>
        </div>
    `;

    try {
        const peca = await loadPecaEmCartaz();

        if (!peca) {
            container.innerHTML = `
                <div class="empty-cartaz" style="text-align:center; padding:40px;">
                    <h3>Sem produções em cena</h3>
                    <p>De momento não temos nenhuma peça em cartaz. 🙁</p>
                    <br>
                    <a href="index.html#pecas-grid" class="btn btn--primary">Ver Peças Anteriores</a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="cartaz-atual fade-in">
                <img src="${peca.imagem || 'placeholder.jpg'}" alt="${escapeHtmlSite(peca.nome)}" class="cartaz-poster" onerror="this.src='placeholder.jpg'">
                <div class="cartaz-info">
                    <h2>${escapeHtmlSite(peca.nome)}</h2>
                    <p>${escapeHtmlSite(peca.sinopse || '')}</p>
                    <div style="margin-top: 20px;">
                        <a href="peca.html?id=${peca.id}" class="btn btn--primary">Ver Detalhes</a>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        renderError(container, 'Erro ao carregar cartaz.', error);
    }
}

// ============================================
// RENDERIZAÇÃO - PÁGINA ARQUIVO (antigos.html)
// ============================================

async function renderArquivo() {
    const container = document.getElementById('arquivo-grid');
    if (!container) return;

    showSkeleton(container, 'card', 6);

    try {
        const pecas = await loadPecasFromFirebase();

        if (pecas.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Ainda não há peças registadas.</p></div>';
            return;
        }

        container.innerHTML = pecas.map(peca => `
            <article class="card fade-in">
                <a href="peca.html?id=${peca.id}">
                    <img src="${peca.imagem || 'placeholder.jpg'}" alt="${escapeHtmlSite(peca.nome)}" class="card__image" onerror="this.src='placeholder.jpg'">
                </a>
                <div class="card__content">
                    <h3 class="card__title">${escapeHtmlSite(peca.nome)}</h3>
                    <p class="card__text">${peca.sinopse ? escapeHtmlSite(peca.sinopse.substring(0, 100)) + '...' : ''}</p>
                    <div style="margin-bottom: 10px; font-size: 0.85em; color: #666;">
                        ${peca.ano ? 'Ano: ' + peca.ano : ''}
                    </div>
                    <a href="peca.html?id=${peca.id}" class="btn btn--primary">Ver mais</a>
                </div>
            </article>
        `).join('');

    } catch (error) {
        renderError(container, 'Erro ao carregar arquivo.', error);
    }
}

// ============================================
// RENDERIZAÇÃO - PÁGINA DE PEÇA (peca.html)
// ============================================

async function renderPecaDetalhes() {
    const container = document.getElementById('peca-detalhes');
    if (!container) return;

    // Obter ID da URL
    const urlParams = new URLSearchParams(window.location.search);
    const pecaId = urlParams.get('id');

    if (!pecaId) {
        renderFeedback(container, 'Peça não especificada', 'Não foi possível identificar a peça que procuras.');
        return;
    }

    container.innerHTML = '<div class="loading">A carregar... <br><small>A obter dados do servidor</small></div>';

    try {
        const doc = await siteDb.collection('pecas').doc(pecaId).get();
        if (!doc.exists) {
            renderFeedback(container, 'Peça não encontrada', 'A peça que procuras não existe ou foi removida.');
            return;
        }

        const peca = { id: doc.id, ...doc.data() };

        // Carregar dados relacionados em paralelo
        const [participacoes, membros] = await Promise.all([
            loadParticipacoesPeca(pecaId),
            loadMembrosFromFirebase()
        ]);

        // Atualizar título da página
        document.title = `${peca.nome} - Clube de Teatro`;

        // Atualizar hero se existir
        const heroTitle = document.querySelector('.hero__title');
        if (heroTitle) heroTitle.textContent = peca.nome;

        // Renderizar detalhes
        container.innerHTML = `
            <div class="profile fade-in">
                <img src="${peca.imagem || 'placeholder.jpg'}" alt="${escapeHtmlSite(peca.nome)}" class="profile__image" onerror="this.src='placeholder.jpg'">
                <div class="profile__content">
                    <h2>${escapeHtmlSite(peca.nome)}</h2>
                    ${peca.ano ? `<p><strong>Ano:</strong> ${peca.ano}</p>` : ''}
                    ${peca.autor ? `<p><strong>Autor:</strong> ${escapeHtmlSite(peca.autor)}</p>` : ''}
                    <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;">
                    <p style="white-space: pre-line;">${escapeHtmlSite(peca.sinopse || '')}</p>
                </div>
            </div>
            
            ${participacoes.length > 0 ? `
                <div style="margin-top: 30px;" class="fade-in">
                    <details class="accordion" open>
                        <summary>Elenco e Equipa Técnica</summary>
                        <div class="accordion__content" style="padding: 15px;">
                            <ul style="list-style: none; padding: 0;">
                                ${participacoes.map(p => {
            const membro = membros.find(m => m.id === p.membroId);
            return `
                                        <li style="margin-bottom: 10px; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px;">
                                            <strong>${membro ? `<a href="membro.html?id=${membro.id}">${escapeHtmlSite(membro.nome)}</a>` : 'Membro desconhecido'}</strong> 
                                            <span style="color: #666;"> como </span>
                                            <span>${escapeHtmlSite(p.funcao || 'Participante')}</span>
                                        </li>`;
        }).join('')}
                            </ul>
                        </div>
                    </details>
                </div>
            ` : '<p style="margin-top:20px; color:#666; font-style:italic;">Sem registo de elenco para esta peça.</p>'}

            <div style="margin-top: 30px; text-align: center;">
                <a href="index.html#pecas-grid" class="btn btn--secondary">← Voltar às Peças</a>
            </div>
        `;
    } catch (error) {
        renderError(container, 'Erro ao carregar detalhes.', error);
    }
}

// ============================================
// RENDERIZAÇÃO - PÁGINA DE MEMBRO (membro.html)
// ============================================

async function renderMembroDetalhes() {
    const container = document.getElementById('membro-detalhes');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const membroId = urlParams.get('id');

    if (!membroId) {
        renderFeedback(container, 'Membro não especificado', 'Por favor selecione um membro da lista.');
        return;
    }

    // Loader simples
    container.innerHTML = '<div class="loading">A carregar perfil...</div>';

    try {
        const doc = await siteDb.collection('membros').doc(membroId).get();
        if (!doc.exists) {
            renderFeedback(container, 'Membro Desconhecido', 'Este membro não foi encontrado na base de dados.');
            return;
        }

        const membro = { id: doc.id, ...doc.data() };

        // Carregar participações deste membro e peças para cruzar dados
        const [participacoesSnapshot, pecas] = await Promise.all([
            siteDb.collection('participacoes').where('membroId', '==', membroId).get(),
            loadPecasFromFirebase()
        ]);

        const participacoes = participacoesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Atualizar título
        document.title = `${membro.nome} - Clube de Teatro`;
        const heroTitle = document.querySelector('.hero__title');
        if (heroTitle) heroTitle.textContent = membro.nome;

        container.innerHTML = `
            <div class="profile fade-in">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(membro.nome)}&background=2c3e50&color=fff&size=512" alt="${escapeHtmlSite(membro.nome)}" class="profile__image">
                <div class="profile__content">
                    <h2 style="color:var(--accent); margin-bottom:10px;">Perfil</h2>
                    <p class="profile__name" style="font-size:2rem; font-weight:800; color:var(--primary); margin-bottom:5px;">${escapeHtmlSite(membro.nome)}</p>
                    <p class="member-card__role" style="margin-bottom:20px; text-align:left;">${escapeHtmlSite(membro.funcao || 'Colaborador')}</p>
                    
                    <div style="background:#f8fafc; padding:25px; border-radius:8px; border-left:4px solid var(--primary); margin-bottom:30px;">
                        <h3 style="font-size:0.9rem; text-transform:uppercase; color:var(--text-light); margin-bottom:10px; letter-spacing:1px;">Biografia</h3>
                        <p style="font-size:1.1rem; line-height:1.7; color:var(--text);">${escapeHtmlSite(membro.bio || 'Este membro ainda não forneceu uma biografiam detalhada.')}</p>
                    </div>

                    ${participacoes.length > 0 ? `
                        <h3 style="margin-bottom: 20px; font-weight:700; color:var(--primary);">Trajetória no Clube</h3>
                        <div class="participacoes-grid" style="display:grid; gap:15px;">
                            ${participacoes.map(p => {
            const peca = pecas.find(pc => pc.id === p.pecaId);
            return `
                                    <div style="padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            <span style="color:var(--text-light); font-size:0.8rem; text-transform:uppercase; font-weight:600;">Peça</span>
                                            <h4 style="margin:2px 0;">${peca ? `<a href="peca.html?id=${peca.id}" style="color:var(--primary);">${escapeHtmlSite(peca.nome)}</a>` : 'Peça Anterior'}</h4>
                                        </div>
                                        <div style="text-align:right;">
                                            <span style="color:var(--text-light); font-size:0.8rem; text-transform:uppercase; font-weight:600;">Papel</span>
                                            <p style="margin:2px 0; color:var(--accent); font-weight:700;">${escapeHtmlSite(p.funcao || 'Equipa')}</p>
                                        </div>
                                    </div>`;
        }).join('')}
                        </div>
                    ` : '<p style="margin-top:20px; color:#64748b; font-style:italic;">Ainda não tem participações registadas em espetáculos.</p>'}
                    
                    <div style="margin-top: 40px;">
                        <a href="membros.html" class="btn btn--secondary">← Voltar à Equipa</a>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        renderError(container, 'Erro ao carregar perfil.', error);
    }
}

// ============================================
// UTILITÁRIOS
// ============================================

function escapeHtmlSite(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Atualiza copyright automaticamente
function updateCopyrightYear() {
    const year = new Date().getFullYear();
    const copyrightElements = document.querySelectorAll('.copyright-year');
    if (copyrightElements.length > 0) {
        copyrightElements.forEach(el => el.textContent = year);
    } else {
        // Fallback for older legacy structure
        const footerP = document.querySelector('.footer p');
        if (footerP && footerP.textContent.includes('Clube de Teatro')) {
            if (!footerP.textContent.includes(year.toString())) {
                footerP.innerHTML = footerP.innerHTML.replace(/\d{4}/, year);
            }
        }
    }
}

function renderError(container, message, error) {
    container.innerHTML = `
        <div class="error-message" style="grid-column: 1/-1; text-align: center; color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 8px;">
            <h3>😕 Ops! Algo correu mal.</h3>
            <p>${message}</p>
            ${error ? `<code style="display:block; margin-top:10px; font-size:0.8em; color:#666;">${error.message || error}</code>` : ''}
            <button onclick="window.location.reload()" class="btn btn--secondary" style="margin-top:15px">Tentar Novamente</button>
        </div>`;
}

function renderFeedback(container, title, message) {
    container.innerHTML = `
        <div class="error-state" style="text-align:center; padding: 50px;">
            <h3>${title}</h3>
            <p>${message}</p>
            <a href="index.html" class="btn btn--secondary">Voltar ao Início</a>
        </div>`;
}

// ============================================
// CONFIGURAÇÃO DINÂMICA
// ============================================

async function applySiteConfig() {
    console.log('[Loader] A aplicar configurações do site...');
    try {
        const config = await loadSiteConfig();
        if (!config || Object.keys(config).length === 0) {
            console.log('[Loader] Use default config');
            return;
        }

        // Apply Club Name
        if (config.nomeClube) {
            if (document.title === 'Clube de Teatro') {
                document.title = config.nomeClube;
            }
            const clubNameFooter = document.getElementById('club-name-footer');
            if (clubNameFooter) clubNameFooter.textContent = config.nomeClube;
        }

        // Apply School Name
        if (config.escola) {
            const schoolHero = document.getElementById('school-name-hero');
            if (schoolHero) schoolHero.textContent = config.escola;

            const schoolFooter = document.getElementById('school-name-footer');
            if (schoolFooter) schoolFooter.textContent = config.escola;
        }

        // Apply Email
        if (config.email) {
            const emailEl = document.getElementById('contact-email');
            if (emailEl) {
                emailEl.textContent = config.email;
                emailEl.href = `mailto:${config.email}`;
            }
        }

        // Apply Hours
        if (config.horario) {
            const hoursEl = document.getElementById('contact-hours');
            if (hoursEl) hoursEl.textContent = config.horario;
        }

    } catch (e) {
        console.warn('[Loader] Failed to apply site config:', e);
    }
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Loader] Inicializando site-loader v2.1 (Dynamic Config)...');

    updateCopyrightYear();
    applySiteConfig(); // Aplicar config

    // Deteção baseada em ID do elemento contentor
    // É mais robusto do que verificar URL

    if (document.getElementById('pecas-grid')) renderHomePecas();
    if (document.getElementById('professores-grid') || document.getElementById('alunos-grid')) renderMembros();
    if (document.getElementById('cartaz-container')) renderCartaz();
    if (document.getElementById('arquivo-grid')) renderArquivo();
    if (document.getElementById('peca-detalhes')) renderPecaDetalhes();
    if (document.getElementById('membro-detalhes')) renderMembroDetalhes();
});