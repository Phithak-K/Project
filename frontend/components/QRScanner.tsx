'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!isScanning) return;

    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        false
      );

      scannerRef.current.render(
        async (decodedText) => {
          if (isProcessing || scanResult) return; // Prevent double trigger
          
          setIsProcessing(true);
          setScanResult(decodedText);
          
          try {
            await onScanSuccess(decodedText);
          } finally {
            if (scannerRef.current) {
               scannerRef.current.clear();
            }
            setIsScanning(false);
            setIsProcessing(false);
          }
        },
        (error) => {
          if (!isProcessing && onScanFailure) onScanFailure(error);
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner.", error));
        scannerRef.current = null;
      }
    };
  }, [isScanning, isProcessing, scanResult, onScanSuccess, onScanFailure]);

  return (
    <div className="w-full">
      {!isScanning && !scanResult && !isProcessing && (
        <button 
          onClick={() => setIsScanning(true)}
          className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          📷 เปิดกล้องสแกน QR รับเงิน
        </button>
      )}

      {isScanning && !isProcessing && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200 animate-fade-in">
          <div className="p-3 bg-slate-800 text-white flex justify-between items-center">
            <span className="font-bold">เล็งไปที่ QR Code ของลูกค้า</span>
            <button onClick={() => {
               if (scannerRef.current) scannerRef.current.clear();
               setIsScanning(false);
            }} className="text-rose-400 hover:text-rose-300">
               <FiXCircle size={24} />
            </button>
          </div>
          <div id="qr-reader" className="w-full"></div>
        </div>
      )}

      {isProcessing && (
        <div className="w-full bg-indigo-50 text-indigo-700 font-bold py-4 rounded-xl shadow-sm border border-indigo-200 flex items-center justify-center gap-2 animate-pulse">
          <FiLoader size={24} className="animate-spin" />
          กำลังตรวจสอบช้อมูล...
        </div>
      )}

      {scanResult && !isProcessing && (
        <div className="w-full bg-emerald-50 text-emerald-700 font-bold py-4 rounded-xl shadow-sm border border-emerald-200 flex items-center justify-center gap-2">
          <FiCheckCircle size={24} />
          ตรวจสอบข้อมูลสำเร็จ!
        </div>
      )}
    </div>
  );
}
