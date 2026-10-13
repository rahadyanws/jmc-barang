export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: (params: Record<string, unknown>): readonly unknown[] => ['categories', 'list', params],
    options: (categoryId?: string): readonly unknown[] => ['categories', 'options', categoryId ?? null],
  },
  subCategories: {
    all: ['subCategories'] as const,
    list: (params: Record<string, unknown>): readonly unknown[] => ['subCategories', 'list', params],
    options: (categoryId?: string): readonly unknown[] => [
      'subCategories',
      'options',
      categoryId ?? null,
    ],
  },
  users: {
    all: ['users'] as const,
    list: (params: Record<string, unknown>): readonly unknown[] => ['users', 'list', params],
    options: (role?: string): readonly unknown[] => ['users', 'options', role ?? null],
  },
  incomingGoods: {
    all: ['incomingGoods'] as const,
    list: (params: Record<string, unknown>): readonly unknown[] => ['incomingGoods', 'list', params],
    years: (): readonly unknown[] => ['incomingGoods', 'years'],
    detail: (id: string): readonly unknown[] => ['incomingGoods', 'detail', id],
  },
};
