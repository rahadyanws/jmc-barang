import { createZodDto } from 'nestjs-zod';

import {
  createSubCategorySchema,
  idParamSchema,
  subCategoryListQuerySchema,
  subCategoryOptionsQuerySchema,
  updateSubCategorySchema,
} from '../../../shared';

export class SubCategoryListQueryDto extends createZodDto(subCategoryListQuerySchema) {}
export class SubCategoryOptionsQueryDto extends createZodDto(subCategoryOptionsQuerySchema) {}
export class CreateSubCategoryDto extends createZodDto(createSubCategorySchema) {}
export class UpdateSubCategoryDto extends createZodDto(updateSubCategorySchema) {}
export class IdParamDto extends createZodDto(idParamSchema) {}
