import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { registerProcessSafetyNets } from './process-safety.js';

describe('registerProcessSafetyNets', () => {
  it('registra una promesa rechazada sin apagar el proceso', () => {
    const proc = new EventEmitter();
    const logger = { error: vi.fn() };
    const shutdown = vi.fn();
    registerProcessSafetyNets(logger, shutdown, proc as never);

    proc.emit('unhandledRejection', new Error('boom'));

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error'));
    expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(shutdown).not.toHaveBeenCalled();
  });

  it('no escribe el mensaje ni el stack de la excepción en el log', () => {
    const proc = new EventEmitter();
    const logger = { error: vi.fn() };
    registerProcessSafetyNets(logger, vi.fn(), proc as never);

    const error = new TypeError('token=sk-secreto-123');
    proc.emit('unhandledRejection', error);

    const logged = logger.error.mock.calls.map(([line]) => String(line)).join('\n');
    expect(logged).toContain('TypeError');
    expect(logged).not.toContain('sk-secreto-123');
    expect(logged).not.toContain('at ');
  });

  it('registra el code corto del error de sistema cuando existe', () => {
    const proc = new EventEmitter();
    const logger = { error: vi.fn() };
    registerProcessSafetyNets(logger, vi.fn(), proc as never);

    const error = Object.assign(new Error('socket hang up /private/path'), { code: 'ECONNRESET' });
    proc.emit('unhandledRejection', error);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ECONNRESET'));
    expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('/private/path'));
  });

  it('no registra un code con saltos de línea o texto libre', () => {
    const proc = new EventEmitter();
    const logger = { error: vi.fn() };
    registerProcessSafetyNets(logger, vi.fn(), proc as never);

    proc.emit('unhandledRejection', Object.assign(new Error('x'), { code: 'ECON\nsecreto' }));

    expect(logger.error).toHaveBeenCalledWith('Promesa rechazada sin manejar: Error');
    expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('secreto'));
  });

  it('para valores que no son Error registra solo su tipo', () => {
    const proc = new EventEmitter();
    const logger = { error: vi.fn() };
    registerProcessSafetyNets(logger, vi.fn(), proc as never);

    proc.emit('unhandledRejection', 'secreto-en-texto');

    expect(logger.error).toHaveBeenCalledWith('Promesa rechazada sin manejar: string');
    expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('secreto-en-texto'));
  });

  it('ante una excepción no capturada registra y apaga una sola vez con código 1', () => {
    const proc = new EventEmitter();
    const logger = { error: vi.fn() };
    const shutdown = vi.fn();
    registerProcessSafetyNets(logger, shutdown, proc as never);

    proc.emit('uncaughtException', new Error('fatal'));
    proc.emit('uncaughtException', new Error('otra'));

    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(shutdown).toHaveBeenCalledWith(1);
  });

  it('la función devuelta quita los manejadores', () => {
    const proc = new EventEmitter();
    const off = registerProcessSafetyNets({ error: vi.fn() }, vi.fn(), proc as never);
    off();
    expect(proc.listenerCount('unhandledRejection')).toBe(0);
    expect(proc.listenerCount('uncaughtException')).toBe(0);
  });
});
