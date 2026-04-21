import './global.css';

export const metadata = {
  title: 'Floxio CRM',
  description: 'Operational CRM for freelancers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
