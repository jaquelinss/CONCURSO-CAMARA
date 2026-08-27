# Plano de Implementação — Paridade Mini App × App Principal

## ✅ Concluído
- [x] Login e autenticação com Firebase
- [x] Listagem de Post-its em Grid
- [x] NoteEditor com rich text (B/I/U/Lista)
- [x] Flashcards Individuais (isFlashcard, edição do Verso, flip 3D)
- [x] Cores Aleatórias (Pastel/Vibrante/Neon) e Conta-gotas (EyeDropper API)
- [x] Modo Estudo (FlashcardStudy.tsx) - flip 3D, navegação, contagem de progresso
- [x] Modo Cascata toggle (grava booleano no Firestore)
- [x] Campo subjectTag no NoteEditor
- [x] PWA com Service Worker e manifest
- [x] Banner de instalação PWA (beforeinstallprompt)
- [x] Aviso ao desarquivar (afeta app principal)
- [x] **Filtro por Tags** — Botões pill: "Todos", "Sem Tags" e cada tag (subjectTag)
- [x] **Filtro por Subtags** — Sub-filtros (subTag) quando uma tag está selecionada
- [x] **Seletor de Ordenação** — Dropdown "Mais recentes" / "Mais antigos"
- [x] **Botão "Mostrar Últimos"** — Reabrir os 3 últimos arquivados
- [x] **Botão "Ocultar Todos"** — Arquivar todos ativos (ou da tag selecionada)
- [x] **Botão "Mostrar Todos"** — Desarquivar todos (ou da tag selecionada)
- [x] **Sombras reduzidas** — boxShadow leve nos cards para evitar acúmulo visual
- [x] **SubTag no NoteEditor** — Campo "Assunto" ao lado da "Matéria"
- [x] **Tachado (strikeThrough)** — Botão na toolbar rich text
- [x] **Alinhamento** — Botões Alinhar Esquerda e Centralizar na toolbar
- [x] **Sugestão de Tags existentes** — Painel com tags/subtags para seleção rápida
- [x] **Botão Remover Tags** — Limpar subjectTag e subTag
- [x] **Exibir tags no card** — subjectTag e subTag visíveis no grid
- [x] **Exibir #noteNumber** — Numeração no rodapé do card
- [x] **Contagem de post-its** — Exibir total filtrado

---

## 🔧 Pendente — Interface e Organização

### NoteEditor
- [ ] **Histórico de Cores Salvas** — Salvar últimas 6 cores no localStorage

### Cards no Grid
- [ ] **Renderização de Stickers** — Exibir adesivos (emojis) sobre os post-its se existirem

---

## 🔧 Pendente — Flashcards

### Compatibilidade de dados
- [ ] **Ler flashcards individuais de `users/{uid}/notes`** — Também exibir flashcards da coleção `notes` com `isFlashcard: true` (criados no app principal)
- [ ] **Filtros por Tags nos Flashcards** — Mesmos filtros do PostItsView

### Funcionalidades
- [ ] **Criação/Edição de Decks** — Formulário para adicionar novas cartas (Frente/Verso)
- [ ] **Dúvida com IA no Modo Estudo** — Integração com Gemini para explicar o card
- [ ] **Exportar PDF** — Gerar PDF com flashcards para impressão

---

## ❌ Fora de Escopo (funcionalidades do canvas que não se aplicam ao mini app)
- Canvas flutuante em tela cheia (draggable livre)
- Redimensionamento livre de post-its
- Gerenciamento de camadas (zIndex, bringToFront, sendToBack)
- Minimização de notas (barra de 32px)
- Modo Cascata visual com empilhamento/arrasto sincronizado
- Arrastar da sidebar para a tela
- Auto-tagging por IA em background
- Sistema de recompensas/gamificação
- Eventos globais (add-note, toggle-archive, etc.)
