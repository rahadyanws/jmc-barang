import { createZodDto } from 'nestjs-zod';

import {
  createUserSchema,
  idParamSchema,
  lockUserSchema,
  updateUserSchema,
  userListQuerySchema,
  userOptionsQuerySchema,
} from '@jmc/shared';

export class UserListQueryDto extends createZodDto(userListQuerySchema) {}
export class UserOptionsQueryDto extends createZodDto(userOptionsQuerySchema) {}
export class CreateUserDto extends createZodDto(createUserSchema) {}
export class UpdateUserDto extends createZodDto(updateUserSchema) {}
export class LockUserDto extends createZodDto(lockUserSchema) {}
export class IdParamDto extends createZodDto(idParamSchema) {}
