import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import type { SessionUser } from '@jmc/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  IdParamDto,
  LockUserDto,
  UpdateUserDto,
  UserListQueryDto,
  UserOptionsQueryDto,
} from './dto/user.dto';

@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: UserListQueryDto) {
    return this.usersService.list(query);
  }

  @Get('options')
  options(@Query() query: UserOptionsQueryDto) {
    return this.usersService.options(query.role);
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Get(':id')
  getById(@Param() params: IdParamDto) {
    return this.usersService.getById(params.id);
  }

  @Put(':id')
  update(@Param() params: IdParamDto, @Body() body: UpdateUserDto) {
    return this.usersService.update(params.id, body);
  }

  @Patch(':id/lock')
  lock(
    @Param() params: IdParamDto,
    @Body() body: LockUserDto,
    @CurrentUser() actor: SessionUser,
  ) {
    return this.usersService.lock(params.id, body, actor.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param() params: IdParamDto, @CurrentUser() actor: SessionUser): Promise<void> {
    return this.usersService.remove(params.id, actor.id);
  }
}
