import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, MapPin,
  PackageCheck, Radar, Search, Store, Truck, UserRound,
} from 'lucide-react';

const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';

const guides = [
  {
    id: 'customer', eyebrow: 'สำหรับผู้ส่งพัสดุ', title: 'ลูกค้า', icon: UserRound,
    description: 'เหมาะสำหรับคนที่ต้องการส่งของ ติดตามพัสดุ และดูประวัติการจัดส่ง',
    steps: ['กด “สมัครสมาชิก” แล้วกรอกชื่อ อีเมล และรหัสผ่าน', 'เข้าสู่ระบบ จากนั้นเลือกสร้างรายการจัดส่งใหม่', 'กรอกข้อมูลผู้รับ ที่อยู่ และรายละเอียดพัสดุให้ครบ', 'ตรวจสอบราคา กดยืนยัน แล้วเก็บรหัสพัสดุไว้ติดตามสถานะ'],
    href: '/register', action: 'สมัครบัญชีลูกค้า',
  },
  {
    id: 'merchant', eyebrow: 'สำหรับเจ้าของกิจการ', title: 'ร้านค้า', icon: Store,
    description: 'เหมาะสำหรับร้านที่มีหลายออเดอร์ ต้องการจัดการสินค้า คนขับ และยอดขายในที่เดียว',
    steps: ['เปิด Store Portal แล้วสมัครบัญชีร้านค้า', 'กรอกข้อมูลร้าน ชื่อผู้ติดต่อ และข้อมูลเข้าสู่ระบบ', 'เข้าแดชบอร์ดเพื่อเพิ่มสินค้า หรือสร้างออเดอร์ให้ลูกค้า', 'ติดตามคนขับและสถานะทุกออเดอร์จากหน้าแดชบอร์ด'],
    href: `//store.${baseDomain}/register`, action: 'สมัครเปิดร้านค้า',
  },
  {
    id: 'driver', eyebrow: 'สำหรับผู้ให้บริการขนส่ง', title: 'คนขับ', icon: Truck,
    description: 'เหมาะสำหรับคนขับที่ต้องการค้นหางาน รับงาน และส่งตำแหน่งระหว่างจัดส่ง',
    steps: ['เปิด Fleet Portal แล้วสมัครเป็นคนขับ', 'เข้าสู่ระบบและเปิด Fleet Radar เพื่อดูงานที่พร้อมรับ', 'กดรับงาน ตรวจสอบข้อมูลผู้รับ และเริ่มการจัดส่ง', 'อนุญาตตำแหน่ง GPS ระหว่างทำงาน หรือเลือกโหมด Demo เมื่อต้องการทดลอง'],
    href: `//fleet.${baseDomain}/register`, action: 'สมัครเป็นคนขับ',
  },
];

const quickActions = [
  { icon: Search, title: 'มีรหัสพัสดุแล้ว', text: 'นำรหัส SP… ไปค้นหาได้ทันที ไม่จำเป็นต้องเข้าสู่ระบบ', href: '/track', action: 'ติดตามพัสดุ' },
  { icon: Radar, title: 'กำลังทดลองระบบ', text: 'คนขับสามารถใช้โหมด Demo เพื่อจำลองเส้นทางได้โดยไม่ต้องเปิด GPS จริง', href: `//fleet.${baseDomain}/login`, action: 'เข้า Fleet Portal' },
  { icon: MapPin, title: 'GPS ใช้งานไม่ได้', text: 'ตรวจว่าเบราว์เซอร์อนุญาตตำแหน่ง หากไม่สะดวกให้เลือกโหมด Demo', href: '#help', action: 'ดูวิธีแก้ปัญหา' },
];

export default function GuidePage() {
  return (
    <div className="guide-shell">
      <nav className="guide-nav">
        <Link href="/" className="landing-brand" aria-label="กลับหน้าแรก SwiftPath">
          <span className="landing-brand-mark"><PackageCheck size={19} /></span>
          <span>Swift<strong>Path</strong></span>
        </Link>
        <Link href="/" className="guide-back"><ArrowLeft size={16} /> กลับหน้าแรก</Link>
      </nav>

      <main>
        <section className="guide-hero">
          <span className="guide-eyebrow"><CircleHelp size={16} /> คู่มือสำหรับผู้เริ่มต้น</span>
          <h1>เริ่มใช้งาน SwiftPath<br /><span>ได้ในไม่กี่ขั้นตอน</span></h1>
          <p>ไม่ต้องเข้าใจศัพท์เทคนิค เพียงเลือกว่าคุณเป็นลูกค้า ร้านค้า หรือคนขับ แล้วทำตามขั้นตอนด้านล่างได้เลย</p>
          <div className="guide-role-jumps" aria-label="เลือกประเภทผู้ใช้งาน">
            <a href="#customer"><UserRound size={17} /> ลูกค้า</a>
            <a href="#merchant"><Store size={17} /> ร้านค้า</a>
            <a href="#driver"><Truck size={17} /> คนขับ</a>
          </div>
        </section>

        <section className="guide-grid" aria-label="วิธีใช้งานตามประเภทผู้ใช้">
          {guides.map(({ id, eyebrow, title, description, icon: Icon, steps, href, action }) => (
            <article className="guide-role-card" id={id} key={id}>
              <div className="guide-role-heading">
                <span className="guide-role-icon"><Icon size={23} /></span>
                <div><small>{eyebrow}</small><h2>{title}</h2></div>
              </div>
              <p>{description}</p>
              <ol>{steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
              <a href={href} className="guide-card-action">{action} <ArrowRight size={17} /></a>
            </article>
          ))}
        </section>

        <section className="guide-quick">
          <div className="guide-section-heading"><span>ทางลัดที่ควรรู้</span><h2>ต้องการทำอะไรตอนนี้?</h2></div>
          <div className="guide-quick-grid">
            {quickActions.map(({ icon: Icon, title, text, href, action }) => (
              <a href={href} className="guide-quick-card" key={title}>
                <Icon size={21} /><h3>{title}</h3><p>{text}</p><span>{action} <ArrowRight size={15} /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="guide-help" id="help">
          <div><span><CheckCircle2 size={17} /> แก้ปัญหาเบื้องต้น</span><h2>ถ้าหน้าจอค้างหรือข้อมูลยังไม่เปลี่ยน</h2></div>
          <ul>
            <li>กดรีเฟรชหน้าเว็บหนึ่งครั้ง หรือกด Ctrl + Shift + R บนคอมพิวเตอร์</li>
            <li>ตรวจว่าเปิดเว็บถูก Portal: ลูกค้าใช้หน้าหลัก ร้านค้าใช้ store และคนขับใช้ fleet</li>
            <li>ถ้าเข้าสู่ระบบไม่ได้ ให้ตรวจชื่อผู้ใช้ รหัสผ่าน และสถานะการยืนยันบัญชี</li>
            <li>ถ้า GPS ไม่ทำงาน ให้กดอนุญาตตำแหน่งจากไอคอนข้างช่องที่อยู่เว็บไซต์</li>
          </ul>
        </section>
      </main>

      <footer className="guide-footer"><span>ยังไม่แน่ใจว่าจะเริ่มตรงไหน?</span><Link href="/track">ลองติดตามพัสดุก่อน <ArrowRight size={16} /></Link></footer>
    </div>
  );
}
