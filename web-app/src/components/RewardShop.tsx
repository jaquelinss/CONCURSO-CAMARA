import React, { useState, useEffect, useRef } from 'react';
import { useReward } from '../contexts/RewardContext';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Sparkles, Wand2, UploadCloud } from 'lucide-react';

interface RewardShopProps {
  onClose: () => void;
}

const DEFAULT_STICKERS = [
  { id: '1', url: '/stickers/1.png', price: 350 },
  { id: '2', url: '/stickers/2.png', price: 350 },
  { id: '3', url: '/stickers/3.png', price: 350 },
  { id: '4', url: '/stickers/4.png', price: 350 },
  { id: '5', url: '/stickers/5.png', price: 350 },
  { id: '6', url: '/stickers/6.png', price: 350 },
  { id: '7', url: '/stickers/7.png', price: 350 },
  { id: '8', url: '/stickers/8.png', price: 350 },
  { id: '9', url: '/stickers/9.png', price: 350 },
  { id: '10', url: '/stickers/10.png', price: 350 },
  { id: '11', url: '/stickers/11.png', price: 350 },
];

export const RewardShop: React.FC<RewardShopProps> = ({ onClose }) => {
  const { effortPoints, spendPoints, addStickerToInventory, unlockedStickers, markStickerAsUnused, setActiveStamper } = useReward();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory' | 'admin'>('shop');
  const [buying, setBuying] = useState<string | null>(null);
  
  const [globalShop, setGlobalShop] = useState<{ id: string; url: string; price: number }[]>(DEFAULT_STICKERS);
  
  // Admin AI 
  const [adminPrompt, setAdminPrompt] = useState('');
  const [adminPreview, setAdminPreview] = useState<string | null>(null);
  const [adminPreviewBlob, setAdminPreviewBlob] = useState<Blob | null>(null);
  const [adminGenerating, setAdminGenerating] = useState(false);
  const [adminUploading, setAdminUploading] = useState(false);
  const [adminImgLoading, setAdminImgLoading] = useState(false);
  const [adminImgError, setAdminImgError] = useState(false);
  const adminFileRef = useRef<HTMLInputElement>(null);

  // User AI
  const [userGenerating, setUserGenerating] = useState(false);

  // Helper to remove white background using flood fill from a loaded Image element
  const processImageBlob = (img: HTMLImageElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        // Flood fill from corners to remove white/near-white background
        const stack = [[0, 0], [width-1, 0], [0, height-1], [width-1, height-1]];
        const visited = new Uint8Array(width * height);
        
        const isSimilarToWhite = (r: number, g: number, b: number) => {
          return r > 230 && g > 230 && b > 230;
        };

        while (stack.length > 0) {
          const [x, y] = stack.pop()!;
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          
          const vIdx = y * width + x;
          if (visited[vIdx]) continue;
          visited[vIdx] = 1;
          
          const idx = vIdx * 4;
          if (isSimilarToWhite(data[idx], data[idx+1], data[idx+2])) {
            data[idx+3] = 0;
            
            stack.push([x+1, y]);
            stack.push([x-1, y]);
            stack.push([x, y+1]);
            stack.push([x, y-1]);
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao criar blob'));
        }, 'image/png');
      } catch (err) {
        reject(new Error('Erro ao processar imagem: ' + err));
      }
    });
  };

  // Load image via <img> element (handles redirects/CORS better than fetch)
  const loadImageElement = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('A IA não conseguiu gerar a imagem. Tente novamente em alguns segundos.'));
      img.src = url;
    });
  };

  useEffect(() => {
    // Load global shop items
    const loadGlobalShop = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'global_shop'));
        const dynamicStickers = querySnapshot.docs.map(d => ({ id: d.id, url: d.data().url, price: d.data().price || 350 }));
        setGlobalShop([...DEFAULT_STICKERS, ...dynamicStickers]);
      } catch(e) {
        console.error("Error loading global shop:", e);
      }
    };
    loadGlobalShop();
  }, []);

  const handleBuy = async (sticker: { id: string; url: string; price: number }) => {
    if (effortPoints < sticker.price) return;
    setBuying(sticker.id);
    
    const success = await spendPoints(sticker.price, `compra_sticker_${sticker.id}`);
    if (success) {
      await addStickerToInventory(sticker.id, sticker.url.startsWith('/') ? undefined : sticker.url);
    }
    setBuying(null);
  };

  const handleUseSticker = (instanceId: string, stickerId: string, customUrl?: string) => {
    setActiveStamper({ instanceId, stickerId, customUrl });
    onClose();
  };

  const handleGenerateUserSticker = async () => {
    if (effortPoints < 500) return;
    if (!user) return;
    setUserGenerating(true);
    try {
      const themes = ['cute dog', 'cool neon cat', 'kawaii ghost', 'pixel art sword', 'magic potion', 'superhero frog', 'ninja turtle', 'unicorn'];
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      const prompt = `A colorful cute sticker of ${randomTheme}, die-cut, white border, vector art style, flat colors, white background`;
      const seed = Math.floor(Math.random() * 1000000);
      const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=256&height=256&nologo=true`;

      const success = await spendPoints(500, `gerar_sticker_ia_aleatorio`);
      if (success) {
        const img = await loadImageElement(aiUrl);
        const blob = await processImageBlob(img);
        
        const storageRef = ref(storage, `users/${user.uid}/stickers/ai_sticker_${Date.now()}.png`);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        
        await addStickerToInventory(`ai_${Date.now()}`, downloadUrl);
        setActiveTab('inventory');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Erro ao gerar figurinha.");
    } finally {
      setUserGenerating(false);
    }
  };

  // Admin: Generate AI preview
  const handleGenerateAdminPreview = () => {
    if (!adminPrompt) return;
    const prompt = `A colorful cute sticker of ${adminPrompt}, die-cut, white border, vector art style, flat colors, white background`;
    const seed = Math.floor(Math.random() * 1000000);
    const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=256&height=256&nologo=true`;
    
    setAdminPreview(aiUrl);
    setAdminPreviewBlob(null);
    setAdminImgLoading(true);
    setAdminImgError(false);
  };

  // Admin: Handle file upload
  const handleAdminFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const blobUrl = URL.createObjectURL(file);
    setAdminPreview(blobUrl);
    setAdminPreviewBlob(file);
    setAdminImgLoading(false);
    setAdminImgError(false);
  };

  // Helper to convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Helper to resize image if it's too big (for manual uploads)
  const resizeImageFile = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to resize'));
        }, 'image/png', 0.9);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Admin: Add sticker to shop
  const handleAddAdminStickerToShop = async () => {
    if (!adminPreview || !user) return;
    setAdminUploading(true);
    try {
      let finalBase64: string;
      
      if (adminPreviewBlob) {
        // File upload - resize and use directly
        const resizedBlob = await resizeImageFile(adminPreviewBlob as File);
        finalBase64 = await blobToBase64(resizedBlob);
      } else {
        // AI-generated - load and process (transparent background)
        const img = await loadImageElement(adminPreview);
        const processedBlob = await processImageBlob(img);
        finalBase64 = await blobToBase64(processedBlob);
      }
      
      const newId = `global_ai_${Date.now()}`;
      
      await setDoc(doc(db, 'global_shop', newId), {
        url: finalBase64,
        price: 350
      });
      
      setGlobalShop([{ id: newId, url: finalBase64, price: 350 }, ...globalShop]);
      setAdminPreview(null);
      setAdminPreviewBlob(null);
      setAdminPrompt('');
      alert("Figurinha adicionada à Lojinha Global!");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Erro ao adicionar figurinha à loja.");
    } finally {
      setAdminUploading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Lojinha de Recompensas</h2>
            <p className="text-gray-500">Gaste seus Effort Points em itens de personalização</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full font-bold flex items-center gap-2 border border-yellow-200">
              <span>⭐</span>
              {effortPoints} EP
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 font-semibold transition-colors ${activeTab === 'shop' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('shop')}
          >
            🛒 Comprar Adesivos
          </button>
          <button 
            className={`flex-1 py-3 font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'inventory' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Minha Gaveta 
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{unlockedStickers.length}</span>
          </button>
          {isAdmin && (
            <button 
              className={`flex-1 py-3 font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'admin' ? 'bg-white text-purple-600 border-b-2 border-purple-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('admin')}
            >
              <Wand2 className="w-4 h-4" /> Admin IA
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {activeTab === 'shop' ? (
            <div className="space-y-6">
              {/* Gerador IA para usuário */}
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 p-6 rounded-xl border border-purple-200 flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-purple-900 text-lg flex items-center gap-2">
                    <Sparkles className="text-purple-600 w-5 h-5" /> 
                    Figurinha Surpresa IA
                  </h3>
                  <p className="text-purple-700 text-sm mt-1 max-w-sm">Gere uma figurinha aleatória única usando Inteligência Artificial. Ela será 100% sua e guardada na sua conta!</p>
                </div>
                <button
                  onClick={handleGenerateUserSticker}
                  disabled={effortPoints < 500 || userGenerating}
                  className={`px-6 py-3 rounded-xl font-bold shadow-sm transition-all ${
                    userGenerating ? 'bg-purple-300 text-purple-800' 
                    : effortPoints >= 500 ? 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {userGenerating ? 'Gerando...' : 'Gerar por 500 EP'}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {globalShop.map(sticker => {
                  const canAfford = effortPoints >= sticker.price;
                  return (
                    <div key={sticker.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:shadow-md transition-shadow">
                      <div className="w-24 h-24 flex items-center justify-center relative">
                        <img src={sticker.url} alt={`Adesivo ${sticker.id}`} className="max-w-full max-h-full drop-shadow-md" />
                      </div>
                      <button 
                        disabled={!canAfford || buying === sticker.id}
                        onClick={() => handleBuy(sticker)}
                        className={`w-full py-2 rounded-lg font-medium transition-colors ${
                          buying === sticker.id ? 'bg-gray-200 text-gray-500'
                          : canAfford ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {buying === sticker.id ? 'Comprando...' : `${sticker.price} EP`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'inventory' ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {unlockedStickers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400">
                  Sua gaveta está vazia. Compre adesivos na loja!
                </div>
              ) : (
                unlockedStickers.map(instance => {
                  const stickerDef = globalShop.find(s => s.id === instance.stickerId);
                  const displayUrl = instance.customUrl || stickerDef?.url;
                  
                  if (!displayUrl) return null;
                  
                  return (
                    <div 
                      key={instance.instanceId} 
                      onClick={() => {
                        handleUseSticker(instance.instanceId, instance.stickerId, instance.customUrl);
                      }}
                      className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 transition-all group hover:ring-2 cursor-pointer hover:scale-105 ring-blue-400"
                      title="Clique para COLOCAR na tela!"
                    >
                      <div className="w-16 h-16 flex items-center justify-center relative">
                        <img src={displayUrl} alt="Adesivo" className="max-w-full max-h-full drop-shadow-md" />
                      </div>
                      <span className="text-xs font-medium text-gray-400 group-hover:text-blue-500">
                        Usar
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            // Admin Tab
            <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-purple-100">
              <h3 className="text-lg font-bold text-purple-900 mb-2">Criador de Figurinhas da Loja (Admin)</h3>
              <p className="text-gray-500 text-sm mb-6">Descreva como deve ser a figurinha. A IA vai gerar a imagem com fundo branco, e nós aplicaremos transparência automática (multiply) na tela do usuário.</p>
              
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={adminPrompt}
                  onChange={e => setAdminPrompt(e.target.value)}
                  placeholder="Ex: coruja fofa de óculos"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleGenerateAdminPreview()}
                />
                <button 
                  onClick={handleGenerateAdminPreview}
                  disabled={adminGenerating || !adminPrompt}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
                >
                  {adminGenerating ? 'Gerando...' : 'Testar IA'}
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-400 font-medium">OU</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              <div className="flex justify-center mb-6">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={adminFileRef}
                  onChange={handleAdminFileUpload}
                />
                <button 
                  onClick={() => adminFileRef.current?.click()}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors border border-gray-300 flex items-center gap-2"
                >
                  <UploadCloud className="w-5 h-5" />
                  Fazer Upload do Computador
                </button>
              </div>

              {adminPreview && (
                <div className="flex flex-col items-center gap-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <span className="text-sm font-semibold text-gray-500">Preview (Com Fundo Removido Automaticamente):</span>
                  <div className="w-32 h-32 bg-yellow-200 flex items-center justify-center rounded-lg shadow-inner overflow-hidden p-2">
                    <img src={adminPreview} alt="Preview" className="max-w-full max-h-full drop-shadow-md" />
                  </div>
                  <button 
                    onClick={handleAddAdminStickerToShop}
                    disabled={adminUploading}
                    className="mt-4 px-6 py-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:bg-emerald-300"
                  >
                    <UploadCloud className="w-5 h-5" /> 
                    {adminUploading ? 'Enviando para a Loja...' : 'Adicionar à Lojinha (350 EP)'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
