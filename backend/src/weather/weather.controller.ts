import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get(':city')
  async getWeather(@Param('city') city: string) {
    if (!city || city.trim() === '') {
      throw new BadRequestException('City is required');
    }

    const data = await this.weatherService.getWeather(city);
    
    // Return empty payload if weather fetching fails, allowing frontend fallback logic
    if (!data) {
      return { success: false, weather: [] };
    }

    return data;
  }
}
