/**
 * @jest-environment jsdom
 */
import { createElement, useEffect, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useGridParams } from '@/hooks/use-grid-params';
import { DEFAULT_GRID_PARAMS } from '@/types/grid';
import type { GridParams } from '@/types/grid';

interface HarnessApi {
  params: GridParams;
  priceDecimals: number;
  errors: string[];
  replaceParams: (next: GridParams) => void;
}

describe('useGridParams.replaceParams', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: HarnessApi | null;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  function Harness() {
    const api = useGridParams(DEFAULT_GRID_PARAMS);
    useEffect(() => {
      latest = {
        params: api.params,
        priceDecimals: api.priceDecimals,
        errors: api.errors,
        replaceParams: api.replaceParams,
      };
    });
    return null;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
    act(() => {
      root.render(createElement(Harness));
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('整体替换后同步参数、校验与价格精度', () => {
    expect(latest).not.toBeNull();
    act(() => {
      latest!.replaceParams({
        ...DEFAULT_GRID_PARAMS,
        basePrice: 2,
        priceUnit: 0.01,
      });
    });

    expect(latest!.params.basePrice).toBe(2);
    expect(latest!.params.priceUnit).toBe(0.01);
    expect(latest!.priceDecimals).toBe(2);
    expect(latest!.errors).toEqual([]);
  });
});
