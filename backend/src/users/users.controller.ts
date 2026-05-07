import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin) // ล็อคให้เฉพาะแอดมินเท่านั้น!
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me — คืนข้อมูล Profile + Balance ของผู้ใช้ที่ Login อยู่
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findOne(req.user.sub, req.user.role);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto, @Body('role') role: string) {
    if (!role) throw new BadRequestException('Role is required');
    return this.usersService.create(createUserDto, role);
  }

  @Get()
  findAll(@Query('role') role: string) {
    if (!role) throw new BadRequestException('Role query parameter is required');
    return this.usersService.findAll(role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('role') role: string) {
    if (!role) throw new BadRequestException('Role query parameter is required');
    return this.usersService.findOne(+id, role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Query('role') role: string) {
    if (!role) throw new BadRequestException('Role query parameter is required');
    return this.usersService.update(+id, updateUserDto, role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('role') role: string) {
    if (!role) throw new BadRequestException('Role query parameter is required');
    return this.usersService.remove(+id, role);
  }
}
