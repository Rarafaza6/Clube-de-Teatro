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
                    callback(user);
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
            role: 'admin',
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
