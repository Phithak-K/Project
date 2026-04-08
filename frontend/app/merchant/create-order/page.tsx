'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiArrowLeft, FiPackage, FiUser, FiPhone, 
  FiMapPin, FiCloudRain, FiAlertTriangle, FiPlus 
} from 'react-icons/fi';

export default function CreateOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [weatherChecking, setWeatherChecking] = useState(false);
  const [weatherData, setWeatherData] = useState<{ main: string; surge: number } | null>(null);

  const [formData, setFormData] = useState({
    productName: '',
    price: '',
    quantity: '1',
    receiverName: '',
    receiverPhone: '',
    address: '', // แนะนำให้กรอก "เขต/จังหวัด" ไว้ท้ายสุดเพื่อให้ Logic Backend แม่นยำ
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // 1. Helper: อ่าน Token
  const getAuthToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; token=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  // 2. ฟังก์ชันเช็คสภาพอากาศล่วงหน้า (Optional UX)
  const checkWeatherPreview = async () => {
    if (!formData.address) return alert('กรุณากรอกที่อยู่เพื่อเช็คสภาพอากาศ');
    setWeatherChecking(true);
    
    try {
      const addressParts = formData.address.trim().split(/\s+/);
      const city = addressParts[addressParts.length - 1];
      
      const res = await fetch(`${API_URL}/weather/${city}`);
      const data = await res.json();
      
      if (data.weather && data.weather[0]) {
        const main = data.weather[0].main;
        const isRainy = main === 'Rain' || main === 'Thunderstorm';
        setWeatherData({ main, surge: isRainy ? 20 : 0 });
      }
    } catch (err) {
      console.error("Weather check failed");
    } finally {
      setWeatherChecking(false);
    }
  };

  // 3. ฟังก์ชันสร้างออเดอร์จริง
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = getAuthToken();

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity)
        })
      });

      if (res.ok) {
        alert('สร้างออเดอร์สำเร็จ!');
        router.push('/merchant'); // กลับไปหน้า Dashboard
      } else {
        const err = await res.json();
        alert(err.message || 'เกิดข้อผิดพลาดในการสร้างออเดอร์');
      }
    } catch (error) {
      alert('Network Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-purple-600 transition-colors font-bold">
          <FiArrowLeft /> ย้อนกลับ
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="bg-purple-600 p-8 text-white">
            <h1 className="text-2xl font-black flex items-center gap-3">
              <FiPlus className="bg-white/20 p-1 rounded-lg" /> สร้างออเดอร์ใหม่
            </h1>
            <p className="text-purple-100 opacity-80 text-sm mt-1">กรอกรายละเอียดพัสดุและข้อมูลผู้รับให้ครบถ้วน</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* ส่วนข้อมูลสินค้า */}
            <div className="space-y-4">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                <FiPackage className="text-purple-600" /> ข้อมูลพัสดุ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" placeholder="ชื่อสินค้า" required
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                  value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})}
                />
                <input 
                  type="number" placeholder="ราคาสินค้า (บาท)" required
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                  value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                />
              </div>
            </div>

            {/* ส่วนข้อมูลผู้รับ */}
            <div className="space-y-4 pt-4">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                <FiUser className="text-purple-600" /> ข้อมูลผู้รับ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" placeholder="ชื่อผู้รับ" required
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                  value={formData.receiverName} onChange={e => setFormData({...formData, receiverName: e.target.value})}
                />
                <input 
                  type="text" placeholder="เบอร์โทรศัพท์" required
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                  value={formData.receiverPhone} onChange={e => setFormData({...formData, receiverPhone: e.target.value})}
                />
              </div>
              <div className="relative">
                <textarea 
                  placeholder="ที่อยู่จัดส่ง (ระบุ จังหวัด ไว้ท้ายสุด เช่น ... กรุงเทพ)" required rows={3}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                />
                <button 
                  type="button" onClick={checkWeatherPreview} disabled={weatherChecking}
                  className="absolute right-3 bottom-3 text-xs bg-white border border-slate-100 px-3 py-2 rounded-xl font-bold text-purple-600 hover:bg-purple-50 shadow-sm transition-all"
                >
                  {weatherChecking ? 'กำลังเช็ค...' : '🔍 เช็คสภาพอากาศ'}
                </button>
              </div>
            </div>

            {/* Weather Alert & Price Breakdown */}
            {weatherData && (
              <div className={`p-5 rounded-2xl border flex items-start gap-4 animate-in fade-in slide-in-from-top-2 ${weatherData.surge > 0 ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                {weatherData.surge > 0 ? <FiCloudRain size={24} /> : <FiAlertTriangle size={24} />}
                <div>
                  <p className="font-black text-sm uppercase tracking-wide">รายงานสภาพอากาศ: {weatherData.main}</p>
                  <p className="text-xs font-medium opacity-80">
                    {weatherData.surge > 0 
                      ? `ตรวจพบฝนในพื้นที่ปลายทาง มีการบวกค่าบริการพิเศษ +฿${weatherData.surge}` 
                      : 'สภาพอากาศปกติ ไม่มีค่าบริการเพิ่มเติม'}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-6">
              <button 
                type="submit" disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-purple-200 transition-all transform active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
              >
                {loading ? 'กำลังบันทึกออเดอร์...' : 'ยืนยันสร้างออเดอร์'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}