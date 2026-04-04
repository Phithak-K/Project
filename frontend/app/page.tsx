import { redirect } from 'next/navigation';

export default function HomePage() {
  // สั่งให้ใครก็ตามที่หลงมาหน้าแรกสุด เด้งไปหน้า login ทันที!
  redirect('/login');
}