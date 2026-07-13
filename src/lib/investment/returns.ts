import type {
  CalculateTwrInput,
  CalculateTwrResult,
  CalculateXirrInput,
  CalculateXirrResult,
  CashFlow,
  ExternalCashFlowType,
} from '@/types/investment';
import { finalizeInternal } from '@/lib/investment/money';

const MAX_NEWTON_ITERATIONS = 100;
const NEWTON_TOLERANCE = 1e-7;
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

function parseDate(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

function yearFraction(from: string, to: string): number {
  return (parseDate(to) - parseDate(from)) / YEAR_MS;
}

function isExternalFlow(
  flow: CashFlow
): flow is CashFlow & { type: ExternalCashFlowType } {
  return flow.type === 'deposit' || flow.type === 'withdrawal';
}

/**
 * 账本非负金额 + type → XIRR 投资者符号（入金负、出金正）。
 */
export function toXirrSignedAmount(
  type: ExternalCashFlowType,
  amountBase: number
): number {
  if (!(amountBase > 0)) {
    throw new Error('XIRR 金额必须为正的账本金额后再转换符号');
  }
  return type === 'deposit' ? -amountBase : amountBase;
}

/**
 * 账本非负金额 + type → TWR 组合口径（入金正、出金负；与 XIRR 相反）。
 */
export function toTwrCashFlowAmount(
  type: ExternalCashFlowType,
  amountBase: number
): number {
  if (!(amountBase > 0)) {
    throw new Error('TWR 金额必须为正的账本金额后再转换符号');
  }
  return type === 'deposit' ? amountBase : -amountBase;
}

/**
 * 从账本现金流提取外部现金流并转为 XIRR 符号（忽略 dividend 等内部类型）。
 */
export function extractXirrExternalFlows(
  cashFlows: CashFlow[]
): Array<{ date: string; amountBase: number }> {
  return cashFlows.filter(isExternalFlow).map(flow => ({
    date: flow.flowDate,
    amountBase: toXirrSignedAmount(flow.type, flow.amountBase),
  }));
}

/**
 * 从账本现金流提取外部现金流并转为 TWR 组合符号。
 */
export function extractTwrExternalFlows(
  cashFlows: CashFlow[]
): Array<{ date: string; amountBase: number }> {
  return cashFlows.filter(isExternalFlow).map(flow => ({
    date: flow.flowDate,
    amountBase: toTwrCashFlowAmount(flow.type, flow.amountBase),
  }));
}

function npv(rate: number, flows: Array<{ t: number; amount: number }>): number {
  return flows.reduce((sum, flow) => sum + flow.amount / (1 + rate) ** flow.t, 0);
}

function dNpv(rate: number, flows: Array<{ t: number; amount: number }>): number {
  return flows.reduce(
    (sum, flow) => sum - (flow.t * flow.amount) / (1 + rate) ** (flow.t + 1),
    0
  );
}

function hasSignChange(amounts: number[]): boolean {
  const hasPos = amounts.some(amount => amount > 0);
  const hasNeg = amounts.some(amount => amount < 0);
  return hasPos && hasNeg;
}

/**
 * 在多个初值上跑牛顿法；若收敛到差异显著的多个根，返回 multiple_roots。
 */
function solveXirrRate(
  timedFlows: Array<{ t: number; amount: number }>
): CalculateXirrResult {
  const guesses = [-0.99, -0.5, 0, 0.1, 0.5, 1, 10];
  const roots: number[] = [];

  for (const guess of guesses) {
    let rate = guess;
    let converged = false;
    for (let i = 0; i < MAX_NEWTON_ITERATIONS; i += 1) {
      const derivative = dNpv(rate, timedFlows);
      if (Math.abs(derivative) < 1e-12) {
        break;
      }
      const next = rate - npv(rate, timedFlows) / derivative;
      if (!Number.isFinite(next)) {
        break;
      }
      if (Math.abs(next - rate) < NEWTON_TOLERANCE) {
        rate = next;
        converged = true;
        break;
      }
      rate = next;
    }
    if (converged && Math.abs(npv(rate, timedFlows)) < 1e-6) {
      const duplicate = roots.some(existing => Math.abs(existing - rate) < 1e-4);
      if (!duplicate) {
        roots.push(rate);
      }
    }
  }

  if (roots.length === 0) {
    return { ok: false, error: 'does_not_converge' };
  }
  if (roots.length > 1) {
    return { ok: false, error: 'multiple_roots' };
  }
  return { ok: true, value: roots[0] };
}

/**
 * 计算 XIRR（外部现金流已带投资者符号 + 终值）。
 */
export function calculateXirr(input: CalculateXirrInput): CalculateXirrResult {
  if (!(input.terminalValueBase >= 0) || !Number.isFinite(input.terminalValueBase)) {
    return { ok: false, error: 'invalid_terminal_value' };
  }

  const flows = [
    ...input.externalCashFlows.map(flow => ({
      date: flow.date,
      amount: flow.amountBase,
    })),
    { date: input.valuationDate, amount: input.terminalValueBase },
  ].filter(flow => flow.amount !== 0);

  if (flows.length === 0) {
    return { ok: false, error: 'empty_cash_flows' };
  }
  if (!hasSignChange(flows.map(flow => flow.amount))) {
    return { ok: false, error: 'no_sign_change' };
  }

  const anchor = flows.reduce(
    (min, flow) => (flow.date < min ? flow.date : min),
    flows[0].date
  );
  const timedFlows = flows.map(flow => ({
    t: yearFraction(anchor, flow.date),
    amount: flow.amount,
  }));

  return solveXirrRate(timedFlows);
}

/**
 * 计算 TWR：r_t = (V_t - CF_t) / V_(t-1) - 1；TWR = Π(1+r_t)-1。
 * externalCashFlows.amountBase 必须已是组合口径（入金正、出金负）。
 */
export function calculateTwr(input: CalculateTwrInput): CalculateTwrResult {
  const expected = Array.from(input.expectedValuationDates).sort((a, b) =>
    a.localeCompare(b)
  );
  if (expected.length < 2) {
    return { ok: false, error: 'insufficient_snapshots' };
  }

  const byDate = new Map(input.snapshots.map(snap => [snap.asOfDate, snap]));
  for (const date of expected) {
    if (!byDate.has(date)) {
      return { ok: false, error: 'non_contiguous_snapshots' };
    }
  }

  let product = 1;
  for (let i = 1; i < expected.length; i += 1) {
    const prevDate = expected[i - 1];
    const date = expected[i];
    const prev = byDate.get(prevDate);
    const curr = byDate.get(date);
    if (!prev || !curr) {
      return { ok: false, error: 'non_contiguous_snapshots' };
    }
    if (prev.totalAssetsBase === 0) {
      return { ok: false, error: 'zero_prior_value' };
    }

    // end_of_day：计入当日外部净现金流
    const cfT = input.externalCashFlows
      .filter(flow => flow.date === date)
      .reduce((sum, flow) => sum + flow.amountBase, 0);

    const rT = (curr.totalAssetsBase - cfT) / prev.totalAssetsBase - 1;
    product *= 1 + rT;
  }

  return { ok: true, value: finalizeInternal(product - 1) };
}
