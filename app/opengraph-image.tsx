import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Everforest Drive-Thru';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fdf6e3', // Everforest cream background
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              width: 160,
              height: 160,
              backgroundColor: '#e6ead2', // Base rect
              borderRadius: 34,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Ink vertical bar */}
            <div style={{ position: 'absolute', left: 40, top: 36, width: 20, height: 88, backgroundColor: '#42524d', borderRadius: 6 }} />
            
            {/* Green horizontal bars */}
            <div style={{ position: 'absolute', left: 60, top: 96, width: 54, height: 18, backgroundColor: '#8da101', borderRadius: 6 }} />
            <div style={{ position: 'absolute', left: 60, top: 68, width: 40, height: 18, backgroundColor: '#8da101', borderRadius: 6 }} />
            <div style={{ position: 'absolute', left: 60, top: 40, width: 28, height: 18, backgroundColor: '#8da101', borderRadius: 6 }} />
          </div>
          
          <div style={{ marginTop: 40, fontSize: 48, fontWeight: 900, color: '#3a515d', letterSpacing: '-0.02em', fontFamily: 'sans-serif' }}>
            Everforest Drive-Thru
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
