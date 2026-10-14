'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Role, UpdateUserInput } from '@/shared';

import { queryKeys } from '@/lib/query-keys';
import { createUser, deleteUser, listUserOptions, listUsers, lockUser, updateUser } from './api';

export type UserListParams = {
  page: number;
  search?: string;
  role?: Role;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

export function useUserList(params: UserListParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => listUsers(params),
  });
}

export function useUserOptions(role?: Role, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.options(role),
    queryFn: () => listUserOptions(role),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useLockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, locked }: { id: string; locked: boolean }) =>
      lockUser(id, { locked }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
