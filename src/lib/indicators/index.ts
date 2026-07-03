export {
  computeDailyReturns,
  takeLast,
} from './returns';

export {
  sampleStd,
  computeAnnualizedVolatility,
  computeTrueRange,
  computeAtr20,
  computeAvgDailyRangePct20,
} from './volatility';

export {
  pearsonCorrelation,
  alignClosesByDate,
  computeReturnCorrelation,
  buildCorrelationMatrix,
  type CorrelationMatrix,
  type DatedClose,
} from './correlation';

export {
  computeValuationPercentile,
  extractValuationSeries,
  estimateHistoryYears,
  type ValuationPercentileResult,
  type ValuationConfidence,
} from './valuation';

export {
  computeSma,
  computeMa200State,
  type Ma200State,
} from './trend';
