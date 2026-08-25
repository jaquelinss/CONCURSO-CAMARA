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

---

## 🔧 Pendente — Interface e Organização

### Barra de Filtros e Ações (PostItsView / FlashcardsView)
- [ ] **Filtro por Tags** — Botões pill: "Todos", "Sem Tags" e cada tag existente (`subjectTag`)
- [ ] **Filtro por Subtags** — Quando uma tag está selecionada, exibir subtags (`subTag`) como sub-filtros
- [ ] **Seletor de Ordenação** — Dropdown "Mais recentes" / "Mais antigos"
- [ ] **Botão "Mostrar Últimos"** — Desarquivar os 3 últimos post-its/flashcards arquivados
- [ ] **Botão "Ocultar Todos"** — Arquivar todos os ativos (ou apenas os da tag selecionada)
- [ ] **Botão "Mostrar Todos"** — Desarquivar todos (ou apenas os da tag selecionada)
- [ ] **Eliminar acumulação de sombras** — Reduzir shadow dos cards no grid para `shadow-sm` evitando acúmulo visual

### NoteEditor (Modal de edição)
- [ ] **Subtag (subTag)** — Campo adicional "Assunto" além da Matéria existente
- [ ] **Tachado (strikeThrough)** — Adicionar botão na toolbar rich text
- [ ] **Alinhamento** — Botões Alinhar Esquerda e Centralizar na toolbar
- [ ] **Sugestão de Tags existentes** — Listar tags/subtags já usadas para seleção rápida com 1 clique
- [ ] **Botão Remover Tags** — Limpar subjectTag e subTag de uma nota
- [ ] **Histórico de Cores Salvas** — Salvar últimas 6 cores personalizadas no localStorage

### Cards no Grid (PostItsView)
- [ ] **Exibir subtag no card** — Mostrar `subTag` abaixo do título junto com `subjectTag`
- [ ] **Exibir número (#noteNumber)** — Mostrar numeração sequencial no rodapé do card
- [ ] **Renderização de Stickers** — Exibir adesivos (emojis) sobre os post-its se existirem

---

## 🔧 Pendente — Flashcards

### Compatibilidade de dados
- [ ] **Ler flashcards individuais de `users/{uid}/notes`** — Atualmente `FlashcardsView` lê de `users/{uid}/flashcards` (decks da IA). Precisa TAMBÉM exibir flashcards individuais da coleção `notes` com `isFlashcard: true`, que são os criados manualmente no app principal
- [ ] **Filtros por Tags nos Flashcards** — Mesmos filtros de tag do PostItsView

### Funcionalidades
- [ ] **Criação/Edição de Decks** — Formulário para adicionar novas cartas (Frente/Verso) a um baralho
- [ ] **Dúvida com IA no Modo Estudo** — Integração com Gemini para explicar o card atual
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
