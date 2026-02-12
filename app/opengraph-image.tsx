import { ImageResponse } from 'next/og';

export const alt = '仓位视图';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            padding: 48,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            仓位视图
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#475569',
              fontWeight: 500,
            }}
          >
            投资图表与仓位分布
          </div>
          <div
            style={{
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
              opacity: 0.9,
              marginTop: 24,
              boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.35)',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
