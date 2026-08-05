'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CloudSun,
  MapPinned,
  PackageCheck,
  Radar,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
  WalletCards,
} from 'lucide-react';

const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';

const portals = [
  {
    label: 'สำหรับลูกค้า',
    title: 'ส่งง่าย ติดตามได้ทุกจังหวะ',
    description: 'สร้างรายการจัดส่ง ตรวจสอบสถานะแบบเรียลไทม์ และจัดการค่าใช้จ่ายในที่เดียว',
    href: '/login',
    icon: UserRound,
    action: 'เข้าสู่ระบบลูกค้า',
    tone: 'customer',
  },
  {
    label: 'สำหรับร้านค้า',
    title: 'จัดการออเดอร์ให้ธุรกิจเดินไว',
    description: 'รวมออเดอร์ สินค้า คนขับ และยอดขายไว้บนแดชบอร์ดที่เห็นภาพทันที',
    href: `//store.${baseDomain}/login`,
    icon: Store,
    action: 'เปิด Store Portal',
    tone: 'merchant',
  },
  {
    label: 'สำหรับคนขับ',
    title: 'เห็นงานใกล้ตัว รับงานได้ทันที',
    description: 'ค้นหางานผ่าน Fleet Radar พร้อมเส้นทาง สถานะงาน และรายได้แบบเรียลไทม์',
    href: `//fleet.${baseDomain}/login`,
    icon: Truck,
    action: 'เปิด Fleet Portal',
    tone: 'driver',
  },
];

export default function SwiftPathLanding() {
  return (
    <div className="landing-shell">
      <nav className="landing-nav">
        <Link href="/" className="landing-brand" aria-label="SwiftPath หน้าแรก">
          <span className="landing-brand-mark"><PackageCheck size={19} /></span>
          <span>Swift<strong>Path</strong></span>
        </Link>
        <div className="landing-nav-actions">
          <Link href="/guide" className="landing-nav-link">วิธีใช้งาน</Link>
          <Link href="/track" className="landing-nav-link">ติดตามพัสดุ</Link>
          <Link href="/login" className="landing-nav-cta">
            เข้าสู่ระบบ <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>

      <main>
        <section className="landing-hero">
          <div className="landing-glow landing-glow-one" />
          <div className="landing-glow landing-glow-two" />

          <div className="landing-hero-copy sp-animate">
            <div className="landing-kicker">
              <span className="landing-live-dot" />
              Logistics operating system
            </div>
            <h1>
              ส่งทุกออเดอร์<br />
              <span>ไปถึงอย่างมั่นใจ</span>
            </h1>
            <p>
              แพลตฟอร์มขนส่งที่เชื่อมลูกค้า ร้านค้า และคนขับไว้ด้วยกัน
              ตั้งแต่สร้างออเดอร์จนถึงส่งสำเร็จ—รวดเร็ว โปร่งใส และติดตามได้
            </p>
            <div className="landing-hero-actions">
              <a href={`//store.${baseDomain}/register`} className="landing-primary-action">
                เริ่มต้นสำหรับร้านค้า <ArrowRight size={18} />
              </a>
              <Link href="/track" className="landing-secondary-action">
                <Radar size={17} /> ติดตามพัสดุ
              </Link>
            </div>
            <div className="landing-proof-row">
              <span><CheckCircle2 size={15} /> ติดตามแบบ Real-time</span>
              <span><CheckCircle2 size={15} /> แยก Portal ตามบทบาท</span>
              <span><CheckCircle2 size={15} /> รองรับทุกอุปกรณ์</span>
            </div>
          </div>

          <div className="landing-visual sp-animate-d2" aria-label="ตัวอย่างภาพรวมระบบขนส่ง">
            <div className="landing-visual-topbar">
              <span><i /> Live operations</span>
              <span>Today, 10:42</span>
            </div>
            <div className="landing-visual-map">
              <div className="route-line route-line-one" />
              <div className="route-line route-line-two" />
              <span className="map-point map-point-a"><Store size={15} /></span>
              <span className="map-point map-point-b"><Truck size={15} /></span>
              <span className="map-point map-point-c"><MapPinned size={15} /></span>
              <div className="delivery-pill">
                <span className="delivery-icon"><Truck size={17} /></span>
                <span><small>กำลังจัดส่ง</small><strong>SP-2048-TH</strong></span>
                <em>12 นาที</em>
              </div>
            </div>
            <div className="landing-visual-stats">
              <div><span>ส่งสำเร็จ</span><strong>98.7%</strong><small>+4.2%</small></div>
              <div><span>งานวันนี้</span><strong>248</strong><small>Live</small></div>
              <div><span>เวลาเฉลี่ย</span><strong>34m</strong><small>-8m</small></div>
            </div>
          </div>
        </section>

        <section className="landing-portals">
          <div className="landing-section-heading">
            <div>
              <span>One network, three experiences</span>
              <h2>พื้นที่ทำงานที่ออกแบบมาเพื่อคุณ</h2>
            </div>
            <p>แต่ละบทบาทเห็นเฉพาะเครื่องมือที่จำเป็น จึงเริ่มงานได้เร็วและใช้งานได้โดยไม่ซับซ้อน</p>
          </div>

          <div className="landing-portal-grid sp-stagger">
            {portals.map(({ label, title, description, href, icon: Icon, action, tone }) => (
              <a key={tone} href={href} className={`landing-portal-card landing-portal-${tone}`}>
                <div className="landing-portal-head">
                  <span className="landing-portal-icon"><Icon size={22} /></span>
                  <span className="landing-portal-label">{label}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="landing-portal-action">{action} <ArrowUpRight size={16} /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="landing-capabilities">
          <div className="landing-capability-copy">
            <span className="landing-section-tag">Built for daily operations</span>
            <h2>ข้อมูลที่ต้องใช้<br />อยู่ตรงที่ต้องเห็น</h2>
            <p>ลดงานซ้ำและการสลับหน้าจอ ด้วย workflow ที่พาทุกฝ่ายไปในทิศทางเดียวกัน</p>
            <Link href="/register">สร้างบัญชีลูกค้า <ArrowRight size={16} /></Link>
          </div>
          <div className="landing-feature-list">
            {[
              [BarChart3, 'แดชบอร์ดธุรกิจ', 'ดูยอดขาย สถานะออเดอร์ และประสิทธิภาพการจัดส่งแบบสรุป'],
              [Radar, 'Fleet Radar', 'กระจายงานให้คนขับและเห็นงานที่พร้อมรับในพื้นที่ได้ทันที'],
              [CloudSun, 'Smart weather pricing', 'คำนวณผลกระทบจากสภาพอากาศเพื่อราคาและ ETA ที่แม่นยำขึ้น'],
              [WalletCards, 'Wallet & payment', 'จัดการยอดคงเหลือและประวัติรายการทางการเงินอย่างเป็นระบบ'],
            ].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof BarChart3;
              return (
                <div className="landing-feature" key={title as string}>
                  <span><FeatureIcon size={20} /></span>
                  <div><h3>{title as string}</h3><p>{description as string}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <span><ShieldCheck size={17} /> SwiftPath Network</span>
            <h2>พร้อมเปลี่ยนทุกการจัดส่ง<br />ให้จัดการง่ายขึ้นหรือยัง?</h2>
          </div>
          <a href={`//store.${baseDomain}/register`}>
            สมัครเป็นร้านค้า <ArrowRight size={18} />
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-brand">
          <span className="landing-brand-mark"><PackageCheck size={18} /></span>
          <span>Swift<strong>Path</strong></span>
        </div>
        <p><Link href="/guide">คู่มือเริ่มต้นใช้งาน</Link> · ระบบจัดการขนส่งสำหรับธุรกิจและชีวิตประจำวัน</p>
        <span>© 2026 SwiftPath Logistics</span>
      </footer>
    </div>
  );
}
