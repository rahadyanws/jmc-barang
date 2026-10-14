'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  createSubCategorySchema,
  type CreateSubCategoryInput,
  type SubCategoryDto,
} from '@/shared';

import { Button } from '@/components/shared/button';
import { Dialog } from '@/components/shared/dialog';
import { FormField } from '@/components/shared/form-field';
import { RupiahInput } from '@/components/shared/rupiah-input';
import { Select } from '@/components/shared/select';
import { apiErrorMessage, applyApiFieldErrors } from '@/lib/form-errors';
import { messages } from '@/lib/messages';
import { useCategoryOptions } from '@/features/categories/hooks';
import { useCreateSubCategory, useUpdateSubCategory } from '../hooks';

export interface SubCategoryFormModalProps {
  open: boolean;
  subCategory: SubCategoryDto | null;
  onClose: () => void;
}

export function SubCategoryFormModal({ open, subCategory, onClose }: SubCategoryFormModalProps) {
  const isEdit = subCategory !== null;
  const createSubCategory = useCreateSubCategory();
  const updateSubCategory = useUpdateSubCategory();
  const categories = useCategoryOptions();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateSubCategoryInput>({
    resolver: zodResolver(createSubCategorySchema),
    defaultValues: { categoryId: '', name: '', priceLimit: 1 },
  });

  useEffect(() => {
    if (open) {
      reset({
        categoryId: subCategory?.category.id ?? '',
        name: subCategory?.name ?? '',
        priceLimit: subCategory?.priceLimit ?? 1,
      });
    }
  }, [open, subCategory, reset]);

  const isPending = createSubCategory.isPending || updateSubCategory.isPending;
  const priceLimitValue = watch('priceLimit') ?? null;

  async function onSubmit(values: CreateSubCategoryInput): Promise<void> {
    try {
      if (isEdit && subCategory !== null) {
        await updateSubCategory.mutateAsync({ id: subCategory.id, input: values });
      } else {
        await createSubCategory.mutateAsync(values);
      }
      toast.success(messages.saveOk);
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors<CreateSubCategoryInput>(error, setError)) {
        toast.error(apiErrorMessage(error));
      }
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Sub Kategori' : 'Tambah Sub Kategori'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            onClick={() => void handleSubmit(onSubmit)()}
            isLoading={isPending}
            data-dialog-initial-focus
          >
            Simpan
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(onSubmit)();
        }}
      >
        <FormField
          label="Kategori"
          htmlFor="sub-category-category"
          required
          error={errors.categoryId?.message}
        >
          {(fieldProps) => (
            <Select
              {...fieldProps}
              {...register('categoryId')}
              id="sub-category-category"
              placeholder="Pilih kategori…"
              options={(categories.data ?? []).map((category) => ({
                value: category.id,
                label: `${category.code} — ${category.name}`,
              }))}
              invalid={errors.categoryId != null}
            />
          )}
        </FormField>

        <FormField label="Nama" htmlFor="sub-category-name" required error={errors.name?.message}>
          {(fieldProps) => (
            <input
              {...fieldProps}
              {...register('name')}
              id="sub-category-name"
              autoComplete="off"
              placeholder="cth. Alat Tulis"
              className="h-10 w-full rounded-[6px] border border-[#E4E8EF] bg-white px-3 text-sm text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#337DA0] focus:ring-2 focus:ring-[#337DA0]/15 aria-invalid:border-red-500"
            />
          )}
        </FormField>

        <FormField
          label="Batas Harga"
          htmlFor="sub-category-price-limit"
          required
          error={errors.priceLimit?.message}
        >
          {(fieldProps) => (
            <RupiahInput
              {...fieldProps}
              id="sub-category-price-limit"
              value={priceLimitValue}
              onChange={(value) => setValue('priceLimit', value ?? 0, { shouldValidate: true })}
              invalid={errors.priceLimit != null}
            />
          )}
        </FormField>
      </form>
    </Dialog>
  );
}
