// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ESPERA_DA_DIGITACAO_MS, useRascunhoAdiado } from './useRascunhoAdiado.js';

describe('useRascunhoAdiado', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const montar = (valor = '') => {
    const onChange = vi.fn();
    const hook = renderHook(({ v }) => useRascunhoAdiado(v, onChange), {
      initialProps: { v: valor },
    });
    return { ...hook, onChange };
  };

  it('só avisa depois da pausa, e uma vez só para várias teclas', () => {
    const { result, onChange } = montar();

    act(() => result.current[1]('c'));
    act(() => vi.advanceTimersByTime(ESPERA_DA_DIGITACAO_MS - 1));
    act(() => result.current[1]('cb'));
    act(() => vi.advanceTimersByTime(ESPERA_DA_DIGITACAO_MS - 1));
    expect(onChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('cb');
  });

  it('o valor mudado por fora substitui o rascunho, sem avisar de volta', () => {
    const { result, rerender, onChange } = montar('honda');

    act(() => result.current[1]('hon'));
    rerender({ v: '' });
    act(() => vi.advanceTimersByTime(ESPERA_DA_DIGITACAO_MS * 2));

    expect(result.current[0]).toBe('');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('desmontar no meio da espera não avisa depois', () => {
    const { result, unmount, onChange } = montar();

    act(() => result.current[1]('cb'));
    unmount();
    act(() => vi.advanceTimersByTime(ESPERA_DA_DIGITACAO_MS));

    expect(onChange).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
