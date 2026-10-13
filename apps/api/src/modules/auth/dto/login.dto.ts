import { createZodDto } from 'nestjs-zod';

import { loginSchema } from '@jmc/shared';

export class LoginDto extends createZodDto(loginSchema) {}
