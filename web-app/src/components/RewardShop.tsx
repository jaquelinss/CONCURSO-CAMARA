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
  { id: '1', url: '/stickers/1.png', price: 150 },
  { id: '2', url: '/stickers/2.png', price: 150 },
  { id: '3', url: '/stickers/3.png', price: 150 },
  { id: '4', url: '/stickers/4.png', price: 150 },
  { id: '5', url: '/stickers/5.png', price: 150 },
  { id: '6', url: '/stickers/6.png', price: 150 },
  { id: '7', url: '/stickers/7.png', price: 150 },
  { id: '8', url: '/stickers/8.png', price: 150 },
  { id: '9', url: '/stickers/9.png', price: 150 },
  { id: '10', url: '/stickers/10.png', price: 150 },
  { id: '11', url: '/stickers/11.png', price: 150 },
];

export interface GlobalSticker {
  id: string;
  url?: string;
  price: number;
  type?: 'sticker' | 'pack';
  name?: string;
  promoPricePerItem?: number;
  items?: { id: string; url: string }[];
  itemIds?: string[];
  coverUrl?: string;
  packId?: string;
}

export const RewardShop: React.FC<RewardShopProps> = ({ onClose }) => {
  const { effortPoints, spendPoints, awardPoints, addStickerToInventory, addMultipleStickersToInventory, unlockedStickers, setActiveStamper } = useReward();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory' | 'admin'>('shop');
  const [buying, setBuying] = useState<string | null>(null);
  
  const [globalShop, setGlobalShop] = useState<GlobalSticker[]>(DEFAULT_STICKERS);
  const [filterType, setFilterType] = useState<'all' | 'stickers' | 'packs'>('all');
  const [viewingPack, setViewingPack] = useState<GlobalSticker | null>(null);
  
  // Admin AI / Upload
  const [adminMode, setAdminMode] = useState<'single' | 'group' | 'edit_pack'>('single');
  const [adminPrompt, setAdminPrompt] = useState('');
  const [adminPreview, setAdminPreview] = useState<string | null>(null);
  const [adminPreviewBlob, setAdminPreviewBlob] = useState<Blob | null>(null);
  const [adminGenerating, setAdminGenerating] = useState(false);
  const [adminUploading, setAdminUploading] = useState(false);
  const [adminGenerationError, setAdminGenerationError] = useState<string | null>(null);
  const adminFileRef = useRef<HTMLInputElement>(null);

  // Admin Pack Grouping & Editing
  const [adminPackName, setAdminPackName] = useState('');
  const [adminPackPrice, setAdminPackPrice] = useState(100);
  const [adminSelectedStickers, setAdminSelectedStickers] = useState<{id: string; url: string}[]>([]);
  const [adminEditingPackId, setAdminEditingPackId] = useState<string | null>(null);

  // User AI
  const [userGenerating, setUserGenerating] = useState(false);

  // Remove backgrounds from uploaded images
  const processImageBlob = async (imgElement: HTMLImageElement): Promise<Blob> => {
    // Basic canvas operation (white to transparent)
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.width;
    canvas.height = imgElement.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imgElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert near-white pixels to transparent
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
        data[i+3] = 0; // set alpha to 0
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
  };

  const resizeImageFile = (file: File, maxSize = 256): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          
          if (w > maxSize || h > maxSize) {
            if (w > h) {
              h = Math.round((h * maxSize) / w);
              w = maxSize;
            } else {
              w = Math.round((w * maxSize) / h);
              h = maxSize;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(b => resolve(b!), 'image/png');
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  // Load image via <img> element (handles redirects/CORS better than fetch)
  const generateAiImageBlob = async (url: string): Promise<Blob> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha na resposta da rede');
      return await response.blob();
    } catch (e) {
      throw new Error('A IA não conseguiu gerar a imagem. Tente novamente em alguns segundos.');
    }
  };

  const loadImageElement = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Erro ao processar a imagem.'));
      img.src = url;
    });
  };

  useEffect(() => {
    // Load global shop items
    const loadGlobalShop = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'global_shop'));
        const dynamicStickers = querySnapshot.docs.map(d => {
          const defaultMatch = DEFAULT_STICKERS.find(ds => ds.id === d.id);
          return {
            id: d.id,
            url: d.data().url || defaultMatch?.url || '',
            price: d.data().price || defaultMatch?.price || 150,
            type: d.data().type,
            name: d.data().name,
            promoPricePerItem: d.data().promoPricePerItem,
            items: d.data().items || [],
            itemIds: d.data().itemIds || [],
            coverUrl: d.data().coverUrl,
            packId: d.data().packId
          };
        });

        // Hydrate items for packs using itemIds if available
        const packs = dynamicStickers.filter(s => s.type === 'pack');
        packs.forEach(pack => {
           if (pack.itemIds && pack.itemIds.length > 0) {
               pack.items = pack.itemIds.map((id: string) => {
                   const itemDoc = dynamicStickers.find(s => s.id === id);
                   return itemDoc ? { id, url: itemDoc.url } : null;
               }).filter(Boolean) as {id: string, url: string}[];
           }
        });

        // Only keep dynamic stickers that are valid (packs or have a URL)
        const validDynamicStickers = dynamicStickers.filter(s => s.type === 'pack' || s.url);

        // Remove defaults that are now overridden by dynamic
        const dynamicIds = new Set(validDynamicStickers.map(s => s.id));
        const filteredDefaultStickers = DEFAULT_STICKERS.filter(s => !dynamicIds.has(s.id));

        const finalShop = [...filteredDefaultStickers, ...validDynamicStickers];
        setGlobalShop(finalShop);
        
        // --- DEBUG LOG ---
        console.log("FINAL GLOBAL SHOP:", finalShop.map(s => ({id: s.id, url: s.url, packId: (s as any).packId})));
        // -----------------
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

      const generatedItems: {id: string, url: string}[] = [];
      
      for (let i = 0; i < 3; i++) {
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        const prompt = `A colorful cute sticker of ${randomTheme}, die-cut, white border, vector art style, flat colors, white background`;
        const seed = Math.floor(Math.random() * 1000000);
        const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=256&height=256&model=flux`;

        const blob = await generateAiImageBlob(aiUrl);
        
        const storageRef = ref(storage, `users/${user.uid}/stickers/ai_sticker_${Date.now()}_${i}.png`);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        
        generatedItems.push({ id: `ai_${Date.now()}_${i}`, url: downloadUrl });
      }
      
      const success = await spendPoints(500, `gerar_sticker_ia_aleatorio_pack`);
      if (success) {
        await addMultipleStickersToInventory(generatedItems);
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
  const handleGenerateAdminPreview = async () => {
    if (!adminPrompt) return;
    const prompt = `A colorful cute sticker of ${adminPrompt}, die-cut, white border, vector art style, flat colors, white background`;
    const seed = Math.floor(Math.random() * 1000000);
    const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=256&height=256&model=flux`;
    
    setAdminPreview(aiUrl);
    setAdminPreviewBlob(null);
    setAdminGenerationError(null);
    setAdminGenerating(true);
    
    try {
      const blob = await generateAiImageBlob(aiUrl);
      setAdminPreviewBlob(blob);
    } catch (error) {
      console.error(error);
      setAdminGenerationError('Erro ao gerar. Tente outro prompt ou aguarde uns segundos.');
    } finally {
      setAdminGenerating(false);
    }
  };

  // Admin: Handle file upload
  const handleAdminFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const blobUrl = URL.createObjectURL(file);
    setAdminPreview(blobUrl);
    setAdminPreviewBlob(file);
    setAdminGenerationError(null);
  };



  // Admin: Add sticker to shop
  const handleAddAdminStickerToShop = async () => {
    if (!adminPreview || !user) return;
    setAdminUploading(true);
    try {
      let finalBase64: string;
      
      if (adminPreviewBlob && adminPreviewBlob instanceof File) {
        // File upload - resize and use directly
        const resizedBlob = await resizeImageFile(adminPreviewBlob as File);
        finalBase64 = await blobToBase64(resizedBlob);
      } else if (adminPreviewBlob) {
        // AI-generated (we have the blob) - load and process (transparent background)
        const objectUrl = URL.createObjectURL(adminPreviewBlob);
        const img = await loadImageElement(objectUrl);
        const processedBlob = await processImageBlob(img);
        finalBase64 = await blobToBase64(processedBlob);
        URL.revokeObjectURL(objectUrl);
      } else {
        throw new Error("No image blob found.");
      }
      
      const newId = `global_ai_${Date.now()}`;
      
      await setDoc(doc(db, 'global_shop', newId), {
        url: finalBase64,
        price: 150
      });
      
      setGlobalShop([{ id: newId, url: finalBase64, price: 150 }, ...globalShop]);
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

  const handleCreatePackFromExisting = async () => {
    if (!adminPackName || adminSelectedStickers.length === 0) return;
    setAdminUploading(true);
    try {
      const newId = `pack_${Date.now()}`;
      
      const itemIds = adminSelectedStickers.map(s => s.id);

      const packData = {
        type: 'pack' as const,
        name: adminPackName,
        promoPricePerItem: adminPackPrice,
        price: adminPackPrice * adminSelectedStickers.length,
        itemIds: itemIds,
        coverUrl: adminSelectedStickers[0].url
      };

      // Create pack
      await setDoc(doc(db, 'global_shop', newId), packData);

      // Update individual stickers to belong to this pack (avoiding 1MB limit by not storing full base64 in pack)
      for (const item of adminSelectedStickers) {
        await setDoc(doc(db, 'global_shop', item.id), { packId: newId }, { merge: true });
      }

      // Update local state: add packId to the items, add the pack
      const updatedShop = globalShop.map(s => itemIds.includes(s.id) ? { ...s, packId: newId } : s);
      setGlobalShop([{ id: newId, ...packData, items: adminSelectedStickers }, ...updatedShop]);
      
      setAdminPackName('');
      setAdminSelectedStickers([]);
      alert("Pacote criado com sucesso!");
    } catch (e: any) {
      console.error(e);
      alert("Erro ao criar pacote: " + e.message);
    } finally {
      setAdminUploading(false);
    }
  };

  const handleSavePackEdit = async () => {
    if (!adminEditingPackId || !adminPackName || adminSelectedStickers.length === 0) return;
    setAdminUploading(true);
    try {
      const originalPack = globalShop.find(s => s.id === adminEditingPackId);
      if (!originalPack || !originalPack.items) return;

      const oldItems = originalPack.items;
      const newItems = adminSelectedStickers;
      
      const removedItems = oldItems.filter(old => !newItems.some(n => n.id === old.id));
      const addedItems = newItems.filter(n => !oldItems.some(old => old.id === n.id));

      const { updateDoc, deleteField } = await import('firebase/firestore');

      // For removed items, remove their packId
      for (const item of removedItems) {
        try {
          await updateDoc(doc(db, 'global_shop', item.id), {
            packId: deleteField()
          });
        } catch (err: any) {
          if (err.code !== 'not-found') throw err;
        }
      }

      // For added items, set their packId
      for (const item of addedItems) {
        try {
          await updateDoc(doc(db, 'global_shop', item.id), {
            packId: adminEditingPackId
          });
        } catch (err: any) {
          if (err.code !== 'not-found') throw err;
        }
      }

      const itemIds = newItems.map(i => i.id);

      // Update Pack
      const updatedPackData = {
        type: 'pack' as const,
        name: adminPackName,
        promoPricePerItem: adminPackPrice,
        price: adminPackPrice * newItems.length,
        itemIds: itemIds,
        coverUrl: newItems[0].url
      };

      await setDoc(doc(db, 'global_shop', adminEditingPackId), updatedPackData, { merge: true });

      // Update UI state
      const updatedShop = globalShop.map(s => {
        // If it's the pack itself, update data and local items array
        if (s.id === adminEditingPackId) {
          return { ...s, ...updatedPackData, items: newItems };
        }
        // If it's a removed item, remove local packId
        if (removedItems.some(r => r.id === s.id)) {
          const { packId, ...rest } = s;
          return rest;
        }
        // If it's an added item, add local packId
        if (addedItems.some(a => a.id === s.id)) {
          return { ...s, packId: adminEditingPackId };
        }
        return s;
      });
        
      setGlobalShop(updatedShop);

      setAdminPackName('');
      setAdminSelectedStickers([]);
      setAdminEditingPackId(null);
      setAdminMode('group');
      alert("Pacote editado com sucesso!");
    } catch (e: any) {
      console.error(e);
      alert("Erro ao editar pacote: " + e.message);
    } finally {
      setAdminUploading(false);
    }
  };

  const handleDeletePack = async () => {
    if (!adminEditingPackId) return;
    
    if (!confirm("Tem certeza que deseja excluir este pacote? As figurinhas dele voltarão a ficar soltas na loja.")) return;
    
    setAdminUploading(true);
    try {
      const originalPack = globalShop.find(s => s.id === adminEditingPackId);
      if (!originalPack) return;

      const itemsInPack = originalPack.items || [];
      const { updateDoc, deleteField, deleteDoc } = await import('firebase/firestore');

      // Remove packId from all items in this pack
      for (const item of itemsInPack) {
        try {
          await updateDoc(doc(db, 'global_shop', item.id), {
            packId: deleteField()
          });
        } catch (err: any) {
          if (err.code !== 'not-found') throw err;
        }
      }

      // Delete the pack document
      await deleteDoc(doc(db, 'global_shop', adminEditingPackId));

      // Update UI state
      const updatedShop = globalShop
        .filter(s => s.id !== adminEditingPackId) // remove the pack
        .map(s => {
          // if it was an item in the pack, strip its packId so it shows as loose
          if (itemsInPack.some(item => item.id === s.id)) {
            const { packId, ...rest } = s;
            return rest;
          }
          return s;
        });

      setGlobalShop(updatedShop);

      setAdminPackName('');
      setAdminSelectedStickers([]);
      setAdminEditingPackId(null);
      setAdminMode('group');
      alert("Pacote excluído com sucesso!");
    } catch (e: any) {
      console.error(e);
      alert("Erro ao excluir pacote: " + e.message);
    } finally {
      setAdminUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[10005] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
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
                  <p className="text-purple-700 text-sm mt-1 max-w-sm">Gere um pacote surpresa com 3 figurinhas aleatórias únicas usando Inteligência Artificial. Elas serão 100% suas e guardadas na sua conta!</p>
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

              <div className="flex gap-2 pb-4">
                <button
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setFilterType('all')}
                >
                  Todos
                </button>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterType === 'stickers' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setFilterType('stickers')}
                >
                  Figurinhas Soltas
                </button>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterType === 'packs' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setFilterType('packs')}
                >
                  Pacotes (Packs)
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {globalShop
                  .filter(s => {
                    if (s.packId) return false; // hide inner pack items from the main shop list
                    if (filterType === 'packs') return s.type === 'pack';
                    if (filterType === 'stickers') return s.type !== 'pack';
                    return true; // 'all'
                  })
                  .map(sticker => {
                  if (sticker.type === 'pack') {
                    return (
                      <div key={sticker.id} onClick={() => setViewingPack(sticker)} className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col items-center gap-3 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 group">
                        <div className="w-24 h-24 flex items-center justify-center relative">
                          {/* Stacked effect */}
                          <div className="absolute inset-0 bg-white rounded-lg shadow-sm border border-gray-100 rotate-6 transform group-hover:rotate-12 transition-transform"></div>
                          <div className="absolute inset-0 bg-white rounded-lg shadow-sm border border-gray-100 -rotate-3 transform group-hover:-rotate-6 transition-transform"></div>
                          <div className="absolute inset-0 bg-white rounded-lg shadow-sm border border-purple-200 z-10 p-2">
                            <img src={sticker.coverUrl || sticker.items?.[0]?.url} alt={`Pack ${sticker.name}`} className="w-full h-full object-contain drop-shadow-md" />
                          </div>
                          <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center z-20 shadow-md">
                            {sticker.items?.length || 0}
                          </div>
                        </div>
                        <div className="text-center w-full mt-2">
                          <p className="font-bold text-sm text-gray-800 truncate">{sticker.name}</p>
                          <p className="text-xs text-purple-600 font-semibold">{sticker.price} EP</p>
                        </div>
                        <button className="w-full py-1.5 rounded-lg font-medium transition-colors bg-purple-100 text-purple-700 group-hover:bg-purple-200 text-sm">
                          Ver Pacote
                        </button>
                      </div>
                    );
                  }

                  const canAfford = effortPoints >= sticker.price;
                  return (
                    <div key={sticker.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:shadow-md transition-shadow">
                      <div className="w-24 h-24 flex items-center justify-center relative">
                        <img src={sticker.url} alt={`Adesivo ${sticker.id}`} className="max-w-full max-h-full drop-shadow-md" />
                      </div>
                      <button 
                        disabled={!canAfford || buying === sticker.id}
                        onClick={() => handleBuy({ id: sticker.id, url: sticker.url || '', price: sticker.price })}
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
                  let stickerDef = globalShop.find(s => s.id === instance.stickerId);
                  if (!stickerDef) {
                    for (const pack of globalShop.filter(s => s.type === 'pack')) {
                      const found = pack.items?.find(i => i.id === instance.stickerId);
                      if (found) {
                        stickerDef = { ...found, price: pack.promoPricePerItem || 150 };
                        break;
                      }
                    }
                  }
                  
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
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-purple-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-purple-900">Painel Admin da Loja</h3>
                  <p className="text-gray-500 text-sm">Gerencie o que aparece para os usuários comprarem.</p>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button 
                    onClick={() => {
                      setAdminMode('single');
                      setAdminEditingPackId(null);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${adminMode === 'single' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Adicionar Avulsa
                  </button>
                  <button 
                    onClick={() => {
                      setAdminMode('group');
                      setAdminEditingPackId(null);
                      setAdminSelectedStickers([]);
                      setAdminPackName('');
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${adminMode === 'group' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Novo Pacote
                  </button>
                  <button 
                    onClick={() => setAdminMode('edit_pack')}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${adminMode === 'edit_pack' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Editar Pacote
                  </button>
                  <button 
                    onClick={() => {
                      awardPoints(500, "refund");
                      alert("500 EP creditados na sua conta!");
                    }}
                    className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md text-sm font-bold transition-colors ml-2 border border-emerald-200"
                  >
                    + 500 EP (Devolver)
                  </button>
                </div>
              </div>

              {adminMode === 'single' ? (
                <>
                  <p className="text-gray-500 text-sm mb-6">Descreva como deve ser a figurinha (IA) ou faça o upload direto do computador.</p>
                  
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

                  {adminPreviewBlob && (
                    <div className="flex flex-col items-center gap-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <span className="text-sm font-semibold text-gray-500">Preview:</span>
                      <div className="w-32 h-32 bg-yellow-200 flex items-center justify-center rounded-lg shadow-inner overflow-hidden p-2">
                        <img src={URL.createObjectURL(adminPreviewBlob)} alt="Preview" className="max-w-full max-h-full drop-shadow-md" />
                      </div>
                      <button 
                        onClick={handleAddAdminStickerToShop}
                        disabled={adminUploading}
                        className="mt-4 px-6 py-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:bg-emerald-300"
                      >
                        <UploadCloud className="w-5 h-5" /> 
                        {adminUploading ? 'Enviando para a Loja...' : 'Adicionar à Lojinha (150 EP)'}
                      </button>
                    </div>
                  )}
                  {adminGenerationError && (
                    <div className="text-red-500 text-sm font-semibold text-center mt-4">
                      {adminGenerationError}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {adminMode === 'edit_pack' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Pacote para Editar</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={adminEditingPackId || ''}
                        onChange={e => {
                          const packId = e.target.value;
                          setAdminEditingPackId(packId);
                          const pack = globalShop.find(s => s.id === packId);
                          if (pack) {
                            setAdminPackName(pack.name || '');
                            setAdminPackPrice(pack.promoPricePerItem || 300);
                            setAdminSelectedStickers(pack.items || []);
                          } else {
                            setAdminSelectedStickers([]);
                          }
                        }}
                      >
                        <option value="">-- Selecione um Pacote --</option>
                        {globalShop.filter(s => s.type === 'pack').map(pack => (
                          <option key={pack.id} value={pack.id}>{pack.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Pacote</label>
                      <input 
                        type="text" 
                        value={adminPackName}
                        onChange={e => setAdminPackName(e.target.value)}
                        placeholder="Ex: Pacote Verão"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                        disabled={adminMode === 'edit_pack' && !adminEditingPackId}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preço Promocional por Figurinha (EP)</label>
                      <input 
                        type="number" 
                        value={adminPackPrice}
                        onChange={e => setAdminPackPrice(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                        disabled={adminMode === 'edit_pack' && !adminEditingPackId}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Selecione as figurinhas para agrupar:</h4>
                    <p className="text-xs text-gray-500 mb-4">Clique para adicionar ou remover do pacote.</p>
                    
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3 max-h-60 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-lg">
                      {/* In edit mode, show BOTH loose stickers AND stickers currently in this pack */}
                      {globalShop
                        .filter(s => s.type !== 'pack' && (!s.packId || (adminMode === 'edit_pack' && s.packId === adminEditingPackId)))
                        .map(sticker => {
                          const isSelected = adminSelectedStickers.some(selected => selected.id === sticker.id);
                          return (
                            <div 
                              key={sticker.id}
                              onClick={() => {
                                if (adminMode === 'edit_pack' && !adminEditingPackId) return;
                                
                                if (isSelected) {
                                  setAdminSelectedStickers(prev => prev.filter(item => item.id !== sticker.id));
                                } else {
                                  setAdminSelectedStickers(prev => [...prev, { id: sticker.id, url: sticker.url || '' }]);
                                }
                              }}
                              className={`relative border-2 rounded-lg p-2 flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'border-purple-600 bg-purple-50' : 'border-transparent bg-white hover:border-purple-300'} ${(adminMode === 'edit_pack' && !adminEditingPackId) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <img src={sticker.url} alt="Sticker" className="w-12 h-12 object-contain" />
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                                  ✓
                                </div>
                              )}
                            </div>
                          );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <div>
                      <p className="text-sm text-purple-900">Total de itens: <strong>{adminSelectedStickers.length}</strong></p>
                      <p className="text-lg font-bold text-purple-700">Preço do Pacote: {adminSelectedStickers.length * adminPackPrice} EP</p>
                    </div>
                    <div className="flex gap-2">
                      {adminMode === 'edit_pack' && adminEditingPackId && (
                        <button 
                          onClick={handleDeletePack}
                          disabled={adminUploading}
                          className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50 rounded-xl font-bold transition-colors"
                        >
                          Excluir Pacote
                        </button>
                      )}
                      <button 
                        onClick={adminMode === 'edit_pack' ? handleSavePackEdit : handleCreatePackFromExisting}
                        disabled={adminUploading || !adminPackName || adminSelectedStickers.length === 0 || (adminMode === 'edit_pack' && !adminEditingPackId)}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-xl font-bold transition-colors"
                      >
                        {adminUploading ? 'Salvando...' : (adminMode === 'edit_pack' ? 'Salvar Edição do Pacote' : 'Criar Pacote Agora')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pack Viewing Modal */}
      {viewingPack && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setViewingPack(null)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-purple-900">{viewingPack.name}</h2>
                <p className="text-purple-600 text-sm font-medium">{viewingPack.items?.length || 0} figurinhas incríveis</p>
              </div>
              <button onClick={() => setViewingPack(null)} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="bg-purple-100 p-6 rounded-xl border border-purple-200 mb-6 flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-purple-900 text-lg">Levar Pacote Completo</h3>
                  <p className="text-purple-700 text-sm">Compre todas as figurinhas de uma vez com um preço promocional especial!</p>
                  {viewingPack.items && viewingPack.items.length * 150 > viewingPack.price && (
                    <p className="text-green-600 text-sm font-bold mt-1">
                      Economize {(viewingPack.items.length * 150) - viewingPack.price} EP em relação à compra individual!
                    </p>
                  )}
                </div>
                <button
                  disabled={effortPoints < viewingPack.price || buying === viewingPack.id}
                  onClick={async () => {
                    if (effortPoints < viewingPack.price) return;
                    setBuying(viewingPack.id);
                    const success = await spendPoints(viewingPack.price, `compra_pacote_${viewingPack.id}`);
                    if (success && viewingPack.items) {
                      await addMultipleStickersToInventory(viewingPack.items);
                    }
                    setBuying(null);
                    setViewingPack(null);
                  }}
                  className={`px-8 py-3 rounded-xl font-bold shadow-sm transition-all ${
                    buying === viewingPack.id ? 'bg-purple-300 text-purple-800' 
                    : effortPoints >= viewingPack.price ? 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {buying === viewingPack.id ? 'Comprando...' : `Comprar Tudo por ${viewingPack.price} EP`}
                </button>
              </div>

              <h4 className="font-bold text-gray-800 mb-4">Ou compre separadamente por 150 EP cada:</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {viewingPack.items?.map(item => {
                  const itemDef = { id: item.id, url: item.url, price: 150 };
                  const canAfford = effortPoints >= 150;
                  const isUnlocked = unlockedStickers.some(u => u.stickerId === item.id);
                  
                  return (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-3">
                      <div className="w-20 h-20 flex items-center justify-center relative">
                        <img src={item.url} alt={`Adesivo ${item.id}`} className="max-w-full max-h-full drop-shadow-md" />
                      </div>
                      {isUnlocked ? (
                        <div className="w-full py-1.5 rounded-lg font-medium bg-emerald-100 text-emerald-700 text-sm text-center">
                          Já Possui
                        </div>
                      ) : (
                        <button 
                          disabled={!canAfford || buying === item.id}
                          onClick={() => handleBuy(itemDef)}
                          className={`w-full py-1.5 rounded-lg font-medium transition-colors text-sm ${
                            buying === item.id ? 'bg-gray-200 text-gray-500'
                            : canAfford ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {buying === item.id ? 'Comprando...' : '150 EP'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
