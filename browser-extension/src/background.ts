import { doc, getDoc, setDoc, increment, collection, addDoc } from 'firebase/firestore';
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
        createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        archived: false
      };

      addDoc(collection(db, 'users', currentUser.uid, 'notes'), newNote)
        .then(() => sendResponse({ success: true }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }
});
