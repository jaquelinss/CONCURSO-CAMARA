import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import ErrorReportModal from './ErrorReportModal';

export default function ReportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 hover:scale-110 active:scale-95 transition-all group"
        title="Reportar um problema"
      >
        <AlertTriangle className="w-5 h-5" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Reportar problema
        </span>
      </button>

      {open && <ErrorReportModal onClose={() => setOpen(false)} />}
    </>
  );
}
