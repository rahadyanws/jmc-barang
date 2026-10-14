'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  MAX_ITEMS,
  MIN_ITEMS,
  incomingGoodsItemNameSchema,
  incomingGoodsLetterNumberSchema,
  incomingGoodsOriginSchema,
  quantitySchema,
  unitPriceSchema,
  uomSchema,
  uuidSchema,
  expiredDateSchema,
} from '@/shared';

import { Button } from '@/components/shared/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { FormField } from '@/components/shared/form-field';
import { PageHeader } from '@/components/shared/page-header';
import { PriceLimitSummary } from '@/components/shared/price-limit-summary';
import { Select } from '@/components/shared/select';
import { useSession } from '@/features/auth/hooks/use-session';
import { useCategoryOptions } from '@/features/categories/hooks';
import { useSubCategoryOptions } from '@/features/sub-categories/hooks';
import { useUserOptions } from '@/features/users/hooks';
import { ApiError } from '@/lib/api-client';
import { apiErrorMessage, applyApiFieldErrors } from '@/lib/form-errors';
import { messages } from '@/lib/messages';
import { cn } from '@/lib/utils';
import {
  useCreateIncomingGoods,
  useIncomingGoodsDetail,
  useUpdateIncomingGoods,
  useUploadIncomingGoodsAttachment,
} from '../hooks';
import { AttachmentPanel } from './attachment-panel';
import { ItemRowsEditor } from './item-rows-editor';
import type { IncomingGoodsFormValues } from '../types';

const itemFormSchema = z.object({
  id: uuidSchema.optional(),
  name: incomingGoodsItemNameSchema,
  unitPrice: unitPriceSchema,
  quantity: quantitySchema,
  uom: uomSchema,
  expiredDate: expiredDateSchema.nullable().optional(),
});

const formSchema = z.object({
  operatorId: uuidSchema,
  categoryId: uuidSchema,
  subCategoryId: uuidSchema,
  origin: incomingGoodsOriginSchema,
  letterNumber: incomingGoodsLetterNumberSchema.nullable().optional(),
  items: z.array(itemFormSchema).min(MIN_ITEMS).max(MAX_ITEMS),
});

const CARD_CLASS = 'rounded-[6px] border border-[#E4E8EF] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.06)]';
const CARD_TITLE_CLASS =
  'mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]';

const inputClass =
  'h-10 w-full rounded-[6px] border border-[#E4E8EF] bg-white px-3 text-sm text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#337DA0] focus:ring-2 focus:ring-[#337DA0]/15 aria-invalid:border-red-500';

interface PriceLimitDetails {
  limit?: number;
  total?: number;
  excess?: number;
}

function parsePriceLimitDetails(details: unknown): PriceLimitDetails | null {
  if (details == null || typeof details !== 'object' || Array.isArray(details)) {
    return null;
  }
  const record = details as Record<string, unknown>;
  return {
    limit: typeof record.limit === 'number' ? record.limit : undefined,
    total: typeof record.total === 'number' ? record.total : undefined,
    excess: typeof record.excess === 'number' ? record.excess : undefined,
  };
}

export interface IncomingGoodsFormProps {
  mode: 'create' | 'edit';
  transactionId?: string;
}

export function IncomingGoodsForm({ mode, transactionId }: IncomingGoodsFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isEditMode = mode === 'edit';
  const isOperator = session?.role === 'OPERATOR';

  const detailQuery = useIncomingGoodsDetail(isEditMode ? transactionId : undefined);
  const createMutation = useCreateIncomingGoods();
  const updateMutation = useUpdateIncomingGoods();
  const uploadAttachment = useUploadIncomingGoodsAttachment();

  const categories = useCategoryOptions();
  const operatorOptions = useUserOptions('OPERATOR', !isOperator);

  const [serverLimitError, setServerLimitError] = useState<string | null>(null);
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [savedCreateId, setSavedCreateId] = useState<string | null>(null);
  const [attachmentFailed, setAttachmentFailed] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<IncomingGoodsFormValues>({
    resolver: zodResolver(formSchema) as Resolver<IncomingGoodsFormValues>,
    defaultValues: {
      operatorId: '',
      categoryId: '',
      subCategoryId: '',
      origin: '',
      letterNumber: '',
      items: [{ name: '', unitPrice: null, quantity: null, uom: '', expiredDate: null }],
    },
    mode: 'onTouched',
  });

  const detail = detailQuery.data;

  // BR-10: Operator terkunci pada dirinya sendiri
  useEffect(() => {
    if (isOperator && session?.id != null) {
      setValue('operatorId', session.id);
    }
  }, [isOperator, session?.id, setValue]);

  useEffect(() => {
    if (isEditMode && detail != null) {
      reset({
        operatorId: detail.operator.id,
        categoryId: detail.category.id,
        subCategoryId: detail.subCategory.id,
        origin: detail.origin,
        letterNumber: detail.letterNumber ?? '',
        items: detail.items.map((item) => ({
          id: item.id,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          uom: item.uom,
          expiredDate: item.expiredDate,
        })),
      });
    }
  }, [isEditMode, detail, reset]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const watchedCategoryId = useWatch({ control, name: 'categoryId' }) ?? '';
  const watchedSubCategoryId = useWatch({ control, name: 'subCategoryId' }) ?? '';
  const watchedItems = useWatch({ control, name: 'items' });

  const subCategoryOptions = useSubCategoryOptions(
    watchedCategoryId === '' ? undefined : watchedCategoryId,
    watchedCategoryId !== '',
  );

  const selectedSubCategory = (subCategoryOptions.data ?? []).find(
    (option) => option.id === watchedSubCategoryId,
  );
  const priceLimit = selectedSubCategory?.priceLimit ?? null;

  const total =
    watchedItems?.reduce(
      (sum, item) => sum + (item?.unitPrice ?? 0) * (item?.quantity ?? 0),
      0,
    ) ?? 0;

  function handleCategoryChange(value: string): void {
    setValue('categoryId', value, { shouldDirty: true, shouldValidate: true });
    setValue('subCategoryId', '', { shouldDirty: true, shouldValidate: true });
    setServerLimitError(null);
  }

  async function onSubmit(values: IncomingGoodsFormValues): Promise<void> {
    setServerLimitError(null);

    const payload = {
      operatorId: values.operatorId,
      subCategoryId: values.subCategoryId,
      origin: values.origin,
      letterNumber:
        values.letterNumber != null && values.letterNumber.trim() !== ''
          ? values.letterNumber.trim()
          : null,
      items: values.items.map((item) => ({
        ...(isEditMode && item.id != null ? { id: item.id } : {}),
        name: item.name,
        unitPrice: item.unitPrice ?? 0,
        quantity: item.quantity ?? 0,
        uom: item.uom,
        expiredDate: item.expiredDate != null && item.expiredDate !== '' ? item.expiredDate : null,
      })),
    };

    try {
      if (isEditMode && transactionId != null) {
        await updateMutation.mutateAsync({ id: transactionId, input: payload });
        toast.success(messages.saveOk);
        router.push('/barang-masuk');
        router.refresh();
        return;
      }

      const created = await createMutation.mutateAsync(payload);
      if (pendingFile != null) {
        try {
          await uploadAttachment.mutateAsync({ id: created.id, file: pendingFile });
          toast.success(messages.saveOk);
          toast.success(messages.uploadOk);
          router.push('/barang-masuk');
          router.refresh();
          return;
        } catch {
          // AS-12: transaksi tetap tersimpan; lampiran bisa dicoba lagi.
          setSavedCreateId(created.id);
          setAttachmentFailed(true);
          toast.warning(messages.uploadFailedRetry);
          return;
        }
      }
      toast.success(messages.saveOk);
      router.push('/barang-masuk');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PRICE_LIMIT_EXCEEDED') {
        const details = parsePriceLimitDetails(error.details);
        setServerLimitError(error.message);
        if (details != null && details.total != null && details.limit != null) {
          setServerLimitError(
            messages.priceLimitExceeded(
              details.total.toLocaleString('id-ID'),
              details.limit.toLocaleString('id-ID'),
            ),
          );
        }
        toast.error(error.message);
        return;
      }
      if (!applyApiFieldErrors<IncomingGoodsFormValues>(error, setError)) {
        toast.error(apiErrorMessage(error));
      }
    }
  }

  function handleBack(): void {
    if (isDirty) {
      setBackConfirmOpen(true);
      return;
    }
    router.push('/barang-masuk');
  }

  async function retryAttachmentUpload(): Promise<void> {
    if (savedCreateId == null || pendingFile == null) {
      return;
    }
    try {
      await uploadAttachment.mutateAsync({ id: savedCreateId, file: pendingFile });
      toast.success(messages.uploadOk);
      router.push('/barang-masuk');
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function finishWithoutAttachment(): void {
    router.push('/barang-masuk');
    router.refresh();
  }

  if (isEditMode && detailQuery.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#6B7280]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        Memuat transaksi…
      </div>
    );
  }

  if (isEditMode && detailQuery.isError) {
    return (
      <ErrorState
        message={apiErrorMessage(detailQuery.error)}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  if (isEditMode && detail?.isVerified === true) {
    return (
      <ErrorState message="Transaksi sudah terverifikasi dan tidak dapat diubah." onRetry={() => router.push('/barang-masuk')} />
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        breadcrumb="Barang Masuk"
        title={isEditMode ? 'Edit Barang Masuk' : 'Tambah Barang Masuk'}
        description="Lengkapi informasi umum dan daftar barang yang diterima."
        actions={
          detail != null ? (
            <span className="text-xs text-[#6B7280]">
              Tanggal transaksi dibuat otomatis oleh sistem
            </span>
          ) : null
        }
      />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(onSubmit)();
        }}
        className="space-y-5"
      >
        <section className={CARD_CLASS} aria-labelledby="card-umum">
          <h2 id="card-umum" className={CARD_TITLE_CLASS}>
            Informasi Umum
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              label="Operator"
              htmlFor="operatorId"
              required
              error={errors.operatorId?.message}
              hint={isOperator ? messages.operatorTerKunci : undefined}
            >
              {(fieldProps) =>
                isOperator ? (
                  <input
                    {...fieldProps}
                    id="operatorId"
                    value={session?.name ?? ''}
                    readOnly
                    disabled
                    className={cn(inputClass, 'bg-[#F4F6FA] text-[#6B7280]')}
                  />
                ) : (
                  <Select
                    {...fieldProps}
                    {...register('operatorId')}
                    id="operatorId"
                    placeholder={messages.pilihOperator}
                    invalid={errors.operatorId != null}
                    options={(operatorOptions.data ?? []).map((option) => ({
                      value: option.id,
                      label: `${option.name} (${option.username})`,
                    }))}
                  />
                )
              }
            </FormField>

            <FormField
              label="Kategori"
              htmlFor="categoryId"
              required
              error={errors.categoryId?.message}
            >
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  id="categoryId"
                  value={watchedCategoryId}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  placeholder={messages.pilihKategori}
                  invalid={errors.categoryId != null}
                  options={(categories.data ?? []).map((category) => ({
                    value: category.id,
                    label: `${category.code} — ${category.name}`,
                  }))}
                />
              )}
            </FormField>

            <FormField
              label="Sub Kategori"
              htmlFor="subCategoryId"
              required
              error={errors.subCategoryId?.message}
            >
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  {...register('subCategoryId')}
                  id="subCategoryId"
                  placeholder={messages.pilihSubKategori}
                  disabled={watchedCategoryId === '' || subCategoryOptions.isPending}
                  invalid={errors.subCategoryId != null}
                  options={(subCategoryOptions.data ?? []).map((option) => ({
                    value: option.id,
                    label: option.name,
                  }))}
                />
              )}
            </FormField>

            <FormField label="Batas Harga" htmlFor="priceLimit">
              {() => (
                <input
                  id="priceLimit"
                  readOnly
                  disabled
                  value={priceLimit != null ? `Rp ${priceLimit.toLocaleString('id-ID')}` : ''}
                  placeholder="Otomatis dari sub kategori"
                  className={cn(inputClass, 'bg-[#F4F6FA] text-right text-[#1F2937]')}
                />
              )}
            </FormField>

            <FormField
              label="Asal Barang"
              htmlFor="origin"
              required
              error={errors.origin?.message}
              className="lg:col-span-2"
            >
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  {...register('origin')}
                  id="origin"
                  autoComplete="off"
                  placeholder="cth. PT. Sidomakmur"
                  className={inputClass}
                />
              )}
            </FormField>

            <FormField
              label="Nomor Surat"
              htmlFor="letterNumber"
              error={errors.letterNumber?.message}
              className="lg:col-span-2"
            >
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  {...register('letterNumber')}
                  id="letterNumber"
                  autoComplete="off"
                  placeholder="cth. SM/001/X/2026 (opsional)"
                  className={inputClass}
                />
              )}
            </FormField>
          </div>
        </section>

        <section className={CARD_CLASS} aria-labelledby="card-barang">
          <h2 id="card-barang" className={CARD_TITLE_CLASS}>
            Informasi Barang
          </h2>
          <ItemRowsEditor
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
          />

          <PriceLimitSummary
            total={total}
            priceLimit={priceLimit}
            errorMessage={serverLimitError}
            className="mt-4"
          />
        </section>

        {isEditMode && transactionId != null && detail != null ? (
          <AttachmentPanel
            transactionId={transactionId}
            attachment={detail.attachment ?? null}
          />
        ) : null}

        {!isEditMode ? (
          <section className={CARD_CLASS} aria-labelledby="card-lampiran">
            <h2 id="card-lampiran" className={CARD_TITLE_CLASS}>
              {messages.attachmentSection}
            </h2>
            <input
              ref={createFileInputRef}
              type="file"
              accept=".doc,.docx,.zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setPendingFile(file);
                event.target.value = '';
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => createFileInputRef.current?.click()}
                disabled={attachmentFailed}
              >
                <Upload className="h-4 w-4" aria-hidden />
                {pendingFile != null ? messages.replaceAttachment : messages.uploadAttachment}
              </Button>
              <div className="min-w-0">
                <p className="truncate text-sm text-[#1F2937]">
                  {pendingFile != null ? pendingFile.name : messages.attachmentEmpty}
                </p>
                <p className="text-xs text-[#6B7280]">{messages.attachmentHint}</p>
              </div>
            </div>
          </section>
        ) : null}

        {attachmentFailed ? (
          <div className="rounded-[6px] border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              {messages.uploadFailedRetry}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void retryAttachmentUpload()}
                isLoading={uploadAttachment.isPending}
              >
                {messages.retryUploadAttachment}
              </Button>
              <Button type="button" variant="secondary" onClick={finishWithoutAttachment}>
                {messages.finishWithoutAttachment}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={handleBack} disabled={isSubmitting}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Kembali
          </Button>
          {!attachmentFailed ? (
            <Button
              type="submit"
              isLoading={
                isSubmitting || createMutation.isPending || updateMutation.isPending
              }
            >
              Simpan
            </Button>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={backConfirmOpen}
        title={messages.unsavedTitle}
        message={messages.unsavedMessage}
        confirmLabel="Tinggalkan"
        isDanger
        onConfirm={() => {
          setBackConfirmOpen(false);
          router.push('/barang-masuk');
        }}
        onClose={() => setBackConfirmOpen(false)}
      />
    </div>
  );
}
