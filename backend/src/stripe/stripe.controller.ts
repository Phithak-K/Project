import { Controller, Post, Body, Req, Headers, BadRequestException, type RawBodyRequest } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-topup')
  async createTopUpIntent(@Body() body: { userId: number; role: string; amount: number }) {
    return this.stripeService.createTopUpIntent(body.userId, body.role, body.amount);
  }

  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    if (!req.rawBody) {
      throw new BadRequestException('Webhook requires raw body buffer for signature validation');
    }
    return this.stripeService.handleWebhook(sig, req.rawBody);
  }
}
