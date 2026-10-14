'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  createUserSchema,
  updateUserSchema,
  type Role,
  type UserDto,
} from '@/shared';

import { Button } from '@/components/shared/button';
import { Dialog } from '@/components/shared/dialog';
import { FormField } from '@/components/shared/form-field';
import { Select } from '@/components/shared/select';
import { apiErrorMessage, applyApiFieldErrors } from '@/lib/form-errors';
import { messages } from '@/lib/messages';
import { useCreateUser, useUpdateUser } from '../hooks';

interface UserFormValues {
  username: string;
  password?: string;
  name: string;
  email: string;
  role: Role;
}

const createUserFormSchema = createUserSchema;
const updateUserFormSchema = updateUserSchema.extend({
  password: z.preprocess(
    (value) => (value === '' ? undefined : value),
    updateUserSchema.shape.password,
  ),
});

export interface UserFormModalProps {
  open: boolean;
  user: UserDto | null;
  onClose: () => void;
}

const inputClass =
  'h-10 w-full rounded-[6px] border border-[#E4E8EF] bg-white px-3 text-sm text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#337DA0] focus:ring-2 focus:ring-[#337DA0]/15 aria-invalid:border-red-500';

export function UserFormModal({ open, user, onClose }: UserFormModalProps) {
  const isEdit = user !== null;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(
      isEdit ? updateUserFormSchema : createUserFormSchema,
    ) as Resolver<UserFormValues>,
    defaultValues: { username: '', password: '', name: '', email: '', role: 'OPERATOR' },
  });

  useEffect(() => {
    if (open) {
      reset({
        username: user?.username ?? '',
        password: '',
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'OPERATOR',
      });
    }
  }, [open, user, reset]);

  const isPending = createUser.isPending || updateUser.isPending;

  async function onSubmit(values: UserFormValues): Promise<void> {
    try {
      if (isEdit && user !== null) {
        await updateUser.mutateAsync({ id: user.id, input: values });
      } else {
        await createUser.mutateAsync({ ...values, password: values.password ?? '' });
      }
      toast.success(messages.saveOk);
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors<UserFormValues>(error, setError)) {
        toast.error(apiErrorMessage(error));
      }
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Tambah User'}
      maxWidth="max-w-lg"
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Username"
            htmlFor="user-username"
            required
            error={errors.username?.message}
          >
            {(fieldProps) => (
              <input
                {...fieldProps}
                {...register('username')}
                id="user-username"
                autoComplete="off"
                placeholder="min. 8 karakter"
                className={inputClass}
              />
            )}
          </FormField>

          <FormField
            label="Password"
            htmlFor="user-password"
            required={!isEdit}
            hint={isEdit ? 'Kosongkan jika tidak diganti' : undefined}
            error={errors.password?.message}
          >
            {(fieldProps) => (
              <input
                {...fieldProps}
                {...register('password')}
                id="user-password"
                type="password"
                autoComplete="new-password"
                placeholder={isEdit ? 'Biarkan kosong' : 'min. 8 karakter, campur huruf & angka'}
                className={inputClass}
              />
            )}
          </FormField>
        </div>

        <FormField label="Nama Lengkap" htmlFor="user-name" required error={errors.name?.message}>
          {(fieldProps) => (
            <input
              {...fieldProps}
              {...register('name')}
              id="user-name"
              autoComplete="off"
              placeholder="cth. Budi Santoso"
              className={inputClass}
            />
          )}
        </FormField>

        <FormField label="Email" htmlFor="user-email" required error={errors.email?.message}>
          {(fieldProps) => (
            <input
              {...fieldProps}
              {...register('email')}
              id="user-email"
              type="email"
              autoComplete="off"
              placeholder="nama@jmc-indonesia.test"
              className={inputClass}
            />
          )}
        </FormField>

        <FormField label="Role" htmlFor="user-role" required error={errors.role?.message}>
          {(fieldProps) => (
            <Select
              {...fieldProps}
              {...register('role')}
              id="user-role"
              options={[
                { value: 'OPERATOR', label: 'Operator' },
                { value: 'ADMIN', label: 'Administrator' },
              ]}
              invalid={errors.role != null}
            />
          )}
        </FormField>
      </form>
    </Dialog>
  );
}
