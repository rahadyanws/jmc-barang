'use client';

import { Plus, X } from 'lucide-react';
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';

import { MAX_ITEMS } from '@/shared';

import { RupiahInput } from '@/components/shared/rupiah-input';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { IncomingGoodsFormValues } from '../types';

export interface ItemRowsEditorProps {
  control: Control<IncomingGoodsFormValues>;
  register: UseFormRegister<IncomingGoodsFormValues>;
  setValue: UseFormSetValue<IncomingGoodsFormValues>;
  errors: FieldErrors<IncomingGoodsFormValues>;
}

const NUMBER_INPUT_CLASS =
  'h-10 w-full rounded-[6px] border border-[#E4E8EF] bg-white px-3 text-sm text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#337DA0] focus:ring-2 focus:ring-[#337DA0]/15 aria-invalid:border-red-500';

const COLUMN_CLASS =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_6rem_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_2.5rem]';

function fieldError(
  errors: FieldErrors<IncomingGoodsFormValues>,
  index: number,
  field: 'name' | 'unitPrice' | 'quantity' | 'uom' | 'expiredDate',
): string | undefined {
  const itemErrors = errors.items?.[index];
  if (itemErrors == null || typeof itemErrors === 'string') {
    return undefined;
  }
  const value = itemErrors[field];
  if (value == null || typeof value === 'string') {
    return undefined;
  }
  return value.message;
}

export function ItemRowsEditor({ control, register, setValue, errors }: ItemRowsEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });
  const watchedItems = useWatch({ control, name: 'items' });

  const canAdd = fields.length < MAX_ITEMS;

  function addRow(): void {
    if (!canAdd) {
      return;
    }
    append({ name: '', unitPrice: null, quantity: null, uom: '', expiredDate: null });
  }

  return (
    <div className="space-y-3">
      <div className={cn(COLUMN_CLASS, 'px-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]')}>
        <span>Nama Barang <span className="text-red-500">*</span></span>
        <span>Harga (Rp.) <span className="text-red-500">*</span></span>
        <span>Jumlah <span className="text-red-500">*</span></span>
        <span>Satuan <span className="text-red-500">*</span></span>
        <span className="text-right">Total</span>
        <span>Tgl. Expired</span>
        <span className="sr-only">Aksi</span>
      </div>

      {fields.map((field, index) => {
        const row = watchedItems?.[index];
        const lineTotal = (row?.unitPrice ?? 0) * (row?.quantity ?? 0);
        const isFirst = index === 0;

        return (
          <div
            key={field.id}
            className={cn(
              COLUMN_CLASS,
              'items-start rounded-[6px] border border-[#E4E8EF] bg-white p-3',
            )}
          >
            <div className="space-y-1">
              <input
                {...register(`items.${index}.name`)}
                placeholder="cth. Kertas HVS A4"
                aria-label={`Nama barang baris ${index + 1}`}
                className={NUMBER_INPUT_CLASS}
              />
              {fieldError(errors, index, 'name') != null ? (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {fieldError(errors, index, 'name')}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <RupiahInput
                aria-label={`Harga baris ${index + 1}`}
                value={row?.unitPrice ?? null}
                onChange={(value) =>
                  setValue(`items.${index}.unitPrice`, value, { shouldDirty: true })
                }
                invalid={fieldError(errors, index, 'unitPrice') != null}
              />
              {fieldError(errors, index, 'unitPrice') != null ? (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {fieldError(errors, index, 'unitPrice')}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <input
                {...register(`items.${index}.quantity`, {
                  setValueAs: (value: unknown) =>
                    value === '' || value == null ? null : Number(value),
                })}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="1"
                aria-label={`Jumlah baris ${index + 1}`}
                className={NUMBER_INPUT_CLASS}
              />
              {fieldError(errors, index, 'quantity') != null ? (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {fieldError(errors, index, 'quantity')}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <input
                {...register(`items.${index}.uom`)}
                placeholder="cth. Rim"
                aria-label={`Satuan baris ${index + 1}`}
                className={NUMBER_INPUT_CLASS}
              />
              {fieldError(errors, index, 'uom') != null ? (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {fieldError(errors, index, 'uom')}
                </p>
              ) : null}
            </div>

            <div className="flex h-10 items-center justify-end gap-1.5 rounded-[6px] bg-[#F4F6FA] px-3 text-right text-sm tabular-nums text-[#1F2937]">
              <span className="text-[#6B7280]">Rp</span>
              <span>{formatRupiah(lineTotal)}</span>
            </div>

            <div className="space-y-1">
              <input
                {...register(`items.${index}.expiredDate`)}
                type="date"
                aria-label={`Tgl expired baris ${index + 1}`}
                className={cn(NUMBER_INPUT_CLASS, 'text-[#1F2937]')}
              />
              {fieldError(errors, index, 'expiredDate') != null ? (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {fieldError(errors, index, 'expiredDate')}
                </p>
              ) : null}
            </div>

            <div className="flex h-10 items-center justify-center">
              {isFirst ? (
                <button
                  type="button"
                  onClick={addRow}
                  disabled={!canAdd}
                  aria-label="Tambah baris item"
                  title={canAdd ? 'Tambah baris' : 'Maksimal 50 baris'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#337DA0] text-[#337DA0] transition hover:bg-[#337DA0]/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Hapus baris ${index + 1}`}
                  title="Hapus baris"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-300 text-red-600 transition hover:bg-red-50"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {typeof errors.items?.message === 'string' ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {errors.items.message}
        </p>
      ) : null}

      {fields.length > 1 && canAdd ? (
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#337DA0] transition hover:underline"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Tambah baris
        </button>
      ) : null}
    </div>
  );
}
