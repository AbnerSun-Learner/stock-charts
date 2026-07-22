/**
 * 家庭财务领域类型。
 * 金额在 DB 为 numeric(18,2)；应用层用 number 展示，读写按两位小数定点数语义。
 */

export type FamilyMemberRole = 'self' | 'spouse' | 'child' | 'other';

export type LedgerSide = 'asset' | 'liability';

export type AssetCategory =
  | 'cash'
  | 'deposit'
  | 'investment'
  | 'property'
  | 'vehicle'
  | 'other_asset';

export type LiabilityCategory =
  | 'mortgage'
  | 'consumer_loan'
  | 'credit_card'
  | 'other_liability';

export type LedgerCategory = AssetCategory | LiabilityCategory;

export type FourPot = 'liquid' | 'stable' | 'long_term' | 'insurance';

export type PolicyType =
  | 'life'
  | 'critical_illness'
  | 'medical'
  | 'accident'
  | 'property'
  | 'other';

export type PolicyStatus = 'active' | 'lapsed' | 'pending';

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  role: FamilyMemberRole;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyLedgerItem {
  id: string;
  userId: string;
  /** 资产必填；负债必须为 null（家庭债） */
  memberId: string | null;
  side: LedgerSide;
  category: LedgerCategory;
  name: string;
  amount: number;
  currency: 'CNY';
  fourPot: FourPot | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsurancePolicy {
  id: string;
  userId: string;
  memberId: string;
  policyType: PolicyType;
  insurer: string | null;
  name: string;
  coverageAmount: number;
  annualPremium: number;
  status: PolicyStatus;
  startDate: string | null;
  endDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerTotals {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface CategoryShare {
  category: LedgerCategory;
  amount: number;
  ratio: number;
}

/** 资产结构饼图用：活钱 / 稳钱 / 长钱（不含 insurance）。 */
export type StructureFourPot = Extract<FourPot, 'liquid' | 'stable' | 'long_term'>;

export interface FourPotShare {
  fourPot: StructureFourPot;
  amount: number;
  ratio: number;
}

/** 资产结构饼图固定顺序。 */
export const STRUCTURE_FOUR_POTS: StructureFourPot[] = ['liquid', 'stable', 'long_term'];

export interface MemberShare {
  memberId: string | null;
  memberName: string;
  amount: number;
  ratio: number;
}

export interface PolicyCoverageSummary {
  policyType: PolicyType;
  covered: boolean;
}

/** 数据库历史视图的单行（家庭或成员当日资产合计）。 */
export interface FamilyAssetHistoryRow {
  date: string;
  memberId: string;
  memberName: string;
  sortOrder: number;
  fourPot: StructureFourPot;
  potOrder: number;
  totalAssets: number;
}

export interface AssetHistoryPoint {
  date: string;
  amount: number;
  fourPot: StructureFourPot;
  potOrder: number;
  /** 仅最新日期存在：家庭在同一类别中的资产总额。 */
  latestHouseholdAmount?: number;
  /** 仅最新日期存在；家庭同类资产为 0 时占比不可计算。 */
  latestShareRatio?: number | null;
}

export interface MemberAssetHistorySeries {
  memberId: string;
  memberName: string;
  sortOrder: number;
  points: AssetHistoryPoint[];
}

export type FamilyAssetHistory = MemberAssetHistorySeries[];

export const ASSET_CATEGORIES: AssetCategory[] = [
  'cash',
  'deposit',
  'investment',
  'property',
  'vehicle',
  'other_asset',
];

export const LIABILITY_CATEGORIES: LiabilityCategory[] = [
  'mortgage',
  'consumer_loan',
  'credit_card',
  'other_liability',
];

/** 全量保单类型（含历史数据兼容）。 */
export const POLICY_TYPES: PolicyType[] = [
  'life',
  'critical_illness',
  'medical',
  'accident',
  'property',
  'other',
];

/** 覆盖摘要 / 新建可选：不含财产、其他。 */
export const COVERAGE_POLICY_TYPES: PolicyType[] = [
  'life',
  'critical_illness',
  'medical',
  'accident',
];

export const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  cash: '现金',
  deposit: '存款',
  investment: '投资',
  property: '房产',
  vehicle: '车辆',
  other_asset: '其他资产',
  mortgage: '房贷',
  consumer_loan: '消费贷',
  credit_card: '信用卡',
  other_liability: '其他负债',
};

export const FOUR_POT_LABELS: Record<FourPot, string> = {
  liquid: '活钱',
  stable: '稳钱',
  long_term: '长钱',
  insurance: '保险（资金标签）',
};

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  life: '寿险',
  critical_illness: '重疾',
  medical: '医疗',
  accident: '意外',
  property: '财产',
  other: '其他',
};

export const MEMBER_ROLE_LABELS: Record<FamilyMemberRole, string> = {
  self: '本人',
  spouse: '配偶',
  child: '子女',
  other: '其他',
};
