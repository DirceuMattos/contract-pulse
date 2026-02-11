import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface SimulationStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  maxVisited: number;
}

const steps = [
  { label: 'Identificação' },
  { label: 'Precificação' },
  { label: 'Complexidade' },
  { label: 'Recursos' },
  { label: 'Resultado' },
];

export function SimulationStepper({ currentStep, onStepClick, maxVisited }: SimulationStepperProps) {
  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const canClick = idx <= maxVisited;

        return (
          <div key={idx} className="flex items-center flex-1">
            <button
              onClick={() => canClick && onStepClick(idx)}
              disabled={!canClick}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full',
                isCurrent && 'bg-primary text-primary-foreground',
                isCompleted && !isCurrent && 'bg-primary/10 text-primary cursor-pointer',
                !isCompleted && !isCurrent && canClick && 'bg-muted text-muted-foreground cursor-pointer hover:bg-accent',
                !isCompleted && !isCurrent && !canClick && 'bg-muted text-muted-foreground/50 cursor-not-allowed',
              )}
            >
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                isCurrent && 'bg-primary-foreground text-primary',
                isCompleted && !isCurrent && 'bg-primary text-primary-foreground',
                !isCompleted && !isCurrent && 'bg-muted-foreground/20 text-muted-foreground',
              )}>
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </span>
              <span className="hidden sm:inline truncate">{step.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className={cn('h-px w-4 shrink-0 mx-1', isCompleted ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
