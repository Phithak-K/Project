import { Controller, Post, Body, Req, Headers, BadRequestException, UseGuards, type RawBodyRequest } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // [C-01] FIX: ต้อง Login ก่อน และอ่าน userId/role จาก JWT Token โดยตรง ไม่รับจาก Body
  // [H-04] FIX: ตรวจสอบ Max Amount ไม่เกิน 100,000 บาท
  @UseGuards(JwtAuthGuard)
  @Post('create-topup')
  async createTopUpIntent(@Req() req: any, @Body() body: { amount: number }) {
    if (!body.amount || body.amount <= 0) throw new BadRequestException('จำนวนเงินต้องมากกว่า 0');
    if (body.amount > 100000) throw new BadRequestException('ไม่สามารถเติมเงินเกิน 100,000 บาทต่อครั้ง');
    // อ่าน userId และ role จาก JWT Token ที่ยืนยันแล้ว ไม่ใช่จาก Body
    return this.stripeService.createTopUpIntent(req.user.sub, req.user.role, body.amount);
  }

  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    if (!req.rawBody) {
      throw new BadRequestException('Webhook requires raw body buffer for signature validation');
    }
    return this.stripeService.handleWebhook(sig, req.rawBody);
  }
}
