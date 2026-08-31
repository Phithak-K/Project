import { ImageResponse } from 'next/og';

/**
 * รูปการ์ดพรีวิวตอนแชร์ลิงก์ติดตามพัสดุ (LINE / Facebook / X / Slack)
 *
 * ทำไมเป็น route handler ไม่ใช่ opengraph-image.tsx:
 * ไฟล์ตามชื่อ convention ของ Next มีสิทธิ์เหนือค่า openGraph.images ที่เราระบุเอง
 * และในโหมด dev มันจะตรึง URL ไว้ที่ http://localhost:3000 เสมอ
 * ทำให้แชร์ออกไปข้างนอกแล้วรูปโหลดไม่ขึ้น — เขียนเป็น route เองจึงคุม URL ได้จริง
 *
 * ทำไมจัดทุกอย่างไว้กลางภาพ:
 * LINE ครอปรูปเป็นจัตุรัสเล็กในแชท โดยเอาเฉพาะช่วงกลาง (ประมาณ 630×630 จาก 1200×630)
 * ถ้าวางเนื้อหาชิดซ้ายแบบการ์ด OG ทั่วไป จะโดนตัดจนเหลือแต่เศษตัวอักษร
 * องค์ประกอบทั้งหมดจึงต้องอยู่ในกรอบจัตุรัสกลางภาพ และเลขพัสดุต้องไม่กว้างเกิน ~570px
 *
 * กติกาที่ยึดไว้:
 *   1. ไม่มีข้อมูลส่วนตัว — รูปนี้เปิดได้สาธารณะโดยไม่ต้องล็อกอิน
 *      ห้ามใส่ชื่อผู้รับ เบอร์โทร ที่อยู่ หรือชื่อสินค้า
 *   2. ไม่ใส่สถานะ — แพลตฟอร์มแชท cache การ์ดไว้ต่อ URL
 *      ถ้าใส่ไป การ์ดในแชทจะค้างสถานะ ณ วันที่แชร์ตลอดไป
 *   3. ตัวอักษรละตินล้วน — Satori (ตัววาดรูป) ไม่มีฟอนต์ไทยติดมา
 *      ข้อความไทยไปอยู่ใน title/description แทน ซึ่งแพลตฟอร์มเรนเดอร์เอง
 */

const SIZE = { width: 1200, height: 630 };
const TRACKING_PATTERN = /^SP[A-Z0-9-]{8,15}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const raw = decodeURIComponent(id).toUpperCase();
  // กันไม่ให้ยัดข้อความอะไรก็ได้ผ่าน URL มาโผล่บนรูป
  const code = TRACKING_PATTERN.test(raw) ? raw : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          background: 'linear-gradient(135deg, #1c1613 0%, #120f0d 55%, #241a12 100%)',
          color: '#fdfaf7',
        }}
      >
        {/* โลโก้ */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 44 }}>
          <div
            style={{
              display: 'flex',
              width: 48,
              height: 48,
              marginRight: 16,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #f4661f, #cf3d05)',
            }}
          />
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
            <span>Swift</span>
            <span style={{ color: '#f4661f' }}>Path</span>
          </div>
        </div>

        {/* หัวข้อกำกับ */}
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            letterSpacing: 6,
            color: '#f4661f',
            marginBottom: 16,
          }}
        >
          TRACKING NUMBER
        </div>

        {/* เลขพัสดุ — ขนาดคุมไว้ให้พอดีกรอบจัตุรัสที่ LINE ครอป */}
        <div
          style={{
            display: 'flex',
            fontSize: code ? 72 : 52,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          {code ?? 'Track your parcel'}
        </div>

        {/* เส้นคั่น */}
        <div
          style={{
            display: 'flex',
            width: 108,
            height: 5,
            marginTop: 34,
            marginBottom: 20,
            borderRadius: 999,
            background: 'linear-gradient(90deg, #f4661f, #cf3d05)',
          }}
        />

        <div style={{ display: 'flex', fontSize: 24, color: '#a89f98' }}>
          Real-time delivery tracking
        </div>
      </div>
    ),
    {
      ...SIZE,
      // การ์ดขึ้นกับรหัสพัสดุอย่างเดียว ไม่มีวันเปลี่ยน จึง cache ได้ยาว
      // crawler ของ LINE/Facebook มี timeout สั้นมาก ถ้าวาดรูปใหม่ทุกครั้ง
      // ที่มันมาขอ การ์ดมีสิทธิ์ไม่ขึ้นเฉย ๆ ตอนเน็ตหรือเครื่องช้า
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  );
}
