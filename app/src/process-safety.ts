import type { LoggerService } from '@nestjs/common';

type ShutdownFn = (exitCode: number) => void | Promise<void>;

/**
 * Red de seguridad de proceso (SDD 3.1, estabilización).
 * - `unhandledRejection`: se registra y el proceso sigue vivo. Una promesa suelta de una tarea secundaria no debe
 *   tumbar trabajos en curso; los fallos de infraestructura del poller se capturan en su origen.
 * - `uncaughtException`: el estado del proceso es incierto, así que se registra y se apaga de forma ordenada con
 *   código 1 para que la plataforma lo reinicie.
 * Los logs solo describen el tipo del fallo (nombre o `code` corto), nunca su mensaje ni su stack.
 * Devuelve una función que quita los manejadores (para pruebas).
 */
export function registerProcessSafetyNets(
  logger: Pick<LoggerService, 'error'>,
  shutdown: ShutdownFn,
  proc: Pick<NodeJS.Process, 'on' | 'off'> = process,
): () => void {
  const onRejection = (reason: unknown): void => {
    logger.error(`Promesa rechazada sin manejar: ${describe(reason)}`);
  };
  let shuttingDown = false;
  const onException = (error: Error): void => {
    logger.error(`Excepción no capturada: ${describe(error)}`);
    if (shuttingDown) return;
    shuttingDown = true;
    void Promise.resolve(shutdown(1));
  };
  proc.on('unhandledRejection', onRejection);
  proc.on('uncaughtException', onException);
  return () => {
    proc.off('unhandledRejection', onRejection);
    proc.off('uncaughtException', onException);
  };
}

const SAFE_NAME = /^[A-Za-z_$][\w$]{0,63}$/;
const SAFE_CODE = /^[A-Za-z0-9_]{1,32}$/;

/** Nombre del tipo de un fallo, validado; nunca texto de excepción. */
export function errorName(value: unknown): string {
  if (!(value instanceof Error)) return typeof value;
  return SAFE_NAME.test(value.name) ? value.name : 'Error';
}

/** Describe un fallo sin texto de excepción: solo nombre del tipo y, si es corto y alfanumérico, su `code`. */
function describe(value: unknown): string {
  if (!(value instanceof Error)) return typeof value;
  const name = errorName(value);
  const code = (value as { code?: unknown }).code;
  return typeof code === 'string' && SAFE_CODE.test(code) ? `${name} (${code})` : name;
}
