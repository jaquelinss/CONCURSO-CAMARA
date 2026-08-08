# 📚 EduGenius — Plataforma de Estudos com IA

> Plataforma de estudos personalizada com IA (Gemini), focada na preparação para concursos públicos (especialmente o concurso da Câmara Municipal de Caruaru/PE) e ENEM. Combina geração de conteúdo por IA, banco de questões, revisão espaçada, ferramentas visuais e um sistema de gamificação completo.

---

## 🧭 Visão Geral

O EduGenius é uma SPA (Single-Page Application) em React que serve como "co-piloto" de estudos. O usuário configura a matéria, modelo e dificuldade, e a IA gera aulas explicativas ou quizzes personalizados. O app também conta com cronograma de revisões, banco de questões offline, ferramentas de estudo visuais (quadro branco, notas, PDF com anotações) e um sistema de pontos e figurinhas para gamificação.

---

## 🛠️ Stack Tecnológico

| Categoria | Tecnologia |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Estilização | Tailwind CSS v4 |
| Roteamento | React Router DOM v7 |
| IA | Google Gemini API (`@google/generative-ai`) |
| Backend / Auth | Firebase v12 (Firestore + Auth + Storage) |
| Storage alternativo | Supabase JS (para PDFs/documentos) |
| Gráficos | Recharts |
| PDF | pdfjs-dist, pdf-lib, jsPDF, html2canvas |
| ePub | epubjs |
| DOCX | mammoth |
| Desenho | perfect-freehand |
| Drag & Drop | react-draggable |
| Cache local | localforage |
| Ícones | lucide-react |
| Datas | date-fns (pt-BR) |

---

## 📁 Estrutura do Projeto

```
CONCURSO CAMARA/
├── web-app/                  # Aplicação principal (React/Vite)
│   ├── src/
│   │   ├── App.tsx           # Raiz da aplicação, rotas e providers globais
│   │   ├── pages/            # Telas principais (rotas)
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── contexts/         # Contexts globais (Auth, Reward, KnowledgeBase, etc.)
│   │   ├── hooks/            # Hooks customizados
│   │   ├── lib/              # Serviços, configurações e constantes
│   │   └── types/            # Tipagens TypeScript
│   ├── public/
│   │   ├── stickers/         # Figurinhas (1.png a 11.png)
│   │   └── data/
│   │       └── lei_organica_caruaru.txt  # Texto da Lei Orgânica (para IA)
│   ├── firebase.json
│   ├── firestore.rules
│   └── package.json
├── testes/                   # Materiais de referência, PDFs, arquivos de pesquisa
├── parse_questions.py        # Script para importar questões (raiz)
└── parsed_questions.json     # Banco de questões parseado
```

---

## 🔐 Autenticação e Configuração

- **Login:** Firebase Authentication via `Login.tsx`
- **Chave de API:** O usuário fornece sua própria chave da API do Google Gemini, salva no Firestore em `users/{uid}/settings/config`
- **Banca:** O usuário seleciona a banca do seu concurso (FGV, CESPE, CESGRANRIO, IBAM), que personaliza os tópicos e pesos das matérias
- **Admin:** Acesso especial para o e-mail admin — visualização de reportes de erros e painel da loja de figurinhas

---

## 🗺️ Rotas da Aplicação

| Rota | Componente | Descrição |
|---|---|---|
| `/login` | `Login.tsx` | Tela de autenticação |
| `/dashboard` | `Dashboard.tsx` | Geração de conteúdo (aulas + quizzes) |
| `/saved` | `SavedContent.tsx` | Meus salvamentos (aulas e quizzes salvos) |
| `/revisions` | `RevisionScreen.tsx` | Cronograma de revisões + plano de estudos |
| `/progress` | `StudyProgressScreen.tsx` | Checklist de progresso por matéria/tópico |
| `/statistics` | `StatisticsScreen.tsx` | Estatísticas das sessões de estudo (foco) |
| `/questions` | `QuestionsDatabase.tsx` | Banco de questões offline |
| `/config` | `ConfigScreen.tsx` | Configurações, API Key e painel admin |

---

## 🧠 Funcionalidades Principais

### 1. 🎓 Geração de Conteúdo (Dashboard)

O núcleo do app. O usuário configura:
- **Modo:** Concurso | ENEM | Geral
- **Matéria** (filtrada por modo)
- **Tópico / Subtópico** (árvore de tópicos por banca)
- **Modelo de geração:**
  - `Aula Explicativa` → exibe `LessonScreen` com conteúdo didático estruturado
  - `Técnica | Enem | FGV | Cespe | Ibam | Fanema | Fuvest | Flashcard` → exibe `QuizScreen`
- **Dificuldade:** Fácil | Médio | Difícil | Avançado
- **Nível da aula:** Introdutória | Intermediária | Aprofundada

**LessonScreen:** Renderiza aulas em seções com suporte a termos explicáveis (`[EXPLICACAO]`) e Lei Seca (`[LEI_SECA]`). Permite exportar PDF, zoom, salvar no Firebase e praticar com mini-quiz.

**QuizScreen:** Gera questões de múltipla escolha com gabarito, explicação e "lei seca". Suporte a flashcards flip, marcação de questões para revisão, progresso visual e barra de streak.

**Especial para Química:** Botão flutuante de tabela periódica interativa (`PeriodicTable.tsx`).

---

### 2. 💾 Meus Salvamentos (`/saved`)

- Lista as aulas (`lessons`) e quizzes (`quizzes`) salvos no Firestore
- Organização por **pastas** criadas pelo usuário
- Edição de título inline
- Comentários por item
- Agendamento de revisão (abre modal com data)
- Retomada direta (abre `LessonScreen` ou `QuizScreen` com o conteúdo salvo)
- Exclusão individual

---

### 3. 📅 Cronograma de Revisões (`/revisions`)

Dividido em 3 abas:

**Revisões:**
- Lista de revisões agendadas com status (pendente, atrasada, concluída)
- Sistema de espaçamento: ao concluir, a IA (`revision.service.ts`) sugere a próxima data (Fibonacci: 1→2→3→5→8→13 dias)
- Ao abrir uma revisão, pode escolher rever via aula, quiz ou YouTube
- Sugestão de vídeos via IA (`suggestVideoSearches` do Gemini)
- Integração com `LinkContentModal` para vincular aulas/quizzes salvos a uma revisão

**Plano de Estudos:**
- Wizard em 3 etapas (`StudyPlanWizard.tsx`):
  1. Fonte do conteúdo: arquivo `.docx/.pdf`, manual ou base de conhecimento em nuvem
  2. Configurações do cronograma (título, horas/dia, dias da semana, data da prova)
  3. Geração automática via IA (Gemini) que distribui os tópicos nos dias disponíveis
- Visualização do plano gerado (`StudyPlanView.tsx`) com tarefas diárias marcáveis
- Botão "Estudar Hoje" integrado (`TodayStudyButton`)

**Criação Manual de Revisões:**
- Campo de pesquisa por matéria/tópico
- Seleção de data

---

### 4. 📊 Progresso de Estudos (`/progress`)

- Checklist por matéria e tópico (baseado em `topicsBySubject` das constantes)
- Filtro por modo (Concurso / ENEM / Geral)
- Suporte a itens customizados adicionados pelo usuário
- Barra de progresso visual por tópico
- Geração de plano de estudos via IA com base no contexto fornecido
- Criação de novas matérias customizadas

---

### 5. 📈 Estatísticas (`/statistics`)

- Baseado nas sessões do timer de foco salvas no Firestore
- Filtro de período: Hoje | Esta Semana | Geral
- Gráfico de barras: horas estudadas por dia
- Gráfico de pizza: distribuição por matéria
- Cards de resumo: total de horas, dias com foco, matéria mais estudada, sequência de dias

---

### 6. 🗃️ Banco de Questões (`/questions`)

- Questões importadas via scripts Python e armazenadas em JSON no `public/`
- Navegação em sidebar por matéria → tópico → subtópico
- Filtro por categoria (Todos | Concurso | ENEM | Geral) e busca textual
- Status por questão: não respondida | correta | incorreta
- Ao responder, ganha pontos de esforço
- Chat tutor (`QuestionTutorChat`) para tirar dúvidas sobre a questão via IA
- Sugestão de YouTube integrada
- Organização em listas customizadas (`AddToListModal`)

---

### 7. 🤖 Chat com Professor IA (Flutuante)

**`AITeacherChat.tsx`** — Disponível em todas as páginas:
- Professores com personalidade única por matéria (ex: "Profa. Catapimbas" para Geografia, "Profa. Clarice" para Português, etc.)
- Histórico de conversas salvo no Firestore
- Suporte a **imagens** (upload de foto ou captura de câmera para tirar dúvidas visuais)
- Modo "Salvar como Post-it" (envia o conteúdo gerado para a nota adesiva)
- Integração com **Base de Conhecimento** (adiciona contexto dos materiais ativos)
- Historial de conversas passadas
- Bookmarks de mensagens

---

### 8. 📝 Notas Adesivas / Flashcards (`StickyNotesManager`)

- Notas post-it arrastáveis pela tela, sincronizadas no Firestore em tempo real
- Modo **Flashcard**: frente/verso com flip animado
- Cores customizáveis (amarelo, rosa, azul, verde, roxo)
- Tags automáticas por matéria via IA (`generateNoteTag`)
- Modo cascata (notas empilhadas)
- Arquivo de notas (sidebar deslizante)
- Histórico de versões por nota
- Suporte a **stickers** (figurinhas coladas nas notas)
- Atalho: `Ctrl+Shift+N` para criar nova nota

---

### 9. 🎨 Quadro Branco (`WhiteboardOverlay`)

- Overlay transparente sobre qualquer página
- Modos: Caneta livre | Marca-texto | Borracha (pixel ou stroke)
- Múltiplas páginas (caderno virtual)
- Presets de caneta, marca-texto e borracha customizáveis
- Undo/Redo
- Modo foco (fundo branco sólido para anotações)
- Suporte a stickers do sistema de recompensas na tela
- Persistência local via `localforage`
- Atalhos: `Ctrl+Shift+L` (transparente) | `Ctrl+Shift+C` (notebook)

---

### 10. 📄 Leitor de Documentos com Anotações (`PdfAnnotatorOverlay`)

- Leitura de **PDF**, **ePub** e **DOCX** com anotações salvas
- Modos de exibição: página única | modo livro (duas páginas) | scroll
- Ferramentas: caneta, marca-texto, borracha, stickers
- Zoom in/out e rotação
- Navegação por páginas
- Exportação do PDF anotado (com as marcações incorporadas)
- Sidebar de documentos salvos na nuvem (Supabase Storage)
- Laser de leitura integrado (`ReadingLaser`)
- Atalho: `Ctrl+Shift+P`

---

### 11. ⏱️ Timer de Foco (`FocusTimerWidget`)

- Modos: **Pomodoro** (trabalho + pausa) ou **Cronômetro livre**
- Configuração de minutos de trabalho e pausa
- Seleção de matéria e tópico para registrar a sessão
- Draggable (arrastável) e redimensionável (3 tamanhos via font-size)
- Minimizável
- Ao completar uma sessão, salva no Firestore (`focus.service.ts`) e concede pontos de esforço proporcionais ao tempo
- Temas visuais por matéria

---

### 12. ▶️ Player de YouTube Flutuante (`FloatingYouTubePlayer`)

- Player de vídeo do YouTube incorporado e arrastável
- Persiste em qualquer página enquanto navega
- Redimensionável (pequeno | médio | grande)
- Minimizável para um botão no canto

---

### 13. 🏆 Sistema de Recompensas

**Pontos de Esforço:**
- Ganhos por: responder quizzes, criar notas, concluir tarefas, tempo de foco, perguntar ao chat
- Cooldowns para evitar abuso (ex: 30s entre perguntas)
- Exibição flutuante de pontos ganhos
- Persistência no Firestore (`users/{uid}/settings/rewards`)

**Loja de Figurinhas (`RewardShop`):**
- Figurinhas padrão (11 disponíveis) compráveis com pontos
- **Packs** de figurinhas com preço promocional por item
- Geração de figurinhas via IA (admin) ou upload de imagem
- Remoção de fundo automática de imagens enviadas
- Inventário de figurinhas desbloqueadas
- "Stamper": ativa figurinha para carimbá-la em qualquer lugar da tela (`StamperOverlay`)
- Admin pode criar/editar/deletar figurinhas e packs

---

### 14. 🧩 Base de Conhecimento (`KnowledgeBaseManager`)

- Upload de materiais de estudo (TXT/PDF) para o Firebase Storage
- Ativação seletiva de materiais por sessão
- Conteúdo dos materiais ativos é injetado como contexto no chat IA e na geração de plano de estudos
- Gestão no modal `KnowledgeBaseManager`

---

### 15. 🛠️ Ferramentas Auxiliares

| Ferramenta | Descrição |
|---|---|
| `ReadingLaser` | Guia de leitura (linha horizontal animada que segue o scroll) |
| `TextSelectionPopover` | Ao selecionar texto, exibe opções: explicar com IA, criar nota, pesquisar no YouTube |
| `GlobalSplitScreenManager` | Divide a tela em dois painéis (conteúdo + ferramenta) |
| `DockableWrapper` | Wrapper que permite "dockar" conteúdo em painéis fixos |
| `SiteDecorator` | Decorações visuais de fundo (animações, partículas) |
| `NavigationTutorial` | Tutorial interativo para novos usuários |
| `ReportButton` | Botão flutuante para reportar bugs (salvo no Firestore) |
| `FocusPlayer` | Mini-player de música/sons para foco (dentro da Navigation) |

---

## 🔒 Segurança (Firestore Rules)

```
/users/{uid}/**         → somente o próprio usuário autenticado
/error_reports/**       → qualquer auth pode criar; só admin lê/edita
/question_reports/**    → qualquer auth pode criar; só admin lê/edita
/global_shop/**         → qualquer auth lê; só admin escreve
/user_materials/**      → somente o dono do material (por userId)
```

---

## 🌐 Contextos Globais (React Context API)

| Context | Responsabilidade |
|---|---|
| `AuthContext` | Usuário autenticado, apiKey Gemini, banca selecionada, isAdmin |
| `ThemeContext` | Tema claro/escuro (toggle persistido) |
| `RewardContext` | Pontos de esforço, stickers, stamper ativo, floating points |
| `KnowledgeBaseContext` | Materiais da base de conhecimento e contexto ativo |
| `CustomSubjectsContext` | Matérias customizadas criadas pelo usuário |

---

## 📐 Matérias e Modos

### Modo Concurso
Português, Raciocínio Lógico-Matemático, Matemática, Noções de Informática, Lei Orgânica de Caruaru, Legislação Específica, Administração Pública, Noções de Arquivologia, Noções de Direito Constitucional, Noções de Direito Administrativo

### Modo ENEM
Matemática, Redação, Biologia, Física, Química, História, Geografia, Filosofia, Sociologia, Português, Artes, Literatura, Inglês, Espanhol

### Bancas Suportadas
FGV | CESPE | CESGRANRIO | IBAM — cada banca tem pesos e tópicos prioritários diferentes por matéria

### Lei Orgânica de Caruaru
Texto completo carregado de `/public/data/lei_organica_caruaru.txt` e injetado como contexto no prompt da IA para matérias jurídicas.

---

## 🤖 Integração com Gemini AI (`lib/gemini.ts`)

Principais funções:

| Função | Descrição |
|---|---|
| `generateContentFromGemini` | Gera aulas explicativas (JSON estruturado) |
| `generateQuizFromGemini` | Gera quizzes com questões, opções e explicação |
| `generatePrompt` | Monta o prompt baseado nas configurações do usuário |
| `fetchLeiOrganicaText` | Carrega e cacheia o texto da Lei Orgânica |
| `generateStudyPlan` | Gera plano de estudos semanal via IA |
| `extractTopicsFromDoc` | Extrai tópicos de um documento (DOCX/PDF) via IA |
| `suggestVideoSearches` | Sugere buscas de vídeo no YouTube por matéria/tópico |
| `generateNoteTag` | Gera tag automática para uma nota adesiva |
| `formatTextToPostIt` | Formata uma resposta para ser colada como post-it |
| `safeJsonParse` | Parse seguro de JSON com backslashes (LaTeX) |

---

## 🚀 Rodando Localmente

```bash
# Instalar dependências
cd web-app
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

### Variáveis de Ambiente necessárias (`.env.local`)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 🗄️ Coleções Firestore

| Coleção | Dados |
|---|---|
| `users/{uid}/settings/config` | apiKey, selectedBanca, hasSeenWelcome |
| `users/{uid}/settings/rewards` | effortPoints, unlockedStickers |
| `users/{uid}/lessons` | Aulas salvas |
| `users/{uid}/quizzes` | Quizzes salvos |
| `users/{uid}/notes` | Notas adesivas / flashcards |
| `users/{uid}/revisions` | Revisões agendadas |
| `users/{uid}/studyPlans` | Planos de estudo |
| `users/{uid}/studyProgress/{mode}` | Progresso de checklist por matéria |
| `users/{uid}/focusSessions` | Sessões de timer de foco |
| `users/{uid}/chatHistories` | Histórico de chats com a IA |
| `users/{uid}/whiteboard` | Dados do quadro branco (por página) |
| `users/{uid}/annotations` | Anotações do leitor de PDF |
| `error_reports` | Reportes de bugs enviados pelos usuários |
| `question_reports` | Denúncias de questões incorretas |
| `global_shop` | Loja de figurinhas global (admin) |
| `user_materials` | Materiais da base de conhecimento |

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|---|---|
| `Ctrl+Shift+L` | Ativar/desativar quadro branco transparente |
| `Ctrl+Shift+C` | Ativar/desativar quadro branco (modo notebook) |
| `Ctrl+Shift+P` | Abrir/fechar arquivo de notas |
| `Ctrl+Shift+N` | Criar nova nota adesiva |

---

## 🐍 Scripts Python (Utilitários)

Scripts na raiz e em `web-app/` para importar e processar questões:

| Script | Descrição |
|---|---|
| `parse_questions.py` | Parseia questões de texto bruto para JSON |
| `parse_questions_v2.py` | Versão 2 do parser |
| `parse_admin_fcc.py` | Parser específico para questões FCC |
| `import_lei_organica.py` | Importa e processa a Lei Orgânica de Caruaru |
| `import_informatica.py` | Importa questões de Informática |
| `normalize_math_topics.py` | Normaliza tópicos de matemática no JSON |
| `merge_questions.py` | Mescla múltiplos arquivos de questões |
| `decode_fcc.py` | Decodifica questões no formato FCC |
| `fix.py` | Script de correção pontual de dados |
| `update-script.cjs` | Script de atualização de dados no Firestore |

---

## 📌 Status do Projeto

- ✅ MVP completo e funcional
- ✅ Deploy via Firebase Hosting
- ✅ Sistema de recompensas e gamificação
- ✅ Leitor de documentos (PDF, ePub, DOCX) com anotações
- ✅ Plano de estudos com IA
- ✅ Banco de questões offline
- ✅ Chat professor com personalidade por matéria
- ✅ Suporte a imagens no chat IA
- ✅ Base de conhecimento personalizável
- 🔄 Em evolução contínua

---

*Última atualização: Junho 2026*
