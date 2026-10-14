import { Injectable } from '@nestjs/common';

import {
  type IncomingGoodsExportQuery,
  type SessionUser,
} from '../../shared';

import { IncomingGoodsService } from './incoming-goods.service';

export interface ExportResult {
  buffer: Buffer;
  fileName: string;
}

interface ExportSheetRow {
  no: number | null;
  tanggal: string | null;
  asal: string | null;
  penerima: string | null;
  unit: string | null;
  kode: string;
  nama: string;
  harga: number;
  jumlah: string;
  total: number;
  status: string | null;
}

function formatWibDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function formatWibStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}-${get('hour')}${get('minute')}${get('second')}`;
}

/**
 * BR-20 / AS-18: export Excel mengikuti filter/search/sort aktif (builder identik list).
 */
@Injectable()
export class ExportService {
  constructor(private readonly incomingGoodsService: IncomingGoodsService) {}

  async exportExcel(
    query: IncomingGoodsExportQuery,
    actor: SessionUser,
  ): Promise<ExportResult> {
    const { data } = await this.incomingGoodsService.exportRows(query, actor);

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'JMC Barang';
    const sheet = workbook.addWorksheet('Barang Masuk', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'NO', key: 'no', width: 6 },
      { header: 'TANGGAL', key: 'tanggal', width: 18 },
      { header: 'ASAL BARANG', key: 'asal', width: 24 },
      { header: 'PENERIMA', key: 'penerima', width: 18 },
      { header: 'UNIT', key: 'unit', width: 24 },
      { header: 'KODE', key: 'kode', width: 10 },
      { header: 'NAMA', key: 'nama', width: 28 },
      { header: 'HARGA (RP.)', key: 'harga', width: 14 },
      { header: 'JUMLAH', key: 'jumlah', width: 12 },
      { header: 'TOTAL (RP.)', key: 'total', width: 14 },
      { header: 'STATUS', key: 'status', width: 16 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let col = 1; col <= 11; col += 1) {
      headerRow.getCell(col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    let runningNo = 1;
    for (const transaction of data) {
      const firstRowNumber = sheet.rowCount + 1;
      for (const [itemIndex, item] of transaction.items.entries()) {
        const row = sheet.addRow({
          no: itemIndex === 0 ? runningNo : null,
          tanggal:
            itemIndex === 0
              ? formatWibDateTime(new Date(transaction.transactionDate))
              : null,
          asal: itemIndex === 0 ? transaction.origin : null,
          penerima: itemIndex === 0 ? transaction.operator.name : null,
          unit: itemIndex === 0 ? transaction.unit : null,
          kode: item.itemCode,
          nama: item.name,
          harga: item.unitPrice,
          jumlah: `${item.quantity} ${item.uom}`,
          total: item.lineTotal,
          status:
            itemIndex === 0
              ? transaction.isVerified
                ? 'Terverifikasi'
                : 'Belum'
              : null,
        } satisfies ExportSheetRow);
        row.getCell('harga').numFmt = '#,##0';
        row.getCell('total').numFmt = '#,##0';
      }
      const lastRowNumber = sheet.rowCount;
      if (lastRowNumber > firstRowNumber) {
        for (const column of [1, 2, 3, 4, 5, 11]) {
          sheet.mergeCells(firstRowNumber, column, lastRowNumber, column);
        }
      }
      runningNo += 1;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      fileName: `barang-masuk_${formatWibStamp(new Date())}.xlsx`,
    };
  }
}
