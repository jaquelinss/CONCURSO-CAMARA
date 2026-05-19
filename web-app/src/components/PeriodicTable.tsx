import React from 'react';

export interface ChemicalElement {
    atomicNumber: number;
    symbol: string;
    name: string;
    atomicMass: string;
    category: string;
    xpos: number;
    ypos: number;
    shells: number[];
    electronegativity_pauling: number | null;
}

export const periodicTableData: ChemicalElement[] = [
    { "atomicNumber": 1, "symbol": "H", "name": "Hidrogênio", "atomicMass": "1.008", "category": "diatomic nonmetal", "xpos": 1, "ypos": 1, "shells": [1], "electronegativity_pauling": 2.20 },
    { "atomicNumber": 2, "symbol": "He", "name": "Hélio", "atomicMass": "4.002602(2)", "category": "noble gas", "xpos": 18, "ypos": 1, "shells": [2], "electronegativity_pauling": null },
    { "atomicNumber": 3, "symbol": "Li", "name": "Lítio", "atomicMass": "6.94", "category": "alkali metal", "xpos": 1, "ypos": 2, "shells": [2, 1], "electronegativity_pauling": 0.98 },
    { "atomicNumber": 4, "symbol": "Be", "name": "Berílio", "atomicMass": "9.0121831(5)", "category": "alkaline earth metal", "xpos": 2, "ypos": 2, "shells": [2, 2], "electronegativity_pauling": 1.31 },
    { "atomicNumber": 5, "symbol": "B", "name": "Boro", "atomicMass": "10.81", "category": "metalloid", "xpos": 13, "ypos": 2, "shells": [2, 3], "electronegativity_pauling": 2.04 },
    { "atomicNumber": 6, "symbol": "C", "name": "Carbono", "atomicMass": "12.011", "category": "diatomic nonmetal", "xpos": 14, "ypos": 2, "shells": [2, 4], "electronegativity_pauling": 2.55 },
    { "atomicNumber": 7, "symbol": "N", "name": "Nitrogênio", "atomicMass": "14.007", "category": "diatomic nonmetal", "xpos": 15, "ypos": 2, "shells": [2, 5], "electronegativity_pauling": 3.04 },
    { "atomicNumber": 8, "symbol": "O", "name": "Oxigênio", "atomicMass": "15.999", "category": "diatomic nonmetal", "xpos": 16, "ypos": 2, "shells": [2, 6], "electronegativity_pauling": 3.44 },
    { "atomicNumber": 9, "symbol": "F", "name": "Flúor", "atomicMass": "18.998403163(6)", "category": "diatomic nonmetal", "xpos": 17, "ypos": 2, "shells": [2, 7], "electronegativity_pauling": 3.98 },
    { "atomicNumber": 10, "symbol": "Ne", "name": "Neônio", "atomicMass": "20.1797(6)", "category": "noble gas", "xpos": 18, "ypos": 2, "shells": [2, 8], "electronegativity_pauling": null },
    { "atomicNumber": 11, "symbol": "Na", "name": "Sódio", "atomicMass": "22.98976928(2)", "category": "alkali metal", "xpos": 1, "ypos": 3, "shells": [2, 8, 1], "electronegativity_pauling": 0.93 },
    { "atomicNumber": 12, "symbol": "Mg", "name": "Magnésio", "atomicMass": "24.305", "category": "alkaline earth metal", "xpos": 2, "ypos": 3, "shells": [2, 8, 2], "electronegativity_pauling": 1.31 },
    { "atomicNumber": 13, "symbol": "Al", "name": "Alumínio", "atomicMass": "26.9815385(7)", "category": "post-transition metal", "xpos": 13, "ypos": 3, "shells": [2, 8, 3], "electronegativity_pauling": 1.61 },
    { "atomicNumber": 14, "symbol": "Si", "name": "Silício", "atomicMass": "28.085", "category": "metalloid", "xpos": 14, "ypos": 3, "shells": [2, 8, 4], "electronegativity_pauling": 1.90 },
    { "atomicNumber": 15, "symbol": "P", "name": "Fósforo", "atomicMass": "30.97376200(1)", "category": "polyatomic nonmetal", "xpos": 15, "ypos": 3, "shells": [2, 8, 5], "electronegativity_pauling": 2.19 },
    { "atomicNumber": 16, "symbol": "S", "name": "Enxofre", "atomicMass": "32.06", "category": "polyatomic nonmetal", "xpos": 16, "ypos": 3, "shells": [2, 8, 6], "electronegativity_pauling": 2.58 },
    { "atomicNumber": 17, "symbol": "Cl", "name": "Cloro", "atomicMass": "35.45", "category": "diatomic nonmetal", "xpos": 17, "ypos": 3, "shells": [2, 8, 7], "electronegativity_pauling": 3.16 },
    { "atomicNumber": 18, "symbol": "Ar", "name": "Argônio", "atomicMass": "39.948(1)", "category": "noble gas", "xpos": 18, "ypos": 3, "shells": [2, 8, 8], "electronegativity_pauling": null },
];

export const categoryColors: Record<string, string> = {
    "diatomic nonmetal": "bg-green-500 hover:bg-green-600",
    "noble gas": "bg-purple-500 hover:bg-purple-600",
    "alkali metal": "bg-red-500 hover:bg-red-600",
    "alkaline earth metal": "bg-orange-500 hover:bg-orange-600",
    "metalloid": "bg-yellow-500 hover:bg-yellow-600",
    "polyatomic nonmetal": "bg-green-400 hover:bg-green-500",
    "post-transition metal": "bg-blue-400 hover:bg-blue-500",
    "transition metal": "bg-blue-500 hover:bg-blue-600",
    "lanthanide": "bg-indigo-400 hover:bg-indigo-500",
    "actinide": "bg-indigo-600 hover:bg-indigo-700",
    "unknown": "bg-gray-500 hover:bg-gray-600"
};

interface PeriodicTableProps {
    onSelectElement: (element: ChemicalElement | null) => void;
}

export const PeriodicTable: React.FC<PeriodicTableProps> = ({ onSelectElement }) => {
    return (
        <div className="p-4 bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-700 shadow-2xl max-w-full overflow-auto">
            <h4 className="text-center text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">
                Tabela Periódica Interativa
            </h4>
            <div className="grid grid-cols-18 gap-1 min-w-[500px]">
                {periodicTableData.map(el => (
                    <div
                        key={el.atomicNumber}
                        onMouseEnter={() => onSelectElement(el)}
                        onMouseLeave={() => onSelectElement(null)}
                        className={`w-7 h-9 md:w-8 md:h-10 flex flex-col items-center justify-center text-[10px] font-bold text-white rounded cursor-pointer transition-all duration-250 hover:scale-115 hover:z-10 hover:shadow-lg ${categoryColors[el.category] || 'bg-gray-500'}`}
                        style={{ gridColumn: el.xpos, gridRow: el.ypos }}
                    >
                        <div className="text-[7px] md:text-[8px] opacity-75">{el.atomicNumber}</div>
                        <div className="text-[11px] md:text-xs tracking-tighter">{el.symbol}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface ElementDetailModalProps {
    element: ChemicalElement | null;
}

export const ElementDetailModal: React.FC<ElementDetailModalProps> = ({ element }) => {
    if (!element) return null;
    return (
        <div className="fixed bottom-6 right-6 w-64 p-4 rounded-xl shadow-2xl z-50 bg-gray-900/95 backdrop-blur-md border border-teal-500/50 text-white animate-fade-in">
            <h3 className="text-lg font-bold text-teal-400 border-b border-gray-700 pb-1 flex items-center justify-between">
                <span>{element.name}</span>
                <span className="text-sm bg-gray-800 px-2 py-0.5 rounded text-gray-300">{element.symbol}</span>
            </h3>
            <div className="mt-2 space-y-1.5 text-xs text-gray-300">
                <p className="flex justify-between">
                    <span className="text-gray-400">Nº Atômico:</span>
                    <strong className="text-white">{element.atomicNumber}</strong>
                </p>
                <p className="flex justify-between">
                    <span className="text-gray-400">Massa Atômica:</span>
                    <strong className="text-white">{element.atomicMass}</strong>
                </p>
                <p className="flex justify-between">
                    <span className="text-gray-400">Eletronegatividade:</span>
                    <strong className="text-white">{element.electronegativity_pauling ?? 'N/A'}</strong>
                </p>
                <p className="flex justify-between">
                    <span className="text-gray-400">Camadas:</span>
                    <strong className="text-white">{element.shells.join(', ')}</strong>
                </p>
                <p className="flex flex-col gap-0.5">
                    <span className="text-gray-400">Categoria:</span>
                    <strong className="text-teal-300 capitalize">{element.category}</strong>
                </p>
            </div>
        </div>
    );
};
