import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCustomSubjects } from '../contexts/CustomSubjectsContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useReward } from '../contexts/RewardContext';
import { formatTextToPostIt, fetchLeiOrganicaText } from '../lib/gemini';
import {
  GraduationCap,
  Send,
  X,
  Sparkles,
  History,
  Bookmark,
  Trash2,
  Loader2,
  Check,
  ChevronDown,
  BookOpen,
  FileEdit,
  ImagePlus,
  XCircle,
  Database,
  CheckCircle2
} from 'lucide-react';
import { subjectsConcurso, subjectsEnem, subjectsGeral } from '../lib/constants';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';

interface ChatMessage {
  sender: 'user' | 'teacher';
  text: string;
  timestamp: string;
  imageBase64?: string;
}

interface Teacher {
  name: string;
  emoji: string;
  avatarBg: string;
  subject: string;
  greeting: string;
  personality: string;
  placeholder: string;
}

const TEACHERS: Record<string, Teacher> = {
  'Geografia': {
    name: 'Professora Catapimbas',
    emoji: '👩‍🏫',
    avatarBg: 'from-green-400 to-teal-600',
    subject: 'Geografia',
    greeting: 'Olá, aventureiro(a) da Terra! Sou a Professora Catapimbas! 🌍 Prontinho(a) para desbravar rios, montanhas, climas e geopolítica? Pergunte-me qualquer coisa sobre Geografia e vamos descobrir juntos o quanto nosso planeta é incrível! Catapimbas, que matéria fantástica!',
    personality: 'entusiasmada, enérgica, usa expressões informais divertidas como "Catapimbas!", "Fantástico!" e "Extraordinário!", ama analogias sobre a natureza, relevos e mapas.',
    placeholder: 'Tire suas dúvidas de Geografia com a Profa. Catapimbas...'
  },
  'Língua Portuguesa': {
    name: 'Professora Clarice',
    emoji: '👩‍💻',
    avatarBg: 'from-pink-400 to-rose-600',
    subject: 'Língua Portuguesa',
    greeting: 'Seja muito bem-vindo(a) ao fascinante mundo da nossa Língua Portuguesa. 📚 Sou a Professora Clarice. Juntos, desvendaremos a beleza da gramática, a precisão da sintaxe e a força da concordância. Qual é a sua dúvida linguística hoje? Vamos lapidá-la como um belo texto.',
    personality: 'sofisticada, poética, atenta aos detalhes ortográficos, amorosa com as palavras, pedagógica e extremamente didática ao explicar regras complexas da língua.',
    placeholder: 'Escreva sua dúvida de Português...'
  },
  'Português': {
    name: 'Professora Clarice',
    emoji: '👩‍💻',
    avatarBg: 'from-pink-400 to-rose-600',
    subject: 'Português',
    greeting: 'Seja muito bem-vindo(a) ao fascinante mundo da nossa Língua Portuguesa. 📚 Sou a Professora Clarice. Juntos, desvendaremos a beleza da gramática, a precisão da sintaxe e a força da concordância. Qual é a sua dúvida linguística hoje? Vamos lapidá-la como um belo texto.',
    personality: 'sofisticada, poética, atenta aos detalhes ortográficos, amorosa com as palavras, pedagógica e extremamente didática ao explicar regras complexas da língua.',
    placeholder: 'Escreva sua dúvida de Português...'
  },
  'Interpretação Textual': {
    name: 'Professora Clarice',
    emoji: '👩‍💻',
    avatarBg: 'from-pink-400 to-rose-600',
    subject: 'Interpretação Textual',
    greeting: 'Olá! Ler é enxergar além das entrelinhas. 📖 Sou a Professora Clarice. Estou aqui para ajudar você a decifrar sentidos, compreender ideias implícitas e estruturar uma análise textual impecável. Qual texto ou conceito vamos desvendar agora?',
    personality: 'analítica, refinada, poética, foca em ensinar a interpretar conectivos, figuras de linguagem e as intenções do autor.',
    placeholder: 'Qual dúvida de interpretação vamos tirar hoje?...'
  },
  'Redação': {
    name: 'Professora Clarice',
    emoji: '✍️',
    avatarBg: 'from-red-400 to-rose-700',
    subject: 'Redação',
    greeting: 'Escrever é desenhar o pensamento. ✍️ Sou a Professora Clarice, sua tutora de redação. Vamos estruturar sua tese, articular argumentos sólidos e garantir conectivos de coesão perfeitos para alcançar aquela nota máxima! Qual tema ou dúvida estrutural vamos trabalhar hoje?',
    personality: 'exigente porém carinhosa, extremamente focada na estrutura do ENEM/concursos, dá dicas preciosas de operadores argumentativos e de intervenção social.',
    placeholder: 'Pergunte sobre introdução, desenvolvimento, proposta...'
  },
  'Matemática': {
    name: 'Professor Pitágoras',
    emoji: '👨‍🏫',
    avatarBg: 'from-blue-400 to-indigo-600',
    subject: 'Matemática',
    greeting: 'Saudações matemáticas! 📐 Aqui é o Professor Pitágoras. Na matemática, tudo é harmonia e lógica perfeita! Não tema as equações; elas são apenas quebra-cabeças esperando para serem resolvidos. Qual número, fórmula ou teorema vamos desvendar hoje?',
    personality: 'lógico, analítico, apaixonado por números, descomplica fórmulas matemáticas difíceis usando etapas passo a passo extremamente claras.',
    placeholder: 'Qual é a sua dúvida matemática?...'
  },
  'Raciocínio Lógico-Matemático': {
    name: 'Professor Pitágoras',
    emoji: '👨‍🎓',
    avatarBg: 'from-indigo-400 to-purple-600',
    subject: 'Raciocínio Lógico-Matemático',
    greeting: 'Seja bem-vindo(a) ao templo da lógica pura! 🧠 Professor Pitágoras na área. Vamos treinar seu cérebro para desmascarar proposições, silogismos e tabelas-verdade! Qual é o enigma lógico que está desafiando você hoje?',
    personality: 'dedutivo, estruturado, adora resolver desafios lógicos e ensinar técnicas rápidas de negações e equivalências para provas.',
    placeholder: 'Envie sua proposição ou dúvida lógica...'
  },
  'Noções de Informática': {
    name: 'Professor Turing',
    emoji: '👨‍💻',
    avatarBg: 'from-cyan-400 to-blue-600',
    subject: 'Noções de Informática',
    greeting: 'Hello, World! 💻 Sou o Professor Turing. Estou pronto para ajudar você a decodificar redes de computadores, segurança da informação, sistemas operacionais e planilhas! Vamos transformar bits e bytes em conhecimento para sua prova. Qual o comando de hoje?',
    personality: 'entusiasta de tecnologia, didático, focado em ensinar com precisão técnica e explicar comandos e atalhos de forma objetiva para provas.',
    placeholder: 'Qual dúvida de informática ou Excel você tem?...'
  },
  'Tecnologia e Sociedade': {
    name: 'Professor Turing',
    emoji: '🚀',
    avatarBg: 'from-sky-400 to-cyan-600',
    subject: 'Tecnologia e Sociedade',
    greeting: 'Olá! A tecnologia molda o nosso futuro todos os dias. 🌐 Sou o Professor Turing. Vamos analisar o impacto da internet, inteligência artificial e privacidade na sociedade moderna. O que vamos debater ou analisar hoje?',
    personality: 'futurista, reflexivo, atualizado sobre tendências tecnológicas e sociais, didático ao explicar o impacto das inovações.',
    placeholder: 'Dúvidas sobre o impacto da tecnologia?...'
  },
  'Noções de Direito Constitucional': {
    name: 'Professora Justina',
    emoji: '👩‍⚖️',
    avatarBg: 'from-amber-400 to-yellow-600',
    subject: 'Noções de Direito Constitucional',
    greeting: 'Saudações constitucionais! ⚖️ Sou a Professora Justina. A Constituição é a nossa Lei Maior! Vamos estudar direitos fundamentais, organização do Estado e poderes públicos de forma descomplicada e com foco total no seu edital. Qual artigo ou conceito vamos analisar?',
    personality: 'formal porém muito acessível, defensora de princípios jurídicos, cita artigos da CF/88 e explica através de exemplos reais do cotidiano estatal.',
    placeholder: 'Artigo 5º, Remédios Constitucionais? Pergunte à Profa. Justina...'
  },
  'Constituição Federal': {
    name: 'Professora Justina',
    emoji: '👩‍⚖️',
    avatarBg: 'from-amber-400 to-yellow-600',
    subject: 'Constituição Federal',
    greeting: 'Saudações constitucionais! ⚖️ Sou a Professora Justina. A Constituição é a nossa Lei Maior! Vamos estudar direitos fundamentais, organização do Estado e poderes públicos de forma descomplicada e com foco total no seu edital. Qual artigo ou conceito vamos analisar?',
    personality: 'formal porém muito acessível, defensora de princípios jurídicos, cita artigos da CF/88 e explica através de exemplos reais do cotidiano estatal.',
    placeholder: 'Artigo 5º, Remédios Constitucionais? Pergunte à Profa. Justina...'
  },
  'Noções de Direito Administrativo': {
    name: 'Professora Justina',
    emoji: '🏛️',
    avatarBg: 'from-yellow-500 to-amber-600',
    subject: 'Noções de Direito Administrativo',
    greeting: 'Olá! A Administração Pública obedece ao princípio da legalidade! 🏛️ Sou a Professora Justina. Vamos dominar os atos administrativos, licitações, poderes e agentes públicos! Como posso ajudar você a clarear o Direito Administrativo hoje?',
    personality: 'estruturada, focada no princípio do LIMPE, detalha conceitos teóricos com exemplos práticos da administração pública brasileira.',
    placeholder: 'Atos administrativos, poderes, licitações?...'
  },
  'Legislação Específica': {
    name: 'Professora Justina',
    emoji: '📜',
    avatarBg: 'from-amber-500 to-orange-600',
    subject: 'Legislação Específica',
    greeting: 'Saudações, futuro(a) servidor(a)! 📜 Sou a Professora Justina. Leis específicas exigem leitura atenta e memorização estratégica de prazos e regimentos. Qual estatuto, decreto ou lei municipal/estadual vamos decifrar hoje?',
    personality: 'meticulosa, incentiva o aluno a fazer anotações de prazos importantes, traduz a linguagem burocrática das leis específicas.',
    placeholder: 'Qual artigo ou estatuto específico vamos estudar hoje?...'
  },
  'Lei Orgânica de Caruaru': {
    name: 'Professora Justina',
    emoji: '🌆',
    avatarBg: 'from-amber-500 to-yellow-700',
    subject: 'Lei Orgânica de Caruaru',
    greeting: 'Olá! Orgulho do nosso município! 🌆 Sou a Professora Justina. A Lei Orgânica de Caruaru organiza nossa cidade! Vamos compreender a competência do município, a organização da Câmara e as atribuições do Prefeito. Qual a sua dúvida sobre nossa lei local?',
    personality: 'regionalista, focada na legislação caruaruense, explica com exemplos específicos da geografia e administração local.',
    placeholder: 'Competência do município, organização dos poderes?...'
  },
  'Administração Pública': {
    name: 'Professor Weber',
    emoji: '👨‍💼',
    avatarBg: 'from-emerald-400 to-teal-700',
    subject: 'Administração Pública',
    greeting: 'Saudações! A eficiência e o planejamento são as chaves da boa gestão! 👨‍💼 Aqui é o Professor Weber. Vamos compreender as teorias administrativas, a evolução da administração pública no Brasil (patrimonialista, burocrática, gerencial) e a gestão de processos. O que estudaremos hoje?',
    personality: 'planejador, organizado, foca em conceitos de gestão, governança e evolução histórica dos modelos administrativos com extrema clareza.',
    placeholder: 'Modelos de administração, governança, planejamento...'
  },
  'Noções de Arquivologia': {
    name: 'Professor Weber',
    emoji: '📂',
    avatarBg: 'from-orange-400 to-amber-600',
    subject: 'Noções de Arquivologia',
    greeting: 'Olá! Organização é a alma da Arquivologia! 📂 Sou o Professor Weber. Vamos estudar a teoria dos três idades dos documentos, métodos de arquivamento, preservação e gestão documental de forma simples e direta. Qual documento ou conceito vamos arquivar na mente hoje?',
    personality: 'metódico, sistemático, usa fluxogramas conceituais falados, ensina técnicas infalíveis de classificação e arquivamento.',
    placeholder: 'Teoria das três idades, métodos de arquivamento...'
  },
  'Biologia': {
    name: 'Professora Margarida',
    emoji: '🌱',
    avatarBg: 'from-green-400 to-emerald-600',
    subject: 'Biologia',
    greeting: 'Olá, amante da vida! 🌿 Sou a Professora Margarida! Da célula mais microscópica até os maiores ecossistemas, a Biologia é a ciência da vida em movimento! Qual mistério da natureza, fotossíntese, genética ou fisiologia vamos investigar hoje?',
    personality: 'direta, focada em explicações biológicas precisas, explica processos complexos com clareza e objetividade.',
    placeholder: 'Sua dúvida de citologia, ecologia, genética...'
  },
  'Física': {
    name: 'Professor Newton',
    emoji: '🍎',
    avatarBg: 'from-purple-500 to-indigo-700',
    subject: 'Física',
    greeting: 'Saudações! Toda ação gera uma reação de igual intensidade! 🍎 Sou o Professor Newton. A Física descreve as engrenagens ocultas do universo: movimento, forças, termodinâmica e eletricidade! Qual mistério mecânico ou eletromagnético vamos equacionar hoje?',
    personality: 'entusiasta da gravidade, fascinado pela ordem das leis naturais, explica fenômenos físicos relacionando com acontecimentos do cotidiano.',
    placeholder: 'Dúvidas de mecânica, cinemática, óptica, eletricidade?...'
  },
  'Química': {
    name: 'Professor Dalton',
    emoji: '🧪',
    avatarBg: 'from-teal-400 to-cyan-600',
    subject: 'Química',
    greeting: 'Olá! Sentindo a reação química no ar? 🧪 Sou o Professor Dalton. A matéria e suas infinitas transformações nos aguardam! Das ligações atômicas até as reações orgânicas, tudo no universo é Química! Qual átomo ou composto vamos analisar hoje?',
    personality: 'objetivo, metódico e muito claro ao explicar equações químicas, tabela periódica e ligações.',
    placeholder: 'Tabela periódica, ligações químicas, estequiometria?...'
  },
  'História': {
    name: 'Professor Heródoto',
    emoji: '🏛️',
    avatarBg: 'from-orange-500 to-red-600',
    subject: 'História',
    greeting: 'Saudações, viajante do tempo! ⏳ Sou o Professor Heródoto. A História é a grande narrativa da humanidade. Vamos mergulhar no Brasil Colônia, na Antiguidade Clássica ou nas Revoluções Modernas para entender quem somos hoje. Para onde vamos viajar agora?',
    personality: 'narrador de histórias carismático, apaixonado por intrigas históricas, revoluções e conexões socioculturais entre passado e presente.',
    placeholder: 'Dúvidas sobre história do Brasil, história geral...'
  },
  'Filosofia': {
    name: 'Professor Sócrates',
    emoji: '🗿',
    avatarBg: 'from-violet-400 to-purple-600',
    subject: 'Filosofia',
    greeting: 'Só sei que nada sei. 🗿 Sou o Professor Sócrates. A filosofia nos convida a questionar o óbvio e a examinar nossas próprias vidas. Qual conceito ético, epistemológico ou filósofo (de Platão a Kant) vamos questionar hoje?',
    personality: 'reflexivo, socrático (responde instigando com novas perguntas e reflexões), calmo e profundo, incentiva o pensamento crítico.',
    placeholder: 'O que é a justiça, ética, existencialismo?...'
  },
  'Sociologia': {
    name: 'Professor Sócrates',
    emoji: '👥',
    avatarBg: 'from-purple-500 to-indigo-600',
    subject: 'Sociologia',
    greeting: 'Olá! O indivíduo e a sociedade estão em constante diálogo. 👥 Sou o Professor Sócrates. Vamos desvendar as estruturas sociais, desigualdades, movimentos de massa e teorias sociológicas de Marx, Durkheim e Weber. O que vamos analisar sob a lupa sociológica hoje?',
    personality: 'sociológico, questionador do status quo, adora debater fatos sociais e instituições que organizam a vida humana.',
    placeholder: 'Indivíduo e sociedade, fatos sociais, movimentos sociais...'
  },
  'Artes': {
    name: 'Professora Tarsila',
    emoji: '🎨',
    avatarBg: 'from-pink-500 to-red-500',
    subject: 'Artes',
    greeting: 'Olá! Deixe as cores e as formas falarem! 🎨 Sou a Professora Tarsila. A Arte expressa o que as palavras sozinhas não alcançam. Vamos navegar pela arte moderna, renascentista, movimentos brasileiros ou história da arte. Qual expressão criativa vamos sentir hoje?',
    personality: 'expressiva, criativa, romântica sobre o fazer artístico, foca em sensibilidade, vanguarda e estética.',
    placeholder: 'Modernismo, Barroco, história da arte?...'
  },
  'Literatura': {
    name: 'Professora Tarsila',
    emoji: '📖',
    avatarBg: 'from-rose-500 to-pink-600',
    subject: 'Literatura',
    greeting: 'Olá, amante das belas letras! 📖 Sou a Professora Tarsila. A Literatura é a arte tecida em palavras. Vamos explorar as escolas literárias brasileiras, do Romantismo ao Modernismo, analisando poemas e prosas inesquecíveis. Qual autor ou obra vamos saborear hoje?',
    personality: 'sensível, apaixonada por poemas, adora contextualizar obras com o momento histórico de produção dos autores.',
    placeholder: 'Machado de Assis, Romantismo, Modernismo?...'
  },
  'Inglês': {
    name: 'Professora Babel',
    emoji: '🇬🇧',
    avatarBg: 'from-sky-500 to-indigo-600',
    subject: 'Inglês',
    greeting: 'Welcome! 🇬🇧 Sou a Professora Babel. O inglês abre portas para o mundo todo! Vamos trabalhar gramática, vocabulário, compreensão de textos e dicas práticas para sua prova. What is your question for today?',
    personality: 'polyglot, interativa, alterna pequenas palavras em inglês no texto de forma acolhedora, dá dicas de pronúncia teórica e falsos cognatos.',
    placeholder: 'Dúvidas de tempos verbais, pronomes, textos...'
  },
  'Espanhol': {
    name: 'Professora Babel',
    emoji: '🇪🇸',
    avatarBg: 'from-yellow-400 to-red-500',
    subject: 'Espanhol',
    greeting: '¡Hola! Bienvenidos a todos. 🇪🇸 Sou a Professora Babel. El español es un idioma rico y hermano del portugués. Vamos dominar os heterossemânticos (falsos amigos), gramática e interpretação de textos. ¿Qué duda tienes hoy?',
    personality: 'cálida, simpática, alerta contra portunhol, ensina vocabulários e estruturas verbais que costumam cair em provas.',
    placeholder: 'Falsos amigos, verbos, pronombres?...'
  },
  'Medicina': {
    name: 'Professor Dr. Drauzio',
    emoji: '👨‍⚕️',
    avatarBg: 'from-teal-500 to-green-600',
    subject: 'Medicina',
    greeting: 'Olá! A saúde e o corpo humano são a maior maravilha biológica. 👨‍⚕️ Aqui é o Professor Dr. Drauzio. Vamos discutir anatomia, fisiologia, saúde pública ou patologia com rigor científico e clareza. Qual é a sua dúvida médica ou fisiológica hoje?',
    personality: 'empático, sereno, baseado em dados científicos sólidos, explica de forma muito humanizada e descomplicada a biologia do corpo humano.',
    placeholder: 'Dúvidas de fisiologia, patologia, saúde pública...'
  },
  'Atualidades': {
    name: 'Professor Mercúrio',
    emoji: '📰',
    avatarBg: 'from-slate-500 to-gray-700',
    subject: 'Atualidades',
    greeting: 'Olá! Mantenha-se informado(a), pois o mundo gira rápido! 📰 Sou o Professor Mercúrio. Vamos analisar os principais acontecimentos geopolíticos, econômicos, ambientais e sociais do Brasil e do mundo recente. Qual evento global vamos desvendar hoje?',
    personality: 'jornalístico, rápido, neutro e altamente informativo, conecta notícias atuais com contextos geográficos e históricos.',
    placeholder: 'Pergunte sobre conflitos globais, economia, meio ambiente...'
  }
};

const DEFAULT_TEACHER: Teacher = {
  name: 'Professor Sabichão',
  emoji: '🧠',
  avatarBg: 'from-purple-500 to-pink-500',
  subject: 'Geral',
  greeting: 'Olá, caro(a) estudante! 🧠 Sou o Professor Sabichão, seu tutor multidisciplinar no EduGenius. Estou pronto para ajudar você em qualquer matéria com paciência, explicações estruturadas e muito incentivo. Do que precisamos falar hoje para garantir sua aprovação?',
  personality: 'paciente, multidisciplinar, extremamente claro, usa linguagem incentivadora e conselhos gerais de estudos.',
  placeholder: 'Tire qualquer dúvida de estudos com o Prof. Sabichão...'
};

export default function AITeacherChat({ isHidden = false }: { isHidden?: boolean }) {
  const { user, apiKey } = useAuth();
  const { awardPoints } = useReward();
  const [isGeneratingPostIt, setIsGeneratingPostIt] = useState<string | null>(null);
  
  // Knowledge Base State
  const { materials, activeMaterialIds, toggleMaterialActive, getContextText, isDownloadingContext, setShowManager } = useKnowledgeBase();
  const { customSubjects } = useCustomSubjects();

  const createPostItFromAI = async (text: string, msgId: string) => {
    if (!apiKey) {
      alert("Configure sua chave de API nas Configurações.");
      return;
    }
    setIsGeneratingPostIt(msgId);
    try {
      const { title, content } = await formatTextToPostIt(text, apiKey);
      const event = new CustomEvent('add-note', { detail: { title, content } });
      window.dispatchEvent(event);
    } catch (e) {
      console.error(e);
      alert("Erro ao criar post-it.");
    } finally {
      setIsGeneratingPostIt(null);
    }
  };
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'history'>('chat');
  const [activeSubject, setActiveSubject] = useState('Geral');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loadedChatId, setLoadedChatId] = useState<string | null>(null);
  const [savedChats, setSavedChats] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Combine and sort unique subjects from application constants and custom subjects
  const allSubjects = useMemo(() => {
    return [
      'Geral',
      ...Array.from(
        new Set([...subjectsConcurso, ...subjectsEnem, ...subjectsGeral, ...customSubjects.map(s => s.id)])
      ).filter(s => s !== 'Geral').sort((a, b) => a.localeCompare(b, 'pt-BR'))
    ];
  }, [customSubjects]);

  // Determine active teacher based on activeSubject
  const activeTeacher = useMemo(() => {
    return TEACHERS[activeSubject] || DEFAULT_TEACHER;
  }, [activeSubject]);

  // Initial trigger: load default greeting for default subject
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          sender: 'teacher',
          text: activeTeacher.greeting,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [activeSubject, activeTeacher]);

  // Scroll to bottom only when user sends a message or AI starts typing.
  // We avoid scrolling when AI finishes a message so the user can read from the top.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isFromUser = lastMessage?.sender === 'user';
    
    if (isTyping || isFromUser) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Fetch saved conversations when switching to history view
  useEffect(() => {
    if (viewMode === 'history' && user) {
      fetchSavedChats();
    }
  }, [viewMode, user]);

  const handleSubjectChange = (subject: string) => {
    const teacher = TEACHERS[subject] || DEFAULT_TEACHER;
    setActiveSubject(subject);
    setLoadedChatId(null);
    setSaveStatus('idle');
    setMessages([
      {
        sender: 'teacher',
        text: teacher.greeting,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const processImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setSelectedImage(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) processImage(blob);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'user',
          text: inputValue.trim(),
          timestamp: new Date().toISOString()
        },
        {
          sender: 'teacher',
          text: '⚠️ **Chave de API não configurada.**\n\nPor favor, insira sua chave de API do Gemini na tela de **Configurações** (ícone de engrenagem) para poder conversar com os professores em tempo real!',
          timestamp: new Date().toISOString()
        }
      ]);
      setInputValue('');
      return;
    }

    const userText = inputValue.trim();
    const imageToSend = selectedImage;
    setInputValue('');
    setSelectedImage(null);

    // Build context string from active materials
    let contextData = '';
    if (activeMaterialIds.size > 0 && !imageToSend) {
      contextData = await getContextText();
    }

    // Add user message to state
    const userMessage: ChatMessage = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };
    if (imageToSend) {
      userMessage.imageBase64 = imageToSend;
    }
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey!);
      
      let systemPrompt = `Você é ${activeTeacher.name}, atuando como um tutor especializado em ${activeTeacher.subject}.
Sua personalidade é: ${activeTeacher.personality}.
Diretrizes:
- Use emojis e o tom de voz da sua personalidade.
- Seja didático e encorajador.
- Responda de forma clara, usando markdown para destacar pontos importantes.
- NUNCA saia do personagem.`;

      if (contextData) {
        systemPrompt += `\n\nATENÇÃO: O ALUNO FORNECEU OS SEGUINTES MATERIAIS DE ESTUDO COMO BASE DE CONHECIMENTO.\nUse ESSES materiais como a principal fonte da verdade para responder. Se a resposta estiver no material, cite-a. Se a pergunta for sobre um assunto que não está no material, responda com seu conhecimento geral, mas sempre dando prioridade ao material fornecido:\n\n${contextData}`;
      }

      // Load Lei Orgânica text if the teacher subject is Lei Orgânica de Caruaru
      if (activeTeacher.subject === 'Lei Orgânica de Caruaru') {
        const leiText = await fetchLeiOrganicaText();
        if (leiText) {
          systemPrompt += `\n\nFONTE OFICIAL OBRIGATÓRIA — LEI ORGÂNICA DO MUNICÍPIO DE CARUARU (compilada até Dezembro de 2024):\nO texto abaixo é o texto OFICIAL e INTEGRAL da Lei Orgânica do Município de Caruaru. Use EXCLUSIVAMENTE este texto como base para responder dúvidas sobre a lei. NÃO invente artigos, incisos ou parágrafos que não existam neste texto. Se o aluno perguntar sobre um artigo específico, transcreva o texto EXATO conforme aparece abaixo.\n\n--- INÍCIO DO TEXTO OFICIAL ---\n${leiText}\n--- FIM DO TEXTO OFICIAL ---`;
        }
      }

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40
        }
      });

      const conversationHistoryPrompt = updatedMessages.slice(-10)
        .map((msg) => `${msg.sender === 'user' ? 'Aluno' : activeTeacher.name}: ${msg.text}`)
        .join('\n');

      const geminiSystemPrompt = `${systemPrompt}\n\nHistórico das últimas interações:\n${conversationHistoryPrompt}\n\nPor favor, responda à última dúvida ou comentário do Aluno, incorporando plenamente a sua personalidade${imageToSend ? ' e analisando a imagem enviada por ele' : ''}:\n${activeTeacher.name}:`;

      const parts: any[] = [{ text: geminiSystemPrompt }];
      if (imageToSend) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageToSend.split(',')[1]
          }
        });
      }

      let responseText = '';
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await model.generateContent(parts);
          responseText = result.response.text().trim();
          break;
        } catch (retryError: any) {
          const is503 = retryError?.message?.includes('503') || retryError?.status === 503;
          if (is503 && attempt < maxRetries - 1) {
            const delay = (attempt + 1) * 2000;
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw retryError;
        }
      }

      const teacherMessage: ChatMessage = {
        sender: 'teacher',
        text: responseText,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, teacherMessage]);
      setSaveStatus('idle');
      
      // Recompensa o esforço por perguntar
      awardPoints(5, 'ask_question');

      // Auto-criar post-it se o usuário pediu
      const postItKeywords = /post.?it|postit|cria.*nota|gera.*nota|anota.*pra\s*m|faz.*resumo.*post|cria.*resumo|faz.*post/i;
      if (postItKeywords.test(userText)) {
        try {
          setIsGeneratingPostIt('auto');
          const { title, content } = await formatTextToPostIt(responseText, apiKey);
          const event = new CustomEvent('add-note', { detail: { title, content } });
          window.dispatchEvent(event);
          setMessages((prev) => [...prev, {
            sender: 'teacher',
            text: '📌 **Post-it criado!** Dá uma olhada na sua tela — acabei de fixar um resumo pra você! 😉',
            timestamp: new Date().toISOString()
          }]);
        } catch (e) {
          console.error('Erro ao criar post-it automático:', e);
        } finally {
          setIsGeneratingPostIt(null);
        }
      }
    } catch (error: any) {
      console.error('Error generating tutor response:', error);
      const is503 = error?.message?.includes('503');
      const isNetwork = error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError');
      
      let friendlyMsg = '';
      if (is503) {
        friendlyMsg = `😅 **Opa, o servidor da IA está sobrecarregado agora!**\n\nIsso acontece quando muita gente está usando ao mesmo tempo. Já tentei novamente algumas vezes, mas não rolou.\n\n💡 **Tente enviar sua pergunta de novo em alguns segundos** — geralmente volta rápido!`;
      } else if (isNetwork) {
        friendlyMsg = `📡 **Parece que sua internet oscilou!**\n\nNão consegui me conectar ao servidor. Verifique sua conexão e tente novamente.`;
      } else {
        friendlyMsg = `😕 **Algo deu errado ao gerar a resposta.**\n\nPode ser uma instabilidade temporária. Tente enviar sua pergunta novamente.\n\nSe o problema continuar, verifique sua Chave API nas Configurações.`;
      }
      
      setMessages((prev) => [
        ...prev,
        {
          sender: 'teacher',
          text: friendlyMsg,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Cloud Database: Save conversation
  const handleSaveConversation = async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      // Strip out any accidental undefined values recursively, just to be safe
      const cleanMessages = JSON.parse(JSON.stringify(messages));
      
      const chatsRef = collection(db, 'users', user.uid, 'savedTeacherChats');
      const docData = {
        subject: activeSubject,
        teacherName: activeTeacher.name,
        updatedAt: new Date().toISOString(),
        messages: cleanMessages
      };

      if (loadedChatId) {
        await setDoc(doc(db, 'users', user.uid, 'savedTeacherChats', loadedChatId), docData);
      } else {
        const docRef = await addDoc(chatsRef, docData);
        setLoadedChatId(docRef.id);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving conversation:', err);
      setSaveStatus('idle');
    }
  };

  // Cloud Database: Fetch past conversations
  const fetchSavedChats = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'savedTeacherChats'),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSavedChats(list);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Cloud Database: Load conversation
  const handleLoadSavedChat = (chat: any) => {
    setActiveSubject(chat.subject);
    setMessages(chat.messages || []);
    setLoadedChatId(chat.id);
    setSaveStatus('idle');
    setViewMode('chat');
  };

  // Cloud Database: Delete conversation
  const handleDeleteSavedChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!confirm('Deseja realmente excluir esta conversa salva?')) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savedTeacherChats', chatId));
      if (loadedChatId === chatId) {
        setLoadedChatId(null);
      }
      setSavedChats((prev) => prev.filter((chat) => chat.id !== chatId));
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  // Helper to format timestamps
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Helper to parse markdown-like bold/italic in messages
  const renderMessageText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const parsedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-extrabold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <span key={idx} className="block min-h-[0.5rem]">
          {parsedLine}
        </span>
      );
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-[10.5rem] bottom-6 z-[10005] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 bg-gradient-to-tr from-purple-500 via-indigo-500 to-indigo-600 text-white border border-indigo-400/20 group hover:shadow-purple-500/30 ${isHidden ? 'opacity-0 translate-x-12 pointer-events-none' : 'opacity-100 translate-x-0'}`}
        title="Tirar dúvida com IA"
      >
        <div className="relative">
          <GraduationCap className="w-7 h-7 text-white animate-pulse" />
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 absolute -top-1 -right-1.5 animate-bounce" />
        </div>
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-gray-800">
          Dúvidas com IA
        </span>
      </button>

      {isOpen && (
        <div className="fixed right-4 bottom-[5.5rem] z-[10004] w-[380px] max-w-[calc(100vw-2rem)] h-[550px] max-h-[80vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-6 zoom-in-95 origin-bottom-right">
          
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-800 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${activeTeacher.avatarBg} flex items-center justify-center shadow-md text-xl animate-wiggle border border-white/20`}>
                  {activeTeacher.emoji}
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5 text-white">
                    {activeTeacher.name}
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  </h4>
                  <p className="text-[10px] text-indigo-100 font-medium tracking-wide">
                    Tutor de {activeTeacher.subject}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewMode === 'chat' && user && (
                  <button
                    onClick={handleSaveConversation}
                    disabled={saveStatus === 'saving'}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white disabled:opacity-50 relative group/btn"
                    title="Salvar conversa em nuvem"
                  >
                    {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saveStatus === 'saved' && <Check className="w-4 h-4 text-green-300" />}
                    {saveStatus === 'idle' && <Bookmark className="w-4 h-4" />}
                  </button>
                )}

                {user && (
                  <button
                    onClick={() => setViewMode(viewMode === 'chat' ? 'history' : 'chat')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'history' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white'
                    } group/btn`}
                    title="Histórico de conversas salvas"
                  >
                    <History className="w-4 h-4" />
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowManager(true)}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-1.5"
                    title="Gerenciar Base de Conhecimento (PDFs)"
                  >
                    <Database className="w-4 h-4" />
                    {materials.length > 0 && (
                      <span className="text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                        {materials.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'chat' && (
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-[10px] text-indigo-100 font-bold uppercase tracking-wider whitespace-nowrap">
                  Estudando:
                </span>
                <div className="relative flex-grow max-w-[240px]">
                  <select
                    value={activeSubject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full bg-white/15 dark:bg-black/20 text-white border border-white/25 dark:border-gray-800 rounded-lg py-1 px-2.5 pr-8 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-300 cursor-pointer appearance-none shadow-sm transition-all"
                  >
                    {allSubjects.map((subject) => (
                      <option
                        key={subject}
                        value={subject}
                        className="text-gray-900 dark:text-gray-100 dark:bg-gray-900 font-semibold"
                      >
                        {subject}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-white/80 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {viewMode === 'chat' && (
            <>
              {activeMaterialIds.size > 0 && (
                <div className="flex items-center gap-1 text-[10px] px-4 py-1 bg-indigo-50 text-indigo-700 border-b border-indigo-100" title={`${activeMaterialIds.size} material(is) ativado(s)`}>
                    <Database className="w-3 h-3" />
                    <span>Usando Base: {activeMaterialIds.size} material(is)</span>
                </div>
              )}
              <div
                ref={chatContainerRef}
                className="flex-grow overflow-y-auto p-4 space-y-3.5 bg-gray-50/50 dark:bg-gray-950/20"
              >
                {messages.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] ${
                        isUser ? 'ml-auto' : 'mr-auto'
                      }`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm border transition-all ${
                          isUser
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-500 rounded-tr-none'
                            : 'bg-white dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 border-gray-200/60 dark:border-gray-850 rounded-tl-none'
                        }`}
                      >
                        {msg.imageBase64 && (
                          <div className="mb-2">
                            <img src={msg.imageBase64} alt="Upload do usuário" className="max-w-full rounded-lg max-h-48 object-contain" />
                          </div>
                        )}
                        {renderMessageText(msg.text)}
                      </div>
                      <div className="flex gap-3 items-center mt-1 px-1">
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold">
                          {formatTime(msg.timestamp)}
                        </span>
                        {!isUser && (
                          <button 
                            onClick={() => createPostItFromAI(msg.text, idx.toString())}
                            disabled={isGeneratingPostIt === idx.toString()}
                            className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 font-bold transition-colors disabled:opacity-50"
                            title="Transformar esta resposta em um Post-it resumido"
                          >
                            {isGeneratingPostIt === idx.toString() ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <FileEdit className="w-3 h-3" />
                            )}
                            Criar Post-it
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex flex-col items-start mr-auto max-w-[85%]">
                    <div className="p-3 bg-white dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 border border-gray-200/60 dark:border-gray-850 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce delay-100" />
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-200" />
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-300" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {materials.length > 0 && (
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Consultar:</span>
                  {materials.map(mat => {
                    const isActive = activeMaterialIds.has(mat.id);
                    return (
                      <button
                        key={mat.id}
                        onClick={() => toggleMaterialActive(mat.id)}
                        className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded-full transition-colors border ${
                          isActive 
                            ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300' 
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                      >
                        {isActive && <CheckCircle2 className="w-3 h-3" />}
                        <span className="truncate max-w-[120px]">{mat.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
                {isDownloadingContext && (
                  <div className="flex items-center justify-center gap-2 mb-2 py-1">
                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                    <span className="text-xs text-blue-500 font-medium animate-pulse">Lendo materiais selecionados...</span>
                  </div>
                )}
                {selectedImage && (
                  <div className="relative inline-block self-start mb-1">
                    <img src={selectedImage} alt="Preview" className="h-16 rounded-md object-cover border border-gray-200 dark:border-gray-700" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-white rounded-full text-red-500 shadow-sm hover:text-red-600"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                )}
                
                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-2 items-center w-full"
                >
                  <label className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-colors" title="Enviar imagem">
                    <ImagePlus className="w-5 h-5" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processImage(file);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={activeTeacher.placeholder}
                    disabled={isTyping}
                    className="flex-grow bg-gray-50 dark:bg-gray-800/60 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 dark:focus:ring-indigo-500 disabled:opacity-60 transition-all font-medium"
                  />
                  <button
                    type="submit"
                    disabled={(!inputValue.trim() && !selectedImage) || isTyping}
                    className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}

          {viewMode === 'history' && (
            <div className="flex-grow flex flex-col bg-gray-50/50 dark:bg-gray-950/20 overflow-y-auto">
              <div className="p-3 border-b border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900/60 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-purple-500" />
                  Minhas Conversas Salvas
                </span>
                <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {savedChats.length} conversas
                </span>
              </div>

              {isLoadingHistory ? (
                <div className="flex-grow flex items-center justify-center flex-col gap-2 text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
                  <span className="text-xs font-medium">Carregando histórico em nuvem...</span>
                </div>
              ) : savedChats.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <BookOpen className="w-10 h-10 mb-2.5 opacity-30 text-purple-500" />
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Nenhuma conversa salva ainda.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[240px]">
                    Converse com um professor de IA e clique no botão de **marcador** no topo para salvar sua conversa!
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2.5 flex-grow overflow-y-auto">
                  {savedChats.map((chat) => {
                    const t = TEACHERS[chat.subject] || DEFAULT_TEACHER;
                    const date = chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString('pt-BR') : '';
                    const lastMsg = chat.messages?.[chat.messages.length - 1]?.text || '';
                    
                    return (
                      <div
                        key={chat.id}
                        onClick={() => handleLoadSavedChat(chat)}
                        className="p-3 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-850 rounded-xl hover:shadow-md hover:border-purple-300 dark:hover:border-indigo-800 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${t.avatarBg} flex items-center justify-center shadow-sm text-base`}>
                            {t.emoji}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-snug">
                              {chat.subject}
                            </h5>
                            <p className="text-[10px] text-purple-600 dark:text-indigo-400 font-semibold">
                              {t.name}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5 max-w-[200px]">
                              {lastMsg}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold whitespace-nowrap bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-800">
                            {date}
                          </span>
                          <button
                            onClick={(e) => handleDeleteSavedChat(chat.id, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all"
                            title="Deletar conversa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
