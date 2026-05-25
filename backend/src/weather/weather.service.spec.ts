// weather.service.spec.ts — ใช้ mock ConfigService แทนการ inject จริง
import { Test, TestingModule } from '@nestjs/testing';
import { WeatherService } from './weather.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

describe('WeatherService', () => {
  let service: WeatherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-api-key') } },
        { provide: HttpService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
