'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SessionUser } from '@/shared';

import { queryKeys } from '@/lib/query-keys';
import { getSessionRequest, loginRequest, logoutRequest } from '../api';

export function useSession() {
  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: getSessionRequest,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (user: SessionUser) => {
      queryClient.setQueryData(queryKeys.auth.session, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.session, null);
      queryClient.clear();
    },
  });
}
