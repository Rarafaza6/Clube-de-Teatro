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

// Carrega todas as peças (excluindo rascunhos para site público)
// Theme Management
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// REST OF THE CODE
async function loadPecasFromFirebase() {
    console.log('[Loader] A carregar peças...');
    try {
        const snapshot = await siteDb.collection('pecas').orderBy('ano', 'desc').get();
        const pecas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filtrar rascunhos - só mostrar peças publicadas no site público
        return pecas.filter(p => !p.rascunho);
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

// Carrega config do site (incluindo layout global)
async function loadSiteConfig() {
    try {
        const [siteDoc, layoutDoc] = await Promise.all([
            siteDb.collection('config').doc('site').get(),
            siteDb.collection('config').doc('layout').get()
        ]);

        const config = siteDoc.exists ? siteDoc.data() : {};
        const layoutData = layoutDoc.exists ? layoutDoc.data() : { layout: [] };

        return { ...config, layout: layoutData.layout };
    } catch (error) {
        console.error('[Loader] Erro ao carregar configurações:', error);
        return { layout: [] };
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
                    <div style="margin-bottom: 10px; font-size: 0.85em; color: var(--text-light);">
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
                    <p>${escapeHtmlWithBr(peca.sinopse || '')}</p>
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

        // Cinematic Hero Update
        const heroTitle = document.getElementById('peca-title-main');
        if (heroTitle) heroTitle.textContent = peca.nome;

        const heroBg = document.getElementById('peca-hero-bg');
        if (heroBg && peca.imagem) {
            heroBg.style.backgroundImage = `url('${peca.imagem}')`;
            heroBg.style.opacity = '1';

            // Add subtle parallax effect on scroll
            window.addEventListener('scroll', () => {
                const scrolled = window.scrollY;
                if (scrolled < 800) {
                    heroBg.style.transform = `scale(1.1) translateY(${scrolled * 0.4}px)`;
                }
            });
        }

        // Renderizar detalhes
        container.innerHTML = `
            <div class="peca-layout fade-in">
                <!-- Sidebar Info -->
                <aside class="peca-sidebar">
                    <img src="${peca.imagem || 'placeholder.jpg'}" alt="${escapeHtmlSite(peca.nome)}" class="peca-poster" onerror="this.src='placeholder.jpg'">
                    
                    <div class="glass-card peca-meta-card">
                        <div class="meta-item">
                            <span class="meta-label">Ano</span>
                            <span class="meta-value">${peca.ano || '-'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Autor</span>
                            <span class="meta-value">${escapeHtmlSite(peca.autor || 'Desconhecido')}</span>
                        </div>
                    </div>

                    ${peca.emCartaz ? (peca.requerBilhete ? (peca.reservasAbertas !== false ? `
                        <div class="glass-card peca-booking-card">
                            <h3>🎟️ Reserva de Bilhetes</h3><br>
                              <a href="bilhetes.html?peca=${peca.id}" class="btn btn--primary" style="width: 100%; padding:15px; font-weight:800; border-radius:8px;">
                                Reservar Agora
                            </a><br><br>
                            <p style="margin-bottom: 20px;">Pode também ser comprado no local no dia.</p>
                        </div>
                    ` : `
                        <div class="glass-card peca-booking-card" style="opacity: 0.8; text-align:center;">
                            <h3>🎟️ Reservas</h3><br>
                            <p style="font-weight:700; color:var(--color-primary); background:rgba(255,255,255,0.1); padding:10px; border-radius:8px;">As reservas para esta peça abrem brevemente.</p>
                            <p style="margin-top:20px; font-size:0.9rem;">Pode também ser comprado no local no dia.</p>
                        </div>
                    `) : `
                        <div class="glass-card peca-booking-card peca-booking-card--free">
                            <h3>✨ Entrada Livre</h3>
                            <p>Não é necessária reserva para este espetáculo.</p>
                        </div>
                    `) : ''}
                </aside>

                <!-- Main Content -->
                <main class="peca-main">
                    <div class="glass-card peca-description-card">
                        <h2 class="peca-subtitle">Sinopse</h2>
                        <p class="peca-sinopse">${escapeHtmlWithBr(peca.sinopse || 'Sem sinopse disponível.')}</p>
                    </div>

                    <!-- Sessões Grid -->
                    ${peca.emCartaz && peca.sessoes && peca.sessoes.length > 0 ? `
                        <div class="glass-card peca-sessions-card">
                            <h2 class="peca-subtitle">Próximas Sessões</h2>
                            <div class="sessions-list">
                                ${peca.sessoes.map(s => `
                                    <div class="session-row">
                                        <div class="session-info-main">
                                            <div class="session-date-box">
                                                <span class="session-day">${new Date(s.data).getDate()}</span>
                                                <span class="session-month">${new Date(s.data).toLocaleString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase()}</span>
                                            </div>
                                            <div class="session-time">
                                                ${new Date(s.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}h
                                            </div>
                                        </div>
                                        <div class="session-place">
                                            <i class="fas fa-map-marker-alt"></i> ${s.local || 'Auditório'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${participacoes.length > 0 ? `
                        <div class="glass-card peca-cast-card">
                            <h2 class="peca-subtitle">Elenco e Equipa Técnica</h2>
                            <div class="cast-grid">
                                ${participacoes.map(p => {
            const membro = membros.find(m => m.id === p.membroId);
            return `
                                        <div class="cast-item">
                                            <span class="cast-name">${membro ? `<a href="membro.html?id=${membro.id}">${escapeHtmlSite(membro.nome)}</a>` : 'Membro desconhecido'}</span>
                                            <span class="cast-role">${escapeHtmlSite(p.funcao || 'Participante')}</span>
                                        </div>`;
        }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${renderMemoryGalleryCinematic(peca)}

                    <div style="margin-top: 60px; text-align: center; padding-bottom: 40px;">
                        <a href="cartaz.html" class="btn btn--secondary" style="opacity:0.8;">← Voltar ao Cartaz</a>
                    </div>
                </main>
            </div>
        `;
    } catch (error) {
        renderError(container, 'Erro ao carregar detalhes.', error);
    }
}

function renderMemoryGalleryCinematic(peca) {
    const hasPhotos = peca.galeriaFotos && peca.galeriaFotos.length > 0;
    const hasVideos = peca.galeriaVideos && peca.galeriaVideos.length > 0;

    if (!hasPhotos && !hasVideos) return '';

    return `
        <div style="margin-top: 50px;">
            ${hasPhotos ? `
                <div class="glass-card peca-gallery-card">
                    <h2 class="peca-subtitle">Galeria de Recordações</h2>
                    <div class="peca-gallery">
                        ${peca.galeriaFotos.map(url => `
                            <div class="gallery-item" onclick="openLightbox('${url}')">
                                <img src="${url}" loading="lazy" onerror="this.src='placeholder.jpg'">
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${hasVideos ? `
                <div class="glass-card peca-video-card">
                    <h2 class="peca-subtitle">Vídeos</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px;">
                        ${peca.galeriaVideos.map(url => {
        const embedUrl = getVideoEmbedUrl(url);
        return `
                            <div style="aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.1);">
                                <iframe 
                                    src="${embedUrl}" 
                                    width="100%" 
                                    height="100%" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowfullscreen
                                    referrerpolicy="strict-origin-when-cross-origin">
                                </iframe>
                            </div>
                        `;
    }).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function getVideoEmbedUrl(url) {
    if (!url) return '';
    let videoId = '';

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        if (url.includes('watch?v=')) {
            videoId = url.split('watch?v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('youtube.com/embed/')[1].split('?')[0];
        } else if (url.includes('youtube.com/shorts/')) {
            videoId = url.split('youtube.com/shorts/')[1].split('?')[0];
        }
        return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : url;
    }

    // Vimeo
    if (url.includes('vimeo.com/')) {
        videoId = url.split('vimeo.com/')[1].split('?')[0].split('#')[0];
        return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }

    return url;
}

// Global Lightbox for Site
function openLightbox(src) {
    let lightbox = document.getElementById('siteLightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'siteLightbox';
        lightbox.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:10000; display:none; align-items:center; justify-content:center; cursor:zoom-out; backdrop-filter:blur(10px);';
        lightbox.onclick = () => lightbox.style.display = 'none';
        lightbox.innerHTML = `
            <img id="lightboxImg" style="max-width:95%; max-height:95%; border-radius:8px; box-shadow:0 0 50px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1);">
            <button style="position:absolute; top:30px; right:30px; background:none; border:none; color:white; font-size:2rem; cursor:pointer;">✕</button>
        `;
        document.body.appendChild(lightbox);
    }
    document.getElementById('lightboxImg').src = src;
    lightbox.style.display = 'flex';
}

window.openLightbox = openLightbox;

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
                    
                    <div class="glass-card" style="padding:25px; border-left:4px solid var(--primary); margin-bottom:30px;">
                        <h3 style="font-size:0.9rem; text-transform:uppercase; color:var(--text-light); margin-bottom:10px; letter-spacing:1px;">Biografia</h3>
                        <p style="font-size:1.1rem; line-height:1.7; color:var(--text);">${escapeHtmlSite(membro.bio || 'Este membro ainda não forneceu uma biografia detalhada.')}</p>
                    </div>

                    ${participacoes.length > 0 ? `
                        <h3 style="margin-bottom: 20px; font-weight:700; color:var(--primary);">Trajetória no Clube</h3>
                        <div class="participacoes-grid" style="display:grid; gap:15px;">
                            ${participacoes.map(p => {
            const peca = pecas.find(pc => pc.id === p.pecaId);
            return `
                                    <div class="glass-card" style="padding: 15px; margin-bottom: 0; display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            <span style="color:var(--text-light); font-size:0.8rem; text-transform:uppercase; font-weight:600;">Peça</span>
                                            <h4 style="margin:2px 0;">${peca ? `<a href="peca.html?id=${peca.id}" style="color:var(--accent); font-weight:700;">${escapeHtmlSite(peca.nome)}</a>` : 'Peça Anterior'}</h4>
                                        </div>
                                        <div style="text-align:right;">
                                            <span style="color:var(--text-light); font-size:0.8rem; text-transform:uppercase; font-weight:600;">Papel</span>
                                            <p style="margin:2px 0; color:var(--text); font-weight:700;">${escapeHtmlSite(p.funcao || 'Equipa')}</p>
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

function escapeHtmlWithBr(text) {
    if (!text) return '';
    // Primeiro escapa tudo para segurança
    let escaped = escapeHtmlSite(text);
    // Depois volta a converter &lt;br&gt; ou &lt;br/&gt; em tags reais
    return escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
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
        window.currentSiteConfig = config; // Store globally for fallback functionality

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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Loader] Inicializando site-loader v2.2 (Bilheteira)...');

    updateCopyrightYear();
    await applySiteConfig();

    // Deteção baseada em ID do elemento contentor
    if (document.getElementById('pecas-grid')) renderHomePecas();
    if (document.getElementById('professores-grid') || document.getElementById('alunos-grid')) renderMembros();
    if (document.getElementById('cartaz-container')) renderCartaz();
    if (document.getElementById('arquivo-grid')) renderArquivo();
    if (document.getElementById('peca-detalhes')) renderPecaDetalhes();
    if (document.getElementById('membro-detalhes')) renderMembroDetalhes();
    if (document.getElementById('booking-container')) renderBilhetes();
    if (document.getElementById('verificar-container')) renderVerificador();
    if (document.getElementById('recoveryResults')) {
        // Any recovery page specific init if needed? 
    }
});

// ============================================
// BILHETEIRA - PÁGINA DE RESERVA
// ============================================

let selectedSeats = [];
let currentPecaData = null;
let currentTokenData = null;
let bookings = []; // Local cache of reservations
let currentSessaoId = null;

async function renderBilhetes() {
    const container = document.getElementById('booking-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const pecaId = urlParams.get('peca');
    const token = urlParams.get('token');
    const adminMode = urlParams.get('mode') === 'admin';

    if (!pecaId) {
        container.innerHTML = '<div class="error-state" style="text-align:center; padding:50px;"><h3>Peça não especificada</h3><a href="index.html" class="btn btn--primary">Voltar</a></div>';
        return;
    }

    try {
        // Carregar peça
        const doc = await siteDb.collection('pecas').doc(pecaId).get();
        if (!doc.exists) throw new Error('Peça não encontrada');

        currentPecaData = { id: doc.id, ...doc.data() };

        const requerReserva = currentPecaData.requerReserva || currentPecaData.requerBilhete || false;
        if (!requerReserva) {
            container.innerHTML = '<div class="error-state" style="text-align:center; padding:50px;"><h3>Esta peça não requer reserva de bilhete</h3><a href="peca.html?id=' + pecaId + '" class="btn btn--primary">Ver Peça</a></div>';
            return;
        }

        // Atualizar header
        const pecaNomeEl = document.getElementById('pecaNome');
        if (pecaNomeEl) pecaNomeEl.textContent = currentPecaData.nome;
        document.title = `Reservar - ${currentPecaData.nome}`;

        // Validar token se existir
        if (token) {
            currentTokenData = await validateCastToken(token);
            if (!currentTokenData.valid) {
                currentTokenData = null;
            }
        }

        // SETUP SESSION (Se houver múltiplas)
        const sessoes = currentPecaData.sessoes || [];
        if (sessoes.length > 0) {
            // Sort by date just in case
            sessoes.sort((a, b) => new Date(a.data) - new Date(b.data));
            // Default to first session
            currentSessaoId = sessoes[0].id;
        } else {
            currentSessaoId = 'default';
        }

        // Carregar reservas
        bookings = await getReservas(pecaId);

        // Initial Render
        renderBookingUI(container, adminMode);

    } catch (error) {
        console.error('[Bilhetes] Erro:', error);
        container.innerHTML = `<div class="error-state" style="text-align:center; padding:50px;"><h3>Erro ao carregar</h3><p>${error.message}</p></div>`;
    }
}

function renderBookingUI(container, adminMode) {
    // Standardization: Force global layout for consistency
    let layout = window.currentSiteConfig?.layout;

    // Fallback if global is missing
    if (!layout || layout.length === 0) {
        layout = [
            { fila: 'A', map: '1111111111' },
            { fila: 'B', map: '111111111111' },
            { fila: 'C', map: '11111111111111' },
            { fila: 'D', map: '11111111111111' },
            { fila: 'E', map: '111111111111' }
        ];
    }
    const sessoes = currentPecaData.sessoes || [];

    // Filter reservations by session and expiration
    const reservasDaSessao = bookings.filter(r =>
        (r.sessaoId || 'default') === currentSessaoId && !isReservaExpirada(r)
    );
    const reservadosMap = new Map();
    reservasDaSessao.forEach(r => {
        reservadosMap.set(`${r.fila}-${r.lugar}`, r);
    });

    let html = '';

    // Header Info (Admin or Token)
    if (adminMode) {
        html += `
            <div class="cast-badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                👑 <strong>MODO ADMINISTRADOR</strong>
                <div class="quota-info">Emissão de bilhete manual (ignora pagamento)</div>
            </div>
        `;
    } else if (currentTokenData) {
        if (currentTokenData.isTurma) {
            html += `
                <div class="cast-badge" style="background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);">
                    🏫 <strong>Turma ${escapeHtmlSite(currentTokenData.turma)}</strong>
                    <div class="quota-info">Podem ser reservados até ${currentTokenData.quotaRestante} lugar(es) gratuito(s)</div>
                </div>
            `;
        } else {
            html += `
                <div class="cast-badge">
                    🎭 Olá, <strong>${escapeHtmlSite(currentTokenData.membroNome)}</strong>!
                    <div class="quota-info">Podes reservar até ${currentTokenData.quotaRestante} lugar(es) gratuito(s)</div>
                </div>
            `;
        }
    }

    // Session Selector
    if (sessoes.length > 0) {
        // Restricted Token Check
        const restrictedSessionId = currentTokenData?.sessaoId;
        const isRestricted = !!restrictedSessionId;

        // Force session if restricted
        if (isRestricted && currentSessaoId !== restrictedSessionId) {
            // Defer the update to avoid render loop issues
            setTimeout(() => changeSession(restrictedSessionId), 0);
        }

        html += `<div style="margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border: 1px solid ${isRestricted ? '#f59e0b' : '#e2e8f0'}; color: #1e293b;">
            <label style="display:block; font-weight:600; margin-bottom:5px; color: #1e293b;">📅 Escolhe a Sessão:</label>
            ${isRestricted ? '<div style="font-size:0.9rem; color:#d97706; margin-bottom:8px;">⚠️ Este convite é válido apenas para esta sessão.</div>' : ''}
            <select onchange="changeSession(this.value)" ${isRestricted ? 'disabled' : ''} style="width:100%; padding:10px; border-radius:6px; font-size:1rem; border:1px solid #cbd5e1; background: white; color: #1e293b; ${isRestricted ? 'background:#fef3c7; color:#92400e;' : ''}">
                ${sessoes.map(s => `
                    <option value="${s.id}" ${s.id === (isRestricted ? restrictedSessionId : currentSessaoId) ? 'selected' : ''}>
                        ${new Date(s.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })} às ${new Date(s.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} 
                        ${s.local ? `(${s.local})` : ''}
                    </option>
                `).join('')}
            </select>
        </div>`;
    }

    html += `
        <div class="stage-indicator">🎭 PALCO 🎭</div>
        <div class="seat-map" id="seatMap">
    `;

    layout.forEach(row => {
        // Normalize map (Legacy support)
        const map = row.map || (row.lugares ? '1'.repeat(row.lugares) : '');

        html += `<div class="seat-row"><span class="seat-row-label">${row.fila}</span>`;

        let seatNum = 0;
        [...map].forEach(char => {
            if (char === '1') {
                seatNum++;
                const i = seatNum;

                const seatId = `${row.fila}-${i}`;
                const reservation = reservadosMap.get(seatId);
                const isOccupied = !!reservation && !selectedSeats.some(s => s.fila === row.fila && s.lugar === i);
                const isSelected = selectedSeats.some(s => s.fila === row.fila && s.lugar === i);

                let seatClass = 'seat seat--available';
                let content = i;

                if (isOccupied) {
                    seatClass = 'seat seat--occupied';
                    if (reservation.turma) {
                        content = reservation.turma;
                    }
                }
                if (isSelected) seatClass = 'seat seat--selected';

                const onClick = isOccupied ? '' : `onclick="toggleSeat('${row.fila}', ${i})"`;
                const tooltip = isOccupied && reservation.turma ? `Turma ${reservation.turma}` : (isOccupied ? 'Ocupado' : `Lugar ${i}`);

                html += `<div class="${seatClass}" id="seat-${seatId}" title="${escapeHtmlSite(tooltip)}" ${onClick} style="${isOccupied && reservation.turma ? 'font-size: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' : ''}">${content}</div>`;
            } else {
                // Spacer
                html += `<div style="width:32px; height:32px;"></div>`;
            }
        });

        html += `<span class="seat-row-label">${row.fila}</span></div>`;
    });

    html += `</div>`;

    html += `
        <div class="seat-legend">
            <div class="legend-item"><div class="legend-box" style="background:#22c55e;"></div> Disponível</div>
            <div class="legend-item"><div class="legend-box" style="background:#3b82f6;"></div> Selecionado</div>
            <div class="legend-item"><div class="legend-box" style="background:#94a3b8;"></div> Ocupado</div>
        </div>
    `;

    html += `
        <div class="booking-form">
            <div class="booking-summary" id="bookingSummary" style="${selectedSeats.length ? 'display:block' : 'display:none'}">
                <strong>Lugares selecionados:</strong> <span id="selectedSeatsList">${selectedSeats.map(s => `${s.fila}${s.lugar}`).join(', ')}</span>
            </div>
            
            <form id="reservaForm" onsubmit="submitReserva(event, ${adminMode})">
                ${currentTokenData?.isTurma ? `
                    <input type="hidden" id="reservaNome" value="Turma ${escapeHtmlSite(currentTokenData.turma)}">
                    <input type="hidden" id="reservaEmail" value="turma@aecidadela.pt">
                    <input type="hidden" id="reservaTelefone" value="">
                    <input type="hidden" id="reservaTermos" value="checked" checked>
                ` : `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label style="font-weight:600; margin-bottom:5px; display:block;">Nome Completo</label>
                            <input type="text" id="reservaNome" required style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight:600; margin-bottom:5px; display:block;">Email</label>
                            <input type="email" id="reservaEmail" required style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                        </div>
                    </div>
                    <div class="form-group" style="margin-top:15px;">
                        <label style="font-weight:600; margin-bottom:5px; display:block;">Telefone</label>
                        <input type="tel" id="reservaTelefone" style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:8px;">
                    </div>
                    <div class="form-group" style="margin: 15px 0; display: flex; align-items: flex-start; gap: 10px;">
                        <input type="checkbox" id="reservaTermos" required style="width: 20px; height: 20px; margin-top: 2px; cursor: pointer;">
                        <label for="reservaTermos" style="font-size: 0.85rem; color: #475569; cursor: pointer; line-height:1.4;" class="form-label-readability">
                            Li e aceito os <a href="termos.html" target="_blank" style="color: #3b82f6; text-decoration: underline; font-weight: 600;">Termos e Condições</a> de reserva e pagamento.
                        </label>
                    </div>
                `}
                <button type="submit" id="submitBtn" class="btn btn--primary" style="width:100%; margin-top:20px; padding:15px;" ${selectedSeats.length === 0 ? 'disabled' : ''}>
                    ${getSubmitButtonText(adminMode, selectedSeats.length)}
                </button>
                ${(() => {
            const localPagamento = currentPecaData.localPagamento || window.currentSiteConfig?.localPagamento || 'bilheteira';
            return !adminMode && !currentTokenData && currentPecaData.pecaPaga ? `<p style="margin-top:15px; font-size:0.9rem; color:#64748b; text-align:center;">Deve ser pago em até 24h após o registo no <strong>${localPagamento}</strong>.</p>` : '';
        })()}
                ${!adminMode && !currentTokenData && !currentPecaData.pecaPaga && currentPecaData.requerReserva ? '<p style="margin-top:15px; font-size:0.9rem; color:#16a34a; text-align:center; font-weight:600;">✨ Entrada Livre — Basta reservares o teu lugar!</p>' : ''}
            </form>
        </div>
    `;

    container.innerHTML = html;
}

function getSubmitButtonText(adminMode, count) {
    if (count === 0) return 'Seleciona pelo menos um lugar';
    if (adminMode) return `👑 Emitir ${count} Bilhete(s) Manualmente`;
    if (currentTokenData) return `🎟️ Reservar ${count} Bilhete(s) Grátis`;

    if (currentPecaData && currentPecaData.pecaPaga && currentPecaData.preco) {
        const total = (count * currentPecaData.preco).toFixed(2);
        return `Reservar (${total}€)`;
    }

    return `Reservar ${count} Lugar(es) Grátis`;
}

function changeSession(sessaoId) {
    currentSessaoId = sessaoId;
    selectedSeats = []; // Clear selection when changing session
    const adminMode = new URLSearchParams(window.location.search).get('mode') === 'admin';
    renderBookingUI(document.getElementById('booking-container'), adminMode);
}
window.changeSession = changeSession;

function toggleSeat(fila, lugar) {
    const seatId = `${fila}-${lugar}`;
    const seatEl = document.getElementById(`seat-${seatId}`);
    const adminMode = new URLSearchParams(window.location.search).get('mode') === 'admin';

    const index = selectedSeats.findIndex(s => s.fila === fila && s.lugar === lugar);

    if (index >= 0) {
        selectedSeats.splice(index, 1);
        seatEl.classList.remove('seat--selected');
        seatEl.classList.add('seat--available');
    } else {
        // Check quota for cast members
        if (!adminMode && currentTokenData && selectedSeats.length >= currentTokenData.quotaRestante) {
            alert(`Só podes selecionar até ${currentTokenData.quotaRestante} lugar(es) gratuito(s)`);
            return;
        }
        selectedSeats.push({ fila, lugar });
        seatEl.classList.remove('seat--available');
        seatEl.classList.add('seat--selected');
    }

    updateBookingSummary(adminMode);
}
window.toggleSeat = toggleSeat;

function updateBookingSummary(adminMode) {
    const summaryDiv = document.getElementById('bookingSummary');
    const listSpan = document.getElementById('selectedSeatsList');
    const submitBtn = document.getElementById('submitBtn');

    if (selectedSeats.length === 0) {
        summaryDiv.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Seleciona pelo menos um lugar';
    } else {
        summaryDiv.style.display = 'block';
        listSpan.textContent = selectedSeats.map(s => `${s.fila}${s.lugar}`).join(', ');
        submitBtn.disabled = false;
        submitBtn.textContent = getSubmitButtonText(adminMode, selectedSeats.length);
    }
}

async function submitReserva(e, adminMode = false) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'A processar...';

    const isTurma = currentTokenData && currentTokenData.isTurma;
    const nome = document.getElementById('reservaNome').value;
    const email = document.getElementById('reservaEmail').value;
    const telefone = document.getElementById('reservaTelefone').value;
    const termos = document.getElementById('reservaTermos');

    if (!adminMode && !isTurma && termos && !termos.checked) {
        alert('Deves aceitar os Termos e Condições para prosseguir.');
        submitBtn.disabled = false;
        submitBtn.textContent = getSubmitButtonText(adminMode, selectedSeats.length);
        return;
    }

    try {
        // Criar reservas (agora SEMPRE cria a reserva primeiro)
        const reservasFeitas = [];

        // Determine initial payment status
        let statusInicial = 'pendente';
        if (adminMode) statusInicial = 'bypassed';
        if (currentTokenData) statusInicial = 'isento';

        const grupoId = (currentTokenData && currentTokenData.isTurma) ? generateGroupCode() : null;

        for (const seat of selectedSeats) {
            const result = await addReserva({
                pecaId: currentPecaData.id,
                sessaoId: currentSessaoId,
                fila: seat.fila,
                lugar: seat.lugar,
                nomeReservante: nome,
                email: email,
                telefone: telefone,
                tokenElenco: currentTokenData ? currentTokenData.tokenId : null,
                pagamentoStatus: statusInicial,
                turma: currentTokenData ? currentTokenData.turma : null,
                grupoId: grupoId
            });
            reservasFeitas.push({ ...seat, id: result.id, codigoBilhete: result.codigoBilhete, sessaoId: currentSessaoId, grupoId: grupoId });
        }

        // Atualizar quota do token se usado
        if (currentTokenData) {
            await useTokenQuota(currentTokenData.tokenId, selectedSeats.length);
        }

        // Gerar PDF para todos (Já não há Stripe redirecionamento)
        await generateTicketPDF(reservasFeitas, nome, currentPecaData);
        let message = '';
        if (!adminMode && !currentTokenData) {
            if (currentPecaData.pecaPaga && currentPecaData.preco) {
                const total = (selectedSeats.length * currentPecaData.preco).toFixed(2);
                const localPagamento = currentPecaData.localPagamento || window.currentSiteConfig?.localPagamento || 'bilheteira';
                message = `<div style="margin: 20px 0; padding: 15px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
                    <p style="margin:0; font-weight:600; color:#92400e;">💰 Pagamento Pendente: ${total}€</p>
                    <p style="margin:5px 0 0 0; font-size:0.9rem; color:#92400e;">Deve ser pago em até 24h após o registo em <strong>${localPagamento}</strong>.</p>
                </div>`;
            } else {
                message = `<p style="color:#16a34a; font-weight:600;">✨ Esta reserva é gratuita.</p>`;
            }
        }

        // Sucesso
        document.getElementById('booking-container').innerHTML = `
            <div style="text-align:center; padding:50px;">
                <h2 style="color:#22c55e;">✅ Reserva Confirmada!</h2>
                <p>Os teus bilhetes foram emitidos com sucesso.</p>
                <p><strong>Lugares:</strong> ${reservasFeitas.map(r => `${r.fila}${r.lugar}`).join(', ')}</p>
                <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px; display: inline-block;">
                    📥 O download do PDF começou automaticamente.
                </div>
                ${message}
                <br>
                <a href="peca.html?id=${currentPecaData.id}" class="btn btn--secondary" style="margin-top:20px;">Voltar à Peça</a>
                ${adminMode ? `<br><br><button onclick="location.reload()" class="btn btn--outline">Emitir Novo Bilhete</button>` : ''}
            </div>
        `;

    } catch (error) {
        console.error('[Reserva] Erro:', error);
        alert('Erro ao fazer reserva: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tentar Novamente';
    }
}
window.generateTicketPDF = generateTicketPDF;
window.submitReserva = submitReserva;

async function generateTicketPDF(reservas, nome, peca) {
    if (typeof window.jspdf === 'undefined') {
        console.error('jsPDF not loaded');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });

    // Load Logo (Optional)
    let logoData = null;
    try {
        const logoImg = new Image();
        logoImg.src = 'teatro.png';
        await new Promise(r => { logoImg.onload = r; logoImg.onerror = r; });
        logoData = logoImg;
    } catch (e) { }

    // Session Text
    let sessaoDate = '-';
    let sessaoTime = '-';
    let sessaoLocal = 'Auditório';
    if (reservas[0].sessaoId && peca.sessoes) {
        const sessao = peca.sessoes.find(s => s.id === reservas[0].sessaoId);
        if (sessao) {
            sessaoDate = new Date(sessao.data).toLocaleDateString('pt-PT');
            sessaoTime = new Date(sessao.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) + 'h';
            sessaoLocal = sessao.local || 'Auditório';
        }
    }

    const isGroup = reservas.some(r => r.grupoId) || (window.currentTokenData && window.currentTokenData.isTurma);
    const grupoId = reservas[0].grupoId || (window.currentTokenData?.isTurma ? generateGroupCode() : null);

    if (isGroup && grupoId) {
        // --- PREMIUM MINIMALIST GROUP TICKET ---
        const w = 210;
        const h = 148;

        // Background & Frame
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, w, h, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1.5);
        doc.rect(8, 8, w - 16, h - 16, 'S');

        // Header Section
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text('BILHETE DE GRUPO • CLUBE DE TEATRO DA CIDADELA', w / 2, 18, { align: 'center' });

        doc.setFont('times', 'bold');
        doc.setFontSize(32);
        doc.text(peca.nome.toUpperCase(), w / 2, 35, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`${sessaoDate} • ${sessaoTime} • ${sessaoLocal}`, w / 2, 42, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(20, 48, w - 20, 48);

        // Content Grid
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('VISITANTE / TURMA', 20, 60);
        doc.text('LUGARES RESERVADOS', w - 20, 60, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        const visitorName = reservas[0].turma || nome;
        doc.text(visitorName.toUpperCase(), 20, 68);

        doc.setFontSize(10);
        const seatList = reservas.map(r => `${r.fila}${r.lugar}`).join(', ');
        const wrappedSeats = doc.splitTextToSize(seatList, 80);
        doc.text(wrappedSeats, w - 20, 68, { align: 'right' });

        // QR Code Section
        doc.setLineWidth(1);
        doc.rect(w / 2 - 25, 80, 50, 50, 'S');

        const qrDiv = document.getElementById('qr-temp');
        if (qrDiv) {
            qrDiv.innerHTML = '';
            new QRCode(qrDiv, {
                text: grupoId,
                width: 200, height: 200,
                colorDark: "#000000", colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            await new Promise(res => setTimeout(res, 80));
            const qrImg = qrDiv.querySelector('img');
            if (qrImg) {
                doc.addImage(qrImg.src, 'PNG', w / 2 - 22, 83, 44, 44);
            }
        }

        doc.setFont('courier', 'bold');
        doc.setFontSize(12);
        doc.text(grupoId, w / 2, 138, { align: 'center' });

    } else {
        // --- INDIVIDUAL TICKETS (1 per page) ---
        for (let i = 0; i < reservas.length; i++) {
            const r = reservas[i];
            if (i > 0) doc.addPage();

            const w = 210;
            const h = 148;

            // Background & Frame
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, w, h, 'F');
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(1);
            doc.rect(8, 8, w - 16, h - 16, 'S');

            // Header Section
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('BILHETE INDIVIDUAL • CLUBE DE TEATRO DA CIDADELA', w / 2, 18, { align: 'center' });

            doc.setFont('times', 'bold');
            doc.setFontSize(34);
            const playTitle = peca.nome.toUpperCase();
            if (doc.getTextWidth(playTitle) > 160) doc.setFontSize(24);
            doc.text(playTitle, w / 2, 35, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`${sessaoDate} • ${sessaoTime} • ${sessaoLocal}`, w / 2, 42, { align: 'center' });

            doc.setLineWidth(0.5);
            doc.line(20, 48, w - 20, 48);

            // Info Logic
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('VISITANTE', 20, 60);
            doc.text('LUGAR', w - 40, 60);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(14);
            doc.text(nome.length > 30 ? nome.substring(0, 28) + '...' : nome, 20, 68);
            doc.setFont('helvetica', 'bold');
            doc.text(`${r.fila}${r.lugar}`, w - 40, 68);

            // QR Code display (Centered bottom)
            doc.setLineWidth(1);
            doc.rect(w / 2 - 25, 80, 50, 50, 'S');

            const qrDiv = document.getElementById('qr-temp');
            if (qrDiv) {
                qrDiv.innerHTML = '';
                new QRCode(qrDiv, {
                    text: r.codigoBilhete,
                    width: 200, height: 200,
                    colorDark: "#000000", colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                await new Promise(res => setTimeout(res, 80));
                const qrImg = qrDiv.querySelector('img');
                if (qrImg) {
                    doc.addImage(qrImg.src, 'PNG', w / 2 - 22, 83, 44, 44);
                }
            }

            doc.setFont('courier', 'bold');
            doc.setFontSize(12);
            doc.text(r.codigoBilhete, w / 2, 138, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.text('APRESENTA ESTE CÓDIGO À ENTRADA DO AUDITÓRIO', w / 2, 144, { align: 'center' });
        }
    }
    doc.save(`Ticket-${peca.nome.replace(/\s+/g, '-')}-${new Date().getTime()}.pdf`);
}

// ============================================
// BILHETEIRA - PÁGINA DE VERIFICAÇÃO
// ============================================

async function renderVerificador() {
    const container = document.getElementById('verificar-container');
    if (!container) return;

    // Check Secure Context
    const isSecure = window.isSecureContext;
    let warning = '';

    // Simple check: host is not localhost and protocol is http
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttp = window.location.protocol === 'http:';

    if (isHttp && !isLocalhost) {
        warning = `
            <div style="background: #fff1f2; color: #be123c; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left; border: 1px solid #fda4af;">
                <strong>⚠️ Câmara Bloqueada pelo Browser</strong><br>
                A maioria dos browsers bloqueia o acesso à câmara em ligações não seguras (HTTP).<br>
                Para testar, usa localhost ou ativa as permissões de "Insecure origins".
            </div>
        `;
    }

    container.innerHTML = `
        <div style="max-width:500px; margin:0 auto; padding:20px;">
            <h2 style="text-align:center; margin-bottom:30px;">🎫 Verificar Bilhete</h2>
            
            ${warning}

            <div id="scanner-container" style="margin-bottom:20px;"></div>
            
            <div style="text-align:center; margin:20px 0; color:#64748b;">— ou —</div>
            
            <form onsubmit="verificarCodigo(event)">
                <input type="text" id="codigoManual" placeholder="Código do bilhete (ex: TEATRO-XXXXXXXX)" 
                    style="width:100%; padding:15px; border:2px solid #e2e8f0; border-radius:8px; font-size:16px; text-align:center;">
                <button type="submit" class="btn btn--primary" style="width:100%; margin-top:15px; padding:15px;">
                    Verificar Código
                </button>
            </form>
            
            <div id="resultadoVerificacao" style="margin-top:30px;"></div>
        </div>
    `;

    // Iniciar scanner se disponível
    if (typeof Html5QrcodeScanner !== 'undefined') {
        const scanner = new Html5QrcodeScanner("scanner-container", { fps: 10, qrbox: 250 });
        scanner.render(onScanSuccess, onScanError);
    }
}

function onScanSuccess(codigo) {
    document.getElementById('codigoManual').value = codigo;
    verificarCodigoInterno(codigo);
}

function onScanError(error) {
    // Silenciar erros de scan
}

async function verificarCodigo(e) {
    e.preventDefault();
    const codigo = document.getElementById('codigoManual').value.trim().toUpperCase();
    if (!codigo) return;
    await verificarCodigoInterno(codigo);
}
window.verificarCodigo = verificarCodigo;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(type = 'success') {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'success') {
            // High-Pitch Supermarket Beep
            osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // A6
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); // Short and sharp
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'error') {
            // Sad Buzz (Low)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'done') {
            // Double High Beep (Confirmation)
            const now = audioCtx.currentTime;

            // Beep 1
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.frequency.setValueAtTime(2000, now);
            gain1.gain.setValueAtTime(0.1, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc1.start();
            osc1.stop(now + 0.08);

            // Beep 2 (delayed)
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.frequency.setValueAtTime(2000, now + 0.1);
            gain2.gain.setValueAtTime(0.1, now + 0.1);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc2.start();
            osc2.stop(now + 0.18);
        }
    } catch (e) { }
}

async function verificarCodigoInterno(codigo) {
    const resultDiv = document.getElementById('resultadoVerificacao');
    resultDiv.innerHTML = '<p style="text-align:center;">A verificar...</p>';

    try {
        const isGroup = codigo.startsWith('GRP-');
        const data = isGroup ? await getReservasByGrupo(codigo) : await getReservaByCode(codigo);

        if (!data || (isGroup && data.length === 0)) {
            playBeep('error');
            resultDiv.innerHTML = `
                <div style="background:#fef2f2; border:2px solid #ef4444; padding:20px; border-radius:8px; text-align:center;">
                    <h3 style="color:#ef4444;">❌ Inválido</h3>
                    <p>Não encontrado.</p>
                </div>
            `;
            setTimeout(() => { if (resultDiv.innerHTML.includes('Inválido')) resultDiv.innerHTML = ''; }, 3000);
            return;
        }

        if (isGroup) {
            const reservas = data;
            const jaValidados = reservas.filter(r => r.validado);
            const pendentes = reservas.filter(r => !r.validado && !isReservaExpirada(r));
            const expiradas = reservas.filter(r => isReservaExpirada(r));
            const turmaNome = reservas[0].turma || reservas[0].nomeReservante;

            if (pendentes.length === 0) {
                playBeep('error');
                const motivo = expiradas.length > 0 ? 'EXPIRARAM' : 'JÁ ENTRARAM';
                resultDiv.innerHTML = `
                    <div style="background:#fff7ed; border:4px solid #f97316; padding:20px; border-radius:8px; text-align:center;">
                        <h3 style="color:#c2410c; font-size:2rem;">⚠️ ${motivo}</h3>
                        <p style="font-size:1.5rem; font-weight:bold;">Turma ${escapeHtmlSite(turmaNome)}</p>
                        <p>${expiradas.length > 0 ? 'As reservas pendentes expiraram por falta de pagamento.' : 'Todos os bilhetes já foram validados.'}</p>
                    </div>
                `;
                return;
            }

            playBeep('success');
            resultDiv.innerHTML = `
                <div style="background:#f0fdf4; border:4px solid #22c55e; padding:20px; border-radius:8px; text-align:center;">
                    <h3 style="color:#15803d; margin-bottom:10px;">✅ Grupo Válido</h3>
                    <p style="font-size:1.8rem; font-weight:bold; margin-bottom:5px;">Turma ${escapeHtmlSite(turmaNome)}</p>
                    <div style="font-size:1.2rem; margin:15px 0;">
                        <strong>${pendentes.length}</strong> de ${reservas.length} bilhetes por validar.
                        ${jaValidados.length > 0 ? `<br><small style="color:#f97316;">(${jaValidados.length} já entraram)</small>` : ''}
                    </div>
                    <button onclick="marcarValidado('${codigo}')" id="btnValidar" class="btn btn--primary" style="width:100%; padding:20px; font-size:1.4rem; background:#16a34a;">
                        VALIDAR GRUPO (${pendentes.length} bilhetes)
                    </button>
                    <p style="font-size:0.8rem; color:#64748b; margin-top:10px;">Lugares: ${pendentes.map(r => r.fila + r.lugar).join(', ')}</p>
                </div>
            `;
            setTimeout(() => document.getElementById('btnValidar')?.focus(), 100);

        } else {
            const reserva = data;

            if (isReservaExpirada(reserva)) {
                playBeep('error');
                resultDiv.innerHTML = `
                    <div style="background:#fef2f2; border:4px solid #ef4444; padding:20px; border-radius:8px; text-align:center;">
                        <h3 style="color:#ef4444; font-size:2rem;">❌ EXPIRADO</h3>
                        <p style="font-size:1.5rem; font-weight:bold;">${escapeHtmlSite(reserva.nomeReservante)}</p>
                        <p>Esta reserva foi anulada por falta de pagamento em 24h.</p>
                    </div>
                `;
                return;
            }

            if (reserva.validado) {
                playBeep('error');
                resultDiv.innerHTML = `
                    <div style="background:#fff7ed; border:4px solid #f97316; padding:20px; border-radius:8px; text-align:center;">
                        <h3 style="color:#c2410c; font-size:2rem;">⚠️ JÁ ENTROU</h3>
                        <p style="font-size:1.5rem; font-weight:bold;">${escapeHtmlSite(reserva.nomeReservante)}</p>
                        <p style="font-size:1.2rem;">${reserva.fila}${reserva.lugar}</p>
                    </div>
                `;
                return;
            }

            playBeep('success');
            resultDiv.innerHTML = `
                <div style="background:#f0fdf4; border:4px solid #22c55e; padding:20px; border-radius:8px; text-align:center;">
                    <h3 style="color:#15803d; margin-bottom:10px;">✅ Válido</h3>
                    <p style="font-size:1.8rem; font-weight:bold; margin-bottom:5px;">${escapeHtmlSite(reserva.nomeReservante)}</p>
                    <div style="font-size:2.5rem; font-weight:900; color:#166534; margin:15px 0;">
                        ${reserva.fila}${reserva.lugar}
                    </div>
                    <button onclick="marcarValidado('${codigo}')" id="btnValidar" class="btn btn--primary" style="width:100%; padding:20px; font-size:1.4rem; background:#16a34a;">
                        ENTRAR (VALIDAR)
                    </button>
                </div>
            `;
            setTimeout(() => document.getElementById('btnValidar')?.focus(), 100);
        }

    } catch (error) {
        console.error('[Verificar] Erro:', error);
        resultDiv.innerHTML = `<div style="background:#fef2f2; padding:20px; border-radius:8px; text-align:center;"><p>Erro: ${error.message}</p></div>`;
    }
}

async function marcarValidado(codigo) {
    try {
        const isGroup = codigo.startsWith('GRP-');
        if (isGroup) {
            await marcarGrupoValidado(codigo);
        } else {
            await marcarBilheteValidado(codigo);
        }
        playBeep('done');

        document.getElementById('resultadoVerificacao').innerHTML = `
            <div style="background:#f0fdf4; border:2px solid #22c55e; padding:30px; border-radius:8px; text-align:center;">
                <h1 style="color:#22c55e; font-size:3rem;">✓</h1>
                <h2 style="color:#15803d;">Boa Sessão!</h2>
            </div>
        `;
        document.getElementById('codigoManual').value = '';

        setTimeout(() => {
            document.getElementById('resultadoVerificacao').innerHTML = '';
            document.getElementById('codigoManual').focus();
        }, 1500);

    } catch (error) {
        alert('Erro: ' + error.message);
    }
}
window.marcarValidado = marcarValidado;
async function getReservasByEmail(email) {
    if (!email) return [];
    try {
        const snapshot = await db.collection('reservas')
            .where('email', '==', email.toLowerCase())
            .orderBy('dataCriacao', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error('[Loader] Error fetching reservas by email:', e);
        return [];
    }
}
window.getReservasByEmail = getReservasByEmail;
