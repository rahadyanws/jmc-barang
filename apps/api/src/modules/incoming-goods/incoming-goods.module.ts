import { Module } from '@nestjs/common';

import { IncomingGoodsController } from './incoming-goods.controller';
import { IncomingGoodsService } from './incoming-goods.service';
import { ExportService } from './export.service';
import { PrintService } from './print.service';

@Module({
  controllers: [IncomingGoodsController],
  providers: [IncomingGoodsService, ExportService, PrintService],
  exports: [IncomingGoodsService],
})
export class IncomingGoodsModule {}
