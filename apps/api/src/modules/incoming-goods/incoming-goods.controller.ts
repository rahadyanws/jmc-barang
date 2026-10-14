import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

import type { SessionUser } from '../../shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { env } from '../../config/env';
import { ExportService } from './export.service';
import { IncomingGoodsService } from './incoming-goods.service';
import { PrintService } from './print.service';
import {
  CreateIncomingGoodsDto,
  IdParamDto,
  IncomingGoodsExportQueryDto,
  IncomingGoodsListQueryDto,
  UpdateIncomingGoodsDto,
  VerificationDto,
} from './dto/incoming-goods.dto';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('incoming-goods')
export class IncomingGoodsController {
  constructor(
    private readonly incomingGoodsService: IncomingGoodsService,
    private readonly exportService: ExportService,
    private readonly printService: PrintService,
  ) {}

  @Get()
  list(@Query() query: IncomingGoodsListQueryDto, @CurrentUser() actor: SessionUser) {
    return this.incomingGoodsService.list(query, actor);
  }

  @Get('years')
  years(@CurrentUser() actor: SessionUser) {
    return this.incomingGoodsService.getYears(actor);
  }

  /** BR-20: export Excel mengikuti filter/search/sort aktif. */
  @Get('export')
  async export(
    @Query() query: IncomingGoodsExportQueryDto,
    @CurrentUser() actor: SessionUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await this.exportService.exportExcel(query, actor);
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.end(buffer);
  }

  @Post()
  create(@Body() body: CreateIncomingGoodsDto, @CurrentUser() actor: SessionUser) {
    return this.incomingGoodsService.create(body, actor);
  }

  @Get(':id')
  getById(@Param() params: IdParamDto, @CurrentUser() actor: SessionUser) {
    return this.incomingGoodsService.getById(params.id, actor);
  }

  @Put(':id')
  update(
    @Param() params: IdParamDto,
    @Body() body: UpdateIncomingGoodsDto,
    @CurrentUser() actor: SessionUser,
  ) {
    return this.incomingGoodsService.update(params.id, body, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param() params: IdParamDto, @CurrentUser() actor: SessionUser): Promise<void> {
    return this.incomingGoodsService.remove(params.id, actor);
  }

  @Patch(':id/verification')
  @Roles('ADMIN')
  setVerification(
    @Param() params: IdParamDto,
    @Body() body: VerificationDto,
    @CurrentUser() actor: SessionUser,
  ) {
    return this.incomingGoodsService.setVerification(params.id, body.verified, actor);
  }

  /** AS-19: cetak Surat Barang Masuk (PDF, inline). */
  @Get(':id/print')
  async print(
    @Param() params: IdParamDto,
    @CurrentUser() actor: SessionUser,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.printService.printPdf(params.id, actor);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.end(pdf);
  }

  @Post(':id/attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: env.MAX_ATTACHMENT_MB * 1024 * 1024 },
    }),
  )
  uploadAttachment(
    @Param() params: IdParamDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: SessionUser,
  ) {
    if (file == null) {
      throw new BadRequestException({
        code: 'FILE_INVALID',
        message: 'Lampiran harus berformat doc, docx, atau zip (maks 4 MB)',
      });
    }
    return this.incomingGoodsService.uploadAttachment(params.id, file, actor);
  }

  @Get(':id/attachment')
  getAttachment(@Param() params: IdParamDto, @CurrentUser() actor: SessionUser) {
    return this.incomingGoodsService.getAttachment(params.id, actor);
  }

  @Get(':id/attachment/content')
  async getAttachmentContent(
    @Param() params: IdParamDto,
    @CurrentUser() actor: SessionUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, mime, fileName } = await this.incomingGoodsService.getAttachmentContent(
      params.id,
      actor,
    );
    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileName)}"`,
    );
    res.end(buffer);
  }

  @Delete(':id/attachment')
  @HttpCode(204)
  removeAttachment(
    @Param() params: IdParamDto,
    @CurrentUser() actor: SessionUser,
  ): Promise<void> {
    return this.incomingGoodsService.removeAttachment(params.id, actor);
  }
}
