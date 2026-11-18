import DriverBottomNav from '@/components/DriverBottomNav';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <DriverBottomNav />
    </>
  );
}
