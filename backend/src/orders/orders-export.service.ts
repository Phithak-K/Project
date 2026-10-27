import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
const PDFDocument = require('pdfkit');

const CHART_TZ = 'Asia/Bangkok';

/** แปลงช่วงวันที่ YYYY-MM-DD ให้ครอบคลุม 00:00:00 ถึง 23:59:59.999 ตามเวลาไทย (UTC+7) */
function parseBangkokDateFilter(startDate?: string, endDate?: string) {
  const filter: any = {};
  if (startDate) {
    filter.gte = startDate.includes('T')
      ? new Date(startDate)
      : new Date(`${startDate}T00:00:00.000+07:00`);
  }
  if (endDate) {
    filter.lte = endDate.includes('T')
      ? new Date(endDate)
      : new Date(`${endDate}T23:59:59.999+07:00`);
  }
  return filter;
}

@Injectable()
export class OrdersExportService {
  constructor(private prisma: PrismaService) {}

  // ==== ✅ SME Feature: Export รายการออเดอร์เป็น CSV ====
  async exportOrdersCsv(
    merchantId: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<string> {
    const whereClause: any = { merchantId: Number(merchantId) };

    if (dateFrom || dateTo) {
      whereClause.createdAt = parseBangkokDateFilter(dateFrom, dateTo);
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        driver: { select: { name: true, vehiclePlate: true } },
      },
    });

    const headers = [
      'Tracking Number',
      'วันที่สร้าง',
      'สินค้า',
      'จำนวนรายการ',
      'ราคาสุทธิ (บาท)',
      'สถานะ',
      'ชื่อผู้รับ',
      'เบอร์ผู้รับ',
      'ที่อยู่',
      'คนขับ',
      'ทะเบียน',
    ];

    const rows = orders.map((o) => [
      o.trackingNumber,
      new Date(o.createdAt).toLocaleDateString('th-TH', {
        timeZone: CHART_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      o.productName || '-',
      o.items.length > 0 ? o.items.length : 1,
      Number(o.totalPrice || o.price).toFixed(2),
      o.status,
      o.receiverName,
      o.receiverPhone,
      `"${o.address.replace(/"/g, '""')}"`,
      o.driver?.name || '-',
      o.driver?.vehiclePlate || '-',
    ]);

    const csvLines = [headers.join(','), ...rows.map((r) => r.join(','))];
    return csvLines.join('\n');
  }

  // ==== ✅ SME Feature: Generate PDF Delivery Order ====
  async exportOrderPdf(
    orderId: number,
    userId: number,
    userRole: string,
    res: Response,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        merchant: true,
        customer: true,
        driver: true,
      },
    });

    if (!order) throw new BadRequestException('Order not found');

    // Auth Check — [SEC-02 FIX] เพิ่ม Driver guard ป้องกัน Driver คนอื่นดู PDF
    if (userRole === 'Merchant' && order.merchantId !== userId)
      throw new ForbiddenException('Access denied');
    if (userRole === 'Customer' && order.customerId !== userId)
      throw new ForbiddenException('Access denied');
    if (userRole === 'Driver') {
      if (!order.driverId || order.driverId !== userId)
        throw new ForbiddenException(
          'Access denied: คุณไม่ใช่คนขับของออเดอร์นี้',
        );
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="delivery-order-${order.trackingNumber}.pdf"`,
    );

    doc.pipe(res);

    // Register Thai Font
    const regularFontPath = path.join(
      process.cwd(),
      'assets',
      'fonts',
      'Kanit-Regular.ttf',
    );
    const boldFontPath = path.join(
      process.cwd(),
      'assets',
      'fonts',
      'Kanit-Bold.ttf',
    );

    if (fs.existsSync(regularFontPath)) {
      doc.registerFont('Kanit', regularFontPath);
      doc.font('Kanit');
    }
    if (fs.existsSync(boldFontPath)) {
      doc.registerFont('Kanit-Bold', boldFontPath);
    }

    // Header
    doc.fontSize(24).text('ใบส่งของ / Delivery Order', { align: 'center' });
    doc.moveDown(1);

    // Store Info
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.fontSize(14).text('ข้อมูลร้านค้า (Merchant)');
    if (fs.existsSync(regularFontPath)) doc.font('Kanit');
    doc
      .fontSize(12)
      .text(`ร้าน: ${order.merchant?.storeName || 'SwiftPath Shop'}`);
    doc.text(`เบอร์โทร: ${order.merchant?.phone || '-'}`);
    doc.moveDown(1);

    // Customer Info
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.fontSize(14).text('ข้อมูลผู้รับ (Receiver)');
    if (fs.existsSync(regularFontPath)) doc.font('Kanit');
    doc.fontSize(12).text(`ชื่อผู้รับ: ${order.receiverName}`);
    doc.text(`เบอร์โทร: ${order.receiverPhone}`);
    doc.text(`ที่อยู่จัดส่ง: ${order.address}`);
    doc.moveDown(1);

    // Order Info
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.fontSize(14).text('รายละเอียดคำสั่งซื้อ (Order Details)');
    if (fs.existsSync(regularFontPath)) doc.font('Kanit');
    doc.fontSize(12).text(`หมายเลขติดตาม (Tracking): ${order.trackingNumber}`);
    doc.text(
      `วันที่สร้าง: ${new Date(order.createdAt).toLocaleString('th-TH', { timeZone: CHART_TZ })}`,
    );
    doc.moveDown(1);

    // Items Table Header
    const startY = doc.y;
    doc.rect(50, startY, 495, 25).fillAndStroke('#f3f4f6', '#d1d5db');
    doc.fillColor('#111827');
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.text('รายการสินค้า (Item)', 60, startY + 7);
    doc.text('จำนวน (Qty)', 350, startY + 7);
    doc.text('ราคา (Price)', 420, startY + 7, { width: 70, align: 'right' });
    if (fs.existsSync(regularFontPath)) doc.font('Kanit');

    // Items List
    let currentY = startY + 30;
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        doc.text(`${index + 1}. ${item.productName}`, 60, currentY);
        doc.text(`${item.quantity}`, 350, currentY);
        doc.text(
          `฿${Number(item.totalPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
          420,
          currentY,
          { width: 70, align: 'right' },
        );
        currentY += 20;
      });
    } else {
      doc.text(`1. ${order.productName || 'สินค้าทั่วไป'}`, 60, currentY);
      doc.text(`${order.quantity || 1}`, 350, currentY);
      doc.text(
        `฿${Number(order.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
        420,
        currentY,
        { width: 70, align: 'right' },
      );
      currentY += 20;
    }

    doc.moveTo(50, currentY).lineTo(545, currentY).stroke('#d1d5db');
    currentY += 10;

    // Total Amount
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.text('รวมสุทธิ (Total Amount):', 300, currentY);
    doc.text(
      `฿${Number(order.totalPrice || order.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      420,
      currentY,
      { width: 70, align: 'right' },
    );

    // Footer Signatures
    doc.moveDown(4);
    const signY = doc.y;
    doc.text(
      'ผู้ส่งของ (Driver)..........................................',
      50,
      signY,
    );
    doc.text(
      'ผู้รับของ (Receiver)..........................................',
      300,
      signY,
    );

    doc.end();
  }
}
