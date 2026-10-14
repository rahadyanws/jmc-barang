import { createZodDto } from 'nestjs-zod';

import {
  createIncomingGoodsSchema,
  idParamSchema,
  incomingGoodsExportQuerySchema,
  incomingGoodsListQuerySchema,
  updateIncomingGoodsSchema,
  verificationSchema,
} from '../../../shared';

export class CreateIncomingGoodsDto extends createZodDto(createIncomingGoodsSchema) {}
export class UpdateIncomingGoodsDto extends createZodDto(updateIncomingGoodsSchema) {}
export class IncomingGoodsListQueryDto extends createZodDto(incomingGoodsListQuerySchema) {}
export class IncomingGoodsExportQueryDto extends createZodDto(
  incomingGoodsExportQuerySchema,
) {}
export class VerificationDto extends createZodDto(verificationSchema) {}
export class IdParamDto extends createZodDto(idParamSchema) {}
