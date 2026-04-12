import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException } from '@nestjs/common';
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
