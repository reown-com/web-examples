import { toast, ToastOptions } from "react-toastify";

const defaultOptions: ToastOptions = {
  position: "bottom-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark",
};

export function useCustomToast() {
  function showToast(message: string, options: ToastOptions = {}) {
    toast(message, { ...defaultOptions, ...options });
  }

  return showToast;
}
