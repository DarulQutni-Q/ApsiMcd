import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#e6ead2',
          borderRadius: 8, // scaled down
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Simplified for 32x32: 1 trunk + 1 green bar to represent the tree */}
        <div style={{ position: 'absolute', left: 8, top: 6, width: 4, height: 20, backgroundColor: '#42524d', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 12, top: 14, width: 12, height: 4, backgroundColor: '#8da101', borderRadius: 2 }} />
      </div>
    ),
    { ...size }
  );
}
