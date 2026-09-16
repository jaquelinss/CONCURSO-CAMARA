chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== 'offscreen') return;

  const audio = document.getElementById('audio-player');
  
  if (msg.action === 'play') {
    audio.src = msg.url;
    audio.volume = msg.volume !== undefined ? msg.volume : 0.5;
    audio.play()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  } 
  
  if (msg.action === 'stop') {
    audio.pause();
    audio.currentTime = 0;
    sendResponse({ success: true });
  }

  if (msg.action === 'set_volume') {
    audio.volume = msg.volume;
    sendResponse({ success: true });
  }
});
