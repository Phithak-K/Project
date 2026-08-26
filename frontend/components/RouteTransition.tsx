'use client';

import { usePathname } from 'next/navigation';

/**
 * ห่อทุกหน้าเพื่อให้เปลี่ยนหน้าแล้วเฟดเข้าอย่างนุ่มนวล
 * key={pathname} ทำให้ React mount ใหม่ทุกครั้งที่เปลี่ยน route → animation เล่นซ้ำ
 *
 * หมายเหตุสำคัญ: .sp-route ใช้ opacity เท่านั้น ห้ามใส่ transform
 * เพราะจะสร้าง stacking context ทำให้แผนที่ Leaflet และปุ่มลอยเพี้ยน (ดู globals.css §28)
 */
export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="sp-route">
      {children}
    </div>
  );
}
