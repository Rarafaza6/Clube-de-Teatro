// ============================================
// ADMIN PANEL - JavaScript (Phase 5 - Robust)
// ============================================

let currentPecaId = null;
let allPecas = []; // Global cache for robustness
let allMembros = []; // Global cache for robustness

// Verificar autenticação ao carregar
document.addEventListener('DOMContentLoaded', () => {
    checkAuth(user => {
        if (user) {
            showDashboard(user);
        } else {
            showLogin();
        }
    });

    setupEventListeners();
});

// ============================================
// SETUP
// ============================================

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.section) {
                showSection(btn.dataset.section);
            }
        });
    });

    // Peça form
    const pecaFormObj = document.getElementById('pecaFormElement');
    if (pecaFormObj) {
        pecaFormObj.addEventListener('submit', handleSavePeca);
    }

    // Drag & Drop Handling
    const dropZone = document.getElementById('dropZonePeca');
    const fileInput = document.getElementById('pecaImagemFile');

    if (dropZone && fileInput) {
        // Visual feedback
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                if (fileInput.files[0]) updateDropZoneUI(fileInput.files[0].name);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                updateDropZoneUI(fileInput.files[0].name);
            }
        });
    }

    // Gallery Drag & Drop
    const dropZoneGaleria = document.getElementById('dropZoneGaleria');
    const galeriaInput = document.getElementById('pecaGaleriaFotosFile');

    if (dropZoneGaleria && galeriaInput) {
        dropZoneGaleria.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZoneGaleria.style.borderColor = 'var(--color-primary)';
            dropZoneGaleria.style.background = '#f0f9ff';
        });

        dropZoneGaleria.addEventListener('dragleave', () => {
            dropZoneGaleria.style.borderColor = '#bae6fd';
            dropZoneGaleria.style.background = 'white';
        });

        dropZoneGaleria.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZoneGaleria.style.borderColor = '#bae6fd';
            dropZoneGaleria.style.background = 'white';

            if (e.dataTransfer.files.length) {
                handleGalleryUpload(e.dataTransfer.files);
            }
        });

        galeriaInput.addEventListener('change', () => {
            if (galeriaInput.files.length) {
                handleGalleryUpload(galeriaInput.files);
            }
        });
    }

    // Membro form
    const membroFormObj = document.getElementById('membroFormElement');
    if (membroFormObj) membroFormObj.addEventListener('submit', handleSaveMembro);

    // Config form
    const configFormObj = document.getElementById('configForm');
    if (configFormObj) configFormObj.addEventListener('submit', handleSaveConfig);

    // Participação form
    const partFormObj = document.getElementById('participacaoForm');
    if (partFormObj) partFormObj.addEventListener('submit', handleAddParticipacao);

    // Admin management
    const adminFormObj = document.getElementById('adminFormElement');
    if (adminFormObj) adminFormObj.addEventListener('submit', handleCreateAdmin);

    // Gallery Preview Listener
    const galleryTextarea = document.getElementById('pecaGaleriaFotos');
    if (galleryTextarea) {
        galleryTextarea.addEventListener('input', updateGaleriaPreview);
    }
}

// ============================================
// AUTENTICAÇÃO
// ============================================

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');

    errorEl.textContent = 'A entrar...';

    const result = await login(email, password);

    if (result.success) {
        errorEl.textContent = '';
    } else {
        errorEl.textContent = result.error || 'Email ou palavra-passe incorretos';
    }
}

function showLogin() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard(user) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'grid';
    document.getElementById('userEmail').textContent = user.email;

    // Add role-specific body classes for CSS layout control
    document.body.classList.remove('role-admin', 'role-operator', 'role-porteiro');
    document.body.classList.add('role-' + (user.role || 'operator'));

    // RBAC: Restricted view for Operators & Porteiro
    if (user.role === 'operator' || user.role === 'porteiro') {
        const sidebar = document.getElementById('adminSidebar');
        if (sidebar) sidebar.style.display = 'none';

        const main = document.querySelector('.app-main');
        if (main) main.style.paddingLeft = '0';

        // Direct to their specific section
        showSection(user.role === 'operator' ? 'pos' : 'porteiro');
    } else {
        const sidebar = document.getElementById('adminSidebar');
        if (sidebar) sidebar.style.display = 'block';

        const main = document.querySelector('.app-main');
        if (main) main.style.paddingLeft = '';

        // For admins, show the full dashboard section
        showSection('dashboard');
    }

    // Iniciar tutorial se necessário
    if (typeof initTutorial === 'function' && user.role !== 'operator') {
        initTutorial(user.email);
    }
}

// ============================================
// CALCULADORA DE TROCOS (BARRA LATERAL POS)
// ============================================

let calcCurrentInput = '';

function openCalculator(total = 0) {
    calcCurrentInput = '';
    const totalInput = document.getElementById('calcTotalInput');
    if (totalInput) {
        totalInput.value = total > 0 ? total.toFixed(2) : '0.00';
    }
    updateCalcUI();
}

function setQuickCash(val) {
    calcCurrentInput = val.toString();
    updateCalcUI();
}
window.setQuickCash = setQuickCash;

function addToCalc(val) {
    if (val === '.' && calcCurrentInput.includes('.')) return;
    calcCurrentInput += val;
    updateCalcUI();
}

function clearCalc() {
    calcCurrentInput = '';
    updateCalcUI();
}

function updateCalcUI() {
    const display = document.getElementById('calcInputDisplay');
    const result = document.getElementById('calcResultDisplay');
    const totalInput = document.getElementById('calcTotalInput');
    const totalToPay = parseFloat(totalInput?.value) || 0;

    const val = parseFloat(calcCurrentInput) || 0;
    if (display) display.textContent = val.toFixed(2) + '€';

    // Troco = Recebido - Total
    const change = val - totalToPay;
    if (result) {
        result.textContent = change >= 0 ? change.toFixed(2) + '€' : '0.00€';
        result.style.color = change >= 0 ? '#10b981' : '#ef4444';
    }
}

window.openCalculator = openCalculator;
window.addToCalc = addToCalc;
window.clearCalc = clearCalc;

// ============================================
// AUDIO FEEDBACK
// ============================================

function playBeep(type = 'success') {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    } else if (type === 'error') {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) targetSection.style.display = 'block';

    // Update active button
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionName) {
            btn.classList.add('active');

            // Update Page Title
            const titleMap = {
                'dashboard': 'Dashboard',
                'pecas': 'Gestão de Peças',
                'membros': 'Gestão de Membros',
                'pos': 'Bilheteira Rápida (POS)',
                'porteiro': 'Controlo de Porteiro',
                'config': 'Configurações'
            };
            const titleEl = document.getElementById('pageTitleDisplay');
            if (titleEl) titleEl.textContent = titleMap[sectionName] || 'Painel Admin';
        }
    });

    // Load data for section
    if (sectionName === 'pecas') loadPecas();
    if (sectionName === 'membros') loadMembros();
    if (sectionName === 'pos') loadPOSData();
    if (sectionName === 'porteiro') loadPorteiroData();
    if (sectionName === 'config') loadConfig();
    if (sectionName === 'dashboard') loadDashboardStats();
}

// --- NOVO: Botões de Dinheiro Rápido ---
function setQuickCash(amount) {
    const totalToPay = parseFloat(document.getElementById('calcTotalInput')?.value) || 0;
    calcCurrentInput = amount.toString();
    updateCalcUI();

    // Se o valor for suficiente, dá um feedback visual no troco
    const val = parseFloat(calcCurrentInput);
    if (val >= totalToPay) {
        if (typeof playBeep === 'function') playBeep('confirm');
    }
}
window.setQuickCash = setQuickCash;

// ============================================
// DASHBOARD
// ============================================

async function loadDashboardStats() {
    try {
        const pecas = await getPecas();
        const membros = await getMembros();

        document.getElementById('totalPecas').textContent = pecas.length;
        document.getElementById('totalMembros').textContent = membros.length;

        // Reservas stats (async, non-blocking)
        db.collection('reservas').get().then(snap => {
            const reservas = snap.docs.map(d => d.data());
            const totalReservasEl = document.getElementById('totalReservas');
            const pagos = reservas.filter(r => r.pagamentoStatus === 'pago');
            const totalPagosEl = document.getElementById('totalPagos');
            if (totalReservasEl) totalReservasEl.textContent = reservas.length;

            if (totalPagosEl) {
                let totalSoma = 0;
                pagos.forEach(r => {
                    const peca = pecas.find(p => p.id === r.pecaId);
                    if (peca && peca.pecaPaga) totalSoma += (peca.preco || 0);
                });
                totalPagosEl.textContent = `${pagos.length} Bilhetes (${totalSoma.toFixed(2)}€)`;
            }
        }).catch(e => console.error('Erro reservas stats:', e));

        // Live Status Logic
        const pecaEmCartaz = pecas.find(p => p.emCartaz);
        const statusLabel = document.getElementById('statusLabel');
        const statusDesc = document.getElementById('statusDescription');
        const widget = document.getElementById('liveStatusWidget');

        if (pecaEmCartaz) {
            statusLabel.textContent = "Em Temporada 🎭";
            statusLabel.style.color = "#10b981";
            statusDesc.innerHTML = `Neste momento, a peça <strong>"${escapeHtml(pecaEmCartaz.nome)}"</strong> está em destaque na página inicial.`;
            widget.style.borderLeft = "5px solid #10b981";
        } else {
            statusLabel.textContent = "Sem Peça em Cartaz ⚠️";
            statusLabel.style.color = "#f59e0b";
            statusDesc.textContent = "O site não está a mostrar nenhuma peça principal. Vai ao menu 'Peças' e marca uma como 'Em Cartaz'.";
            widget.style.borderLeft = "5px solid #f59e0b";
        }

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// ============================================
// GESTÃO DE PEÇAS
// ============================================

async function loadPecas() {
    const container = document.getElementById('pecasList');
    if (!container) return;
    container.innerHTML = '<div class="loading">A carregar peças</div>';

    try {
        allPecas = await getPecas(); // Update global cache

        if (allPecas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Ainda não há peças registadas</p>
                    <button onclick="showAddPecaForm()" class="btn btn-primary">+ Adicionar Primeira Peça</button>
                </div>
            `;
            return;
        }

        container.innerHTML = allPecas.map(peca => {
            return `
            <div class="data-item">
                <div class="data-body">
                    <h3 class="data-title">${escapeHtml(peca.nome)} ${peca.emCartaz ? '<span class="badge badge-success">EM CARTAZ</span>' : ''}</h3>
                    <p style="margin-top:8px;">${peca.ano || ''} • ${peca.sinopse ? escapeHtml(peca.sinopse.substring(0, 100)) + '...' : ''}</p>
                </div>
                <div class="data-footer">
                    <button onclick="editPeca('${peca.id}')" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;">Editar</button>
                    <button onclick="confirmDeletePeca('${peca.id}')" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;">Eliminar</button>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="error-message">Erro ao carregar peças</p>';
        console.error(error);
    }
}

function showAddPecaForm() {
    currentPecaId = null;
    document.getElementById('pecaFormTitle').textContent = 'Nova Peça';
    document.getElementById('pecaFormElement').reset();
    document.getElementById('pecaId').value = '';
    document.getElementById('pecaAutor').value = '';
    document.getElementById('pecaAno').value = new Date().getFullYear();
    document.getElementById('pecaRascunho').checked = false;
    document.getElementById('pecaReservasAbertas').checked = true;
    document.getElementById('pecaRequerBilhete').checked = false;
    document.getElementById('pecaGaleriaFotos').value = '';
    document.getElementById('pecaGaleriaVideos').value = '';
    document.getElementById('bilheteiraConfig').style.display = 'none';
    document.getElementById('gerarLinksSection').style.display = 'none';
    const turmaSection = document.getElementById('gerarLinksTurmaSection');
    if (turmaSection) turmaSection.style.display = 'none';
    initLayoutEditor([]);
    currentPecaSessoes = [];
    renderListaSessoes();
    document.getElementById('participacoesSection').style.display = 'none';
    document.getElementById('pecaForm').classList.add('active');
    updateGaleriaPreview();
}

async function editPeca(id) {
    currentPecaId = id;
    document.getElementById('pecaFormTitle').textContent = 'Editar Peça';

    try {
        const peca = allPecas.find(p => p.id === id) || await getPeca(id);

        document.getElementById('pecaId').value = id;
        document.getElementById('pecaNome').value = peca.nome || '';
        document.getElementById('pecaAutor').value = peca.autor || '';
        document.getElementById('pecaAno').value = peca.ano || '';
        document.getElementById('pecaSinopse').value = peca.sinopse || '';
        document.getElementById('pecaImagem').value = peca.imagem || '';
        document.getElementById('pecaEmCartaz').checked = peca.emCartaz || false;
        document.getElementById('pecaRascunho').checked = peca.rascunho || false;
        document.getElementById('pecaReservasAbertas').checked = peca.hasOwnProperty('reservasAbertas') ? peca.reservasAbertas : true;

        document.getElementById('pecaGaleriaFotos').value = (peca.galeriaFotos || []).join('\n');
        document.getElementById('pecaGaleriaVideos').value = (peca.galeriaVideos || []).join('\n');

        // Bilheteira — suporta antigo requerBilhete e novo requerReserva
        const requerReserva = peca.requerReserva || peca.requerBilhete || false;
        document.getElementById('pecaRequerBilhete').checked = requerReserva;
        toggleBilheteiraConfig();

        if (peca.bilheteConfig) {
            document.getElementById('pecaQuotaElenco').value = peca.bilheteConfig.quotaElenco || 2;
        }
        // Novo campo: peça paga
        const pecaPaga = peca.pecaPaga || false;
        const pecaPagaEl = document.getElementById('pecaPaga');
        if (pecaPagaEl) {
            pecaPagaEl.checked = pecaPaga;
            togglePrecoField();
        }
        const pecaPrecoEl = document.getElementById('pecaPreco');
        if (pecaPrecoEl) pecaPrecoEl.value = peca.preco || 2.50;

        const pecaLocalPagamentoEl = document.getElementById('pecaLocalPagamento');
        if (pecaLocalPagamentoEl) pecaLocalPagamentoEl.value = peca.localPagamento || '';

        currentPecaSessoes = peca.sessoes || [];
        renderListaSessoes();

        document.getElementById('participacoesSection').style.display = 'block';
        document.getElementById('gerarLinksSection').style.display = requerReserva ? 'block' : 'none';
        const turmaSection = document.getElementById('gerarLinksTurmaSection');
        if (turmaSection) turmaSection.style.display = requerReserva ? 'block' : 'none';
        loadParticipacoes(id);

        // Carregar turmas convidadas guardadas
        if (requerReserva) loadTurmasConvidadas(id);

        document.getElementById('pecaForm').classList.add('active');
        updateGaleriaPreview();
    } catch (error) {
        alert('Erro ao carregar peça');
        console.error(error);
    }
}

function closePecaForm() {
    document.getElementById('pecaForm').classList.remove('active');
    currentPecaId = null;
}

// Função para comprimir imagem e converter para Base64
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const maxWidth = 800;
        const maxHeight = 800;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function () {
                let width = img.width;
                let height = img.height;

                // Calcular novas dimensões mantendo proporção
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Comprimir para JPEG com 70% de qualidade
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = function (error) {
                reject(error);
            };
        };
        reader.onerror = function (error) {
            reject(error);
        };
    });
}

function updateDropZoneUI(filename) {
    const dropText = document.getElementById('dropText');
    const dropZone = document.getElementById('dropZonePeca');

    dropText.innerHTML = `📸 Imagem pronta: <strong>${filename}</strong>`;
    dropZone.classList.add('active');
}

async function handleGalleryUpload(files) {
    const galleryTextarea = document.getElementById('pecaGaleriaFotos');
    const dropText = document.getElementById('dropTextGaleria');
    const originalText = dropText.textContent;

    dropText.textContent = '⌛ A processar fotos...';

    let uploadedCount = 0;

    for (const file of files) {
        try {
            const base64 = await compressImage(file);
            const currentVal = galleryTextarea.value.trim();
            galleryTextarea.value = currentVal ? currentVal + '\n' + base64 : base64;
            uploadedCount++;
        } catch (err) {
            console.error('Erro ao processar foto da galeria:', err);
        }
    }

    dropText.textContent = originalText;
    updateGaleriaPreview();
    if (window.showToast) window.showToast(`${uploadedCount} foto(s) adicionada(s) à galeria`);
}

function updateGaleriaPreview() {
    const textarea = document.getElementById('pecaGaleriaFotos');
    const preview = document.getElementById('pecaGaleriaPreview');
    if (!textarea || !preview) return;

    const urls = textarea.value.split('\n').map(l => l.trim()).filter(l => l);

    if (urls.length === 0) {
        preview.innerHTML = '';
        return;
    }

    preview.innerHTML = urls.map((url, index) => `
        <div style="position: relative; width: 80px; height: 80px; border-radius: 4px; overflow: hidden; border: 1px solid #e2e8f0; cursor: pointer;" onclick="openImagePreview('${url}')">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
            <button onclick="event.stopPropagation(); removeGalleryImage(${index})" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
        </div>
    `).join('');
}

function removeGalleryImage(index) {
    const textarea = document.getElementById('pecaGaleriaFotos');
    if (!textarea) return;

    let urls = textarea.value.split('\n').map(l => l.trim()).filter(l => l);
    urls.splice(index, 1);
    textarea.value = urls.join('\n');
    updateGaleriaPreview();
}

function openImagePreview(src) {
    const modal = document.getElementById('imagePreviewModal');
    const fullImg = document.getElementById('previewFullImage');
    if (!modal || !fullImg) return;

    fullImg.src = src;
    modal.classList.add('active');
}

function closeImagePreview() {
    const modal = document.getElementById('imagePreviewModal');
    if (modal) modal.classList.remove('active');
}

window.updateGaleriaPreview = updateGaleriaPreview;
window.removeGalleryImage = removeGalleryImage;
window.openImagePreview = openImagePreview;
window.closeImagePreview = closeImagePreview;

// ============================================
// GESTÃO DE SESSÕES
// ============================================
let currentPecaSessoes = [];

function renderListaSessoes() {
    const list = document.getElementById('listaSessoes');
    if (!list) return;

    if (currentPecaSessoes.length === 0) {
        list.innerHTML = '<div style="color: #64748b; font-size: 0.9rem; font-style: italic;">Nenhuma sessão agendada.</div>';
        return;
    }

    list.innerHTML = currentPecaSessoes.map((s, index) => `
        <div style="background: white; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 600;">📅 ${new Date(s.data).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}</div>
                ${s.local ? `<div style="font-size: 0.85rem; color: #64748b;">📍 ${escapeHtml(s.local)}</div>` : ''}
            </div>
            <button type="button" onclick="removerSessao(${index})" class="text-danger" style="background: none; border: none; cursor: pointer;">✕</button>
        </div>
    `).join('');
}
window.renderListaSessoes = renderListaSessoes;

function adicionarSessao() {
    const dataInput = document.getElementById('novaSessaoData');
    const localInput = document.getElementById('novaSessaoLocal');

    if (!dataInput.value) {
        alert('Escolhe uma data e hora');
        return;
    }

    currentPecaSessoes.push({
        id: 'sessao_' + Date.now(),
        data: dataInput.value,
        local: localInput.value || ''
    });

    // Sort chronologically
    currentPecaSessoes.sort((a, b) => new Date(a.data) - new Date(b.data));

    dataInput.value = '';
    localInput.value = '';
    renderListaSessoes();
}
window.adicionarSessao = adicionarSessao;

function removerSessao(index) {
    if (confirm('Remover esta sessão?')) {
        currentPecaSessoes.splice(index, 1);
        renderListaSessoes();
    }
}
window.removerSessao = removerSessao;

async function handleSavePeca(e) {
    e.preventDefault();

    const saveBtn = document.querySelector('#pecaFormElement button[type="submit"]');
    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'A guardar...';

    const id = document.getElementById('pecaId').value;
    const fileInput = document.getElementById('pecaImagemFile');
    const uploadStatus = document.getElementById('uploadProgress');

    let imageUrl = document.getElementById('pecaImagem').value;

    try {
        if (fileInput.files.length > 0) {
            saveBtn.textContent = 'A processar imagem...';
            uploadStatus.textContent = 'A processar e comprimir imagem...';
            uploadStatus.style.display = 'block';

            try {
                imageUrl = await compressImage(fileInput.files[0]);
            } catch (imageError) {
                console.error('Erro ao processar imagem:', imageError);
                if (!confirm('Erro ao processar imagem. Queres continuar sem imagem nova?')) {
                    throw new Error('Processamento cancelado pelo utilizador');
                }
            } finally {
                uploadStatus.style.display = 'none';
            }
        }

        const peca = {
            nome: document.getElementById('pecaNome').value,
            autor: document.getElementById('pecaAutor').value,
            ano: parseInt(document.getElementById('pecaAno').value) || null,
            sinopse: document.getElementById('pecaSinopse').value,
            imagem: imageUrl,
            emCartaz: document.getElementById('pecaEmCartaz').checked,
            rascunho: document.getElementById('pecaRascunho').checked,
            reservasAbertas: document.getElementById('pecaReservasAbertas').checked,
            requerReserva: document.getElementById('pecaRequerBilhete').checked,
            requerBilhete: document.getElementById('pecaRequerBilhete').checked, // Backwards compat
            sessoes: currentPecaSessoes || [],
            galeriaFotos: document.getElementById('pecaGaleriaFotos').value.split('\n').map(l => l.trim()).filter(l => l),
            galeriaVideos: document.getElementById('pecaGaleriaVideos').value.split('\n').map(l => l.trim()).filter(l => l)
        };

        // Pagamento manual
        const pecaPagaEl = document.getElementById('pecaPaga');
        const pecaPrecoEl = document.getElementById('pecaPreco');
        peca.pecaPaga = pecaPagaEl ? pecaPagaEl.checked : false;
        peca.preco = (peca.pecaPaga && pecaPrecoEl) ? (parseFloat(pecaPrecoEl.value) || 0) : 0;

        const pecaLocalPagamentoEl = document.getElementById('pecaLocalPagamento');
        if (pecaLocalPagamentoEl) peca.localPagamento = pecaLocalPagamentoEl.value;

        // Se requer reserva, adicionar config
        if (peca.requerReserva) {
            peca.bilheteConfig = {
                layout: [],
                quotaElenco: parseInt(document.getElementById('pecaQuotaElenco').value) || 2,
            };
        }

        const pecaLimiteHorasEl = document.getElementById('pecaLimiteHoras');
        if (pecaLimiteHorasEl) peca.limiteHoras = parseInt(pecaLimiteHorasEl.value) || 24;

        if (peca.emCartaz) {
            const snapshot = await db.collection('pecas').where('emCartaz', '==', true).get();
            const batch = db.batch();
            let updates = 0;

            snapshot.docs.forEach(doc => {
                if (doc.id !== id) {
                    batch.update(doc.ref, { emCartaz: false });
                    updates++;
                }
            });

            if (updates > 0) {
                await batch.commit();
            }
        }

        if (id) {
            await updatePeca(id, peca);
            if (window.showToast) window.showToast('Peça atualizada');
        } else {
            await addPeca(peca);
            if (window.showToast) window.showToast('Peça adicionada');
        }

        closePecaForm();
        loadPecas();
        loadDashboardStats();
    } catch (error) {
        if (window.showToast) {
            window.showToast('Erro ao guardar peça: ' + error.message, 'error');
        } else {
            alert('Erro ao guardar: ' + error.message);
        }
        console.error(error);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
    }
}


// ============================================
// MODAL DE CONFIRMAÇÃO (CUSTOM)
// ============================================
let confirmCallback = null;

function showConfirmModal(title, message, callback, btnText = 'Confirmar', btnClass = 'btn-danger') {
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const actionBtn = document.getElementById('confirmBtnAction');
    const modal = document.getElementById('confirmModal');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message.replace(/\n/g, '<br>');

    if (actionBtn) {
        actionBtn.textContent = btnText;
        actionBtn.className = 'btn ' + btnClass;
    }

    confirmCallback = callback;
    if (modal) modal.classList.add('active');
}

function closeConfirmModal(confirmed) {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');

    if (confirmed && confirmCallback) {
        confirmCallback();
    }
    confirmCallback = null;
}

document.addEventListener('DOMContentLoaded', () => {
    // ... Existing setup ...
    const confirmBtn = document.getElementById('confirmBtnAction');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => closeConfirmModal(true));
    }
});

async function confirmDeletePeca(id) {
    console.log('[DEBUG] confirmDeletePeca chamado para ID:', id);

    let peca = null;
    if (allPecas) peca = allPecas.find(p => p.id === id);
    if (!peca) {
        try { peca = await getPeca(id); } catch (e) { console.error(e); }
    }

    const name = peca ? peca.nome : 'esta peça';
    const message = `Tens a certeza que queres eliminar "<b>${escapeHtml(name)}</b>"? \n\n⚠️ Isto irá também eliminar o elenco associado!`;

    showConfirmModal('Eliminar Peça', message, async () => {
        try {
            console.log('[DEBUG] Confirmado. A eliminar:', id);
            await deletePeca(id);

            // Clean up associations
            const participacoes = await getParticipacoes(id);
            if (participacoes.length > 0) {
                const batch = db.batch();
                participacoes.forEach(p => {
                    batch.delete(db.collection('participacoes').doc(p.id));
                });
                await batch.commit();
            }

            loadPecas();
            loadDashboardStats();
            if (window.showToast) window.showToast('Peça eliminada com sucesso!');
        } catch (error) {
            if (window.showToast) window.showToast('Erro ao eliminar: ' + error.message, 'error');
            console.error(error);
        }
    });
}


// ============================================
// GESTÃO DE MEMBROS
// ============================================

async function loadMembros() {
    const container = document.getElementById('membrosList');
    if (!container) return;
    container.innerHTML = '<div class="loading">A carregar membros</div>';

    try {
        allMembros = await getMembros(); // Update cache

        if (allMembros.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Ainda não há membros registados</p>
                    <button onclick="showAddMembroForm()" class="btn btn-primary">+ Adicionar Primeiro Membro</button>
                </div>
            `;
            return;
        }

        container.innerHTML = allMembros.map(membro => {
            return `
            <div class="data-item">
                <div class="data-body">
                    <h3 class="data-title">${escapeHtml(membro.nome)} 
                        <span class="badge ${membro.tipo === 'professor' ? 'badge-info' : 'badge-warning'}">${membro.tipo === 'professor' ? 'PROFESSOR' : 'ALUNO'}</span>
                        ${membro.ativo === false ? '<span class="badge" style="background:#cbd5e1; color:#475569;">INATIVO</span>' : ''}
                    </h3>
                    <p style="margin-top:8px; font-weight:500; color:var(--color-primary);">${escapeHtml(membro.funcao || 'Membro')}</p>
                    <p style="margin-top:4px;">${membro.bio ? escapeHtml(membro.bio.substring(0, 80)) + '...' : ''}</p>
                </div>
                <div class="data-footer">
                    <button onclick="editMembro('${membro.id}')" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;">Editar</button>
                    <button onclick="confirmDeleteMembro('${membro.id}')" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;">Eliminar</button>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="error-message">Erro ao carregar membros</p>';
        console.error(error);
    }
}

function showAddMembroForm() {
    document.getElementById('membroFormTitle').textContent = 'Novo Membro';
    document.getElementById('membroFormElement').reset();
    document.getElementById('membroId').value = '';
    document.getElementById('membroAtivo').checked = true;
    document.getElementById('membroForm').classList.add('active');
}

async function editMembro(id) {
    document.getElementById('membroFormTitle').textContent = 'Editar Membro';

    try {
        const membro = allMembros.find(m => m.id === id) || await getMembro(id);

        document.getElementById('membroId').value = id;
        document.getElementById('membroNome').value = membro.nome || '';
        document.getElementById('membroFuncao').value = membro.funcao || 'Ator';
        document.getElementById('membroTipo').value = membro.tipo || 'aluno';
        document.getElementById('membroBio').value = membro.bio || '';
        document.getElementById('membroAtivo').checked = membro.ativo !== false;

        document.getElementById('membroForm').classList.add('active');
    } catch (error) {
        alert('Erro ao carregar membro');
        console.error(error);
    }
}

function closeMembroForm() {
    document.getElementById('membroForm').classList.remove('active');
}

async function handleSaveMembro(e) {
    e.preventDefault();

    const id = document.getElementById('membroId').value;
    const membro = {
        nome: document.getElementById('membroNome').value,
        funcao: document.getElementById('membroFuncao').value,
        tipo: document.getElementById('membroTipo').value,
        bio: document.getElementById('membroBio').value,
        ativo: document.getElementById('membroAtivo').checked
    };

    try {
        if (id) {
            await updateMembro(id, membro);
            if (window.showToast) window.showToast('Membro atualizado');
        } else {
            await addMembro(membro);
            if (window.showToast) window.showToast('Membro adicionado');
        }

        closeMembroForm();
        loadMembros();
        loadDashboardStats();
    } catch (error) {
        if (window.showToast) window.showToast('Erro ao guardar membro', 'error');
        console.error(error);
    }
}

async function testStripeConfig() {
    const pk = document.getElementById('configStripeKey').value.trim();
    if (!pk) {
        alert('Introduz primeiro a tua Publishable Key (pk_...).');
        return;
    }

    if (!pk.startsWith('pk_')) {
        alert('❌ Erro: Essa chave não parece ser uma "Publishable Key".\n\nUma chave válida deve começar por "pk_test_" ou "pk_live_".\nTu introduziste algo que começa por "' + pk.substring(0, 4) + '".\n\nVerifica no teu Stripe Dashboard em Developers -> API Keys.');
        return;
    }

    try {
        if (typeof Stripe === 'undefined') {
            alert('Erro: Biblioteca Stripe.js não carregada. Tenta recarregar a página.');
            return;
        }
        const stripe = Stripe(pk);
        alert('✅ Conexão Inicial com Stripe OK! A chave parece válida.\n\nNota: Lembra-te de ativar "Client-only integration" nas definições do Stripe Checkout.');
    } catch (e) {
        alert('❌ Erro no Stripe: ' + e.message);
    }
}
window.testStripeConfig = testStripeConfig;

async function confirmDeleteMembro(id) {
    const membro = allMembros.find(m => m.id === id);
    const name = membro ? membro.nome : 'este membro';

    showConfirmModal('Eliminar Membro', `Tens a certeza que queres eliminar "<b>${escapeHtml(name)}</b>"?`, async () => {
        try {
            await deleteMembro(id);
            loadMembros();
            loadDashboardStats();
            if (window.showToast) window.showToast('Membro eliminado com sucesso');
        } catch (error) {
            if (window.showToast) window.showToast('Erro ao eliminar membro', 'error');
            console.error(error);
        }
    });
}

// ============================================
// PARTICIPAÇÕES
// ============================================

async function loadParticipacoes(pecaId) {
    const container = document.getElementById('participacoesList');
    if (!container) return;
    container.innerHTML = '<div class="loading">A carregar</div>';

    try {
        const participacoes = await getParticipacoes(pecaId);
        // Ensure members loaded
        if (allMembros.length === 0) allMembros = await getMembros();

        if (participacoes.length === 0) {
            container.innerHTML = '<p>Nenhum participante adicionado ainda.</p>';
            return;
        }

        container.innerHTML = participacoes.map(p => {
            const membro = allMembros.find(m => m.id === p.membroId);
            return `
                <div class="participacao-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--color-bg); border-radius:6px; margin-bottom:8px;">
                    <span><strong>${membro ? escapeHtml(membro.nome) : 'Membro não encontrado'}</strong> <span style="color:var(--color-text-muted);">como</span> ${escapeHtml(p.funcao || 'Sem função definida')}</span>
                    <button onclick="removeParticipacao('${p.id}')" class="btn btn-danger" style="padding: 2px 8px; font-size: 12px; border-radius:4px;">✕</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="error-message">Erro ao carregar participações</p>';
        console.error(error);
    }
}

async function showAddParticipacaoForm() {
    const select = document.getElementById('participacaoMembro');
    select.innerHTML = '<option value="">A carregar...</option>';

    try {
        if (allMembros.length === 0) allMembros = await getMembros();

        select.innerHTML = allMembros.map(m =>
            `<option value="${m.id}">${escapeHtml(m.nome)}</option>`
        ).join('');

        document.getElementById('participacaoFuncao').value = '';
        document.getElementById('participacaoModal').classList.add('active');
    } catch (error) {
        alert('Erro ao carregar membros');
        console.error(error);
    }
}

function closeParticipacaoModal() {
    document.getElementById('participacaoModal').classList.remove('active');
}

async function handleAddParticipacao(e) {
    e.preventDefault();

    const participacao = {
        pecaId: currentPecaId,
        membroId: document.getElementById('participacaoMembro').value,
        funcao: document.getElementById('participacaoFuncao').value
    };

    try {
        await addParticipacao(participacao);
        if (window.showToast) window.showToast('Membro adicionado ao elenco');
        closeParticipacaoModal();
        loadParticipacoes(currentPecaId);
    } catch (error) {
        if (window.showToast) window.showToast('Erro ao adicionar membro', 'error');
        console.error(error);
    }
}

function removeParticipacao(id) {
    showConfirmModal(
        "Remover do Elenco",
        "Tens a certeza que desejas remover este membro do elenco desta peça?",
        async () => {
            try {
                await deleteParticipacao(id);
                loadParticipacoes(currentPecaId);
                if (window.showToast) window.showToast("Membro removido do elenco");
            } catch (error) {
                if (window.showToast) window.showToast("Erro ao remover do elenco", "error");
                console.error(error);
            }
        },
        "Remover",
        "btn-danger"
    );
}

// ============================================
// CONFIGURAÇÕES
// ============================================

async function loadConfig() {
    try {
        const config = await getConfig();

        document.getElementById('configNomeClube').value = config.nomeClube || 'Clube de Teatro';
        document.getElementById('configEscola').value = config.escola || 'Agrupamento de Escolas da Cidadela';
        document.getElementById('configEmail').value = config.email || '';
        document.getElementById('configHorario').value = config.horario || '';
        const localPagEl = document.getElementById('configLocalPagamento');
        if (localPagEl) localPagEl.value = config.localPagamento || '';

        const taxaPOSEl = document.getElementById('configTaxaPOS');
        if (taxaPOSEl) taxaPOSEl.value = config.taxaPOS || '0.00';

        // Carregar lista de admins
        loadAdmins();

        // Carregar layout global
        try {
            const layoutDoc = await firebase.firestore().collection('config').doc('layout').get();
            const globalLayout = layoutDoc.exists ? layoutDoc.data().layout : [];
            initLayoutEditor(globalLayout, 'globalLayoutRows');
        } catch (e) { console.error('Erro ao carregar layout global', e); }

    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

async function saveGlobalLayout() {
    try {
        const layout = getLayoutFromEditor('globalLayoutRows');
        await firebase.firestore().collection('config').doc('layout').set({ layout });
        if (window.showToast) window.showToast('Layout padrão guardado com sucesso!');
    } catch (error) {
        if (window.showToast) window.showToast('Erro ao guardar layout: ' + error.message, 'error');
    }
}
window.saveGlobalLayout = saveGlobalLayout;

async function importDefaultLayout() {
    try {
        const layoutDoc = await firebase.firestore().collection('config').doc('layout').get();
        if (layoutDoc.exists && layoutDoc.data().layout) {
            initLayoutEditor(layoutDoc.data().layout, 'layoutRows');
            if (window.showToast) window.showToast('Layout padrão importado!');
        } else {
            if (window.showToast) window.showToast('Não há layout padrão definido nas configurações.', 'info');
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao importar layout');
    }
}
window.importDefaultLayout = importDefaultLayout;

async function handleSaveConfig(e) {
    e.preventDefault();

    const config = {
        nomeClube: document.getElementById('configNomeClube').value,
        escola: document.getElementById('configEscola').value,
        email: document.getElementById('configEmail').value,
        horario: document.getElementById('configHorario').value,
        localPagamento: document.getElementById('configLocalPagamento')?.value || '',
        taxaPOS: parseFloat(document.getElementById('configTaxaPOS')?.value) || 0
    };

    try {
        await updateConfig(config);
        if (window.showToast) window.showToast('Configurações guardadas');
    } catch (error) {
        if (window.showToast) window.showToast('Erro ao guardar configurações', 'error');
        console.error(error);
    }
}

// ============================================
// GESTÃO DE ADMINISTRADORES (LOGIC)
// ============================================

async function loadAdmins() {
    const container = document.getElementById('adminsList');
    if (!container) return;
    container.innerHTML = '<div class="loading">A carregar admins...</div>';

    try {
        const admins = await getAdmins();
        if (admins.length === 0) {
            container.innerHTML = `
                <div style="padding:20px; text-align:center; background:rgba(255,255,255,0.5); border:1px dashed var(--color-border); border-radius:8px;">
                    <p style="margin-bottom:10px;">🛡️ <b>Primeiro Passo de Segurança</b></p>
                    <p style="font-size:0.9rem; color:var(--color-text-muted);">Ainda não registaste nenhum administrador oficialmente. Adiciona o teu email agora para restringires o acesso a este painel.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = admins.map(admin => `
            <div class="admin-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:var(--color-bg); border-radius:8px; border-left:4px solid ${admin.role === 'admin' ? 'var(--color-primary)' : '#16a34a'};">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div>
                        <div style="font-weight:700;">${escapeHtml(admin.nome)}</div>
                        <div style="font-size:0.85rem; color:var(--color-text-muted);">${escapeHtml(admin.email)}</div>
                    </div>
                    <span style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; background: ${admin.role === 'admin' ? '#eef2ff' : '#f0fdf4'}; color: ${admin.role === 'admin' ? '#4338ca' : '#166534'};">
                        ${admin.role === 'admin' ? '🛡️ Master' : '🛒 Operador'}
                    </span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="confirmResetPassword('${admin.email}')" class="btn-icon" title="Reset Password" style="color:var(--color-primary);">📧</button>
                    <button onclick="confirmDeleteAdmin('${admin.email}')" class="btn-icon" title="Eliminar" style="color:var(--color-danger);">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="error-message">Erro ao carregar admins</p>';
    }
}

function showAddAdminForm() {
    document.getElementById('adminFormElement').reset();
    document.getElementById('adminForm').classList.add('active');
}

function closeAdminForm() {
    document.getElementById('adminForm').classList.remove('active');
}

async function handleCreateAdmin(e) {
    if (e) e.preventDefault();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'A criar conta...';
    }

    const nome = document.getElementById('adminNome').value;
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const role = document.getElementById('adminRole').value;

    try {
        await createAdminAccount(nome, email, password, role);
        if (window.showToast) window.showToast('Staff adicionado com sucesso!');
        closeAdminForm();
        loadAdmins();
    } catch (error) {
        if (window.showToast) window.showToast('Erro ao criar conta: ' + error.message, 'error');
        console.error(error);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Criar Conta';
        }
    }
}
window.handleCreateAdmin = handleCreateAdmin;

function confirmDeleteAdmin(email) {
    // Evitar que o admin se apague a si próprio por engano
    const currentUser = firebase.auth().currentUser;
    if (currentUser && currentUser.email === email) {
        if (window.showToast) window.showToast('Não podes eliminar a tua própria conta aqui.', 'error');
        return;
    }

    showConfirmModal(
        'Eliminar Administrador',
        `Tens a certeza que desejas remover <b>${escapeHtml(email)}</b>? \n\n⚠️ O utilizador deixará de ter acesso ao painel imediatamente.`,
        async () => {
            try {
                await deleteAdminAccount(email);
                loadAdmins();
                if (window.showToast) window.showToast('Administrador removido');
            } catch (error) {
                if (window.showToast) window.showToast('Erro ao remover', 'error');
                console.error(error);
            }
        },
        "Eliminar",
        "btn-danger"
    );
}

function confirmResetPassword(email) {
    showConfirmModal(
        'Reset de Password',
        `Enviar email de recuperação para <b>${escapeHtml(email)}</b>?`,
        async () => {
            try {
                await resetAdminPassword(email);
                if (window.showToast) window.showToast('Email enviado com sucesso');
            } catch (error) {
                if (window.showToast) window.showToast('Erro ao enviar email', 'error');
                console.error(error);
            }
        },
        "Enviar Email",
        "btn-primary"
    );
}

async function handleForgotPassword(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('email').value;

    if (!email) {
        if (window.showToast) window.showToast('Por favor, introduz o teu email primeiro.', 'error');
        return;
    }

    showConfirmModal(
        'Recuperar Palavra-passe',
        `Enviar email de recuperação para <b>${escapeHtml(email)}</b>?`,
        async () => {
            try {
                await resetAdminPassword(email);
                if (window.showToast) window.showToast('Email de recuperação enviado!');
            } catch (error) {
                if (window.showToast) window.showToast('Erro ao enviar email: ' + error.message, 'error');
                console.error(error);
            }
        },
        "Enviar Email",
        "btn-primary"
    );
}

// ============================================
// EXPORTS GLOBALS FOR INLINE CLICK HANDLERS
// ============================================
window.editPeca = editPeca;
window.confirmDeletePeca = confirmDeletePeca;
window.editMembro = editMembro;
window.confirmDeleteMembro = confirmDeleteMembro;
window.removeParticipacao = removeParticipacao;
window.showAddPecaForm = showAddPecaForm;
window.showAddMembroForm = showAddMembroForm;
window.showSection = showSection;
window.showAddAdminForm = showAddAdminForm;
window.closeAdminForm = closeAdminForm;
window.confirmDeleteAdmin = confirmDeleteAdmin;
window.confirmResetPassword = confirmResetPassword;
window.handleForgotPassword = handleForgotPassword;
window.logout = function () {
    firebase.auth().signOut().then(() => {
        window.location.reload();
    });
};
window.showAddParticipacaoForm = showAddParticipacaoForm;
window.closePecaForm = closePecaForm;
window.closeMembroForm = closeMembroForm;
window.closeParticipacaoModal = closeParticipacaoModal;

// ============================================
// BILHETEIRA - LAYOUT EDITOR
// ============================================

function toggleBilheteiraConfig() {
    const checkbox = document.getElementById('pecaRequerBilhete');
    const configDiv = document.getElementById('bilheteiraConfig');
    const toggleContainer = document.getElementById('reservasToggleContainer');
    const show = checkbox.checked;

    configDiv.style.display = show ? 'block' : 'none';
    if (toggleContainer) toggleContainer.style.display = show ? 'block' : 'none';

    document.getElementById('gerarLinksSection').style.display = show ? 'block' : 'none';
    const turmaSection = document.getElementById('gerarLinksTurmaSection');
    if (turmaSection) turmaSection.style.display = show ? 'block' : 'none';
    if (show && currentPecaId) loadTurmasConvidadas(currentPecaId);
}
window.toggleBilheteiraConfig = toggleBilheteiraConfig;

function togglePrecoField() {
    const checked = document.getElementById('pecaPaga')?.checked;
    const precoField = document.getElementById('precoField');
    const msgGratis = document.getElementById('msgGratis');
    if (precoField) precoField.style.display = checked ? 'block' : 'none';
    if (msgGratis) msgGratis.style.display = checked ? 'none' : 'block';
}
window.togglePrecoField = togglePrecoField;


// Inject Styles for Visual Editor
const gridStyle = document.createElement('style');
gridStyle.textContent = `
    .block-container { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
    .block { width: 22px; height: 22px; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; transition: all 0.1s; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #64748b; }
    .block.seat { background-color: #22c55e; border-color: #16a34a; box-shadow: 0 1px 2px rgba(0,0,0,0.1); color: white; content: ""; }
    .block.gap { background-color: #f1f5f9; border-color: #e2e8f0; opacity: 0.6; }
    .block:hover { transform: scale(1.15); z-index: 10; border-color: #94a3b8; }
`;
document.head.appendChild(gridStyle);

function initLayoutEditor(layout, containerId = 'layoutRows') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    // Default Layout if empty
    if (!layout || layout.length === 0) {
        if (containerId === 'globalLayoutRows') return;
        const defaultLayout = [
            { fila: 'A', map: '1111111111' }, // 10
            { fila: 'B', map: '111111111111' }, // 12
            { fila: 'C', map: '11111111111111' }, // 14
            { fila: 'D', map: '11111111111111' }, // 14
            { fila: 'E', map: '111111111111' }  // 12
        ];
        defaultLayout.forEach(row => addLayoutRowUI(row.fila, row.map, containerId));
    } else {
        layout.forEach(row => {
            // Convert Legacy (lugares number) to Map String
            let map = row.map;
            if (!map && row.lugares) {
                map = '1'.repeat(row.lugares);
            }
            addLayoutRowUI(row.fila, map || '1111111111', containerId);
        });
    }
}
window.initLayoutEditor = initLayoutEditor;

function addLayoutRow(containerId = 'layoutRows') {
    const container = document.getElementById(containerId);
    const existingRows = container.querySelectorAll('.layout-row-item');
    const nextLetter = String.fromCharCode(65 + existingRows.length);
    addLayoutRowUI(nextLetter, '1111111111', containerId); // Default 10 seats
}
window.addLayoutRow = addLayoutRow;

function addLayoutRowUI(fila, mapString, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rowDiv = document.createElement('div');
    rowDiv.className = 'layout-row-item';
    rowDiv.dataset.map = mapString; // Store current map in dataset
    rowDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px; background: white; padding: 8px; border-radius: 6px; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px rgba(0,0,0,0.03);';

    rowDiv.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; width:40px;">
            <input type="text" class="form-input layout-fila" value="${fila}" style="width: 40px; text-align: center; font-weight:bold; border:none; background:transparent; font-size: 1.1rem;" maxlength="2" title="Letra da Fila">
        </div>
        <div class="block-container" style="flex:1;"></div>
        <div style="display:flex; gap:2px; flex-direction:column;">
            <div style="display:flex; gap:2px;">
                 <button type="button" onclick="addBlockToRow(this, '1')" class="btn btn-outline btn-sm" style="padding:2px 6px; font-size:10px; border-color:#22c55e; color:#22c55e;" title="Adicionar Cadeira">+💺</button>
                 <button type="button" onclick="addBlockToRow(this, '0')" class="btn btn-outline btn-sm" style="padding:2px 6px; font-size:10px; border-color:#94a3b8; color:#94a3b8;" title="Adicionar Espaço">+⬜</button>
            </div>
             <div style="display:flex; gap:2px;">
                <button type="button" onclick="trimRow(this)" class="btn btn-outline btn-sm" style="padding:2px 6px; font-size:10px;" title="Remover último">⌫</button>
                <button type="button" onclick="removeLayoutRow(this)" class="btn btn-danger btn-sm" style="padding:2px 6px; font-size:10px;">✕</button>
            </div>
        </div>
    `;

    container.appendChild(rowDiv);
    renderBlockContainer(rowDiv.querySelector('.block-container'), mapString);
}


function renderBlockContainer(container, mapString) {
    container.innerHTML = '';
    [...mapString].forEach((char, idx) => {
        const block = document.createElement('div');
        block.className = `block ${char === '1' ? 'seat' : 'gap'}`;
        // block.textContent = char === '1' ? (idx + 1) : ''; // Optional: show index? No, confusing with gaps.
        block.onclick = () => toggleBlockState(block, container);
        container.appendChild(block);
    });
}

function toggleBlockState(block, container) {
    const isSeat = block.classList.contains('seat');
    if (isSeat) {
        block.classList.remove('seat');
        block.classList.add('gap');
    } else {
        block.classList.remove('gap');
        block.classList.add('seat');
    }
    updateRowMap(container);
}

function addBlockToRow(btn, type) {
    const rowDiv = btn.closest('.layout-row-item');
    const container = rowDiv.querySelector('.block-container');
    const block = document.createElement('div');
    block.className = `block ${type === '1' ? 'seat' : 'gap'}`;
    block.onclick = () => toggleBlockState(block, container);
    container.appendChild(block);
    updateRowMap(container);
}
window.addBlockToRow = addBlockToRow;

function trimRow(btn) {
    const rowDiv = btn.closest('.layout-row-item');
    const container = rowDiv.querySelector('.block-container');
    if (container.lastChild) {
        container.removeChild(container.lastChild);
        updateRowMap(container);
    }
}
window.trimRow = trimRow;

function updateRowMap(container) {
    const rowDiv = container.closest('.layout-row-item');
    let map = '';
    container.querySelectorAll('.block').forEach(b => {
        map += b.classList.contains('seat') ? '1' : '0';
    });
    rowDiv.dataset.map = map;
}

function removeLayoutRow(btn) {
    btn.closest('.layout-row-item').remove();
}
window.removeLayoutRow = removeLayoutRow;

function getLayoutFromEditor(containerId = 'layoutRows') {
    const container = document.getElementById(containerId);
    if (!container) return [];

    const rows = container.querySelectorAll('.layout-row-item');
    const layout = [];
    rows.forEach(row => {
        const fila = row.querySelector('.layout-fila').value.toUpperCase();

        let map = row.dataset.map;
        if (!map) {
            map = '';
            row.querySelectorAll('.block').forEach(b => map += b.classList.contains('seat') ? '1' : '0');
        }

        const seatCount = (map.match(/1/g) || []).length;

        if (fila) {
            layout.push({
                fila,
                map,
                lugares: seatCount // Keep for compatibility
            });
        }
    });
    return layout;
}

// ============================================
// BILHETEIRA - GERAR LINKS ELENCO
// ============================================

async function gerarLinksElenco() {
    if (!currentPecaId) {
        if (window.showToast) window.showToast('Guarda a peça primeiro', 'error');
        return;
    }

    const peca = allPecas.find(p => p.id === currentPecaId);
    if (!peca || !peca.requerBilhete) {
        if (window.showToast) window.showToast('Esta peça não tem bilheteira ativa', 'error');
        return;
    }

    const quota = peca.bilheteConfig?.quotaElenco || 2;
    const participacoes = await getParticipacoes(currentPecaId);

    if (participacoes.length === 0) {
        if (window.showToast) window.showToast('Adiciona participantes ao elenco primeiro', 'error');
        return;
    }

    let sessaoId = null;
    if (peca.sessoes && peca.sessoes.length > 0) {
        // Simple prompt for now. Ideally a custom modal.
        const options = peca.sessoes.map((s, i) => `${i + 1}. ${new Date(s.data).toLocaleDateString()} ${new Date(s.data).toLocaleTimeString()}`).join('\n');
        const choice = prompt(`Para qual sessão são estes convites?\n\n0. 🎟️ QUALQUER SESSÃO (Livre)\n${options}\n\nDigita o número da opção (0 para todas):`, "0");

        if (choice === null) return; // Cancelled
        const idx = parseInt(choice) - 1;
        if (idx >= 0 && idx < peca.sessoes.length) {
            sessaoId = peca.sessoes[idx].id;
        }
    }

    // Apagar tokens antigos? No, maybe we want to add more? 
    // Actually, legacy logic deleted them. Let's keep it consistent BUT warn.
    if (!confirm('Isto vai APAGAR os links anteriores desta peça e gerar novos. Continuar?')) return;

    await deleteTokensElenco(currentPecaId);

    const linksContainer = document.getElementById('linksElencoList');
    linksContainer.innerHTML = '<p>A gerar links...</p>';

    const links = [];
    for (const p of participacoes) {
        const membro = allMembros.find(m => m.id === p.membroId);
        const nome = membro ? membro.nome : 'Membro';
        const result = await createTokenElenco(currentPecaId, p.membroId, nome, quota, sessaoId);
        const currentBaseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        const url = `${currentBaseUrl}bilhetes.html?peca=${currentPecaId}&token=${result.token}`;
        links.push({ nome, url, token: result.token });
    }

    linksContainer.innerHTML = links.map(l => `
        <div style="background: #f0fdf4; padding: 10px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #22c55e;">
            <strong>${escapeHtml(l.nome)}</strong>
            <div style="display: flex; gap: 8px; margin-top: 5px;">
                <input type="text" value="${l.url}" readonly style="flex: 1; padding: 5px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 4px;">
                <button type="button" onclick="copiarLink('${l.url}')" class="btn btn-outline btn-sm">📋 Copiar</button>
            </div>
            ${sessaoId ? '<div style="font-size:10px; color:#be123c; margin-top:4px;">⚠️ Válido apenas para sessão específica</div>' : ''}
        </div>
    `).join('');

    if (window.showToast) window.showToast(`${links.length} links gerados!`);
}
window.gerarLinksElenco = gerarLinksElenco;

async function gerarLinkTurma() {
    if (!currentPecaId) {
        if (window.showToast) window.showToast('Guarda a peça primeiro', 'error');
        return;
    }

    const turma = (document.getElementById('turmaLabel').value || '').trim();
    const numBilhetes = parseInt(document.getElementById('turmaBilhetes').value) || 0;

    if (!turma) {
        if (window.showToast) window.showToast('Introduz o nome da turma (ex: 10ºD)', 'error');
        return;
    }
    if (numBilhetes < 1) {
        if (window.showToast) window.showToast('Número de lugares inválido', 'error');
        return;
    }

    const peca = allPecas.find(p => p.id === currentPecaId);

    // Optional: session restriction
    let sessaoId = null;
    if (peca && peca.sessoes && peca.sessoes.length > 0) {
        const options = peca.sessoes.map((s, i) => `${i + 1}. ${new Date(s.data).toLocaleDateString()} ${new Date(s.data).toLocaleTimeString()}`).join('\n');
        const choice = prompt(`Para qual sessão é este convite de turma?\n\n0. 🎟️ QUALQUER SESSÃO (Livre)\n${options}\n\nDigita o número da opção (0 para todas):`, "0");
        if (choice === null) return;
        const idx = parseInt(choice) - 1;
        if (idx >= 0 && idx < peca.sessoes.length) {
            sessaoId = peca.sessoes[idx].id;
        }
    }

    try {
        await createTokenTurma(currentPecaId, turma, numBilhetes, sessaoId);

        // Clear inputs
        document.getElementById('turmaLabel').value = '';
        document.getElementById('turmaBilhetes').value = '30';

        if (window.showToast) window.showToast(`Convite para turma ${turma} criado!`);

        // Reload the saved turmas list
        loadTurmasConvidadas(currentPecaId);
    } catch (error) {
        if (window.showToast) window.showToast('Erro ao gerar link: ' + error.message, 'error');
        console.error(error);
    }
}
window.gerarLinkTurma = gerarLinkTurma;

// Load and render saved turma tokens from Firestore
async function loadTurmasConvidadas(pecaId) {
    const container = document.getElementById('linksTurmaList');
    if (!container) return;
    container.innerHTML = '<div style="color:#64748b; font-size:0.85rem; padding:6px 0;">A carregar turmas...</div>';

    try {
        const tokens = await getTurmaTokensByPeca(pecaId);

        if (tokens.length === 0) {
            container.innerHTML = '<div style="color:#94a3b8; font-size:0.85rem; padding:6px 0; font-style:italic;">Nenhuma turma convidada ainda.</div>';
            return;
        }

        container.innerHTML = tokens.map(t => {
            const currentBaseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
            const url = `${currentBaseUrl}bilhetes.html?peca=${pecaId}&token=${t.token}`;
            const usadas = t.reservasUsadas || 0;
            const total = t.quotaMax || 0;
            const restam = total - usadas;
            return `
                <div style="background:#eff6ff; padding:10px 12px; border-radius:8px; margin-bottom:8px; border-left:3px solid #0369a1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-weight:700; color:#0369a1;">🏫 ${escapeHtml(t.turma || t.membroNome)}</span>
                        <span style="font-size:0.8rem; background:${restam > 0 ? '#dcfce7' : '#fee2e2'}; color:${restam > 0 ? '#15803d' : '#b91c1c'}; padding:2px 8px; border-radius:20px;">
                            ${usadas}/${total} usados — ${restam} disponíveis
                        </span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <input type="text" value="${url}" readonly style="flex:1; padding:5px 8px; font-size:11px; border:1px solid #bfdbfe; border-radius:6px; background:#fff; color:#1e40af;">
                        <button type="button" onclick="copiarLink('${url}')" class="btn btn-outline btn-sm" style="white-space:nowrap;">📋</button>
                        <button type="button" onclick="revogarTurma('${t.id}')" class="btn btn-danger btn-sm" style="white-space:nowrap; padding:4px 8px;" title="Revogar acesso">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<div style="color:#b91c1c; font-size:0.85rem;">Erro ao carregar turmas.</div>';
        console.error(error);
    }
}
window.loadTurmasConvidadas = loadTurmasConvidadas;

async function revogarTurma(tokenId) {
    showConfirmModal(
        'Revogar Convite',
        'Tens a certeza que queres <b>revogar</b> este convite de turma? O link deixará de funcionar.',
        async () => {
            try {
                await deleteTurmaToken(tokenId);
                if (window.showToast) window.showToast('Convite revogado');
                loadTurmasConvidadas(currentPecaId);
            } catch (e) {
                if (window.showToast) window.showToast('Erro ao revogar', 'error');
            }
        },
        'Revogar',
        'btn-danger'
    );
}
window.revogarTurma = revogarTurma;

async function confirmarPagamentoReserva(reservaId) {
    if (!reservaId) return;

    showConfirmModal(
        'Confirmar Recebimento',
        'Confirmas que o visitante pagou o bilhete em <b>dinheiro físico</b>? Esta ação não pode ser desfeita.',
        async () => {
            try {
                // Usar marcarPagamento do firebase-config.js
                await marcarPagamento(reservaId, 'pago');
                if (window.showToast) window.showToast('Pagamento confirmado!');

                // Refresh the reservations table
                showAllReservations();

                // Refresh dashboard if stats are visible
                loadDashboardStats();
            } catch (err) {
                console.error('Erro ao confirmar pagamento:', err);
                if (window.showToast) window.showToast('Erro ao confirmar pagamento', 'error');
            }
        },
        'Confirmar Pago',
        'btn-success'
    );
}
window.confirmarPagamentoReserva = confirmarPagamentoReserva;

async function deleteReserva(id) {
    showConfirmModal(
        'Eliminar Reserva',
        'Tens a certeza que queres eliminar esta reserva permanentemente? Esta ação libertará o lugar.',
        async () => {
            try {
                await db.collection('reservas').doc(id).delete();
                if (window.showToast) window.showToast('Reserva eliminada');
                showAllReservations();
            } catch (error) {
                if (window.showToast) window.showToast('Erro ao eliminar reserva', 'error');
            }
        }
    );
}
window.deleteReserva = deleteReserva;

function showEmitirBilheteManual() {
    if (!currentPecaId) return;
    window.open(`bilhetes.html?peca=${currentPecaId}&mode=admin`, '_blank');
}
window.showEmitirBilheteManual = showEmitirBilheteManual;

function copiarLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        if (window.showToast) window.showToast('Link copiado!');
    });
}
window.copiarLink = copiarLink;

// ============================================
// GESTÃO GLOBAL DE RESERVAS
// ============================================

let reservationsUnsubscribe = null;
let allReservasGlobal = [];
let selectedReservas = new Set();

async function showAllReservations() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    // Cleanup previous listener
    if (reservationsUnsubscribe) reservationsUnsubscribe();

    mainContent.innerHTML = `
        <div class="header-actions" style="margin-bottom: 25px;">
            <div>
                <h2 style="font-family: 'Outfit', sans-serif; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                    <span style="background: var(--color-primary); color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 1.2rem;">📋</span>
                    Gestão Central de Reservas
                </h2>
                <p style="color: #64748b; margin-top: 5px;">Visualização hierárquica e ações em massa.</p>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="exportReservasExcel()" class="btn btn-outline" style="border-radius: 10px; border-color:#16a34a; color:#16a34a;">📊 Exportar Excel</button>
                <button onclick="location.reload()" class="btn btn-outline" style="border-radius: 10px;">← Painel Principal</button>
            </div>
        </div>

        <!-- Bulk Actions Toolbar (Hidden by default) -->
        <div id="bulkActionsToolbar" style="display:none; background:#1e293b; color:white; padding:15px 25px; border-radius:15px; margin-bottom:20px; justify-content:space-between; align-items:center; animation: slideDown 0.3s ease;">
            <div style="display:flex; align-items:center; gap:15px;">
                <span id="selectedCount" style="background:var(--color-primary); padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.9rem;">0 selecionados</span>
                <span style="opacity:0.6;">Ações em massa:</span>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="bulkMarkAsPaid()" class="btn btn-sm" style="background:#10b981; color:white; border:none;">💶 Marcar como Pago</button>
                <button onclick="bulkCheckin()" class="btn btn-sm" style="background:#3b82f6; color:white; border:none;">✅ Validar Check-in</button>
                <button onclick="bulkDelete()" class="btn btn-sm" style="background:#ef4444; color:white; border:none;">🗑️ Eliminar</button>
                <button onclick="clearSelection()" class="btn btn-sm" style="background:transparent; color:white; border:1px solid rgba(255,255,255,0.3);">Cancelar</button>
            </div>
        </div>

        <!-- Advanced Filters -->
        <div class="card" style="margin-bottom:25px; padding:20px; border-radius:15px;">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:15px; align-items:center;">
                <div style="position: relative;">
                    <span style="position: absolute; left: 12px; top: 12px; color: #94a3b8;">🔍</span>
                    <input type="text" id="searchReserva" placeholder="Nome, Código, Turma, Local..." 
                        class="form-input" style="padding-left: 35px; border-radius: 10px; width: 100%;">
                </div>
                <select id="filterPecaReserva" class="form-select" style="border-radius: 10px;">
                    <option value="">Todas as Peças</option>
                    ${allPecas.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('')}
                </select>
                <select id="filterStatusReserva" class="form-select" style="border-radius: 10px;">
                    <option value="">Todos os Estados</option>
                    <option value="pago text-success">✅ Pagos</option>
                    <option value="pendente text-warning">⏳ Pendentes</option>
                    <option value="isento text-primary">🆓 Isentos</option>
                    <option value="checkin">🏁 Check-in Feito</option>
                </select>
                <button onclick="resetReservaFilters()" class="btn btn-outline" style="border-radius: 10px; font-size: 0.85rem; padding: 10px;">🔄 Limpar</button>
            </div>
        </div>

        <div id="reservasHierarchicalList">
            <div style="text-align:center; padding:100px;">
                <div class="loading-spinner" style="margin:0 auto 20px;"></div>
                A organizar base de dados...
            </div>
        </div>
    `;

    // Initialize snapshot listener
    reservasUnsubscribe = db.collection('reservas')
        .orderBy('dataCriacao', 'desc')
        .onSnapshot(snapshot => {
            allReservasGlobal = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderHierarchicalReservations();
        }, err => {
            console.error('Snapshot error:', err);
            document.getElementById('reservasHierarchicalList').innerHTML = '<p class="text-danger">Erro ao sincronizar dados.</p>';
        });

    // Attach filter listeners
    document.getElementById('searchReserva').addEventListener('input', renderHierarchicalReservations);
    document.getElementById('filterPecaReserva').addEventListener('change', renderHierarchicalReservations);
    document.getElementById('filterStatusReserva').addEventListener('change', renderHierarchicalReservations);
}

window.getFilteredReservations = () => {
    const term = (document.getElementById('searchReserva')?.value || '').toLowerCase();
    const pecaIdFilter = document.getElementById('filterPecaReserva')?.value || '';
    const statusFilter = document.getElementById('filterStatusReserva')?.value || '';

    return allReservasGlobal.filter(r => {
        const peca = allPecas.find(p => p.id === r.pecaId);
        const sessao = (peca?.sessoes || []).find(s => s.id === r.sessaoId);
        const sessaoLocal = (sessao?.local || '').toLowerCase();

        const matchesTerm = (r.nomeReservante || '').toLowerCase().includes(term) ||
            (r.codigoBilhete || '').toLowerCase().includes(term) ||
            (r.turma || '').toLowerCase().includes(term) ||
            sessaoLocal.includes(term) ||
            (`${r.fila || ''}${r.lugar || ''}`).toLowerCase().includes(term);

        const matchesPeca = pecaIdFilter ? r.pecaId === pecaIdFilter : true;

        let matchesStatus = true;
        if (statusFilter === 'checkin') matchesStatus = r.entradaValidada || r.validado;
        else if (statusFilter === 'pago text-success') matchesStatus = r.pagamentoStatus === 'pago';
        else if (statusFilter === 'pendente text-warning') matchesStatus = r.pagamentoStatus === 'pendente' && !isReservaExpirada(r);
        else if (statusFilter === 'isento text-primary') matchesStatus = (r.pagamentoStatus === 'isento' || r.pagamentoStatus === 'bypassed');

        return matchesTerm && matchesPeca && matchesStatus;
    });
};

function renderHierarchicalReservations() {
    const listContainer = document.getElementById('reservasHierarchicalList');
    if (!listContainer) return;

    // Use global filter
    let filtered = window.getFilteredReservations();

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="card" style="text-align:center; padding:80px; color:#94a3b8; border:2px dashed #e2e8f0; background:transparent; border-radius:20px;">
                <div style="font-size:4rem; margin-bottom:15px;">🔍</div>
                Nenhuma reserva corresponde à pesquisa.
            </div>`;
        return;
    }

    // Grouping Logic: Play > Session
    const pecasMap = {};
    filtered.forEach(r => {
        if (!pecasMap[r.pecaId]) {
            const p = allPecas.find(x => x.id === r.pecaId) || { nome: 'Peça Desconhecida', sessoes: [] };
            pecasMap[r.pecaId] = { ...p, sessions: {} };
        }
        if (!pecasMap[r.pecaId].sessions[r.sessaoId]) {
            const s = (pecasMap[r.pecaId].sessoes || []).find(x => x.id === r.sessaoId) || { data: null, local: 'Local indisp.' };
            pecasMap[r.pecaId].sessions[r.sessaoId] = { ...s, items: [] };
        }
        pecasMap[r.pecaId].sessions[r.sessaoId].items.push(r);
    });

    let html = '';
    Object.values(pecasMap).forEach(peca => {
        html += `
            <div class="peca-group" style="margin-bottom:40px;">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                    <div style="width:4px; height:24px; background:var(--color-primary); border-radius:2px;"></div>
                    <h3 style="font-family:'Outfit'; font-size:1.5rem; margin:0;">${escapeHtml(peca.nome)}</h3>
                </div>
        `;

        Object.values(peca.sessions).forEach(sessao => {
            const date = sessao.data ? new Date(sessao.data) : null;
            const dateStr = date ? date.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Data indisp.';
            const timeStr = date ? date.getHours().toString().padStart(2, '0') + 'h' + date.getMinutes().toString().padStart(2, '0') : '';

            const totalTickets = sessao.items.length;
            const checkins = sessao.items.filter(x => x.entradaValidada).length;
            const pending = sessao.items.filter(x => x.pagamentoStatus === 'pendente' && !isReservaExpirada(x)).length;

            html += `
                <div class="sessao-card" style="background:white; border-radius:15px; border:1px solid #e2e8f0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom:20px; overflow:hidden;">
                    <div style="background:#f8fafc; padding:15px 20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:1.5rem;">📅</span>
                            <div>
                                <div style="font-weight:900; color:#1e293b; text-transform:capitalize;">${dateStr} ${timeStr ? ' às ' + timeStr : ''}</div>
                                <div style="font-size:0.8rem; color:#64748b;">📍 ${escapeHtml(sessao.local)}</div>
                            </div>
                        </div>
                        <div style="display:flex; gap:20px;">
                            <div style="text-align:center;">
                                <div style="font-size:1.2rem; font-weight:800; color:#3b82f6;">${totalTickets}</div>
                                <div style="font-size:0.6rem; text-transform:uppercase; font-weight:700; opacity:0.6;">Tickets</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:1.2rem; font-weight:800; color:#10b981;">${checkins}</div>
                                <div style="font-size:0.6rem; text-transform:uppercase; font-weight:700; opacity:0.6;">Check-ins</div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:1.2rem; font-weight:800; color:#f59e0b;">${pending}</div>
                                <div style="font-size:0.6rem; text-transform:uppercase; font-weight:700; opacity:0.6;">Pendentes</div>
                            </div>
                        </div>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="data-table" style="width:100%; border:none;">
                            <thead>
                                <tr style="background:#fff; color:#1e293b;">
                                    <th style="width:40px; text-align:center;">
                                        <input type="checkbox" onchange="toggleSelectSessao('${peca.id}', '${sessao.id}', this.checked)" style="cursor:pointer; width:18px; height:18px;">
                                    </th>
                                    <th style="color:#1e293b;">Código</th>
                                    <th style="color:#1e293b;">Visitante</th>
                                    <th style="text-align:center; color:#1e293b;">Lugar</th>
                                    <th style="color:#1e293b;">Status Pagamento</th>
                                    <th style="color:#1e293b;">Check-in</th>
                                    <th style="text-align:center; color:#1e293b;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sessao.items.map(r => renderReservaRow(r)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });

    listContainer.innerHTML = html;
}

function renderReservaRow(r) {
    const isSelected = selectedReservas.has(r.id);
    const expirada = isReservaExpirada(r);
    const checkedIn = r.entradaValidada || r.validado;

    // Payment Badge
    let payBadge = '';
    if (r.pagamentoStatus === 'pago') payBadge = '<span class="badge" style="background:#dcfce7; color:#166534; font-weight:800; font-size:0.7rem;">PAGO 💶</span>';
    else if (r.pagamentoStatus === 'isento' || r.pagamentoStatus === 'bypassed') payBadge = '<span class="badge" style="background:#eff6ff; color:#1e40af; font-weight:800; font-size:0.7rem;">ISENTO 🆓</span>';
    else if (expirada) payBadge = '<span class="badge" style="background:#fee2e2; color:#991b1b; font-weight:800; font-size:0.7rem;">EXPIRADO ⏰</span>';
    else payBadge = '<span class="badge" style="background:#fef3c7; color:#92400e; font-weight:800; font-size:0.7rem;">PENDENTE ⏳</span>';

    return `
        <tr class="${isSelected ? 'selected-row' : ''}" style="border-top:1px solid #f1f5f9; ${isSelected ? 'background:#f0f9ff;' : ''} color:#1e293b;">
            <td style="text-align:center;">
                <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleReservaSelection('${r.id}', this.checked)" style="cursor:pointer; width:18px; height:18px;">
            </td>
            <td><code style="font-weight:800; color:#475569;">${r.codigoBilhete}</code></td>
            <td>
                <div style="font-weight:700; color:#1e293b;">${escapeHtml(r.nomeReservante)}</div>
                <div style="font-size:0.7rem; color:#94a3b8;">${escapeHtml(r.email || r.emailReservante || 'Bilheteira POS')}</div>
                ${r.turma ? `<div style="font-size:0.7rem; color:var(--color-accent); font-weight:700; margin-top:2px;">🎓 Turma: ${escapeHtml(r.turma)}</div>` : ''}
            </td>
            <td style="text-align:center;">
                <span style="font-weight:900; color:var(--color-primary); background:#eff6ff; padding:3px 8px; border-radius:6px; border:1px solid #dbeafe;">${r.fila}${r.lugar}</span>
            </td>
            <td>${payBadge}</td>
            <td>
                <button onclick="toggleCheckinReserva('${r.id}', ${!checkedIn})" class="btn" style="padding:4px 10px; font-size:0.75rem; border-radius:6px; background:${checkedIn ? '#dcfce7' : '#f1f5f9'}; color:${checkedIn ? '#166534' : '#64748b'}; border:1px solid ${checkedIn ? '#166534' : '#e2e8f0'}; font-weight:800;">
                    ${checkedIn ? '✅ Entrou' : '⏳ Pendente'}
                </button>
            </td>
            <td style="text-align:right; padding-right:15px;">
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button onclick="baixarBilheteAdmin('${r.id}')" class="btn btn-sm btn-outline" style="padding:5px 8px;" title="Descarregar Bilhete">📥</button>
                    <button onclick="confirmDeleteReserva('${r.id}')" class="btn btn-sm btn-danger" style="padding:5px 8px; background:#fee2e2; color:#ef4444; border:none;" title="Eliminar">🗑️</button>
                </div>
            </td>
        </tr>
    `;
}

function resetReservaFilters() {
    const search = document.getElementById('searchReserva');
    const peca = document.getElementById('filterPecaReserva');
    const status = document.getElementById('filterStatusReserva');
    if (search) search.value = '';
    if (peca) peca.value = '';
    if (status) status.value = '';
    renderHierarchicalReservations();
}

async function toggleCheckinReserva(id, targetState) {
    try {
        await db.collection('reservas').doc(id).update({
            entradaValidada: targetState,
            dataEntrada: targetState ? firebase.firestore.FieldValue.serverTimestamp() : null,
            validado: targetState // For legacy sync
        });
        if (window.showToast) window.showToast(targetState ? 'Check-in realizado!' : 'Check-in resetado');
    } catch (err) {
        console.error('Erro ao alternar check-in:', err);
    }
}

// SELECTION LOGIC
function toggleReservaSelection(id, isSelected) {
    if (isSelected) selectedReservas.add(id);
    else selectedReservas.delete(id);
    updateBulkToolbar();
    renderHierarchicalReservations();
}

function toggleSelectSessao(pecaId, sessaoId, isSelected) {
    const list = allReservasGlobal.filter(r => r.pecaId === pecaId && r.sessaoId === sessaoId);
    list.forEach(r => {
        if (isSelected) selectedReservas.add(r.id);
        else selectedReservas.delete(r.id);
    });
    updateBulkToolbar();
    renderHierarchicalReservations();
}

function clearSelection() {
    selectedReservas.clear();
    updateBulkToolbar();
    renderHierarchicalReservations();
}

function updateBulkToolbar() {
    const toolbar = document.getElementById('bulkActionsToolbar');
    const countEl = document.getElementById('selectedCount');
    if (!toolbar || !countEl) return;

    if (selectedReservas.size > 0) {
        toolbar.style.display = 'flex';
        countEl.textContent = `${selectedReservas.size} selecionados`;
    } else {
        toolbar.style.display = 'none';
    }
}

// BULK ACTIONS
async function bulkMarkAsPaid() {
    if (selectedReservas.size === 0) return;
    if (!confirm(`Desejas marcar ${selectedReservas.size} bilhetes como PAGOS?`)) return;

    const batch = db.batch();
    selectedReservas.forEach(id => {
        batch.update(db.collection('reservas').doc(id), {
            pagamentoStatus: 'pago',
            dataPagamento: firebase.firestore.FieldValue.serverTimestamp()
        });
    });

    try {
        await batch.commit();
        if (window.showToast) window.showToast(`${selectedReservas.size} bilhetes marcados como pagos!`);
        clearSelection();
    } catch (err) {
        alert('Erro ao realizar ação em massa.');
    }
}

async function bulkCheckin() {
    if (selectedReservas.size === 0) return;
    if (!confirm(`Desejas marcar ${selectedReservas.size} bilhetes como ENTRADOS (Check-in)?`)) return;

    const batch = db.batch();
    selectedReservas.forEach(id => {
        batch.update(db.collection('reservas').doc(id), {
            entradaValidada: true,
            dataEntrada: firebase.firestore.FieldValue.serverTimestamp(),
            validado: true
        });
    });

    try {
        await batch.commit();
        if (window.showToast) window.showToast(`${selectedReservas.size} check-ins realizados!`);
        clearSelection();
    } catch (err) {
        alert('Erro ao realizar ação em massa.');
    }
}

async function bulkDelete() {
    if (selectedReservas.size === 0) return;
    if (!confirm(`🚨 ATENÇÃO: Desejas eliminar PERMANENTEMENTE ${selectedReservas.size} bilhetes?`)) return;

    const batch = db.batch();
    selectedReservas.forEach(id => {
        batch.delete(db.collection('reservas').doc(id));
    });

    try {
        await batch.commit();
        if (window.showToast) window.showToast(`${selectedReservas.size} bilhetes eliminados.`);
        clearSelection();
    } catch (err) {
        alert('Erro ao realizar ação em massa.');
    }
}

window.showAllReservations = showAllReservations;
window.toggleReservaSelection = toggleReservaSelection;
window.toggleSelectSessao = toggleSelectSessao;
window.clearSelection = clearSelection;
window.bulkMarkAsPaid = bulkMarkAsPaid;
window.bulkCheckin = bulkCheckin;
window.bulkDelete = bulkDelete;
window.resetReservaFilters = resetReservaFilters;
window.toggleCheckinReserva = toggleCheckinReserva;

// Export Logic (Expert Level Excel)
// Export Logic (Expert Level Excel)
window.exportReservasExcel = () => {
    if (typeof XLSX === 'undefined') {
        alert('A carregar biblioteca de exportação... Tenta novamente em segundos.');
        return;
    }

    const filteredReservas = window.getFilteredReservations();
    const useFiltered = filteredReservas.length < allReservasGlobal.length;

    if (useFiltered) {
        if (!confirm(`Desejas exportar apenas os ${filteredReservas.length} resultados filtrados? (Se cancelares, exportará TUDO)`)) {
            generateExcel(allReservasGlobal);
        } else {
            generateExcel(filteredReservas);
        }
    } else {
        generateExcel(allReservasGlobal);
    }

    function generateExcel(dataToExport) {
        // Sort data by Session and then by Name
        const sortedData = [...dataToExport].sort((a, b) => {
            if (a.sessaoId !== b.sessaoId) return (a.sessaoId || '').localeCompare(b.sessaoId || '');
            return (a.nomeReservante || '').localeCompare(b.nomeReservante || '');
        });

        // 1. RAW DATA SHEET
        const rawData = sortedData.map(r => {
            const peca = allPecas.find(p => p.id === r.pecaId);
            let sessaoTxt = 'Padrão';
            if (peca && peca.sessoes && r.sessaoId) {
                const s = peca.sessoes.find(sess => sess.id === r.sessaoId);
                if (s) {
                    const dateObj = new Date(s.data);
                    sessaoTxt = `${dateObj.toLocaleDateString()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}h`;
                }
            }

            return {
                'Data Reserva': r.dataCriacao ? new Date(r.dataCriacao.toDate()).toLocaleString('pt-PT') : '',
                'Código': r.codigoBilhete || '',
                'Visitante': r.nomeReservante || '',
                'Turma': r.turma || '',
                'Telemóvel': r.telefone || r.telemovel || '',
                'Email': r.email || r.emailReservante || '',
                'Peça': peca?.nome || '',
                'Sessão': sessaoTxt,
                'Lugar': `${r.fila || ''}${r.lugar || ''}`,
                'Pagamento': r.pagamentoStatus?.toUpperCase() || 'PENDENTE',
                'Preço': r.preco || 0,
                'Check-in': (r.entradaValidada || r.validado) ? 'SIM' : 'NÃO',
                'Data Check-in': r.dataEntrada ? new Date(r.dataEntrada.toDate()).toLocaleString('pt-PT') : '-'
            };
        });

        const wsData = XLSX.utils.json_to_sheet(rawData);
        wsData['!autofilter'] = { ref: `A1:M${rawData.length + 1}` };
        wsData['!views'] = [{ state: 'frozen', ySplit: 1, xSplit: 0, topLeftCell: 'A2', activePane: 'bottomRight' }];
        wsData['!cols'] = [
            { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }
        ];

        // 2. DASHBOARD SHEET (Statistics)
        const totalPaidCount = sortedData.filter(r => r.pagamentoStatus === 'pago').length;
        const totalValue = sortedData.reduce((acc, r) => acc + (r.pagamentoStatus === 'pago' ? (r.preco || 0) : 0), 0);

        const dashboardData = [
            ['RELATÓRIO DE RESERVAS - CLUBE DE TEATRO'],
            ['Exportado em:', new Date().toLocaleString('pt-PT')],
            ['Registos Exportados:', rawData.length],
            [],
            ['RESUMO FINANCEIRO (PAGOS)'],
            ['Total de Bilhetes Pagos', totalPaidCount],
            ['Total Recebido Est.', totalValue.toFixed(2) + ' €'],
            [],
            ['BREAKDOWN POR PEÇA/SESSÃO'],
            ['Peça', 'Sessão', 'Reservas', 'Check-ins', 'Taxa Ocupação']
        ];

        // Breakdown logic
        const breakdown = {};
        sortedData.forEach(r => {
            const key = `${r.pecaId}_${r.sessaoId}`;
            if (!breakdown[key]) {
                const peca = allPecas.find(p => p.id === r.pecaId);
                const sessao = (peca?.sessoes || []).find(s => s.id === r.sessaoId);
                let sessTxt = 'Sessão Única';
                if (sessao) {
                    const d = new Date(sessao.data);
                    sessTxt = `${d.toLocaleDateString()} ${d.getHours()}h`;
                }
                breakdown[key] = {
                    peca: peca?.nome || 'Desc.',
                    sessao: sessTxt,
                    count: 0,
                    checkins: 0
                };
            }
            breakdown[key].count++;
            if (r.entradaValidada || r.validado) breakdown[key].checkins++;
        });

        Object.values(breakdown).forEach(b => {
            dashboardData.push([b.peca, b.sessao, b.count, b.checkins, Math.round((b.checkins / b.count) * 100) + '%']);
        });

        const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardData);
        wsDashboard['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];

        // 3. WORKBOOK ASSEMBLY
        const wb = XLSX.utils.book_new();
        XLSX.writeFile(wb, `Reservas_Teatro_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
};

// ============================================
// ============================================

// ============================================
// POS (Point of Sale) - Bilheteira Rápida
// ============================================

let allReservasPOS = [];
let posSnapshotUnsubscribe = null;

async function loadPOSData() {
    const listContainer = document.getElementById('posPendingList');
    if (!listContainer) return;

    // Se já houver um listener ativo, cancelamos para não duplicar
    if (posSnapshotUnsubscribe) posSnapshotUnsubscribe();

    listContainer.innerHTML = `
        <div style="text-align:center; padding: 40px; color:#64748b;">
            <div class="loading-spinner" style="margin: 0 auto 15px;"></div>
            Ativando sincronização em tempo real (Suprasumo)...
        </div>
    `;

    try {
        // --- FIX: Garantir que temos as peças carregadas para os preços ---
        if (allPecas.length === 0) {
            allPecas = await getPecas();
        }

        // Configuramos o listener Real-time
        posSnapshotUnsubscribe = db.collection('reservas')
            .orderBy('dataCriacao', 'desc')
            .onSnapshot(snapshot => {
                console.log('⚡ [POS] Sincronização em tempo real recebida');
                allReservasPOS = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderPOS();
            }, error => {
                console.error('Erro Real-time POS:', error);
                if (window.showToast) window.showToast('Erro na sincronização POS', 'error');
            });

    } catch (error) {
        console.error('Erro POS:', error);
        listContainer.innerHTML = '<p style="color:#ef4444; padding:20px; text-align:center;">Erro ao carregar dados do servidor.</p>';
    }
}
window.loadPOSData = loadPOSData;

function renderPOS() {
    const term = (document.getElementById('posSearchInput')?.value || '').toLowerCase();
    const listContainer = document.getElementById('posPendingList');
    const recentContainer = document.getElementById('posRecentPaidList');
    const countEl = document.getElementById('posPendingCount');
    const totalEl = document.getElementById('posDailyTotal');

    if (!listContainer) return;

    // Filter for non-expired pending reservations
    const pending = allReservasPOS.filter(r =>
        r.pagamentoStatus === 'pendente' && !isReservaExpirada(r)
    );

    const filtered = pending.filter(r =>
        (r.nomeReservante || '').toLowerCase().includes(term) ||
        (r.codigoBilhete || '').toLowerCase().includes(term)
    );

    // Calculate Today's Totals (Paid today)
    const agora = new Date();
    const paidToday = allReservasPOS.filter(r => {
        if (r.pagamentoStatus !== 'pago' || !r.dataPagamento) return false;
        const d = r.dataPagamento.toDate ? r.dataPagamento.toDate() : new Date(r.dataPagamento);
        return d.getDate() === agora.getDate() && d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    });

    let totalDinheiro = 0;
    paidToday.forEach(r => {
        const peca = allPecas.find(p => p.id === r.pecaId);
        if (peca && peca.pecaPaga) {
            totalDinheiro += (peca.preco || 0);
        }
    });

    totalEl.textContent = totalDinheiro.toFixed(2) + '€';
    countEl.textContent = filtered.length > 0 ? `${filtered.length} bilhetes por pagar` : 'Tudo em dia!';
    countEl.style.background = filtered.length > 0 ? '#fef3c7' : '#dcfce7';
    countEl.style.color = filtered.length > 0 ? '#92400e' : '#15803d';

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="card" style="text-align:center; padding:60px; color:#94a3b8; border: 2px dashed #e2e8f0; background: transparent;">
                <div style="font-size: 3rem; margin-bottom: 10px;">✨</div>
                Nenhum bilhete pendente ${term ? 'com este filtro' : 'para hoje'}.
            </div>
        `;
    } else {
        // --- FIX: Agrupar por Email OU Nome (se for presencial) ---
        const grouped = {};
        filtered.forEach(r => {
            // Se não tem email, usamos o nome para agrupar (vendas presenciais da mesma pessoa)
            const key = (r.emailReservante || ('presencial-' + r.nomeReservante) || r.id).toLowerCase();
            if (!grouped[key]) {
                grouped[key] = {
                    nome: r.nomeReservante,
                    email: r.emailReservante,
                    items: [],
                    total: 0
                };
            }
            const peca = allPecas.find(p => p.id === r.pecaId);
            const preco = (peca && peca.pecaPaga) ? (peca.preco || 0) : 0;

            grouped[key].items.push(r);
            grouped[key].total += preco;
        });

        listContainer.innerHTML = Object.values(grouped).map(group => {
            const ids = group.items.map(r => r.id).join(',');
            const count = group.items.length;

            return `
                <div class="card pos-card fade-in" 
                    onclick="startPaymentPOS('${ids}', ${group.total})"
                    style="display:flex; justify-content:space-between; align-items:center; padding:20px; border-left: 6px solid #f59e0b; transition: all 0.2s; margin-bottom: 15px; cursor: pointer;">
                    <div style="flex: 1;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
                            <div style="font-weight:800; font-size:1.2rem; color:#1e293b;">${escapeHtml(group.nome)}</div>
                            ${count > 1 ? `<span style="background:var(--color-primary); color:white; font-size:0.75rem; padding:2px 8px; border-radius:20px; font-weight:700;">${count} BILHETES</span>` : ''}
                        </div>
                        <div style="font-size:0.85rem; color:#64748b; margin-bottom:8px;">${escapeHtml(group.email || 'Presencial')}</div>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${group.items.map(r => `
                                <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:700; color:#475569;">${r.codigoBilhete} (${r.fila}${r.lugar})</span>
                            `).join('')}
                        </div>
                    </div>
                    <div class="pos-card-right" style="display:flex; align-items:center; gap:25px; margin-left: 20px;">
                        <div style="text-align:right;">
                            <div style="font-size:1.8rem; font-weight:900; color:#1e293b;">${group.total.toFixed(2)}€</div>
                            <div style="font-size:0.7rem; color:#f59e0b; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Total a Pagar</div>
                        </div>
                        <div class="btn btn-sm" style="background:#f59e0b; color:white; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center;">💶</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Recent paid list logic was removed from HTML sidebar for focus but remains in JS for data if needed
    // However, the user asked to remove "Ultimos Pagos", so we'll just skip rendering to the now deleted container
}

let currentPaymentIds = null;

async function startPaymentPOS(ids, total) {
    currentPaymentIds = ids;
    openCalculator(total);
}
window.startPaymentPOS = startPaymentPOS;

// ============================================
// BILHETEIRA (POS) - VENDA MANUAL
// ============================================

let currentPOSManualSelectedSeats = [];

function showManualPOSReserva() {
    const modal = document.getElementById('posManualModal');
    const pecaSelect = document.getElementById('posManualPeca');
    const sessaoSelect = document.getElementById('posManualSessao');
    const seatMap = document.getElementById('posManualSeatMap');

    if (!modal || !pecaSelect) return;

    // Reset form
    document.getElementById('posManualForm').reset();
    sessaoSelect.innerHTML = '<option value="">Primeiro escolha a peça...</option>';
    if (seatMap) seatMap.innerHTML = '';
    currentPOSManualSelectedSeats = [];
    document.getElementById('posManualTotal').textContent = '0.00€';
    document.getElementById('posManualSelectionInfo').textContent = 'Nenhum lugar selecionado';

    // Populate Plays (Pecas)
    pecaSelect.innerHTML = '<option value="">Selecione uma peça...</option>' +
        allPecas.map(p => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('');

    modal.classList.add('active');
}
window.showManualPOSReserva = showManualPOSReserva;

function closePOSManualModal() {
    const modal = document.getElementById('posManualModal');
    if (modal) modal.classList.remove('active');
}

async function updatePOSManualSessions() {
    const pecaId = document.getElementById('posManualPeca').value;
    const sessaoSelect = document.getElementById('posManualSessao');
    const precoBaseEl = document.getElementById('posManualPrecoBase');
    const taxaPOSEl = document.getElementById('posManualTaxaPOS');
    const totalEl = document.getElementById('posManualTotal');
    const seatMap = document.getElementById('posManualSeatMap');

    if (!pecaId) {
        sessaoSelect.innerHTML = '<option value="">Primeiro escolha a peça...</option>';
        if (seatMap) seatMap.innerHTML = '';
        return;
    }

    const peca = allPecas.find(p => p.id === pecaId);
    if (!peca) return;

    const precoBase = peca.pecaPaga ? (peca.preco || 0) : 0;

    // Get config for Taxa POS
    let taxa = 0;
    try {
        const config = await getConfig();
        taxa = config.taxaPOS || 0;
    } catch (e) { console.warn('Falha ao obter taxa POS', e); }

    const total = precoBase + taxa;

    precoBaseEl.textContent = precoBase.toFixed(2) + '€';
    taxaPOSEl.textContent = taxa.toFixed(2) + '€';
    totalEl.textContent = total.toFixed(2) + '€';

    if (peca.sessoes) {
        sessaoSelect.innerHTML = '<option value="">Selecione uma sessão...</option>' +
            peca.sessoes.map(s => {
                const d = new Date(s.data);
                return `<option value="${s.id}">${d.toLocaleDateString()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}h - ${escapeHtml(s.local)}</option>`;
            }).join('');

        // Se houver apenas uma sessão, seleciona e renderiza mapa
        if (peca.sessoes.length === 1) {
            sessaoSelect.value = peca.sessoes[0].id;
            renderPOSManualSeatMap(pecaId, peca.sessoes[0].id);
        } else if (seatMap) {
            seatMap.innerHTML = '<div style="text-align:center; color:#64748b; padding:20px;">Escolha uma sessão para ver os lugares...</div>';
        }
    } else {
        sessaoSelect.innerHTML = '<option value="">Sem sessões disponíveis</option>';
        if (seatMap) seatMap.innerHTML = '';
    }
}

// --- NOVO: Mapa de Lugares Interativo para POS ---
async function renderPOSManualSeatMap(pecaId, sessaoId) {
    const container = document.getElementById('posManualSeatMap');
    if (!container || !pecaId || !sessaoId) return;

    container.innerHTML = '<div style="text-align:center; padding:10px; font-size:0.8rem; color:#64748b;">A carregar mapa...</div>';

    try {
        const doc = await db.collection('pecas').doc(pecaId).get();
        if (!doc.exists) return;
        const peca = doc.data();

        // Carregar layout de lugares
        const layoutDoc = await db.collection('config').doc('layout').get();
        const layout = layoutDoc.exists ? layoutDoc.data().layout : [];

        // Carregar reservas desta sessão
        const snapshot = await db.collection('reservas')
            .where('pecaId', '==', pecaId)
            .where('sessaoId', '==', sessaoId)
            .get();

        const ocupados = new Set();
        snapshot.forEach(d => {
            const data = d.data();
            if (data.pagamentoStatus !== 'cancelada' && data.pagamentoStatus !== 'expirada') {
                ocupados.add(`${data.fila}-${data.lugar}`);
            }
        });

        let html = '<div class="stage-indicator">🎭 PALCO</div> <div class="seat-map-pos">';

        layout.forEach(row => {
            const map = row.map || '1'.repeat(row.lugares || 10);
            html += `<div class="seat-row">`;
            let seatCount = 0;
            [...map].forEach(char => {
                if (char === '1') {
                    seatCount++;
                    const seatId = `${row.fila}-${seatCount}`;
                    const isOccupied = ocupados.has(seatId);
                    const isSelected = currentPOSManualSelectedSeats.includes(seatId);

                    html += `
                        <div id="pos-seat-${row.fila}-${seatCount}" 
                             class="seat ${isOccupied ? 'seat--occupied' : ''} ${isSelected ? 'seat--selected' : ''}" 
                             onclick="${isOccupied ? '' : `togglePOSManualSeat('${row.fila}', ${seatCount})`}"
                             title="${isOccupied ? 'Ocupado' : `Fila ${row.fila}, Lugar ${seatCount}`}">
                            ${seatCount}
                        </div>`;
                } else {
                    html += `<div style="width:24px; height:24px;"></div>`;
                }
            });
            html += `</div>`;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (e) {
        console.error('Erro ao renderizar mapa POS:', e);
        container.innerHTML = '<div style="color:red; font-size:0.8rem;">Erro ao carregar mapa.</div>';
    }
}
window.renderPOSManualSeatMap = renderPOSManualSeatMap;

function togglePOSManualSeat(fila, lugar) {
    const seatId = `${fila}-${lugar}`;
    const idx = currentPOSManualSelectedSeats.indexOf(seatId);
    const seatEl = document.getElementById(`pos-seat-${fila}-${lugar}`);

    if (idx > -1) {
        currentPOSManualSelectedSeats.splice(idx, 1);
        if (seatEl) seatEl.classList.remove('seat--selected');
    } else {
        currentPOSManualSelectedSeats.push(seatId);
        if (seatEl) seatEl.classList.add('seat--selected');
    }

    // Atualizar UI de seleção
    const infoEl = document.getElementById('posManualSelectionInfo');
    if (infoEl) {
        infoEl.textContent = currentPOSManualSelectedSeats.length > 0
            ? `${currentPOSManualSelectedSeats.length} lugar(es) selecionado(s): ${currentPOSManualSelectedSeats.join(', ')}`
            : 'Nenhum lugar selecionado';
    }

    // Re-calcular total
    updatePOSManualPrice();
}

async function updatePOSManualPrice() {
    const pecaId = document.getElementById('posManualPeca').value;
    const totalEl = document.getElementById('posManualTotal');
    if (!pecaId || !totalEl) return;

    const peca = allPecas.find(p => p.id === pecaId);
    if (!peca) return;

    const config = await getConfig();
    const taxa = config.taxaPOS || 0;
    const precoBase = peca.pecaPaga ? (peca.preco || 0) : 0;
    const unitario = precoBase + taxa;

    const total = unitario * (currentPOSManualSelectedSeats.length || 1);
    totalEl.textContent = total.toFixed(2) + '€';
}
window.togglePOSManualSeat = togglePOSManualSeat;

function bridgeManualToCalc() {
    const totalEl = document.getElementById('posManualTotal');
    if (!totalEl) return;
    const total = parseFloat(totalEl.textContent) || 0;
    if (total > 0) {
        openCalculator(total);
        if (window.showToast) window.showToast('Calculadora aberta com o total da venda.');
    } else {
        if (window.showToast) window.showToast('Selecione lugares para calcular o troco.');
    }
}
window.bridgeManualToCalc = bridgeManualToCalc;

async function handlePOSManualSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'A processar...';
    }

    const pecaId = document.getElementById('posManualPeca').value;
    const sessaoId = document.getElementById('posManualSessao').value;
    const nome = document.getElementById('posManualNome').value.trim();
    const fila = document.getElementById('posManualFila').value.trim().toUpperCase() || '-';
    const lugar = document.getElementById('posManualLugar').value.trim() || '-';

    if (!pecaId || !sessaoId || !nome) {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Confirmar Venda e Imprimir';
        }
        return;
    }

    try {
        const peca = allPecas.find(p => p.id === pecaId);
        const config = await getConfig();
        const taxa = config.taxaPOS || 0;
        const precoBase = peca && peca.pecaPaga ? (peca.preco || 0) : 0;
        const precoFinalUnitario = precoBase + taxa;

        const newReservationIds = [];
        const batch = db.batch();

        // Se não selecionou lugares no mapa, mas preencheu manual (fallback para 1 bilhete)
        const seatsToProcess = currentPOSManualSelectedSeats.length > 0
            ? currentPOSManualSelectedSeats
            : [`${fila}-${lugar}`];

        for (const seatStr of seatsToProcess) {
            const [f, l] = seatStr.split('-');
            const codigo = 'POS-' + Math.random().toString(36).substring(2, 8).toUpperCase();

            const docRef = db.collection('reservas').doc(); // Auto-ID
            newReservationIds.push(docRef.id);

            batch.set(docRef, {
                nomeReservante: nome,
                emailReservante: 'venda-presencial@pos.clube',
                pecaId: pecaId,
                sessaoId: sessaoId,
                fila: f || fila,
                lugar: l || lugar,
                codigoBilhete: codigo,
                pagamentoStatus: 'pago',
                precoPago: precoFinalUnitario,
                taxaPOS: taxa,
                dataPagamento: firebase.firestore.FieldValue.serverTimestamp(),
                dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
                dataReserva: firebase.firestore.FieldValue.serverTimestamp(),
                validado: false,
                entradaValidada: false,
                source: 'pos-manual'
            });
        }

        await batch.commit();
        playBeep('success');
        if (window.showToast) window.showToast(`${newReservationIds.length} bilhete(s) vendido(s) com sucesso!`);

        closePOSManualModal();

        // Imprimir todos os bilhetes de uma vez
        imprimirLotePOS(newReservationIds.join(','));

        // Atualizar lista se estiver na seção POS
        if (document.getElementById('posSection').style.display !== 'none') {
            loadPOSData();
        }

    } catch (error) {
        console.error('Erro ao submeter venda manual:', error);
        alert('Erro ao realizar venda.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Confirmar Venda e Imprimir';
        }
    }
}

// Bind manual sale form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('posManualForm');
    if (form) {
        form.addEventListener('submit', handlePOSManualSubmit);
    }

    const pecaSelect = document.getElementById('posManualPeca');
    if (pecaSelect) {
        pecaSelect.addEventListener('change', updatePOSManualSessions);
    }

    // NOVO: Listener para mudança de sessão no modal manual
    const sessaoSelect = document.getElementById('posManualSessao');
    if (sessaoSelect) {
        sessaoSelect.addEventListener('change', () => {
            const pecaId = document.getElementById('posManualPeca').value;
            if (pecaId && sessaoSelect.value) {
                renderPOSManualSeatMap(pecaId, sessaoSelect.value);
            }
        });
    }
});

async function confirmarPagamentoPOS(optionalIds = null) {
    const idsToPay = optionalIds || currentPaymentIds;
    if (!idsToPay) return;

    try {
        const batch = db.batch();
        const idsArray = idsToPay.split(',');

        idsArray.forEach(id => {
            const ref = db.collection('reservas').doc(id);
            batch.update(ref, {
                pagamentoStatus: 'pago',
                dataPagamento: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        playBeep('success');
        if (window.showToast) window.showToast('Pagamento confirmado com sucesso!');

        if (!optionalIds) {
            clearCalc(); // Clear persistent calculator
            // REMOVED auto-print for existing reservations as requested
        }
    } catch (error) {
        console.error('Erro ao pagar:', error);
        alert('Erro ao confirmar pagamento.');
    }
}

function imprimirLotePOS(ids) {
    if (!ids) return;
    window.open(`imprimir.html?ids=${ids}&auto=true`, '_blank', 'width=600,height=800');
}
window.imprimirLotePOS = imprimirLotePOS;

window.showManualPOSReserva = showManualPOSReserva;
window.closePOSManualModal = closePOSManualModal;
window.updatePOSManualSessions = updatePOSManualSessions;
window.confirmarPagamentoPOS = confirmarPagamentoPOS;
window.confirmarPagamentoPOS = confirmarPagamentoPOS;

function confirmarPagamentoReserva(id) {
    confirmarPagamentoPOS(id);
}
window.confirmarPagamentoReserva = confirmarPagamentoReserva;

// ============================================
// PORTEIRO (Entry Control)
// ============================================

let porteiroSnapshotUnsubscribe = null;
let allReservasPorteiro = [];
let html5QrCode = null;

async function startScanner() {
    const btn = document.getElementById('btnStartScan');
    if (!btn) return;

    if (html5QrCode && html5QrCode.isScanning) {
        await html5QrCode.stop();
        btn.textContent = '📷 Iniciar Scanner';
        btn.style.background = 'var(--color-primary)';
        return;
    }

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("porteiroReader");
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
        await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);
        btn.textContent = '🛑 Parar Scanner';
        btn.style.background = '#ef4444';
    } catch (err) {
        console.error("Erro scanner:", err);
        alert("Não foi possível aceder à câmara.");
    }
}
window.startScanner = startScanner;

async function onScanSuccess(decodedText) {
    // Tenta encontrar o código do bilhete (formato TEATRO-XXXXXX)
    const code = decodedText.trim().toUpperCase();
    await validarEntradaGeral(code, 'scanner');
}

async function validarPorCodigoManual() {
    const input = document.getElementById('porteiroSearchInput');
    const code = input.value.trim().toUpperCase();
    if (!code) return;

    await validarEntradaGeral(code, 'manual');
    input.value = '';
}
window.validarPorCodigoManual = validarPorCodigoManual;

async function validarEntradaGeral(code, method) {
    const feedbackEl = document.getElementById('porteiroScanResult');
    if (feedbackEl) {
        feedbackEl.style.display = 'block';
        feedbackEl.innerHTML = '⌛ A processar...';
        feedbackEl.style.background = '#f1f5f9';
        feedbackEl.style.color = '#1e293b';
    }

    try {
        const isGroup = code.startsWith('GRP-');

        if (isGroup) {
            // Lógica de GRUPO
            const snapshot = await db.collection('reservas')
                .where('grupoId', '==', code)
                .get();

            if (snapshot.empty) {
                showPorteiroFeedback('❌ Grupo não encontrado', 'error');
                if (typeof playBeep === 'function') playBeep('error');
                return;
            }

            const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const first = tickets[0];

            // Validar todos no grupo (batch)
            const batch = db.batch();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            let countValidado = 0;

            tickets.forEach(r => {
                if (!r.entradaValidada) {
                    batch.update(db.collection('reservas').doc(r.id), {
                        entradaValidada: true,
                        dataEntrada: timestamp
                    });
                    countValidado++;
                }
            });

            if (countValidado === 0) {
                showPorteiroFeedback(`🛑 Grupo já validado(${first.nomeReservante})`, 'warning');
                if (typeof playBeep === 'function') playBeep('warning');
            } else {
                await batch.commit();
                showPorteiroFeedback(`✅ Grupo Validado(${countValidado} bilhetes - ${first.nomeReservante})`, 'success');
                if (typeof playBeep === 'function') playBeep('success');
            }

        } else {
            // Lógica INDIVIDUAL
            const snapshot = await db.collection('reservas')
                .where('codigoBilhete', '==', code)
                .get();

            if (snapshot.empty) {
                showPorteiroFeedback('❌ Bilhete não encontrado', 'error');
                if (typeof playBeep === 'function') playBeep('error');
                return;
            }

            const doc = snapshot.docs[0];
            const r = { id: doc.id, ...doc.data() };

            // Validações
            if (r.pagamentoStatus !== 'pago' && r.pagamentoStatus !== 'isento' && r.pagamentoStatus !== 'bypassed') {
                showPorteiroFeedback(`⚠️ Pagamento Pendente(${r.nomeReservante})`, 'warning');
                if (typeof playBeep === 'function') playBeep('warning');
                return;
            }

            if (r.entradaValidada) {
                showPorteiroFeedback(`🛑 Já Entrou!(${r.nomeReservante})`, 'warning');
                if (typeof playBeep === 'function') playBeep('warning');
                return;
            }

            // Sucesso: Validar entrada
            await db.collection('reservas').doc(r.id).update({
                entradaValidada: true,
                dataEntrada: firebase.firestore.FieldValue.serverTimestamp()
            });

            showPorteiroFeedback(`✅ Bem - vindo, ${r.nomeReservante} !`, 'success');
            if (typeof playBeep === 'function') playBeep('success');
        }

    } catch (err) {
        console.error("Erro validação:", err);
        showPorteiroFeedback('❌ Erro de Sistema', 'error');
    }
}

function showPorteiroFeedback(msg, type) {
    const el = document.getElementById('porteiroScanResult');
    if (!el) return;

    el.style.display = 'block';
    el.textContent = msg;

    if (type === 'success') {
        el.style.background = '#dcfce7';
        el.style.color = '#15803d';
    } else if (type === 'warning') {
        el.style.background = '#fef3c7';
        el.style.color = '#92400e';
    } else {
        el.style.background = '#fee2e2';
        el.style.color = '#b91c1c';
    }

    setTimeout(() => {
        if (el.textContent === msg) el.style.display = 'none';
    }, 5000);
}

async function loadPorteiroData() {
    const listContainer = document.getElementById('porteiroList');
    if (!listContainer) return;

    if (porteiroSnapshotUnsubscribe) porteiroSnapshotUnsubscribe();

    listContainer.innerHTML = '<div class="loading-spinner" style="margin:20px auto;"></div>';

    try {
        if (allPecas.length === 0) allPecas = await getPecas();

        // Mostrar apenas quem pagou (ou isento)
        porteiroSnapshotUnsubscribe = db.collection('reservas')
            .where('pagamentoStatus', 'in', ['pago', 'isento', 'bypassed'])
            .onSnapshot(snapshot => {
                allReservasPorteiro = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderPorteiro();
            });

    } catch (error) {
        console.error('Erro Porteiro:', error);
    }
}

function renderPorteiro() {
    const listContainer = document.getElementById('porteiroList');
    const statsEl = document.getElementById('porteiroStats');
    if (!listContainer) return;

    // Apenas entradas pendentes (não validadas)
    const pendentes = allReservasPorteiro.filter(r => !r.entradaValidada);
    const validadas = allReservasPorteiro.filter(r => r.entradaValidada);

    if (statsEl) {
        statsEl.textContent = `${validadas.length} Entradas / ${pendentes.length} Pendentes`;
    }

    if (pendentes.length === 0) {
        listContainer.innerHTML = `
            < div style = "text-align:center; padding:40px; color:#94a3b8; font-style:italic; border: 2px dashed #e2e8f0; border-radius:15px;" >
                Tudo validado! ✨ Todos os presentes já entraram.
            </div >
            `;
        return;
    }

    listContainer.innerHTML = pendentes.slice(0, 10).map(r => `
            < div class="card fade-in" style = "display:flex; justify-content:space-between; align-items:center; padding:15px 20px; border-left: 5px solid #3b82f6; margin-bottom: 10px;" >
            <div>
                <div style="font-weight:700; color:#1e293b; font-size:1.1rem;">${escapeHtml(r.nomeReservante)}</div>
                <div style="font-size:0.8rem; color:#64748b;">${r.codigoBilhete} • Fila ${r.fila} Lugar ${r.lugar}</div>
            </div>
            <button onclick="validarEntradaManualList('${r.id}')" class="btn btn-sm" style="background:#f1f5f9; color:#1e293b; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
                Validar ➡️
            </button>
        </div >
            `).join('');
}

async function validarEntradaManualList(id) {
    if (!confirm('Validar entrada deste bilhete?')) return;
    try {
        await db.collection('reservas').doc(id).update({
            entradaValidada: true,
            dataEntrada: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (typeof playBeep === 'function') playBeep('success');
    } catch (err) {
        alert('Erro ao validar.');
    }
}
window.validarEntradaManualList = validarEntradaManualList;
window.loadPorteiroData = loadPorteiroData;

// Search binding
document.addEventListener('DOMContentLoaded', () => {
    const search = document.getElementById('posSearchInput');
    if (search) {
        search.addEventListener('input', () => {
            renderPOS();
        });
    }
});

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}
window.toggleTheme = toggleTheme;
