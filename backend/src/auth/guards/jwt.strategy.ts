import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const roleCapitalized = payload.role.charAt(0).toUpperCase() + payload.role.slice(1).toLowerCase();
    
    let user;
    if (roleCapitalized === 'Customer') {
      user = await this.prisma.customer.findUnique({ where: { id: payload.sub }, select: { isActive: true } });
    } else if (roleCapitalized === 'Merchant') {
      user = await this.prisma.merchant.findUnique({ where: { id: payload.sub }, select: { isActive: true } });
    } else if (roleCapitalized === 'Driver') {
      user = await this.prisma.driver.findUnique({ where: { id: payload.sub }, select: { isActive: true } });
    } else {
      // Admin or Platform - allow pass
      return { userId: payload.sub, role: payload.role, email: payload.email };
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    if (user.isActive === false) {
      throw new UnauthorizedException('ACCOUNT_SUSPENDED');
    }

    return { userId: payload.sub, role: payload.role, email: payload.email };
  }
}
