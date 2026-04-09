import toast from 'react-hot-toast';
import { Toast } from '../components/ui/Toast';

export const useToast = () => {
  const showSuccess = (message: string) => {
    toast.custom(
      (t) => (
        <Toast
          message={message}
          type="success"
          duration={3000}
          onClose={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: 3000,
        position: 'top-right',
      }
    );
  };

  const showError = (message: string) => {
    toast.custom(
      (t) => (
        <Toast
          message={message}
          type="error"
          duration={5000}
          onClose={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: 5000,
        position: 'top-right',
      }
    );
  };

  const showLoading = (message: string) => {
    return toast.custom(
      (t) => (
        <Toast
          message={message}
          type="loading"
          onClose={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: Infinity,
        position: 'top-right',
      }
    );
  };

  const showWarning = (message: string) => {
    toast.custom(
      (t) => (
        <Toast
          message={message}
          type="warning"
          duration={4000}
          onClose={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: 4000,
        position: 'top-right',
      }
    );
  };

  const showInfo = (message: string) => {
    toast.custom(
      (t) => (
        <Toast
          message={message}
          type="info"
          duration={3000}
          onClose={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: 3000,
        position: 'top-right',
      }
    );
  };

  const dismiss = (toastId: string) => {
    toast.dismiss(toastId);
  };

  const dismissAll = () => {
    toast.dismiss();
  };

  return {
    success: showSuccess,
    error: showError,
    loading: showLoading,
    warning: showWarning,
    info: showInfo,
    dismiss,
    dismissAll,
  };
};
