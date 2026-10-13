'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateCategoryInput } from '@jmc/shared';

import { queryKeys } from '@/lib/query-keys';
import {
  createCategory,
  deleteCategory,
  listCategories,
  listCategoryOptions,
  updateCategory,
} from './api';

export type CategoryListParams = {
  page: number;
  search?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

export function useCategoryList(params: CategoryListParams) {
  return useQuery({
    queryKey: queryKeys.categories.list(params),
    queryFn: () => listCategories(params),
  });
}

export function useCategoryOptions() {
  return useQuery({
    queryKey: queryKeys.categories.options(),
    queryFn: listCategoryOptions,
    staleTime: 5 * 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.subCategories.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}
