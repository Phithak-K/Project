import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
  private stripe: any;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
  }

  async createTopUpIntent(userId: number, role: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be greater than 0');

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amounts in cents
      currency: 'thb',
      metadata: {
        userId: userId.toString(),
        userRole: role,
        type: 'TOPUP'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  }

  async handleWebhook(sig: string, body: Buffer) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;

    if (!webhookSecret) {
      throw new InternalServerErrorException('Missing STRIPE_WEBHOOK_SECRET configuration');
    }

    try {
      event = this.stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      if (paymentIntent.metadata.type === 'TOPUP') {
         await this.processTopUp(paymentIntent);
      }
    }

    return { received: true };
  }

  private async processTopUp(paymentIntent: any) {
    const userId = parseInt(paymentIntent.metadata.userId, 10);
    const userRole = paymentIntent.metadata.userRole;
    const amount = paymentIntent.amount / 100;

    if (!userId || !userRole) return;

    const modelMap: any = {
      Customer: this.prisma.customer,
      Merchant: this.prisma.merchant,
      Driver: this.prisma.driver,
    };
    if (!modelMap[userRole]) return;

    try {
      await this.prisma.$transaction(async (tx: any) => {
        // ✅ CRITICAL-01 FIX: Idempotency Check อยู่ใน $transaction เดียวกับ write
        // ป้องกัน TOCTOU: ถ้า Stripe retry 2 webhook พร้อมกัน
        // อย่างมากแค่ 1 ใบผ่าน check นี้ได้ก่อน commit
        // อีกใบจะ rollback โดย UniqueConstraintViolation บน referenceId
        const existing = await tx.transaction.findUnique({
          where: { referenceId: paymentIntent.id },
        });
        if (existing) {
          console.log(`Top-up skipped (idempotent): ${paymentIntent.id}`);
          return; // early return = no writes committed
        }

        // 1. Credit Balance
        await tx[userRole.toLowerCase()].update({
          where: { id: userId },
          data: { balance: { increment: amount } },
        });

        // 2. Transaction Record (referenceId @unique เป็น safety net อีกชั้น)
        await tx.transaction.create({
          data: {
            amount,
            type: 'CREDIT',
            note: `Top up via Stripe (Intent: ${paymentIntent.id})`,
            referenceId: paymentIntent.id,
            userId,
            userRole,
          },
        });
      });
      console.log(`Successfully topped up ${amount} THB for ${userRole} ${userId}`);
    } catch (error) {
      console.error(`Failed to process top-up for ${userRole} ${userId}`, error);
      throw new Error(`Webhook processing failed for PaymentIntent ${paymentIntent.id}`);
    }
  }
}
