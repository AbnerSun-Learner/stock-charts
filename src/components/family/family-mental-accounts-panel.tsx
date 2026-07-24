'use client';

import { useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tag,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { FamilyFinanceRepository } from '@/lib/supabase/family-finance-repository';
import {
  aggregateMentalGoalsByPriority,
  computeMentalAccountProgress,
  groupMentalAccountsByPriority,
  listSelectableMentalLedgerItems,
} from '@/lib/family-finance/mental-account';
import type {
  FamilyLedgerItem,
  FamilyMember,
  FamilyMentalAccount,
  MentalAccountPriority,
} from '@/types/family-finance';
import { MENTAL_ACCOUNT_PRIORITIES } from '@/types/family-finance';
import { isStructureFourPot } from '@/lib/family-finance/aggregates';
import { FamilyMentalAccountLiquid } from '@/components/family/family-mental-account-liquid';
import { FamilyMentalGoalsBarChart } from '@/components/family/family-mental-goals-bar-chart';
import Link from 'next/link';

interface FamilyMentalAccountsPanelProps {
  repo: FamilyFinanceRepository;
  loading: boolean;
  items: FamilyLedgerItem[];
  members: FamilyMember[];
  accounts: FamilyMentalAccount[];
  onChanged: () => Promise<void>;
}

interface MentalAccountFormValues {
  name: string;
  targetAmount: number;
  priority: MentalAccountPriority;
  startDate: Dayjs;
  targetDate: Dayjs;
  ledgerItemIds: string[];
}

const PRIORITY_OPTIONS = MENTAL_ACCOUNT_PRIORITIES.map(value => ({
  value,
  label: value,
}));

/**
 * 总览心理账户区：左分组瀑布流 + 右目标柱状图 + 添加/编辑弹窗。
 */
export function FamilyMentalAccountsPanel({
  repo,
  loading,
  items,
  members,
  accounts,
  onChanged,
}: FamilyMentalAccountsPanelProps) {
  const { message, modal } = App.useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMentalAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [form] = Form.useForm<MentalAccountFormValues>();

  const selectable = useMemo(
    () =>
      listSelectableMentalLedgerItems({
        items,
        members,
        allAccounts: accounts,
        editingAccountId: editing?.id ?? null,
      }),
    [items, members, accounts, editing]
  );

  const priorityGroups = useMemo(
    () => groupMentalAccountsByPriority(accounts),
    [accounts]
  );

  const goalAggregates = useMemo(
    () => aggregateMentalGoalsByPriority(accounts, items),
    [accounts, items]
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      priority: 'P1',
      startDate: dayjs(),
      ledgerItemIds: [],
    });
    setOpen(true);
  };

  const openEdit = (account: FamilyMentalAccount) => {
    setEditing(account);
    const options = listSelectableMentalLedgerItems({
      items,
      members,
      allAccounts: accounts,
      editingAccountId: account.id,
    });
    const validIds = new Set(options.map(o => o.id));
    form.setFieldsValue({
      name: account.name,
      targetAmount: account.targetAmount,
      priority: account.priority,
      startDate: dayjs(account.startDate),
      targetDate: dayjs(account.targetDate),
      ledgerItemIds: account.ledgerItemIds.filter(id => validIds.has(id)),
    });
    setOpen(true);
  };

  const save = async () => {
    if (savingRef.current) return;
    const values = await form.validateFields();
    savingRef.current = true;
    setSaving(true);
    try {
      await repo.upsertMentalAccount({
        id: editing?.id,
        name: values.name,
        targetAmount: values.targetAmount,
        priority: values.priority,
        startDate: values.startDate.format('YYYY-MM-DD'),
        targetDate: values.targetDate.format('YYYY-MM-DD'),
        ledgerItemIds: values.ledgerItemIds,
      });
      message.success(editing ? '已更新心理账户' : '已添加心理账户');
      setOpen(false);
      await onChanged();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
      throw e;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const remove = (account: FamilyMentalAccount) => {
    let deleted = false;
    modal.confirm({
      title: `删除心理账户「${account.name}」？`,
      content: '不会删除关联的活账条目。',
      okType: 'danger',
      onOk: async () => {
        try {
          await repo.deleteMentalAccount(account.id);
          deleted = true;
        } catch (e) {
          message.error(e instanceof Error ? e.message : '删除失败');
          throw e;
        }
      },
      afterClose: () => {
        if (!deleted) return;
        message.success('已删除');
        void onChanged();
      },
    });
  };

  return (
    <>
      <Row gutter={[16, 16]} className="family-mental-accounts-layout">
        <Col xs={24} lg={16}>
          <Card
            className="family-finance-section-card family-mental-accounts-card"
            title={<h2 className="family-finance-section__title">心理账户</h2>}
            loading={loading}
            extra={
              <Button type="primary" size="small" onClick={openCreate}>
                添加心理账户
              </Button>
            }
          >
            {accounts.length === 0 ? (
              <Empty description="尚未设立心理账户" />
            ) : (
              <div className="family-mental-accounts-groups">
                {priorityGroups.map(group => (
                  <section
                    key={group.priority}
                    className="family-mental-accounts-group"
                    aria-label={`${group.priority} 心理账户`}
                  >
                    <header className="family-mental-accounts-group__header">
                      <span className="family-mental-accounts-group__title">
                        {group.priority}
                      </span>
                      <span className="family-mental-accounts-group__count">
                        {group.accounts.length} 个
                      </span>
                    </header>
                    <div className="family-mental-accounts-waterfall">
                      {group.accounts.map(account => {
                        const progress = computeMentalAccountProgress(account, items);
                        const hasValidLink = account.ledgerItemIds.some(id => {
                          const item = items.find(i => i.id === id);
                          return Boolean(
                            item && item.side === 'asset' && isStructureFourPot(item.fourPot)
                          );
                        });
                        return (
                          <div key={account.id} className="family-mental-account-item">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <Tag className="m-0 shrink-0">{account.priority}</Tag>
                                <div className="font-medium truncate" title={account.name}>
                                  {account.name}
                                </div>
                              </div>
                              <Space size="small">
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => openEdit(account)}
                                >
                                  编辑
                                </Button>
                                <Button
                                  type="link"
                                  size="small"
                                  danger
                                  onClick={() => remove(account)}
                                >
                                  删除
                                </Button>
                              </Space>
                            </div>
                            {!hasValidLink ? (
                              <div className="space-y-2">
                                <dl className="space-y-1.5 text-sm m-0">
                                  <div className="flex justify-between gap-3">
                                    <dt className="shrink-0 text-[var(--text-muted)]">开始日期</dt>
                                    <dd className="m-0 text-[var(--text)]">{account.startDate}</dd>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <dt className="shrink-0 text-[var(--text-muted)]">预期达成</dt>
                                    <dd className="m-0 text-[var(--text)]">{account.targetDate}</dd>
                                  </div>
                                </dl>
                                <Empty
                                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                                  description="关联账目已失效，请重新关联"
                                />
                              </div>
                            ) : (
                              <FamilyMentalAccountLiquid
                                progress={progress}
                                targetAmount={account.targetAmount}
                                startDate={account.startDate}
                                targetDate={account.targetDate}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            className="family-finance-section-card family-mental-goals-card"
            title={<h2 className="family-finance-section__title">目标总览</h2>}
            loading={loading}
          >
            <div className="family-mental-goals-chart-wrap">
              <FamilyMentalGoalsBarChart aggregates={goalAggregates} />
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title={editing ? '编辑心理账户' : '添加心理账户'}
        open={open}
        onCancel={() => {
          if (!savingRef.current) setOpen(false);
        }}
        onOk={() => save()}
        confirmLoading={saving}
        okButtonProps={{ disabled: saving || selectable.length === 0 }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: '请填写名称' },
              {
                validator: async (_, value: string) => {
                  const trimmed = (value ?? '').trim();
                  if (!trimmed) throw new Error('请填写名称');
                  if (trimmed.length > 32) throw new Error('名称不超过 32 字');
                },
              },
            ]}
          >
            <Input placeholder="如：应急金、旅游基金" maxLength={32} />
          </Form.Item>
          <Form.Item
            name="targetAmount"
            label="预期目标"
            rules={[
              { required: true, message: '请填写预期目标' },
              {
                type: 'number',
                min: 0.01,
                message: '预期目标必须大于 0',
              },
            ]}
          >
            <InputNumber
              min={0.01}
              precision={2}
              className="w-full"
              addonAfter="元"
              placeholder="50000.00"
            />
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select options={PRIORITY_OPTIONS} placeholder="选择 P0 / P1 / P2" />
          </Form.Item>
          <Form.Item
            name="startDate"
            label="开始日期"
            dependencies={['targetDate']}
            rules={[
              { required: true, message: '请选择开始日期' },
              {
                validator: async (_, value: Dayjs | null) => {
                  if (!value) return;
                  const targetDate = form.getFieldValue('targetDate') as Dayjs | undefined;
                  if (targetDate && value.isAfter(targetDate, 'day')) {
                    throw new Error('开始日期不能晚于预期达成日期');
                  }
                },
              },
            ]}
          >
            <DatePicker className="w-full" placeholder="选择开始日期" />
          </Form.Item>
          <Form.Item
            name="targetDate"
            label="预期达成日期"
            dependencies={['startDate']}
            rules={[
              { required: true, message: '请选择预期达成日期' },
              {
                validator: async (_, value: Dayjs | null) => {
                  if (!value) return;
                  if (!editing && value.isBefore(dayjs().startOf('day'))) {
                    throw new Error('预期达成日期不能早于今天');
                  }
                  const startDate = form.getFieldValue('startDate') as Dayjs | undefined;
                  if (startDate && startDate.isAfter(value, 'day')) {
                    throw new Error('开始日期不能晚于预期达成日期');
                  }
                },
              },
            ]}
          >
            <DatePicker
              className="w-full"
              placeholder="选择日期"
              disabledDate={
                editing
                  ? undefined
                  : current =>
                      Boolean(current && current.isBefore(dayjs().startOf('day')))
              }
            />
          </Form.Item>
          <Form.Item
            name="ledgerItemIds"
            label="关联账目"
            rules={[{ type: 'array', min: 1, message: '请至少选择一笔账目' }]}
            extra={
              selectable.length === 0 ? (
                <span>
                  暂无可用账目，请先在
                  <Link href="/view/family/ledger"> 资产记账 </Link>
                  中添加并标注活钱 / 稳钱 / 长钱
                </span>
              ) : (
                '可关联活钱、稳钱或长钱账目（同一账目仅能归属一个心理账户）'
              )
            }
          >
            <Select
              mode="multiple"
              placeholder="选择一到多笔账目（活钱 / 稳钱 / 长钱）"
              disabled={selectable.length === 0}
              options={selectable.map(s => ({ value: s.id, label: s.label }))}
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
