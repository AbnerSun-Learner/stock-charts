'use client';

import { useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { FamilyFinanceRepository } from '@/lib/supabase/family-finance-repository';
import {
  computeMentalAccountProgress,
  listSelectableMentalLedgerItems,
} from '@/lib/family-finance/mental-account';
import type {
  FamilyLedgerItem,
  FamilyMember,
  FamilyMentalAccount,
} from '@/types/family-finance';
import { isStructureFourPot } from '@/lib/family-finance/aggregates';
import { FamilyMentalAccountLiquid } from '@/components/family/family-mental-account-liquid';
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
  targetDate: Dayjs;
  ledgerItemIds: string[];
}

/**
 * 总览心理账户区：列表水波图 + 添加/编辑弹窗。
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

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ ledgerItemIds: [] });
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
    modal.confirm({
      title: `删除心理账户「${account.name}」？`,
      content: '不会删除关联的活账条目。',
      okType: 'danger',
      onOk: async () => {
        try {
          await repo.deleteMentalAccount(account.id);
          message.success('已删除');
          await onChanged();
        } catch (e) {
          message.error(e instanceof Error ? e.message : '删除失败');
        }
      },
    });
  };

  return (
    <>
      <Card
        title="心理账户"
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
          <div
            className={
              accounts.length === 1
                ? 'flex justify-center'
                : 'grid grid-cols-1 sm:grid-cols-2 gap-3'
            }
          >
            {accounts.map(account => {
              const progress = computeMentalAccountProgress(account, items);
              const hasValidLink = account.ledgerItemIds.some(id => {
                const item = items.find(i => i.id === id);
                return Boolean(item && item.side === 'asset' && isStructureFourPot(item.fourPot));
              });
              return (
                <div
                  key={account.id}
                  className={
                    accounts.length === 1
                      ? 'w-full max-w-md rounded-lg border border-[#93c5fd] bg-[#eff6ff]/40 p-3'
                      : 'rounded-lg border border-[#93c5fd] bg-[#eff6ff]/40 p-3'
                  }
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium truncate" title={account.name}>
                      {account.name}
                    </div>
                    <Space size="small">
                      <Button type="link" size="small" onClick={() => openEdit(account)}>
                        编辑
                      </Button>
                      <Button type="link" size="small" danger onClick={() => remove(account)}>
                        删除
                      </Button>
                    </Space>
                  </div>
                  {!hasValidLink ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="关联账目已失效，请重新关联"
                    />
                  ) : (
                    <FamilyMentalAccountLiquid
                      progress={progress}
                      targetAmount={account.targetAmount}
                      targetDate={account.targetDate}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
            name="targetDate"
            label="预期达成日期"
            rules={[{ required: true, message: '请选择预期达成日期' }]}
          >
            <DatePicker className="w-full" placeholder="选择日期" />
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
