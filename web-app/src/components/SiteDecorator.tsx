import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useReward } from '../contexts/RewardContext';
import Draggable from 'react-draggable';
import { StickerImage } from './StickerImage';
import { Lock, Unlock, X } from 'lucide-react';

interface PlacedSticker {
  id: string;
  stickerId: string;
  x: number;
  y: number;
  isLocked: boolean;
}

const STICKERS_DEFS: Record<string, string> = {
  '1': '/stickers/1.png',
  '2': '/stickers/2.png',
  '3': '/stickers/3.png',
  '4': '/stickers/4.png',
  '5': '/stickers/5.png',
  '6': '/stickers/6.png',
  '7': '/stickers/7.png',
  '8': '/stickers/8.png',
  '9': '/stickers/9.png',
  '10': '/stickers/10.png',
  '11': '/stickers/11.png',
};

export default function SiteDecorator() {
  const { user } = useAuth();
  const location = useLocation();
  const { removeStickerFromInventory, addStickerToInventory } = useReward();
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  
  // Create a safe document ID from the pathname
  const docId = `decorations_${location.pathname.replace(/[^a-zA-Z0-9]/g, '_') || 'root'}`;

  // Fetch stickers for current route
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'settings', docId);
    
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setStickers(snap.data().stickers || []);
      } else {
        setStickers([]);
      }
    });

    return unsubscribe;
  }, [user, docId]);

  // Handle new sticker dropped from inventory
  useEffect(() => {
    const handleUseSticker = async (e: Event) => {
      const customEvent = e as CustomEvent<{ instanceId: string, stickerId: string }>;
      const { instanceId, stickerId } = customEvent.detail;
      
      if (!user) return;

      const newSticker: PlacedSticker = {
        id: Math.random().toString(36).substring(2),
        stickerId,
        x: window.innerWidth / 2 - 64, // Center of screen roughly
        y: window.innerHeight / 2 - 64,
        isLocked: false
      };

      const newStickers = [...stickers, newSticker];
      
      // Save to screen
      const docRef = doc(db, 'users', user.uid, 'settings', docId);
      await setDoc(docRef, { stickers: newStickers }, { merge: true });
      
      // Remove from inventory
      await removeStickerFromInventory(instanceId);
    };

    window.addEventListener('use-sticker', handleUseSticker);
    return () => window.removeEventListener('use-sticker', handleUseSticker);
  }, [user, docId, stickers, removeStickerFromInventory]);

  const updateSticker = async (id: string, updates: Partial<PlacedSticker>) => {
    if (!user) return;
    const updated = stickers.map(s => s.id === id ? { ...s, ...updates } : s);
    const docRef = doc(db, 'users', user.uid, 'settings', docId);
    await setDoc(docRef, { stickers: updated }, { merge: true });
  };

  const removeSticker = async (sticker: PlacedSticker) => {
    if (!user) return;
    const updated = stickers.filter(s => s.id !== sticker.id);
    const docRef = doc(db, 'users', user.uid, 'settings', docId);
    await setDoc(docRef, { stickers: updated }, { merge: true });
    
    // Return to inventory
    await addStickerToInventory(sticker.stickerId);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[10]">
      {stickers.map(sticker => (
        <DraggableSticker 
          key={sticker.id}
          sticker={sticker}
          onUpdate={(updates) => updateSticker(sticker.id, updates)}
          onRemove={() => removeSticker(sticker)}
        />
      ))}
    </div>
  );
}

function DraggableSticker({ 
  sticker, 
  onUpdate, 
  onRemove 
}: { 
  sticker: PlacedSticker; 
  onUpdate: (u: Partial<PlacedSticker>) => void;
  onRemove: () => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const url = STICKERS_DEFS[sticker.stickerId];
  
  if (!url) return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: sticker.x, y: sticker.y }}
      disabled={sticker.isLocked}
      onStop={(_, data) => onUpdate({ x: data.x, y: data.y })}
    >
      <div 
        ref={nodeRef} 
        className="absolute inline-block group pointer-events-auto"
      >
        <StickerImage 
          src={url}
          className={`w-32 h-32 object-contain drop-shadow-md transition-opacity ${sticker.isLocked ? 'opacity-90' : 'opacity-100 cursor-move'}`}
        />
        
        {/* Hover Controls - these need pointer-events-auto to be clickable even if the container is locked (but if container is pointer-events-none, they can't be hovered. So we must put pointer-events-auto on the controls wrapper) */}
        <div 
          className="absolute -top-4 -right-4 bg-white/90 backdrop-blur shadow-sm border border-gray-200 rounded-lg p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
        >
          <button 
            onClick={(e) => { e.stopPropagation(); onUpdate({ isLocked: !sticker.isLocked }); }}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title={sticker.isLocked ? "Descolar (permitir mover)" : "Colar (travar no fundo)"}
          >
            {sticker.isLocked ? <Lock className="w-4 h-4 text-blue-500" /> : <Unlock className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-600 transition-colors"
            title="Guardar de volta na gaveta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Draggable>
  );
}
