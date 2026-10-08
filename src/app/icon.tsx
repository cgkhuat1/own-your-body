import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
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
          backgroundColor: '#382C24',
          color: '#E6DAC8',
          fontSize: 200,
          fontWeight: 800,
          fontFamily: 'sans-serif',
          letterSpacing: '-0.05em',
          borderRadius: '120px',
        }}
      >
        OYB
      </div>
    ),
    { ...size }
  );
}
