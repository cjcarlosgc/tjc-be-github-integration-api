import type { LoggerService } from '@nestjs/common';
import { errorName } from './process-safety.js';

type TimerHandle = { unref?: () => unknown };

export interface GracefulShutdownOptions {
  /** Cierre ordenado de la aplicación (p. ej. `app.close()`). */
  close: () => Promise<void>;
  /** Salida del proceso; se invoca una sola vez. */
  exit: (code: number) => void;
  /** Tope de tiempo del cierre ordenado en milisegundos. */
  timeoutMs: number;
  logger: Pick<LoggerService, 'error'>;
  setTimer?: (callback: () => void, ms: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
}

/**
 * Crea el cierre ordenado con tope de tiempo (SDD 3.1, estabilización).
 * Si `close()` termina a tiempo sale con `exitCode`; si vence el tope o `close()` falla, sale con `exitCode`
 * o con 1 cuando `exitCode` era 0. Los logs nunca incluyen mensajes ni stacks. Llamadas repetidas comparten
 * la primera ejecución: `exit` se llama una sola vez y el temporizador se limpia.
 */
export function createShutdown(options: GracefulShutdownOptions): (exitCode: number) => Promise<void> {
  const {
    close,
    exit,
    timeoutMs,
    logger,
    setTimer = (callback, ms) => setTimeout(callback, ms),
    clearTimer = (handle) => clearTimeout(handle as NodeJS.Timeout),
  } = options;
  let running: Promise<void> | undefined;

  const run = async (exitCode: number): Promise<void> => {
    const failureCode = exitCode === 0 ? 1 : exitCode;
    let resolveTimeout: (outcome: 'timeout') => void = () => undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      resolveTimeout = resolve;
    });
    const timer = setTimer(() => resolveTimeout('timeout'), timeoutMs);
    timer.unref?.();
    const closing = (async (): Promise<'closed'> => {
      await close();
      return 'closed';
    })();

    let code = exitCode;
    try {
      const outcome = await Promise.race([closing, timeout]);
      if (outcome === 'timeout') {
        logger.error(`Cierre ordenado excedió ${timeoutMs} ms; el proceso sale sin esperar.`);
        code = failureCode;
      }
    } catch (error) {
      logger.error(`Error durante el cierre ordenado: ${errorName(error)}`);
      code = failureCode;
    } finally {
      clearTimer(timer);
    }
    exit(code);
  };

  return (exitCode: number) => {
    running ??= run(exitCode);
    return running;
  };
}

/**
 * Registra SIGTERM y SIGINT para que ejecuten el cierre ordenado con código 0 (con tope de tiempo).
 * Devuelve una función que quita los manejadores (para pruebas).
 */
export function registerSignalShutdown(
  proc: Pick<NodeJS.Process, 'once' | 'off'>,
  shutdown: (exitCode: number) => unknown,
): () => void {
  const onSignal = (): void => {
    void shutdown(0);
  };
  proc.once('SIGTERM', onSignal);
  proc.once('SIGINT', onSignal);
  return () => {
    proc.off('SIGTERM', onSignal);
    proc.off('SIGINT', onSignal);
  };
}
