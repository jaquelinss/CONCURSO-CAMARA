import { addDays, startOfDay } from 'date-fns';

export interface RevisionDateSuggestion {
  date: Date;
  label: string;
}

/**
 * Padrão de Revisão Espaçada (Spaced Repetition)
 * Ciclo: 1 dia, 7 dias, 30 dias, 90 dias
 */
const DEFAULT_CYCLE = [1, 7, 30, 90];

export const getRevisionSuggestions = (lastPerformance?: number, currentStep: number = 0): RevisionDateSuggestion[] => {
  const today = startOfDay(new Date());
  
  // Próximo intervalo padrão baseado no degrau atual do ciclo
  let daysToAdd = DEFAULT_CYCLE[currentStep] || 90;

  // Se o desempenho for menor que 100%, antecipamos a revisão
  if (lastPerformance !== undefined && lastPerformance < 100) {
    // Reduz o intervalo proporcionalmente ao erro. 
    // Ex: Se errou tudo (0%), antecipa em 80%. Se errou pouco (90%), antecipa em 10%.
    const penaltyFactor = (100 - lastPerformance) / 100;
    const reduction = Math.floor(daysToAdd * 0.8 * penaltyFactor);
    daysToAdd = Math.max(1, daysToAdd - reduction);
  }

  return [
    {
      date: addDays(today, daysToAdd),
      label: lastPerformance !== undefined && lastPerformance < 100 
        ? `Sugerido pela IA (Antecipado por desempenho: ${lastPerformance}%)` 
        : `Sugerido pela IA (Ciclo padrão de ${daysToAdd} dias)`
    }
  ];
};

export const calculateNextStep = (performance: number, currentStep: number): number => {
  if (performance === 100) return currentStep + 1;
  // Se errou muito, pode resetar ou manter no mesmo degrau
  if (performance < 50) return Math.max(0, currentStep - 1);
  return currentStep;
};
