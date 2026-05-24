import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import ErrorReportModal from './ErrorReportModal';

export default function ReportButton({ isHidden = false }: { isHidden?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-8 z-50 bg-red-500 text-white w-14 h-14 rounded-full shadow-lg hover:bg-red-600 hover:scale-110 active:scale-95 transition-all group flex items-center justify-center ${isHidden ? 'opacity-0 translate-x-12 pointer-events-none' : 'opacity-100 translate-x-0'}`}
        title="Reportar um problema"
      >
        <AlertTriangle className="w-6 h-6" />
        <span className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Reportar problema
        </span>
      </button>

      {open && <ErrorReportModal onClose={() => setOpen(false)} />}
    </>
  );
}
