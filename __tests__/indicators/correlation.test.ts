import {
  alignClosesByDate,
  pearsonCorrelation,
  computeReturnCorrelation,
  buildCorrelationMatrix,
  type DatedClose,
} from '@/lib/indicators';

function buildDatedSeries(
  startDate: string,
  count: number,
  closeStart: number,
  closeStep: number
): DatedClose[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      close: closeStart + i * closeStep,
    };
  });
}

function computeDailyReturnsFromDated(series: DatedClose[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < series.length; i += 1) {
    returns.push(series[i].close / series[i - 1].close - 1);
  }
  return returns.slice(-90);
}

describe('correlation indicators', () => {
  it('pearsonCorrelation 完全正相关为 1', () => {
    const series = [0.01, -0.02, 0.03, 0.015, -0.01];
    expect(pearsonCorrelation(series, series)).toBeCloseTo(1, 5);
  });

  it('pearsonCorrelation 固定样本可复算', () => {
    const a = [0.01, 0.02, -0.01, 0.03, 0.005];
    const b = [0.015, 0.01, -0.005, 0.025, 0.01];
    const corr = pearsonCorrelation(a, b);
    expect(corr).not.toBeNull();
    expect(corr!).toBeGreaterThan(0.8);
    expect(corr!).toBeLessThanOrEqual(1);
  });

  it('alignClosesByDate 仅保留共同交易日', () => {
    const seriesA: DatedClose[] = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-02', close: 101 },
      { date: '2024-01-03', close: 102 },
      { date: '2024-01-04', close: 103 },
    ];
    const seriesB: DatedClose[] = [
      { date: '2023-12-31', close: 50 },
      { date: '2024-01-01', close: 200 },
      { date: '2024-01-02', close: 201 },
      { date: '2024-01-04', close: 203 },
    ];

    const aligned = alignClosesByDate(seriesA, seriesB);
    expect(aligned.dates).toEqual(['2024-01-01', '2024-01-02', '2024-01-04']);
    expect(aligned.closesA).toEqual([100, 101, 103]);
    expect(aligned.closesB).toEqual([200, 201, 203]);
  });

  it('computeReturnCorrelation 90 日窗口', () => {
    const seriesA = buildDatedSeries('2024-01-01', 120, 100, 0.5);
    const seriesB = buildDatedSeries('2024-01-01', 120, 200, 0.3);
    const corr = computeReturnCorrelation(seriesA, seriesB, 90);
    expect(corr).not.toBeNull();
    expect(corr!).toBeCloseTo(1, 1);
  });

  it('computeReturnCorrelation 缺失交易日时仅使用共同日期', () => {
    const seriesA: DatedClose[] = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-02', close: 110 },
      { date: '2024-01-03', close: 121 },
      { date: '2024-01-04', close: 99 },
      { date: '2024-01-05', close: 109 },
    ];
    const seriesB: DatedClose[] = [
      { date: '2024-01-01', close: 200 },
      { date: '2024-01-02', close: 180 },
      { date: '2024-01-04', close: 162 },
      { date: '2024-01-05', close: 178 },
    ];

    const aligned = alignClosesByDate(seriesA, seriesB);
    expect(aligned.dates).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-04',
      '2024-01-05',
    ]);

    const dateAligned = computeReturnCorrelation(seriesA, seriesB, 3);
    const tailAligned = pearsonCorrelation(
      computeDailyReturnsFromDated(seriesA.slice(-4)),
      computeDailyReturnsFromDated(seriesB.slice(-4))
    );

    expect(dateAligned).not.toBeNull();
    expect(tailAligned).not.toBeNull();
    expect(dateAligned).not.toBeCloseTo(tailAligned!, 3);
  });

  it('buildCorrelationMatrix 对角线为 1', () => {
    const closes = Array.from({ length: 100 }, (_, i) => 10 + Math.sin(i / 3));
    const seriesA = buildDatedSeries('2024-01-01', 100, closes[0], 0).map(
      (row, i) => ({ ...row, close: closes[i] })
    );
    const seriesB = seriesA.map(row => ({ ...row, close: row.close * 1.1 }));

    const matrix = buildCorrelationMatrix(
      { A: seriesA, B: seriesB },
      ['A', 'B'],
      60
    );
    expect(matrix).not.toBeNull();
    expect(matrix!.matrix[0][0]).toBe(1);
    expect(matrix!.matrix[1][1]).toBe(1);
    expect(matrix!.matrix[0][1]).toBeCloseTo(1, 5);
  });
});
