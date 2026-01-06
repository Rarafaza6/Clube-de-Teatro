# 🔧 Configuração do Firebase

Para o painel de administração funcionar, precisas configurar o Firebase.

## Passo 1: Criar Projeto Firebase

1. Vai a [Firebase Console](https://console.firebase.google.com/)
2. Clica em **"Adicionar projeto"**
3. Dá um nome ao projeto (ex: `clube-teatro-cidadela`)
4. Desativa o Google Analytics (opcional) e clica em **Criar**

## Passo 2: Ativar Autenticação

1. No menu lateral, vai a **Authentication** → **Sign-in method**
2. Ativa **Email/Palavra-passe**
3. Vai a **Users** e clica em **Add user**
4. Adiciona o email e senha do administrador (ex: `admin@clubeteatro.pt`)

## Passo 3: Criar Base de Dados

1. No menu lateral, vai a **Firestore Database**
2. Clica em **Create database**
3. Escolhe **Start in production mode**
4. Seleciona a localização (ex: `europe-west1`)

## Passo 4: Configurar Regras de Segurança

No Firestore, vai a **Rules** e substitui por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Apenas utilizadores autenticados podem ler/escrever
    match /{document=**} {
      allow read: if true;  // Permite leitura pública
      allow write: if request.auth != null;  // Escrita requer login
    }
  }
}
```

## Passo 5: Obter Configuração

1. Vai a **Project Settings** (ícone de engrenagem) → **General**
2. Em "Your apps", clica em **Web** (`</>`)
3. Regista a app com um nome (ex: `site-admin`)
4. Copia a configuração que aparece

## Passo 6: Atualizar firebase-config.js

Abre o ficheiro `firebase-config.js` e substitui os valores:

```javascript
const firebaseConfig = {
    apiKey: "COPIA_O_TEU_apiKey",
    authDomain: "COPIA_O_TEU_authDomain",
    projectId: "COPIA_O_TEU_projectId",
    storageBucket: "COPIA_O_TEU_storageBucket",
    messagingSenderId: "COPIA_O_TEU_messagingSenderId",
    appId: "COPIA_O_TEU_appId"
};
```

## Pronto! 🎉

Agora podes aceder ao painel em: `https://teusite.com/admin.html`

---

## Estrutura da Base de Dados

O Firebase guarda os dados assim:

```
📁 pecas/
   📄 {id_auto}
      ├─ nome: "A Birra do Morto"
      ├─ ano: 2024
      ├─ sinopse: "Uma comédia..."
      ├─ imagem: "peca1.jpg"
      └─ emCartaz: false

📁 membros/
   📄 {id_auto}
      ├─ nome: "Xavier Silva"
      ├─ funcao: "Ator"
      ├─ tipo: "aluno"
      ├─ bio: "Mestre na arte..."
      └─ ativo: true

📁 participacoes/
   📄 {id_auto}
      ├─ pecaId: "abc123"
      ├─ membroId: "xyz789"
      └─ funcao: "Personagem X"

📁 config/
   📄 site
      ├─ nomeClube: "Clube de Teatro"
      ├─ escola: "AE Cidadela"
      ├─ email: "contacto@..."
      └─ horario: "14:30-16:30"
```
