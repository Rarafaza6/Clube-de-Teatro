// Firebase Configuration
// NOTA: Substitui estes valores pelos teus dados do Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBwckHCrJap6lgyZAvBdFeZcYGhjcJpL6A",
    authDomain: "clube-de-teatro-279e9.firebaseapp.com",
    projectId: "clube-de-teatro-279e9",
    storageBucket: "clube-de-teatro-279e9.firebasestorage.app",
    messagingSenderId: "1083907917048",
    appId: "1:1083907917048:web:697ab2fff197fe9dce670d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
// const storage = firebase.storage(); // REMOVED: Using Base64 strings instead

// ===========================================
// AUTENTICAÇÃO
// ===========================================

async function login(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Verificar se a configuração inicial já foi feita
        const configDoc = await db.collection('config').doc('site').get();
        const isSetup = configDoc.exists && configDoc.data().admins_setup === true;

        if (isSetup) {
            // Se já houve setup, verificar autorização obrigatoriamente
            const adminDoc = await db.collection('admins').doc(user.email).get();
            if (!adminDoc.exists) {
                await auth.signOut();
                return { success: false, error: 'Utilizador não autorizado para aceder a este painel.' };
            }
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function logout() {
    await auth.signOut();
    window.location.href = 'admin.html';
}

function checkAuth(callback) {
    auth.onAuthStateChanged(async user => {
        if (user) {
            try {
                // 1. Verificar se o sistema já está configurado
                const configDoc = await db.collection('config').doc('site').get();
                const isSetup = configDoc.exists && configDoc.data().admins_setup === true;

                if (!isSetup) {
                    // Modo Bootstrapping: Permitir entrada
                    callback(user);
                    return;
                }

                // 2. Se configurado, verificar autorização específica
                const adminDoc = await db.collection('admins').doc(user.email).get();
                if (adminDoc.exists) {
                    const adminData = adminDoc.data();
                    // Merge auth user with firestore data (role, etc)
                    callback({ ...user, ...adminData });
                } else {
                    console.warn('Utilizador não autorizado:', user.email);
                    await auth.signOut();
                    callback(null);
                }
            } catch (e) {
                console.error('Erro na verificação de admin:', e);
                callback(user);
            }
        } else {
            callback(null);
        }
    });
}

// ===========================================
// GESTÃO DE PEÇAS
// ===========================================

async function getPecas() {
    const snapshot = await db.collection('pecas').orderBy('ano', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getPeca(id) {
    const doc = await db.collection('pecas').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function addPeca(peca) {
    const docRef = await db.collection('pecas').add({
        ...peca,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
}

async function updatePeca(id, peca) {
    await db.collection('pecas').doc(id).update({
        ...peca,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function deletePeca(id) {
    console.log('[FIREBASE] deletePeca called for ID:', id);
    try {
        await db.collection('pecas').doc(id).delete();
        console.log('[FIREBASE] deletePeca success for ID:', id);
    } catch (e) {
        console.error('[FIREBASE] deletePeca FAILED:', e);
        throw e;
    }
}

// ===========================================
// GESTÃO DE MEMBROS
// ===========================================

async function getMembros() {
    const snapshot = await db.collection('membros').orderBy('nome').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getMembro(id) {
    const doc = await db.collection('membros').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function addMembro(membro) {
    const docRef = await db.collection('membros').add({
        ...membro,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
}

async function updateMembro(id, membro) {
    await db.collection('membros').doc(id).update({
        ...membro,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function deleteMembro(id) {
    console.log('[FIREBASE] deleteMembro called for ID:', id);
    try {
        await db.collection('membros').doc(id).delete();
        console.log('[FIREBASE] deleteMembro success for ID:', id);
    } catch (e) {
        console.error('[FIREBASE] deleteMembro FAILED:', e);
        throw e;
    }
}

// ===========================================
// GESTÃO DE PARTICIPAÇÕES
// ===========================================

async function getParticipacoes(pecaId) {
    const snapshot = await db.collection('participacoes')
        .where('pecaId', '==', pecaId)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addParticipacao(participacao) {
    const docRef = await db.collection('participacoes').add(participacao);
    return docRef.id;
}

async function deleteParticipacao(id) {
    console.log('[FIREBASE] deleteParticipacao called for ID:', id);
    try {
        await db.collection('participacoes').doc(id).delete();
        console.log('[FIREBASE] deleteParticipacao success for ID:', id);
    } catch (e) {
        console.error('[FIREBASE] deleteParticipacao FAILED:', e);
        throw e;
    }
}

// ===========================================
// CONFIGURAÇÕES DO SITE
// ===========================================

async function getConfig() {
    const doc = await db.collection('config').doc('site').get();
    return doc.exists ? doc.data() : {};
}

async function updateConfig(config) {
    await db.collection('config').doc('site').set(config, { merge: true });
}

// ===========================================
// UTILITÁRIOS
// ===========================================

function getCurrentYear() {
    return new Date().getFullYear();
}

// Atualiza o copyright em todas as páginas
function updateCopyright() {
    const copyrightElements = document.querySelectorAll('.copyright-year');
    const year = getCurrentYear();
    copyrightElements.forEach(el => {
        el.textContent = year;
    });
}

// Escapa HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Formata data
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-PT');
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    updateCopyright();
});
// ===========================================
// GESTÃO DE ADMINISTRADORES
// ===========================================

async function getAdmins() {
    const snapshot = await db.collection('admins').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function createAdminAccount(nome, email, password) {
    // Criamos uma instância secundária para não deslogar o admin atual
    const tempApp = firebase.initializeApp(firebaseConfig, "TempRegistration");
    const tempAuth = tempApp.auth();

    try {
        // 1. Criar na Auth
        await tempAuth.createUserWithEmailAndPassword(email, password);

        // 2. Registar no Firestore
        await db.collection('admins').doc(email).set({
            nome: nome,
            email: email,
            role: password === 'SETUP_MASTER' ? 'admin' : (arguments[3] || 'operator'),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Bloquear o sistema permanentemente (Set setup flag)
        await db.collection('config').doc('site').set({ admins_setup: true }, { merge: true });

        // 4. Encerrar sessão da app temporária
        await tempAuth.signOut();
        await tempApp.delete();
        return { success: true };
    } catch (error) {
        if (tempApp) await tempApp.delete();
        throw error;
    }
}

async function deleteAdminAccount(email) {
    // Nota: Como estamos no cliente, só conseguimos remover do Firestore.
    // O utilizador continuará no Firebase Auth mas não conseguirá entrar no painel
    // devido à verificação no checkAuth.
    await db.collection('admins').doc(email).delete();
}

async function resetAdminPassword(email) {
    await auth.sendPasswordResetEmail(email);
}

// ===========================================
// GESTÃO DE BILHETEIRA
// ===========================================

// Gerar código único para bilhete
function generateTicketCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TEATRO-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Gerar token único para elenco
function generateCastToken() {
    return 'CAST-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

// Gerar código único para grupo (Turma)
function generateGroupCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'GRP-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// --- RESERVAS ---

async function getReservas(pecaId) {
    const snapshot = await db.collection('reservas')
        .where('pecaId', '==', pecaId)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getReservasByEmail(email) {
    const snapshot = await db.collection('reservas')
        .where('emailReservante', '==', email.toLowerCase())
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getReservaByCode(codigoBilhete) {
    const snapshot = await db.collection('reservas')
        .where('codigoBilhete', '==', codigoBilhete)
        .limit(1)
        .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function getReservasByGrupo(grupoId) {
    const snapshot = await db.collection('reservas')
        .where('grupoId', '==', grupoId)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addReserva(reserva) {
    const codigoBilhete = generateTicketCode();
    const data = {
        ...reserva,
        codigoBilhete: codigoBilhete,
        validado: false,
        pagamentoStatus: reserva.pagamentoStatus || 'pendente',
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    };
    // Store turma on reservation for easy filtering in admin
    if (reserva.turma) {
        data.turma = reserva.turma;
    }
    const docRef = await db.collection('reservas').add(data);
    return { id: docRef.id, codigoBilhete: codigoBilhete };
}

async function deleteReserva(id) {
    await db.collection('reservas').doc(id).delete();
}

async function updatePagamentoStatus(id, status) {
    await db.collection('reservas').doc(id).update({
        pagamentoStatus: status,
        dataPagamento: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function marcarBilheteValidado(codigoBilhete) {
    const reserva = await getReservaByCode(codigoBilhete);
    if (!reserva) throw new Error('Bilhete não encontrado');
    if (reserva.entradaValidada) throw new Error('Bilhete já foi validado anteriormente');

    await db.collection('reservas').doc(reserva.id).update({
        entradaValidada: true,
        dataEntrada: firebase.firestore.FieldValue.serverTimestamp()
    });
    return reserva;
}

async function marcarGrupoValidado(grupoId) {
    const subs = await getReservasByGrupo(grupoId);
    if (subs.length === 0) throw new Error('Grupo não encontrado');

    const batch = db.batch();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    subs.forEach(res => {
        if (!res.entradaValidada) {
            batch.update(db.collection('reservas').doc(res.id), {
                entradaValidada: true,
                dataEntrada: timestamp
            });
        }
    });

    await batch.commit();
    return subs;
}

// --- TOKENS DE ELENCO ---

async function getTokensElenco(pecaId) {
    const snapshot = await db.collection('tokensElenco')
        .where('pecaId', '==', pecaId)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function createTokenElenco(pecaId, membroId, membroNome, quotaMax, sessaoId = null) {
    const token = generateCastToken();
    const docRef = await db.collection('tokensElenco').add({
        pecaId: pecaId,
        membroId: membroId,
        membroNome: membroNome,
        token: token,
        reservasUsadas: 0,
        quotaMax: quotaMax,
        sessaoId: sessaoId, // NEW: Optional session restriction
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { id: docRef.id, token: token };
}

async function validateCastToken(token) {
    const snapshot = await db.collection('tokensElenco')
        .where('token', '==', token)
        .limit(1)
        .get();

    if (snapshot.empty) return { valid: false, error: 'Token inválido' };

    const doc = snapshot.docs[0];
    const data = doc.data();

    if (data.reservasUsadas >= data.quotaMax) {
        return { valid: false, error: 'Quota de bilhetes gratuitos esgotada' };
    }

    return {
        valid: true,
        tokenId: doc.id,
        membroNome: data.membroNome,
        quotaRestante: data.quotaMax - data.reservasUsadas,
        pecaId: data.pecaId,
        sessaoId: data.sessaoId || null,
        turma: data.turma || null,          // NEW: class name if this is a class token
        isTurma: !!data.turma               // NEW: flag to identify class tokens
    };
}

// NEW: Create a class (turma) token for free reservations
async function createTokenTurma(pecaId, turma, numBilhetes, sessaoId = null) {
    const token = generateCastToken();
    const docRef = await db.collection('tokensElenco').add({
        pecaId: pecaId,
        turma: turma,
        membroNome: 'Turma ' + turma,
        token: token,
        reservasUsadas: 0,
        quotaMax: numBilhetes,
        sessaoId: sessaoId,
        isTurmaToken: true,    // Flag to identify as class token
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { id: docRef.id, token: token };
}

async function useTokenQuota(tokenId, quantidade = 1) {
    const doc = await db.collection('tokensElenco').doc(tokenId).get();
    if (!doc.exists) throw new Error('Token não encontrado');

    const data = doc.data();
    const novaQuantidade = data.reservasUsadas + quantidade;

    if (novaQuantidade > data.quotaMax) {
        throw new Error('Quota insuficiente');
    }

    await db.collection('tokensElenco').doc(tokenId).update({
        reservasUsadas: novaQuantidade
    });
}

async function deleteTokensElenco(pecaId) {
    const tokens = await getTokensElenco(pecaId);
    const batch = db.batch();
    tokens.forEach(t => {
        batch.delete(db.collection('tokensElenco').doc(t.id));
    });
    await batch.commit();
}

// --- TURMA TOKEN MANAGEMENT (PERSISTENT) ---

async function getTurmaTokensByPeca(pecaId) {
    const snapshot = await db.collection('tokensElenco')
        .where('pecaId', '==', pecaId)
        .where('isTurmaToken', '==', true)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function deleteTurmaToken(tokenId) {
    await db.collection('tokensElenco').doc(tokenId).delete();
}

// --- PAGAMENTO MANUAL ---

async function marcarPagamento(reservaId, pago) {
    await db.collection('reservas').doc(reservaId).update({
        pagamentoStatus: pago ? 'pago' : 'pendente',
        dataPagamento: pago ? firebase.firestore.FieldValue.serverTimestamp() : null
    });
}

function isReservaExpirada(reserva) {
    if (!reserva || reserva.pagamentoStatus !== 'pendente') return false;

    const dataCriacao = reserva.dataCriacao ? (reserva.dataCriacao.toDate ? reserva.dataCriacao.toDate() : new Date(reserva.dataCriacao)) : null;
    if (!dataCriacao) return false;

    const agora = new Date();
    const diffHoras = (agora - dataCriacao) / (1000 * 60 * 60);

    return diffHoras > 24;
}
