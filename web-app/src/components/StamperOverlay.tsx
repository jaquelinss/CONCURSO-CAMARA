import { useEffect, useState } from 'react';
import { useReward } from '../contexts/RewardContext';
import { StickerImage } from './StickerImage';

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

export default function StamperOverlay() {
  const { activeStamper, setActiveStamper } = useReward();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!activeStamper) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveStamper(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    
    // Esconde o cursor padrão do body enquanto o carimbo está ativo
    document.body.style.cursor = 'crosshair';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.cursor = '';
    };
  }, [activeStamper, setActiveStamper]);

  if (!activeStamper) return null;

  const url = activeStamper.customUrl || STICKERS_DEFS[activeStamper.stickerId];
  if (!url) return null;

  return (
    <div 
      className="fixed pointer-events-none z-[99999]"
      style={{
        left: mousePos.x,
        top: mousePos.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <StickerImage 
        src={url}
        className="w-32 h-32 object-contain drop-shadow-md opacity-70 scale-110"
      />
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium">
        Clique para carimbar
      </div>
    </div>
  );
}
