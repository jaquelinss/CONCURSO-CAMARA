import { Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';

export interface ConcursoData {
  id: string;
  title: string;
  shortName: string;
  examDate: string;
  banca: string;
  cargo: string;
  vacancies: { ampla: number; cotas: number; pcd: number; total: number };
  salary: string;
  jobDescription: string;
  examStructure: {
    objective: { total: number; subjects: { name: string; questions: number; weight?: number }[] };
    discursive?: { description: string; weight?: number };
    minScore: string;
  };
  importantDates: { label: string; date: string; icon: any; status: 'past' | 'current' | 'future' }[];
  registrationFee: string;
  registrationUrl?: string;
  themeColor: string;
}

export const concursosData: ConcursoData[] = [
  {
    id: 'auditor-fiscal-caruaru',
    title: 'Auditor Fiscal Municipal – Prefeitura de Caruaru',
    shortName: 'Auditor Fiscal',
    examDate: '2026-11-29T08:00:00-03:00',
    banca: 'IBAM',
    cargo: 'Auditor Fiscal Municipal',
    vacancies: { ampla: 7, cotas: 2, pcd: 1, total: 10 },
    salary: 'R$ 6.000,00 + GPF (podendo passar de R$ 9.000,00)',
    jobDescription: 'Planejar e executar a ação fiscal pertinente aos tributos municipais. Lavrar autos de infração e notificações. Examinar escrituração contábil e sistemas eletrônicos. Orientar contribuintes. Exercer poder de polícia administrativa.',
    examStructure: {
      objective: {
        total: 40,
        subjects: [
          { name: 'Conhecimentos Específicos', questions: 20, weight: 3.0 },
          { name: 'Língua Portuguesa', questions: 10, weight: 2.0 },
          { name: 'Raciocínio Lógico', questions: 5, weight: 1.0 },
          { name: 'Informática', questions: 5, weight: 1.0 }
        ]
      },
      discursive: { description: '1 questão técnica sobre Conhecimentos Específicos (25 a 30 linhas)', weight: 40.0 },
      minScore: 'Não zerar nenhuma disciplina e atingir mínimo exigido em todas (total mín. 46/90 na objetiva e 20/40 na discursiva)'
    },
    importantDates: [
      { label: 'Período de Inscrição', date: '10/08 a 08/10/2026', icon: FileText, status: 'current' },
      { label: 'Isenção de Taxa', date: '10/08 a 14/08/2026', icon: AlertCircle, status: 'current' },
      { label: 'Cartão de Confirmação', date: 'Novembro/2026', icon: Calendar, status: 'future' },
      { label: 'Aplicação das Provas', date: '29/11/2026', icon: CheckCircle, status: 'future' },
      { label: 'Gabarito Preliminar', date: '30/11/2026', icon: CheckCircle, status: 'future' }
    ],
    registrationFee: 'R$ 97,00',
    registrationUrl: 'https://www.ibam-concursos.org.br',
    themeColor: 'from-blue-600 to-indigo-700'
  },
  {
    id: 'assistente-ufpe',
    title: 'Assistente em Administração – UFPE',
    shortName: 'Assistente UFPE',
    examDate: '2027-01-17T08:00:00-03:00',
    banca: 'FADE/UFPE',
    cargo: 'Assistente em Administração',
    vacancies: { ampla: 35, cotas: 17, pcd: 3, total: 55 },
    salary: 'R$ 4.373,39 (Vencimento + Auxílio-Alimentação)',
    jobDescription: 'Executar serviços de apoio nas áreas de recursos humanos, administração, finanças e logística. Atender usuários. Tratar de documentos variados. Preparar relatórios e planilhas. Assessorar atividades de ensino, pesquisa e extensão.',
    examStructure: {
      objective: {
        total: 60,
        subjects: [
          { name: 'Conhecimentos Específicos', questions: 25, weight: 1.66 },
          { name: 'Língua Portuguesa', questions: 20, weight: 1.66 },
          { name: 'Legislação Aplicada', questions: 10, weight: 1.66 },
          { name: 'Raciocínio Lógico', questions: 5, weight: 1.66 }
        ]
      },
      discursive: { description: 'Produção de texto da esfera administrativa (15 a 20 linhas)', weight: 100.0 },
      minScore: 'Mínimo de 60,00 pontos na Prova Objetiva e 40,00 pontos na Prova Discursiva.'
    },
    importantDates: [
      { label: 'Período de Inscrição', date: '11/08 a 08/09/2026', icon: FileText, status: 'current' },
      { label: 'Isenção de Taxa', date: '11/08 a 17/08/2026', icon: AlertCircle, status: 'current' },
      { label: 'Pagamento da Taxa', date: 'até 09/09/2026', icon: Calendar, status: 'current' },
      { label: 'Cartão de Inscrição', date: '13/01 a 16/01/2027', icon: Calendar, status: 'future' },
      { label: 'Aplicação das Provas', date: '17/01/2027', icon: CheckCircle, status: 'future' },
      { label: 'Resultado Preliminar', date: '17/02/2027', icon: CheckCircle, status: 'future' },
      { label: 'Resultado Final', date: '23/04/2027', icon: CheckCircle, status: 'future' }
    ],
    registrationFee: 'R$ 120,00',
    registrationUrl: 'https://www.fadeconcursos.org.br/concursoufpe2026',
    themeColor: 'from-emerald-600 to-teal-700'
  }
];
