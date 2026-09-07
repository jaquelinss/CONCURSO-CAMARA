import { doc, getDoc, setDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

// Setup Context Menus when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'create-postit',
    title: 'Salvar como Post-it',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'create-flashcard',
    title: 'Salvar como Flashcard (Frente)',
    contexts: ['selection']
  });
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, _tab) => {
  if (info.menuItemId === 'create-postit' || info.menuItemId === 'create-flashcard') {
    auth.authStateReady().then(() => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png', // Fallback if no icon, Chrome might ignore or show default
          title: 'Estudo Câmara Tracker',
          message: 'Faça login na extensão primeiro para salvar notas.'
        });
        return;
      }
      
      const isFlashcard = info.menuItemId === 'create-flashcard';
      const selectedText = info.selectionText || '';
      
      const newNote = {
        title: 'Captura da Web',
        content: selectedText,
        backContent: isFlashcard ? 'Edite o verso no app...' : '',
        isFlashcard: isFlashcard,
        color: '#fef08a',
        subjectTag: 'Geral',
        subTag: '',
        createdAt: serverTimestamp(),
        archived: false
      };

      addDoc(collection(db, 'users', currentUser.uid, 'notes'), newNote)
        .then(() => {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Salvo com sucesso!',
            message: `O texto foi salvo como ${isFlashcard ? 'Flashcard' : 'Post-it'} no seu app principal.`
          });
        })
        .catch((err) => {
          console.error(err);
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Erro ao salvar',
            message: 'Ocorreu um erro ao tentar salvar a nota no Firebase.'
          });
        });
    });
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'AWARD_POINTS') {
    const amount = request.amount || 10;

    auth.authStateReady().then(() => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        sendResponse({ success: false, error: 'Faça login na extensão primeiro.' });
        return;
      }

      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'rewards');
      getDoc(docRef).then((snap) => {
        const update = snap.exists()
          ? setDoc(docRef, { effortPoints: increment(amount) }, { merge: true })
          : setDoc(docRef, { effortPoints: amount, unlockedStickers: [] });

        update
          .then(() => sendResponse({ success: true, points: amount }))
          .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      }).catch((err: Error) => sendResponse({ success: false, error: err.message }));
    });

    return true; // keep channel open for async
  }

  if (request.action === 'GET_POINTS') {
    auth.authStateReady().then(() => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        sendResponse({ success: false, points: 0 });
        return;
      }
      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'rewards');
      getDoc(docRef).then((snap) => {
        const pts = snap.exists() ? (snap.data().effortPoints || 0) : 0;
        sendResponse({ success: true, points: pts });
      }).catch(() => sendResponse({ success: false, points: 0 }));
    });
    return true;
  }

  if (request.action === 'GET_AUTH_STATE') {
    auth.authStateReady().then(() => {
      const currentUser = auth.currentUser;
      sendResponse({ loggedIn: !!currentUser, email: currentUser?.email || '' });
    });
    return true;
  }

  if (request.action === 'CREATE_NOTE') {
    auth.authStateReady().then(() => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        sendResponse({ success: false, error: 'Faça login na extensão primeiro.' });
        return;
      }

      const isFlashcard = request.isFlashcard || false;
      const text = request.text || '';

      const newNote = {
        title: 'Captura da Web',
        content: text,
        backContent: isFlashcard ? (request.backText || 'Edite o verso no app...') : '',
        isFlashcard,
        color: '#fef08a',
        subjectTag: 'Geral',
        subTag: '',
        createdAt: serverTimestamp(),
        archived: false
      };

      addDoc(collection(db, 'users', currentUser.uid, 'notes'), newNote)
        .then(() => sendResponse({ success: true }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (request.action === 'GENERATE_NOTE_WITH_AI') {
    auth.authStateReady().then(async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        sendResponse({ success: false, error: 'Faça login na extensão primeiro.' });
        return;
      }

      try {
        const configRef = doc(db, 'users', currentUser.uid, 'settings', 'config');
        const configSnap = await getDoc(configRef);
        const apiKey = configSnap.exists() ? configSnap.data().apiKey : null;

        if (!apiKey) {
          sendResponse({ success: false, error: 'Chave da API do Gemini não configurada no app principal.' });
          return;
        }

        const isFlashcard = request.isFlashcard || false;
        const text = request.text || '';

        let prompt = '';
        if (isFlashcard) {
          prompt = `A partir do seguinte texto, crie um ÚNICO Flashcard (estilo frente e verso) que resuma o ponto principal de forma testável:\n"${text}"\n\nRegras:\n1. O objetivo do flashcard é testar o conhecimento do aluno.\n2. A "FRENTE" deve conter uma pergunta clara, um gatilho mental, ou um conceito a ser definido.\n3. O "VERSO" deve conter a resposta direta e concisa.\n4. Forneça um título super curto (1-3 palavras) que resuma o assunto do flashcard.\n\nA resposta DEVE ser estritamente um objeto JSON com o formato:\n{\n  "title": "Assunto Curto",\n  "front": "Pergunta ou Gatilho (Frente)",\n  "back": "Resposta ou Definição (Verso)"\n}\n\nNÃO retorne formatação markdown \`\`\`json. Apenas o JSON válido.`;
        } else {
          prompt = `Atue como um estudante de alta performance. Crie um resumo conciso e VISUALMENTE BONITO (estilo post-it de parede) a partir do seguinte texto:\n"${text}"\n\nRegras OBRIGATÓRIAS:\n1. PRIMEIRA LINHA: Um título curto e chamativo seguido de um emoji relevante (ex: "Advérbios: O Toque Mágico! ✨"). SEM marcadores no título.\n2. LINHAS SEGUINTES: Organize as informações em tópicos usando "•" como marcador.\n3. Use emojis temáticos (📍🕐💪✅❌🤔⇒→) para tornar o post-it visualmente rico e fácil de escanear.\n4. Destaque PALAVRAS-CHAVE em MAIÚSCULAS quando apropriado.\n5. Use "⇒" ou "→" para conectar causa/consequência ou explicações complementares.\n6. Se o texto tiver categorias/tipos, organize como subtópicos com "  •" (indentado).\n7. Seja EXTREMAMENTE conciso — cada tópico deve ter no máximo 1 linha.\n8. PROIBIDO: Markdown (**, *, #, etc). Apenas texto puro com emojis e marcadores "•".\n\nRetorne SOMENTE o post-it. Nada mais.`;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erro na API Gemini');
        
        const generatedText = data.candidates[0].content.parts[0].text.trim();

        if (isFlashcard) {
          const jsonMatch = generatedText.match(/\[.*\]|\{.*\}/s);
          const jsonStr = jsonMatch ? jsonMatch[0] : generatedText;
          const parsed = JSON.parse(jsonStr.replace(/\\/g, "\\\\"));
          
          const newFlashcard = {
            title: parsed.title || 'Flashcard IA',
            content: parsed.front || 'Frente',
            backContent: parsed.back || 'Verso',
            isFlashcard: true,
            color: '#fef08a',
            subjectTag: 'Geral',
            subTag: '',
            createdAt: serverTimestamp(),
            archived: false
          };
          await addDoc(collection(db, 'users', currentUser.uid, 'notes'), newFlashcard);
        } else {
          const lines = generatedText.split('\n');
          const title = lines[0].replace(/\*\*/g, '').replace(/#/g, '').trim();
          const content = lines.slice(1).join('\n').trim().replace(/\*\*/g, '');
          
          const newPostIt = {
            title: title || 'Post-it IA',
            content: content || generatedText,
            backContent: '',
            isFlashcard: false,
            color: '#fef08a',
            subjectTag: 'Geral',
            subTag: '',
            createdAt: serverTimestamp(),
            archived: false
          };
          await addDoc(collection(db, 'users', currentUser.uid, 'notes'), newPostIt);
        }

        sendResponse({ success: true });
      } catch (err: any) {
        console.error(err);
        sendResponse({ success: false, error: err.message || 'Erro desconhecido' });
      }
    });
    return true;
  }
});
