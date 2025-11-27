import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

export const useServiceWorker = () => {
  useEffect(() => {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          console.info('Service worker registrado:', registration.scope);
        }
      },
      onRegisterError(error: unknown) {
        console.error('Falha ao registrar service worker:', error);
      },
    });
  }, []);
};
