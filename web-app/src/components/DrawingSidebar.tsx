import { useState, useRef } from 'react';
import { Eraser, Undo2, Redo2, Minus, Plus, GripHorizontal, MousePointer2 } from 'lucide-react';
import Draggable from 'react-draggable';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

export default function DrawingSidebar({
  tool, setTool,
  penPresets, setPenPresets,
  activePenId, setActivePenId,
  eraserPresets, setEraserPresets,
  activeEraserId, setActiveEraserId,
  strokes, handleUndo, handleRedo, redoStack
}: any) {
  const [sidebarMode] = useState<'fixed' | 'floating' | 'hidden'>('fixed');
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const addPenPreset = () => setPenPresets([...penPresets, { id: 'p' + Date.now(), color: '#3b82f6', width: 4 }]);
  const updatePenPreset = (id: string, updates: any) => setPenPresets(penPresets.map((p: any) => p.id === id ? { ...p, ...updates } : p));

  const addEraserPreset = () => setEraserPresets([...eraserPresets, { id: 'e' + Date.now(), type: 'stroke', width: 24 }]);
  const updateEraserPreset = (id: string, updates: any) => setEraserPresets(eraserPresets.map((p: any) => p.id === id ? { ...p, ...updates } : p));

  if (sidebarMode === 'hidden') return null;

  return (
    <div className={`whiteboard-sidebar pointer-events-auto absolute z-[9999] ${sidebarMode === 'fixed' ? 'left-2 top-1/2 -translate-y-1/2' : 'left-4 top-20'}`}>
      <Draggable disabled={sidebarMode === 'fixed'} handle=".sidebar-drag" nodeRef={sidebarRef}>
        <div ref={sidebarRef} className="flex flex-col items-center gap-1 p-1.5 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 dark:border-gray-700/50">
          {sidebarMode === 'floating' && (
            <div className="sidebar-drag w-full flex justify-center py-1 cursor-grab active:cursor-grabbing text-gray-400 drop-shadow-md">
              <GripHorizontal className="w-4 h-4" />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-1 w-full place-items-center">
            {/* Mouse / Pointer Tool */}
            <button onClick={() => setTool('pointer')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${tool === 'pointer' ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-400' : 'bg-white/90 shadow-sm text-gray-500 hover:text-indigo-600'}`} title="Mouse">
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button onClick={() => {}} className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 pointer-events-none" />

            {/* Undo / Redo */}
            <button onClick={handleUndo} disabled={strokes?.length === 0} className="w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-gray-500 hover:text-indigo-600 disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
            <button onClick={handleRedo} disabled={redoStack?.length === 0} className="w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-gray-500 hover:text-indigo-600 disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
          </div>

          <div className="w-full h-px bg-gray-300 dark:bg-gray-600 my-1 drop-shadow-md" />

          {/* PENS GRID */}
          <div className="grid grid-cols-2 gap-1 w-full place-items-center">
            {penPresets.map((preset: any) => (
              <div key={preset.id} className="relative group">
                <button
                  onClick={() => {
                    if (activePenId === preset.id && tool === 'pen') setEditingPreset(editingPreset === preset.id ? null : preset.id);
                    else { setTool('pen'); setActivePenId(preset.id); setEditingPreset(null); }
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all drop-shadow-md ${tool === 'pen' && activePenId === preset.id ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                  style={{ backgroundColor: preset.color }}
                >
                  <div className="bg-white/40 rounded-full" style={{ width: Math.min(preset.width, 12), height: Math.min(preset.width, 12) }} />
                </button>
                {editingPreset === preset.id && tool === 'pen' && (
                  <div className="absolute left-full ml-3 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-2 z-[10000]">
                    <div className="flex gap-1 flex-wrap w-24">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => updatePenPreset(preset.id, { color: c })} className={`w-5 h-5 rounded-full border-2 ${preset.color === c ? 'border-indigo-500 scale-110' : 'border-gray-300'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updatePenPreset(preset.id, { width: Math.max(1, preset.width - 2) })}><Minus className="w-4 h-4" /></button>
                      <span className="text-xs font-bold w-6 text-center">{preset.width}</span>
                      <button onClick={() => updatePenPreset(preset.id, { width: Math.min(30, preset.width + 2) })}><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {penPresets.length < 5 && (
              <button onClick={addPenPreset} className="w-7 h-7 rounded-full bg-white/80 border border-gray-200 text-gray-500 hover:text-indigo-600 flex items-center justify-center shadow-sm backdrop-blur-sm"><Plus className="w-4 h-4" /></button>
            )}
          </div>

          <div className="w-full h-px bg-gray-300 dark:bg-gray-600 my-1 drop-shadow-md" />
          
          {/* ERASERS GRID */}
          <div className="grid grid-cols-2 gap-1 w-full place-items-center">
            {eraserPresets.map((preset: any) => (
              <div key={preset.id} className="relative group">
                <button
                  onClick={() => {
                    if (activeEraserId === preset.id && tool === 'eraser') setEditingPreset(editingPreset === preset.id ? null : preset.id);
                    else { setTool('eraser'); setActiveEraserId(preset.id); setEditingPreset(null); }
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all drop-shadow-md bg-white/90 ${tool === 'eraser' && activeEraserId === preset.id ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                >
                  <Eraser className="w-4 h-4 text-pink-500" />
                </button>
                {editingPreset === preset.id && tool === 'eraser' && (
                  <div className="absolute left-full ml-3 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-2 z-[10000] w-40">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateEraserPreset(preset.id, { width: Math.max(5, preset.width - 4) })}><Minus className="w-4 h-4" /></button>
                      <span className="text-xs font-bold w-6 text-center">{preset.width}</span>
                      <button onClick={() => updateEraserPreset(preset.id, { width: Math.min(100, preset.width + 4) })}><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {eraserPresets.length < 4 && (
              <button onClick={addEraserPreset} className="w-7 h-7 rounded-full bg-white/80 border border-gray-200 text-gray-500 hover:text-indigo-600 flex items-center justify-center shadow-sm backdrop-blur-sm"><Plus className="w-4 h-4" /></button>
            )}
          </div>
        </div>
      </Draggable>
    </div>
  );
}
