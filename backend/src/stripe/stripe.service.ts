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
    const amount = paymentIntent.amount / 100; // Convert back from cents

    if (!userId || !userRole) return;

    // Determine model
    const modelMap: any = {
      Customer: this.prisma.customer,
      Merchant: this.prisma.merchant,
      Driver: this.prisma.driver
    };
    
    const dbModel = modelMap[userRole];
    if (!dbModel) return;

    // 🆕 1. Check Idempotency (Prevent Double Credit)
    const existingTransaction = await this.prisma.transaction.findUnique({
      where: { referenceId: paymentIntent.id }
    });
    if (existingTransaction) {
      console.log(`Top-up skipped: PaymentIntent ${paymentIntent.id} already processed.`);
      return;
    }

    // Atomic Transaction for Wallet Security
    try {
      await this.prisma.$transaction(async (tx: any) => {
        // 1. Update Balance Safely
        await tx[userRole.toLowerCase()].update({
          where: { id: userId },
          data: {
            balance: {
              increment: amount
            }
          }
        });

        // 2. Create Transaction Record
        await tx.transaction.create({
          data: {
            amount: amount,
            type: 'CREDIT',
            note: `Top up via Stripe (Intent: ${paymentIntent.id})`,
            referenceId: paymentIntent.id,
            userId: userId,
            userRole: userRole
          }
        });
      });
      console.log(`Successfully topped up ${amount} THB for ${userRole} ${userId}`);
    } catch (error) {
      // [L-05] FIX: Throw error เพื่อให้ Stripe รู้ว่าต้อง Retry (ไม่กลืน Error เงียบๆ)
      console.error(`Failed to process top-up for ${userRole} ${userId}`, error);
      throw new Error(`Webhook processing failed for PaymentIntent ${paymentIntent.id}`);
    }
  }
}
