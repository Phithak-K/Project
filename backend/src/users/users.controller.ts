import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me — คืนข้อมูล Profile + Balance ของผู้ใช้ที่ Login อยู่
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findOne(req.user.userId, req.user.role);
  }

  // ==== ✅ SME Feature: Driver Management (Merchant Only) ====

  /** GET /users/my-drivers — คนขับที่สังกัดร้านของ Merchant */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('my-drivers')
  getMyDrivers(@Req() req: any) {
    return this.usersService.getMyDrivers(req.user.userId);
  }

  /** GET /users/find-driver?contact=xxx — ค้นหาคนขับก่อน Link */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('find-driver')
  findDriverByContact(@Query('contact') contact: string) {
    if (!contact) throw new BadRequestException('กรุณาระบุ email หรือเบอร์โทรของคนขับ');
    return this.usersService.findDriverByContact(contact);
  }

  /** PATCH /users/drivers/:driverId/link — ผูกคนขับกับร้านค้า */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Patch('drivers/:driverId/link')
  linkDriver(@Param('driverId') driverId: string, @Req() req: any) {
    return this.usersService.linkDriverToMerchant(Number(driverId), req.user.userId);
  }

  /** PATCH /users/drivers/:driverId/unlink — ยกเลิกความสัมพันธ์ Driver กับร้าน */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Patch('drivers/:driverId/unlink')
  unlinkDriver(@Param('driverId') driverId: string, @Req() req: any) {
    return this.usersService.unlinkDriverFromMerchant(Number(driverId), req.user.userId);
  }

  // ==== Admin-only routes ====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post()
  create(@Body() createUserDto: CreateUserDto, @Body('role') role: string) {
    if (!role) throw new BadRequestException('Role is required');
    return this.usersService.create(createUserDto, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get()
  findAll(@Query('role') role: string) {
    if (!role) throw new BadRequestException('Role query parameter is required');
    return this.usersService.findAll(role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get(':id')
  findOne(@Param('id') id: string, @Query('role') role: string) {
    if (!role) throw new BadRequestException('Role query parameter is required');
    return this.usersService.findOne(+id, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Query('role') role: string) {
    if (!role) throw new BadRequestException('Role query parameter is required');
    return this.usersService.update(+id, updateUserDto, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string, @Query('role') role: string) {
    if (!role) throw new BadRequestException('Role query parameter is required');
    return this.usersService.remove(+id, role);
  }
}
