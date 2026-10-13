'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  createCategorySchema,
  type CategoryDto,
  type CreateCategoryInput,
  MAX_CATEGORY_CODE_LENGTH,
} from '@jmc/shared';

import { Button } from '@/components/shared/button';
import { Dialog } from '@/components/shared/dialog';
import { FormField } from '@/components/shared/form-field';
import { apiErrorMessage, applyApiFieldErrors } from '@/lib/form-errors';
import { messages } from '@/lib/messages';
import { useCreateCategory, useUpdateCategory } from '../hooks';

export interface CategoryFormModalProps {
  open: boolean;
  category: CategoryDto | null;
  onClose: () => void;
}

export function CategoryFormModal({ open, category, onClose }: CategoryFormModalProps) {
  const isEdit = category !== null;
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { code: '', name: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        code: category?.code ?? '',
        name: category?.name ?? '',
      });
    }
  }, [open, category, reset]);

  const isPending = createCategory.isPending || updateCategory.isPending;

  async function onSubmit(values: CreateCategoryInput): Promise<void> {
    try {
      if (isEdit && category !== null) {
        await updateCategory.mutateAsync({ id: category.id, input: values });
      } else {
        await createCategory.mutateAsync(values);
      }
      toast.success(messages.saveOk);
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors<CreateCategoryInput>(error, setError)) {
        toast.error(apiErrorMessage(error));
      }
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Kategori' : 'Tambah Kategori'}
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
        <FormField label="Kode" htmlFor="category-code" required error={errors.code?.message}>
          {(fieldProps) => (
            <input
              {...fieldProps}
              {...register('code')}
              id="category-code"
              maxLength={MAX_CATEGORY_CODE_LENGTH}
              autoComplete="off"
              placeholder="cth. PK"
              className="h-10 w-full rounded-[6px] border border-[#E4E8EF] bg-white px-3 text-sm uppercase text-[#1F2937] outline-none transition placeholder:normal-case placeholder:text-[#9CA3AF] focus:border-[#337DA0] focus:ring-2 focus:ring-[#337DA0]/15 aria-invalid:border-red-500"
            />
          )}
        </FormField>

        <FormField label="Nama" htmlFor="category-name" required error={errors.name?.message}>
          {(fieldProps) => (
            <input
              {...fieldProps}
              {...register('name')}
              id="category-name"
              autoComplete="off"
              placeholder="cth. Peralatan Kantor"
              className="h-10 w-full rounded-[6px] border border-[#E4E8EF] bg-white px-3 text-sm text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#337DA0] focus:ring-2 focus:ring-[#337DA0]/15 aria-invalid:border-red-500"
            />
          )}
        </FormField>
      </form>
    </Dialog>
  );
}
