import { FieldErrors } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';

/**
 * Shared onInvalid handler for react-hook-form.
 * Shows a destructive toast and scrolls to the first field with an error.
 */
export function handleFormValidationError(errors: FieldErrors) {
  toast({
    title: 'Campos obrigatórios',
    description: 'Preencha todos os campos obrigatórios destacados em vermelho.',
    variant: 'destructive',
  });

  // Try to scroll to the first error field
  const firstErrorKey = Object.keys(errors)[0];
  if (!firstErrorKey) return;

  // Try by name attribute, then by id pattern used by shadcn FormItem
  setTimeout(() => {
    const el =
      document.querySelector(`[name="${firstErrorKey}"]`) ||
      document.querySelector(`[id*="${firstErrorKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}
