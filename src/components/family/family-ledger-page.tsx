'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { FamilyFinanceRepository } from '@/lib/supabase/family-finance-repository';
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  CATEGORY_LABELS,
  FOUR_POT_LABELS,
  type FamilyLedgerItem,
  type FamilyMember,
  type FourPot,
  type LedgerCategory,
  type LedgerSide,
} from '@/types/family-finance';
import {
  computeFourPotShares,
  computeLedgerTotals,
} from '@/lib/family-finance/aggregates';
import { formatCny } from '@/lib/family-finance/format';
import { FamilyAssetStructurePie } from '@/components/family/family-asset-structure-pie';

/**
 * 家庭资产记账主界面。
 */
export function FamilyLedgerPage() {
  const { message, modal } = App.useApp();
  const repo = useMemo(() => new FamilyFinanceRepository(createBrowserSupabaseClient()), []);

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [items, setItems] = useState<FamilyLedgerItem[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemSaving, setItemSaving] = useState(false);
  const itemSavingRef = useRef(false);
  const [editing, setEditing] = useState<FamilyLedgerItem | null>(null);
  const [form] = Form.useForm();
  const sideWatch: LedgerSide = Form.useWatch('side', form) ?? 'asset';

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await repo.ensureSelfMember();
      const [m, i] = await Promise.all([repo.listMembers(), repo.listLedgerItems()]);
      setMembers(m);
      setItems(i);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [repo, message]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const totals = useMemo(() => computeLedgerTotals(items), [items]);
  const fourPotShares = useMemo(() => computeFourPotShares(items), [items]);
  const memberNameById = useMemo(
    () => new Map(members.map(m => [m.id, m.name])),
    [members]
  );
  const assetItems = useMemo(() => items.filter(i => i.side === 'asset'), [items]);
  const liabilityItems = useMemo(
    () => items.filter(i => i.side === 'liability'),
    [items]
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      side: 'asset',
      category: 'cash',
      amount: 0,
      memberId: members.find(m => m.role === 'self')?.id,
    });
    setItemModalOpen(true);
  };

  const openEdit = (row: FamilyLedgerItem) => {
    setEditing(row);
    form.setFieldsValue({
      side: row.side,
      category: row.category,
      name: row.name,
      amount: row.amount,
      memberId: row.memberId,
      fourPot: row.fourPot,
      note: row.note,
    });
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    // 同步锁：避免 validateFields 完成前连点并行进入
    if (itemSavingRef.current) {
      throw new Error('正在保存');
    }
    itemSavingRef.current = true;
    setItemSaving(true);
    try {
      const values = await form.validateFields();
      await repo.upsertLedgerItem({
        id: editing?.id,
        side: values.side,
        category: values.category,
        name: values.name,
        amount: values.amount,
        memberId: values.side === 'asset' ? values.memberId : null,
        fourPot: values.side === 'asset' ? (values.fourPot ?? null) : null,
        note: values.note ?? null,
      });
      message.success(editing ? '已更新' : '已添加');
      setItemModalOpen(false);
      await reload();
    } catch (e) {
      // 校验失败：不 toast，rethrow 让 Modal 保持打开
      if (e && typeof e === 'object' && 'errorFields' in e) {
        throw e;
      }
      message.error(e instanceof Error ? e.message : '保存失败');
      throw e instanceof Error ? e : new Error('保存失败');
    } finally {
      itemSavingRef.current = false;
      setItemSaving(false);
    }
  };

  const categoryOptions: Array<{ value: LedgerCategory; label: string }> =
    sideWatch === 'asset'
      ? ASSET_CATEGORIES.map(c => ({ value: c, label: CATEGORY_LABELS[c] }))
      : LIABILITY_CATEGORIES.map(c => ({ value: c, label: CATEGORY_LABELS[c] }));

  const buildColumns = (side: LedgerSide): ColumnsType<FamilyLedgerItem> => {
    const cols: ColumnsType<FamilyLedgerItem> = [
      { title: '名称', dataIndex: 'name', ellipsis: true },
      {
        title: '分类',
        dataIndex: 'category',
        render: (c: LedgerCategory) => CATEGORY_LABELS[c],
      },
    ];
    if (side === 'asset') {
      cols.push({
        title: '成员',
        dataIndex: 'memberId',
        render: (id: string | null) => memberNameById.get(id ?? '') ?? '—',
      });
    }
    cols.push(
      {
        title: '金额',
        dataIndex: 'amount',
        align: 'right',
        render: (v: number) => formatCny(v),
      },
      {
        title: '操作',
        width: 140,
        render: (_, row) => (
          <Space size="small">
            <Button type="link" size="small" onClick={() => openEdit(row)}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={() => {
                modal.confirm({
                  title: '删除该条目？',
                  onOk: async () => {
                    await repo.deleteLedgerItem(row.id);
                    message.success('已删除');
                    await reload();
                  },
                });
              }}
            >
              删除
            </Button>
          </Space>
        ),
      }
    );
    return cols;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-display)] text-xl font-semibold m-0 mb-1">家庭资产记账</h1>
        <p className="text-sm text-[var(--text-muted)] m-0">
          总资产 {formatCny(totals.totalAssets)}
          {' · '}
          总负债 {formatCny(totals.totalLiabilities)}
          {' · '}
          净资产 {formatCny(totals.netWorth)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 min-h-[280px]">
          <h3 className="text-sm font-medium m-0 mb-3">资产结构</h3>
          {fourPotShares.length === 0 ? (
            <Empty description="暂无活钱/稳钱/长钱标注资产" />
          ) : (
            <FamilyAssetStructurePie shares={fourPotShares} height={280} />
          )}
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium m-0">条目列表</h3>
            <Button type="dashed" size="small" onClick={openCreate}>
              + 添加资产/负债
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-[var(--text-muted)] m-0 mb-2">资产</h4>
              <Table
                size="small"
                loading={loading}
                rowKey="id"
                pagination={{ pageSize: 6 }}
                dataSource={assetItems}
                columns={buildColumns('asset')}
                locale={{ emptyText: '暂无资产条目' }}
              />
            </div>
            <div>
              <h4 className="text-xs font-medium text-[var(--text-muted)] m-0 mb-2">负债</h4>
              <Table
                size="small"
                loading={loading}
                rowKey="id"
                pagination={{ pageSize: 6 }}
                dataSource={liabilityItems}
                columns={buildColumns('liability')}
                locale={{ emptyText: '暂无负债条目' }}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={editing ? '编辑条目' : '添加条目'}
        open={itemModalOpen}
        onCancel={() => {
          if (itemSavingRef.current) return;
          setItemModalOpen(false);
        }}
        onOk={() => saveItem()}
        confirmLoading={itemSaving}
        okButtonProps={{ disabled: itemSaving }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="side" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'asset', label: '资产' },
                { value: 'liability', label: '负债' },
              ]}
              onChange={(side: LedgerSide) => {
                form.setFieldsValue({
                  category: side === 'asset' ? 'cash' : 'mortgage',
                  memberId:
                    side === 'asset' ? members.find(m => m.role === 'self')?.id ?? null : null,
                  fourPot: null,
                });
              }}
            />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="amount"
            label="金额"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber min={0} precision={2} className="w-full" />
          </Form.Item>
          {sideWatch === 'asset' && (
            <>
              <Form.Item
                name="memberId"
                label="成员"
                rules={[{ required: true, message: '资产必须选择成员' }]}
              >
                <Select options={members.map(m => ({ value: m.id, label: m.name }))} />
              </Form.Item>
              <Form.Item name="fourPot" label="四笔钱（可选）">
                <Select
                  allowClear
                  options={(Object.keys(FOUR_POT_LABELS) as FourPot[]).map(k => ({
                    value: k,
                    label: FOUR_POT_LABELS[k],
                  }))}
                />
              </Form.Item>
            </>
          )}
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
