export interface Notebook {
  id: string;
  name: string;
  coverColor: string; // hex code
  coverPattern: 'solid' | 'polka-dots' | 'stripes' | 'grid' | 'stars';
  createdAt: number;
  updatedAt: number;
  totalPages: number;
}

export interface NotebookPage {
  id: string; // e.g. "page_1"
  pageNumber: number;
  background: 'transparent' | 'lined' | 'grid' | 'dotted';
  strokes: string; // JSON string of strokes to avoid huge arrays in Firestore
  updatedAt: number;
}
