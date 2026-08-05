'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, XCircle } from 'lucide-react';

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
        scannerRef.current.clear().catch(error => console.warn("Scanner cleanup skipped.", error));
        scannerRef.current = null;
      }
    };
  }, [isScanning, isProcessing, scanResult, onScanSuccess, onScanFailure]);

  return (
    <div style={{ width: '100%' }}>
      {!isScanning && !scanResult && !isProcessing && (
        <button
          onClick={() => setIsScanning(true)}
          className="sp-btn-primary sp-btn-full"
          style={{ padding: '1rem' }}
        >
          เปิดกล้องสแกน QR รับเงิน
        </button>
      )}

      {isScanning && !isProcessing && (
        <div className="sp-card sp-animate" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--n-800)', color: 'var(--n-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>เล็งไปที่ QR Code ของลูกค้า</span>
            <button
              type="button"
              aria-label="ปิดกล้องสแกน"
              onClick={() => {
                if (scannerRef.current) scannerRef.current.clear();
                setIsScanning(false);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--danger-500, #f43f5e)', cursor: 'pointer' }}
            >
               <XCircle size={24} />
            </button>
          </div>
          <div id="qr-reader" style={{ width: '100%' }}></div>
        </div>
      )}

      {isProcessing && (
        <div className="sp-alert sp-animate" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span className="sp-spinner" />
          กำลังตรวจสอบข้อมูล...
        </div>
      )}

      {scanResult && !isProcessing && (
        <div className="sp-alert sp-alert-success sp-animate" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <CheckCircle size={24} />
          ตรวจสอบข้อมูลสำเร็จ!
        </div>
      )}
    </div>
  );
}
