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
      const status = error.response?.status;
      this.logger.error(`Failed to fetch weather for city "${city}". Status: ${status}. Error: ${error.message}`);
      return null;
    }
  }

  async getHotspots(): Promise<any[]> {
    // Standard city queries for OWM
    const cities = ['Bangkok,TH', 'Chiang Mai,TH', 'Phuket,TH', 'Chonburi,TH', 'Khon Kaen,TH', 'Korat,TH', 'Surat Thani,TH', 'Hat Yai,TH'];
    const hotspots: any[] = [];

    for (const city of cities) {
      try {
        const data = await this.getWeather(city);
        if (data && data.weather && data.weather.length > 0) {
          const main = data.weather[0].main;
          if (main === 'Rain' || main === 'Thunderstorm' || main === 'Drizzle') {
            hotspots.push({
              city: city.replace(',TH', ''),
              condition: main,
              temp: data.main.temp,
              description: data.weather[0].description,
            });
          }
        }
      } catch (err) {
        // Silently skip failed cities to avoid crashing the whole process or spamming logs
      }
    }

    return hotspots;
  }
}
