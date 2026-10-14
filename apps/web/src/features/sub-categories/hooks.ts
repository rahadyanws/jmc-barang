'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateSubCategoryInput } from '@/shared';

import { queryKeys } from '@/lib/query-keys';
import {
  createSubCategory,
  deleteSubCategory,
  listSubCategories,
  listSubCategoryOptions,
  updateSubCategory,
} from './api';

export type SubCategoryListParams = {
  page: number;
  search?: string;
  categoryId?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

export function useSubCategoryList(params: SubCategoryListParams) {
  return useQuery({
    queryKey: queryKeys.subCategories.list(params),
    queryFn: () => listSubCategories(params),
  });
}

export function useSubCategoryOptions(categoryId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.subCategories.options(categoryId),
    queryFn: () => listSubCategoryOptions(categoryId),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateSubCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subCategories.all });
    },
  });
}

export function useUpdateSubCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSubCategoryInput }) =>
      updateSubCategory(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subCategories.all });
    },
  });
}

export function useDeleteSubCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSubCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subCategories.all });
    },
  });
}
