import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShutdown, registerSignalShutdown } from './graceful-shutdown.js';

const TIMEOUT_MS = 5_000;

function logger() {
  return { error: vi.fn() };
}

/** Temporizador controlado: `fire` dispara el callback registrado y `unref`/`clearTimer` son espías. */
function controlledTimer() {
  const handle = { unref: vi.fn() };
  let callback: (() => void) | undefined;
  return {
    handle,
    unref: handle.unref,
    setTimer: vi.fn((cb: () => void) => {
      callback = cb;
      return handle;
    }),
    clearTimer: vi.fn(),
    fire: () => callback?.(),
  };
}

describe('createShutdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cierre normal: sale con el código recibido una sola vez', async () => {
    const exit = vi.fn();
    const shutdown = createShutdown({ close: async () => undefined, exit, timeoutMs: TIMEOUT_MS, logger: logger() });

    await shutdown(0);

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('cierre normal con código de error conserva ese código', async () => {
    const exit = vi.fn();
    const shutdown = createShutdown({ close: async () => undefined, exit, timeoutMs: TIMEOUT_MS, logger: logger() });

    await shutdown(1);

    expect(exit).toHaveBeenCalledWith(1);
  });

  it('cierre normal: el temporizador se unref y se limpia', async () => {
    const timer = controlledTimer();
    const shutdown = createShutdown({
      close: async () => undefined,
      exit: vi.fn(),
      timeoutMs: TIMEOUT_MS,
      logger: logger(),
      setTimer: timer.setTimer,
      clearTimer: timer.clearTimer,
    });

    await shutdown(0);

    expect(timer.setTimer).toHaveBeenCalledWith(expect.any(Function), TIMEOUT_MS);
    expect(timer.unref).toHaveBeenCalledTimes(1);
    expect(timer.clearTimer).toHaveBeenCalledWith(timer.handle);
  });

  it('cierre colgado: al vencer el tope sale con código distinto de cero y registra sin texto crudo', async () => {
    const exit = vi.fn();
    const log = logger();
    const timer = controlledTimer();
    const shutdown = createShutdown({
      close: () => new Promise<void>(() => undefined),
      exit,
      timeoutMs: TIMEOUT_MS,
      logger: log,
      setTimer: timer.setTimer,
      clearTimer: timer.clearTimer,
    });

    const pending = shutdown(0);
    timer.fire();
    await pending;

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining(`${TIMEOUT_MS} ms`));
    expect(timer.unref).toHaveBeenCalledTimes(1);
    expect(timer.clearTimer).toHaveBeenCalledWith(timer.handle);
  });

  it('cierre colgado con código de error conserva ese código', async () => {
    const exit = vi.fn();
    const timer = controlledTimer();
    const shutdown = createShutdown({
      close: () => new Promise<void>(() => undefined),
      exit,
      timeoutMs: TIMEOUT_MS,
      logger: logger(),
      setTimer: timer.setTimer,
      clearTimer: timer.clearTimer,
    });

    const pending = shutdown(3);
    timer.fire();
    await pending;

    expect(exit).toHaveBeenCalledWith(3);
  });

  it('error al cerrar: registra solo el nombre del error y sale con código distinto de cero', async () => {
    const exit = vi.fn();
    const log = logger();
    const timer = controlledTimer();
    const shutdown = createShutdown({
      close: async () => {
        throw new TypeError('contraseña-filtrada');
      },
      exit,
      timeoutMs: TIMEOUT_MS,
      logger: log,
      setTimer: timer.setTimer,
      clearTimer: timer.clearTimer,
    });

    await shutdown(0);

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('TypeError'));
    expect(log.error).not.toHaveBeenCalledWith(expect.stringContaining('contraseña-filtrada'));
    expect(timer.unref).toHaveBeenCalledTimes(1);
    expect(timer.clearTimer).toHaveBeenCalledWith(timer.handle);
  });

  it('error al cerrar con nombre con saltos de línea registra el tipo genérico, no el texto', async () => {
    const exit = vi.fn();
    const log = logger();
    const failing = new Error('x');
    failing.name = 'Evil\nsecreto-en-linea';
    const shutdown = createShutdown({
      close: async () => {
        throw failing;
      },
      exit,
      timeoutMs: TIMEOUT_MS,
      logger: log,
    });

    await shutdown(0);

    expect(log.error).toHaveBeenCalledWith('Error durante el cierre ordenado: Error');
    expect(log.error).not.toHaveBeenCalledWith(expect.stringContaining('secreto'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('error al cerrar con código de error conserva ese código', async () => {
    const exit = vi.fn();
    const shutdown = createShutdown({
      close: async () => {
        throw new Error('x');
      },
      exit,
      timeoutMs: TIMEOUT_MS,
      logger: logger(),
    });

    await shutdown(2);

    expect(exit).toHaveBeenCalledWith(2);
  });

  it('llamada repetida: comparte la primera ejecución y sale una sola vez', async () => {
    const exit = vi.fn();
    const close = vi.fn(async () => undefined);
    const shutdown = createShutdown({ close, exit, timeoutMs: TIMEOUT_MS, logger: logger() });

    const first = shutdown(0);
    const second = shutdown(1);
    await Promise.all([first, second]);

    expect(close).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });
});

describe('registerSignalShutdown', () => {
  it('SIGTERM y SIGINT llaman shutdown(0) una sola vez por señal y la función devuelta quita los manejadores', () => {
    const proc = new EventEmitter();
    const shutdown = vi.fn();
    const off = registerSignalShutdown(proc as never, shutdown);

    proc.emit('SIGTERM');
    proc.emit('SIGTERM');
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(shutdown).toHaveBeenLastCalledWith(0);

    proc.emit('SIGINT');
    expect(shutdown).toHaveBeenCalledTimes(2);
    expect(shutdown).toHaveBeenLastCalledWith(0);

    off();
    expect(proc.listenerCount('SIGTERM')).toBe(0);
    expect(proc.listenerCount('SIGINT')).toBe(0);
  });
});
