import React, { useRef, useEffect, useState } from 'react';

interface StickerImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  className?: string;
  threshold?: number; // Alpha threshold (0-255) to consider as "opaque". Default 10.
}

/**
 * StickerImage
 * An image component that ignores pointer events (clicks, drags) on its transparent areas.
 * It does this by checking the exact pixel alpha value on an offscreen canvas.
 * If transparent, it passes the click/pointer event to the element underneath.
 */
export const StickerImage: React.FC<StickerImageProps> = ({ 
  src, 
  className = '', 
  threshold = 10,
  onPointerDown,
  ...props 
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Load the image into an offscreen canvas once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Just in case it's from an external URL
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(img, 0, 0);
        setCtx(context);
      }
    };
  }, [src]);

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!ctx || !imgRef.current) {
      // If canvas isn't ready, let standard behavior happen
      if (onPointerDown) onPointerDown(e);
      return;
    }

    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    
    // Calculate scale in case the rendered size differs from natural size
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    
    // Get pixel coordinates
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Read the alpha channel of that specific pixel
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    const alpha = pixelData[3];

    if (alpha < threshold) {
      // It's transparent! 
      // 1. Prevent Draggable or any wrapper from seeing this event
      e.stopPropagation();
      e.preventDefault();

      // 2. Pass the click through to whatever is underneath
      img.style.pointerEvents = 'none'; // Temporarily hide from hit-testing
      const underlyingElement = document.elementFromPoint(e.clientX, e.clientY);
      if (underlyingElement && underlyingElement !== img) {
        // Clone and dispatch the event
        const newEvent = new PointerEvent(e.nativeEvent.type, {
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY,
          screenX: e.screenX,
          screenY: e.screenY,
          button: e.button,
          buttons: e.buttons,
          pointerId: e.pointerId,
          pointerType: e.pointerType,
        });
        underlyingElement.dispatchEvent(newEvent);
      }
      img.style.pointerEvents = 'auto'; // Restore hit-testing
    } else {
      // It's opaque (the art), act normal (drags and clicks work)
      if (onPointerDown) onPointerDown(e);
    }
  };

  return (
    <img
      ref={imgRef}
      src={src}
      className={`select-none pointer-events-auto ${className}`}
      onPointerDown={handlePointerDown}
      draggable={false} // Prevent default HTML5 ghost image dragging
      {...props}
    />
  );
};
