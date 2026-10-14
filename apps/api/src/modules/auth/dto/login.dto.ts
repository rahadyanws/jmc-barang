import { createZodDto } from 'nestjs-zod';

import { loginSchema } from '../../../shared';

export class LoginDto extends createZodDto(loginSchema) {}
