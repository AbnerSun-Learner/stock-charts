'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
} from 'antd';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { FamilyFinanceRepository } from '@/lib/supabase/family-finance-repository';
import {
  MEMBER_ROLE_LABELS,
  type FamilyLedgerItem,
  type FamilyMember,
  type FamilyMemberRole,
} from '@/types/family-finance';
import {
  computeLedgerTotals,
  computeMemberAssetShares,
} from '@/lib/family-finance/aggregates';
import { formatCny } from '@/lib/family-finance/format';
import { FamilyMemberDistributionPie } from '@/components/family/family-member-distribution-pie';
import { FamilyPoliciesPage } from '@/components/family/family-policies-page';

/**
 * 家庭财务总览（直接读活账合计）。
 */
export function FamilyOverviewPage() {
  const { message, modal } = App.useApp();
  const repo = useMemo(() => new FamilyFinanceRepository(createBrowserSupabaseClient()), []);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FamilyLedgerItem[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [memberDrawer, setMemberDrawer] = useState(false);
  const [memberForm] = Form.useForm();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await repo.ensureSelfMember();
      const [ledgerItems, m] = await Promise.all([repo.listLedgerItems(), repo.listMembers()]);
      setItems(ledgerItems);
      setMembers(m);
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
  const memberNameById = useMemo(
    () => new Map(members.map(m => [m.id, m.name])),
    [members]
  );
  const memberShares = useMemo(
    () => computeMemberAssetShares(items, memberNameById),
    [items, memberNameById]
  );
  const hasLedger = items.length > 0;

  const headerActions = (
    <Space wrap>
      <Button onClick={() => setMemberDrawer(true)}>成员管理</Button>
      <Link href="/view/family/ledger">
        <Button type="primary">{hasLedger ? '更新资产' : '前往资产记账'}</Button>
      </Link>
    </Space>
  );

  const memberDrawerNode = (
    <Drawer
      title="家庭成员"
      open={memberDrawer}
      onClose={() => setMemberDrawer(false)}
      width={360}
    >
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={members}
        columns={[
          { title: '姓名', dataIndex: 'name' },
          {
            title: '角色',
            dataIndex: 'role',
            render: (r: FamilyMemberRole) => MEMBER_ROLE_LABELS[r],
          },
          {
            title: '操作',
            render: (_, row) => (
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    modal.confirm({
                      title: '改名',
                      content: (
                        <Input
                          defaultValue={row.name}
                          id="rename-member-input"
                          onPressEnter={e => {
                            const v = (e.target as HTMLInputElement).value;
                            void (async () => {
                              await repo.renameMember(row.id, v);
                              message.success('已改名');
                              await reload();
                            })();
                          }}
                        />
                      ),
                      onOk: async () => {
                        const el = document.getElementById(
                          'rename-member-input'
                        ) as HTMLInputElement | null;
                        if (!el?.value.trim()) throw new Error('名称不能为空');
                        await repo.renameMember(row.id, el.value);
                        message.success('已改名');
                        await reload();
                      },
                    });
                  }}
                >
                  改名
                </Button>
                {row.role !== 'self' && (
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => {
                      modal.confirm({
                        title: `删除成员「${row.name}」？`,
                        onOk: async () => {
                          try {
                            await repo.deleteMember(row.id);
                            message.success('已删除');
                            await reload();
                          } catch (e) {
                            message.error(e instanceof Error ? e.message : '删除失败');
                            throw e;
                          }
                        },
                      });
                    }}
                  >
                    删除
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Form
        form={memberForm}
        layout="vertical"
        className="mt-4"
        onFinish={async values => {
          try {
            await repo.createMember({
              name: values.name,
              role: values.role,
            });
            memberForm.resetFields();
            message.success('已添加成员');
            await reload();
          } catch (e) {
            message.error(e instanceof Error ? e.message : '添加失败');
          }
        }}
      >
        <Form.Item name="name" label="新成员姓名" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="role" label="角色" initialValue="spouse" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'spouse', label: '配偶' },
              { value: 'child', label: '子女' },
              { value: 'other', label: '其他' },
            ]}
          />
        </Form.Item>
        <Button type="dashed" htmlType="submit" block>
          + 添加成员
        </Button>
      </Form>
    </Drawer>
  );

  if (!loading && !hasLedger) {
    return (
      <div className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="font-[var(--font-display)] text-xl font-semibold m-0 mb-2">
              家庭财务总览
            </h1>
            <p className="text-[var(--text-muted)] m-0">把家庭当作一家小公司 · 财报摘要</p>
          </div>
          {headerActions}
        </div>
        <Empty description="尚无资产条目。请前往资产记账添加后，总览会即时展示。" />
        <div className="mt-8">
          <FamilyPoliciesPage embedded />
        </div>
        {memberDrawerNode}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-display)] text-xl font-semibold m-0 mb-1">家庭财务总览</h1>
          <p className="text-sm text-[var(--text-muted)] m-0">把家庭当作一家小公司 · 财报摘要</p>
        </div>
        {headerActions}
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card loading={loading}>
            <Statistic
              title="总资产"
              value={totals.totalAssets}
              formatter={v => formatCny(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading}>
            <Statistic
              title="总负债"
              value={totals.totalLiabilities}
              formatter={v => formatCny(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading}>
            <Statistic
              title="净资产"
              value={totals.netWorth}
              formatter={v => formatCny(Number(v))}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="成员分布" loading={loading}>
            {memberShares.length === 0 ? (
              <Empty description="无成员资产明细" />
            ) : (
              <FamilyMemberDistributionPie shares={memberShares} />
            )}
          </Card>
        </Col>
      </Row>

      <FamilyPoliciesPage embedded />

      {memberDrawerNode}
    </div>
  );
}
