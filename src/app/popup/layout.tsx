import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Highlight Saver',
  description: 'Save and review highlights from any website.',
};

export default function PopupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          width: 420px;
          min-height: 520px;
          max-height: 600px;
          overflow: hidden;
          margin: 0;
        }
      `}</style>
      {children}
    </>
  );
}
