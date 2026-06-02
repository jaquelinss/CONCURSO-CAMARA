import React, { useState } from 'react';
import { useReward } from '../contexts/RewardContext';

interface RewardShopProps {
  onClose: () => void;
}

const STICKERS = [
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
  const { effortPoints, spendPoints, addStickerToInventory, unlockedStickers } = useReward();
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (stickerId: string, price: number) => {
    if (effortPoints < price) return;
    setBuying(stickerId);
    
    const success = await spendPoints(price, `compra_sticker_${stickerId}`);
    if (success) {
      await addStickerToInventory(stickerId);
    }
    setBuying(null);
  };

  const handleUseSticker = (instanceId: string, stickerId: string) => {
    // This will communicate with the SiteDecorator to drop the sticker on the screen
    // We dispatch a custom event that SiteDecorator listens to.
    window.dispatchEvent(new CustomEvent('use-sticker', {
      detail: { instanceId, stickerId }
    }));
    // We don't remove it from the inventory here yet, SiteDecorator removes it when it successfully places it.
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {activeTab === 'shop' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {STICKERS.map(sticker => {
                const canAfford = effortPoints >= sticker.price;
                return (
                  <div key={sticker.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:shadow-md transition-shadow">
                    <div className="w-24 h-24 flex items-center justify-center relative">
                      <img src={sticker.url} alt={`Adesivo ${sticker.id}`} className="max-w-full max-h-full drop-shadow-md" />
                    </div>
                    <button 
                      disabled={!canAfford || buying === sticker.id}
                      onClick={() => handleBuy(sticker.id, sticker.price)}
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
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {unlockedStickers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400">
                  Sua gaveta está vazia. Compre adesivos na loja!
                </div>
              ) : (
                unlockedStickers.map(instance => {
                  const stickerDef = STICKERS.find(s => s.id === instance.stickerId);
                  if (!stickerDef) return null;
                  
                  return (
                    <div 
                      key={instance.instanceId} 
                      onClick={() => handleUseSticker(instance.instanceId, instance.stickerId)}
                      className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:ring-2 ring-blue-400 cursor-pointer transition-all hover:scale-105 group"
                      title="Clique para colocar na tela!"
                    >
                      <div className="w-16 h-16 flex items-center justify-center">
                        <img src={stickerDef.url} alt="Adesivo" className="max-w-full max-h-full drop-shadow-md" />
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-blue-500 font-medium">Usar</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
