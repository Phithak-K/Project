import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private configService: ConfigService) {}

  async getWeather(city: string): Promise<any> {
    try {
      const apiKey = this.configService.get<string>('WEATHER_API_KEY');
      if (!apiKey) {
        this.logger.warn('WEATHER_API_KEY is not defined in .env');
        return null;
      }

      const url = `https://api.openweathermap.org/data/2.5/weather`;
      const response = await axios.get(url, {
        params: {
          q: city,
          appid: apiKey,
          units: 'metric',
        },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch weather for ${city}: ${error.message}`);
      return null;
    }
  }
}
