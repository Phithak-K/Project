// orders.controller.spec.ts — ใช้ mock แทน dependency chain จริง
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: any;

  beforeEach(async () => {
    ordersService = {
      createOrder: jest.fn(),
      getMyOrders: jest.fn(),
      getOrderById: jest.fn(),
      findAllAvailable: jest.fn(),
      acceptOrder: jest.fn(),
      payOrder: jest.fn(),
      optimizeDeliveryRoute: jest.fn().mockResolvedValue({ totalStops: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: ordersService,
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

  it('should call ordersService.optimizeDeliveryRoute with parsed lat and lng', async () => {
    const mockReq = { user: { userId: 10 } };
    await controller.getRouteOptimization(mockReq, '13.75', '100.5');
    expect(ordersService.optimizeDeliveryRoute).toHaveBeenCalledWith(
      10,
      13.75,
      100.5,
    );
  });

  it('should pass undefined for lat and lng when omitted in getRouteOptimization', async () => {
    const mockReq = { user: { userId: 10 } };
    await controller.getRouteOptimization(mockReq);
    expect(ordersService.optimizeDeliveryRoute).toHaveBeenCalledWith(
      10,
      undefined,
      undefined,
    );
  });
});
