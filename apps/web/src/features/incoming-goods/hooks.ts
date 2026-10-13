'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateIncomingGoodsInput } from '@jmc/shared';

import { queryKeys } from '@/lib/query-keys';
import {
  createIncomingGoods,
  deleteIncomingGoods,
  deleteIncomingGoodsAttachment,
  getIncomingGoods,
  listIncomingGoods,
  listIncomingGoodsYears,
  setIncomingGoodsVerification,
  updateIncomingGoods,
  uploadIncomingGoodsAttachment,
  type IncomingGoodsListParams,
} from './api';

export function useIncomingGoodsList(params: IncomingGoodsListParams) {
  return useQuery({
    queryKey: queryKeys.incomingGoods.list(params),
    queryFn: () => listIncomingGoods(params),
  });
}

export function useIncomingGoodsYears() {
  return useQuery({
    queryKey: queryKeys.incomingGoods.years(),
    queryFn: listIncomingGoodsYears,
    staleTime: 5 * 60_000,
  });
}

export function useVerifyIncomingGoods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      setIncomingGoodsVerification(id, verified),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incomingGoods.all });
    },
  });
}

export function useDeleteIncomingGoods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteIncomingGoods,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incomingGoods.all });
    },
  });
}

export function useIncomingGoodsDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.incomingGoods.detail(id ?? ''),
    queryFn: () => getIncomingGoods(id as string),
    enabled: id != null && id !== '',
  });
}

export function useCreateIncomingGoods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createIncomingGoods,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incomingGoods.all });
    },
  });
}

export function useUpdateIncomingGoods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateIncomingGoodsInput }) =>
      updateIncomingGoods(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incomingGoods.all });
    },
  });
}

export function useUploadIncomingGoodsAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadIncomingGoodsAttachment(id, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incomingGoods.all });
    },
  });
}

export function useDeleteIncomingGoodsAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteIncomingGoodsAttachment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incomingGoods.all });
    },
  });
}
