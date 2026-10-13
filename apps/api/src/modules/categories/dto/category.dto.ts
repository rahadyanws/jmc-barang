import { createZodDto } from 'nestjs-zod';

import {
  categoryListQuerySchema,
  createCategorySchema,
  idParamSchema,
  updateCategorySchema,
} from '@jmc/shared';

export class CategoryListQueryDto extends createZodDto(categoryListQuerySchema) {}
export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
export class IdParamDto extends createZodDto(idParamSchema) {}
