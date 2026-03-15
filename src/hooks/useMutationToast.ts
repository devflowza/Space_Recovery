import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useToast } from './useToast';

interface MutationToastOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'onSuccess' | 'onError'> {
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export const useMutationToast = <TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: MutationToastOptions<TData, TError, TVariables, TContext>
) => {
  const toast = useToast();
  const {
    successMessage = 'Operation completed successfully',
    errorMessage,
    loadingMessage,
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
    ...mutationOptions
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    onMutate: async (variables) => {
      let toastId: string | undefined;

      if (loadingMessage) {
        toastId = toast.loading(loadingMessage);
      }

      const context = mutationOptions.onMutate
        ? await mutationOptions.onMutate(variables)
        : undefined;

      return { ...context, toastId } as TContext;
    },
    onSuccess: async (data, variables, context) => {
      const ctx = context as any;
      if (ctx?.toastId) {
        toast.dismiss(ctx.toastId);
      }

      if (showSuccessToast) {
        toast.success(successMessage);
      }

      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      const ctx = context as any;
      if (ctx?.toastId) {
        toast.dismiss(ctx.toastId);
      }

      if (showErrorToast) {
        const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
        toast.error(message);
      }

      if (onError) {
        onError(error, variables, context);
      }
    },
  });
};
