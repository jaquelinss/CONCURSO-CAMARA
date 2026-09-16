let audioCtx = null;
let gainNode = null;
let currentNodes = [];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function stopAll() {
  currentNodes.forEach(n => {
    try { n.stop(); } catch(e) {}
    try { n.disconnect(); } catch(e) {}
  });
  currentNodes = [];
}

function playNoise(type) {
  initAudio();
  const bufferSize = audioCtx.sampleRate * 2; 
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  if (type === 'white') filter.frequency.value = 5000;
  else if (type === 'pink') filter.frequency.value = 1000;
  else if (type === 'brown') filter.frequency.value = 400;
  
  noise.connect(filter);
  filter.connect(gainNode);
  noise.start();
  currentNodes.push(noise);
}

function playBinaural(type) {
  initAudio();
  const baseFreq = 200; 
  let beatFreq = 10;
  if (type === 'beta') beatFreq = 20;
  else if (type === 'theta') beatFreq = 6;
  
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const merger = audioCtx.createChannelMerger(2);
  
  const localGain = audioCtx.createGain();
  localGain.gain.value = 0.4;
  
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = baseFreq;
  osc2.frequency.value = baseFreq + beatFreq;
  
  osc1.connect(merger, 0, 0); 
  osc2.connect(merger, 0, 1); 
  
  merger.connect(localGain);
  localGain.connect(gainNode);
  
  osc1.start();
  osc2.start();
  currentNodes.push(osc1, osc2);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== 'offscreen') return;

  if (msg.action === 'play') {
    stopAll();
    initAudio();
    if (gainNode) gainNode.gain.value = msg.volume !== undefined ? msg.volume : 0.5;
    
    if (msg.type === 'white' || msg.type === 'pink' || msg.type === 'brown') {
      playNoise(msg.type);
    } else {
      playBinaural(msg.type);
    }
    sendResponse({ success: true });
  } 
  
  if (msg.action === 'stop') {
    stopAll();
    sendResponse({ success: true });
  }

  if (msg.action === 'set_volume') {
    if (gainNode) {
      gainNode.gain.value = msg.volume;
    }
    sendResponse({ success: true });
  }
});
