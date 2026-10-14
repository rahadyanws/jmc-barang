import { Injectable } from '@nestjs/common';

import type { IncomingGoodsDetailDto, SessionUser } from '../../shared';

import { IncomingGoodsService } from './incoming-goods.service';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

interface TdText {
  text: string;
  bold?: boolean;
  fontSize?: number;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
}

function formatWibDate(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

function rupiah(value: number): string {
  return value.toLocaleString('id-ID');
}

function labelValue(label: string, value: string): TdText[] {
  return [
    { text: `${label}: `, bold: true },
    { text: value },
  ];
}

/**
 * Cetak Surat Barang Masuk (AS-19): kop PT JMC Indonesia, tabel item,
 * grand total, status verifikasi, blok tanda tangan.
 */
@Injectable()
export class PrintService {
  constructor(private readonly incomingGoodsService: IncomingGoodsService) {}

  async printPdf(id: string, actor: SessionUser): Promise<Buffer> {
    const detail = await this.incomingGoodsService.getById(id, actor);

    const pdfMake = (await import('pdfmake')).default;
    const roboto = (await import('pdfmake/fonts/Roboto')).default;
    pdfMake.setFonts(roboto);

    const doc = pdfMake.createPdf(this.buildDocDefinition(detail));
    return doc.getBuffer();
  }

  private buildDocDefinition(detail: IncomingGoodsDetailDto) {
    const itemRows = detail.items.map((item, index) => [
      { text: String(index + 1), alignment: 'center' as const },
      { text: item.itemCode },
      { text: item.name },
      { text: rupiah(item.unitPrice), alignment: 'right' as const },
      { text: `${item.quantity} ${item.uom}`, alignment: 'center' as const },
      { text: rupiah(item.lineTotal), alignment: 'right' as const },
      { text: item.expiredDate ?? '-', alignment: 'center' as const },
    ]);

    return {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60] as [number, number, number, number],
      defaultStyle: { fontSize: 10 },
      info: {
        title: `Surat Barang Masuk ${detail.id}`,
        creator: 'JMC Barang',
      },
      content: [
        {
          text: 'PT JMC Indonesia',
          bold: true,
          fontSize: 16,
          alignment: 'center' as const,
        },
        {
          text: 'SURAT BARANG MASUK',
          bold: true,
          fontSize: 13,
          alignment: 'center' as const,
          margin: [0, 4, 0, 16] as [number, number, number, number],
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: labelValue('Nomor Surat', detail.letterNumber ?? '-') },
                {
                  text: labelValue(
                    'Tanggal',
                    formatWibDate(new Date(detail.transactionDate)),
                  ),
                },
                { text: labelValue('Asal Barang', detail.origin) },
              ],
            },
            {
              width: '50%',
              stack: [
                { text: labelValue('Penerima', detail.operator.name) },
                { text: labelValue('Unit', detail.unit) },
                { text: labelValue('Kategori', detail.category.name) },
                { text: labelValue('Sub Kategori', detail.subCategory.name) },
              ],
            },
          ],
          columnGap: 16,
          margin: [0, 0, 0, 16] as [number, number, number, number],
        },
        {
          table: {
            headerRows: 1,
            widths: [28, 60, '*', 70, 50, 70, 60],
            body: [
              [
                { text: 'No', bold: true, alignment: 'center' as const },
                { text: 'Kode', bold: true },
                { text: 'Nama Barang', bold: true },
                { text: 'Harga (Rp.)', bold: true, alignment: 'right' as const },
                { text: 'Jumlah', bold: true, alignment: 'center' as const },
                { text: 'Total (Rp.)', bold: true, alignment: 'right' as const },
                { text: 'Tgl Expired', bold: true, alignment: 'center' as const },
              ],
              ...itemRows,
            ],
          },
          layout: 'lightLines',
        },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              table: {
                widths: [100, 90],
                body: [
                  [
                    { text: 'Grand Total', bold: true, alignment: 'right' as const },
                    {
                      text: `Rp ${rupiah(detail.totalAmount)}`,
                      bold: true,
                      alignment: 'right' as const,
                    },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
          margin: [0, 12, 0, 8] as [number, number, number, number],
        },
        {
          text: detail.isVerified
            ? 'Status: Terverifikasi'
            : 'Status: Belum terverifikasi',
          bold: true,
          color: detail.isVerified ? '#15803D' : '#6B7280',
          margin: [0, 0, 0, 24] as [number, number, number, number],
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'Penerima,' },
                { text: '\n\n\n(.............................)', alignment: 'center' as const },
              ],
            },
            {
              width: '50%',
              stack: [
                { text: 'Mengetahui,' },
                { text: '\n\n\n(.............................)', alignment: 'center' as const },
              ],
            },
          ],
          columnGap: 16,
        },
      ],
    };
  }
}
