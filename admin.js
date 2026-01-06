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
    document.getElementById('adminDashboard').style.display = 'grid'; // Uses Grid now
    document.getElementById('userEmail').textContent = user.email;

    loadDashboardStats();

    // Iniciar tutorial se necessário
    if (typeof initTutorial === 'function') {
        initTutorial(user.email);
    }
}

// ============================================
// NAVEGAÇÃO
// ============================================

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
                'config': 'Configurações'
            };
            const titleEl = document.getElementById('pageTitleDisplay');
            if (titleEl) titleEl.textContent = titleMap[sectionName] || 'Painel Admin';
        }
    });

    // Load data for section
    if (sectionName === 'pecas') loadPecas();
    if (sectionName === 'membros') loadMembros();
    if (sectionName === 'config') loadConfig();
    if (sectionName === 'dashboard') loadDashboardStats();
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboardStats() {
    try {
        const pecas = await getPecas();
        const membros = await getMembros();
        const participacoesSnapshot = await db.collection('participacoes').get();

        document.getElementById('totalPecas').textContent = pecas.length;
        document.getElementById('totalMembros').textContent = membros.length;

        // Participações count
        const participacoesEl = document.getElementById('totalParticipacoes');
        if (participacoesEl) {
            participacoesEl.textContent = participacoesSnapshot.size;
        }

        // Live Status Logic
        const pecaEmCartaz = pecas.find(p => p.emCartaz);
        const statusLabel = document.getElementById('statusLabel');
        const statusDesc = document.getElementById('statusDescription');
        const widget = document.getElementById('liveStatusWidget');

        if (pecaEmCartaz) {
            statusLabel.textContent = "Em Temporada 🎭";
            statusLabel.style.color = "#10b981"; // success green
            statusDesc.innerHTML = `Neste momento, a peça <strong>"${escapeHtml(pecaEmCartaz.nome)}"</strong> está em destaque na página inicial.`;
            widget.style.borderLeft = "5px solid #10b981";
        } else {
            statusLabel.textContent = "Sem Peça em Cartaz ⚠️";
            statusLabel.style.color = "#f59e0b"; // warning orange
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
    document.getElementById('participacoesSection').style.display = 'none';
    document.getElementById('pecaForm').classList.add('active'); // Use class for modal
}

async function editPeca(id) {
    currentPecaId = id;
    document.getElementById('pecaFormTitle').textContent = 'Editar Peça';

    try {
        const peca = allPecas.find(p => p.id === id) || await getPeca(id); // Use cache if available

        document.getElementById('pecaId').value = id;
        document.getElementById('pecaNome').value = peca.nome || '';
        document.getElementById('pecaAutor').value = peca.autor || '';
        document.getElementById('pecaAno').value = peca.ano || '';
        document.getElementById('pecaSinopse').value = peca.sinopse || '';
        document.getElementById('pecaImagem').value = peca.imagem || '';
        document.getElementById('pecaEmCartaz').checked = peca.emCartaz || false;

        document.getElementById('participacoesSection').style.display = 'block';
        loadParticipacoes(id);

        document.getElementById('pecaForm').classList.add('active');
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
            emCartaz: document.getElementById('pecaEmCartaz').checked
        };

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

        // Carregar lista de admins
        loadAdmins();
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

async function handleSaveConfig(e) {
    e.preventDefault();

    const config = {
        nomeClube: document.getElementById('configNomeClube').value,
        escola: document.getElementById('configEscola').value,
        email: document.getElementById('configEmail').value,
        horario: document.getElementById('configHorario').value
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
            <div class="admin-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:var(--color-bg); border-radius:8px; border-left:4px solid var(--color-primary);">
                <div>
                    <div style="font-weight:700;">${escapeHtml(admin.nome)}</div>
                    <div style="font-size:0.85rem; color:var(--color-text-muted);">${escapeHtml(admin.email)}</div>
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
    e.preventDefault();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'A criar conta...';

    const nome = document.getElementById('adminNome').value;
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    try {
        await createAdminAccount(nome, email, password);
        if (window.showToast) window.showToast('Conta criada com sucesso');
        closeAdminForm();
        loadAdmins();
    } catch (error) {
        if (window.showToast) window.showToast('Erro ao criar conta: ' + error.message, 'error');
        console.error(error);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

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
