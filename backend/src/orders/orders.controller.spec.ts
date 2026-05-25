// orders.controller.spec.ts — ใช้ mock แทน dependency chain จริง
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            createOrder: jest.fn(),
            getMyOrders: jest.fn(),
            getOrderById: jest.fn(),
            findAllAvailable: jest.fn(),
            acceptOrder: jest.fn(),
            payOrder: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
