'use client';

import { useRouter } from 'next/navigation';
import { Card, Row, Col, Button } from 'antd';

const TOOLS = [
  {
    id: 'sunburst',
    title: '旭日图生成',
    description: '上传与 position_distribution.json 格式一致的 JSON，生成资产配置旭日图。支持导出配置、下载 PNG。',
    href: '/view/sunburst',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.9" />
        <path d="M24 8 A16 16 0 0 1 24 40 A16 16 0 0 1 24 8" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M24 12 A12 12 0 0 1 24 36 A12 12 0 0 1 24 12" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M24 16 A8 8 0 0 1 24 32 A8 8 0 0 1 24 16" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.75" />
      </svg>
    ),
  },
] as const;

export function HomeToolGrid() {
  const router = useRouter();

  return (
    <Row gutter={[24, 24]} className="home-tool-grid">
      {TOOLS.map((tool) => (
        <Col xs={24} sm={12} md={12} lg={6} key={tool.id}>
          <Card className="home-tool-card" bordered>
            <div className="home-tool-card-icon">{tool.icon}</div>
            <h2 className="home-tool-card-title">{tool.title}</h2>
            <p className="home-tool-card-desc">{tool.description}</p>
            <Button type="primary" size="middle" className="home-tool-card-btn" onClick={() => router.push(tool.href)}>
              开始使用
            </Button>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
