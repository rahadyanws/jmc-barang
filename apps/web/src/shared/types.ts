import type { Role } from './enums';

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
}

export interface CategoryDto {
  id: string;
  code: string;
  name: string;
}

export interface CategoryOptionDto {
  id: string;
  code: string;
  name: string;
}

export interface SubCategoryDto {
  id: string;
  category: CategoryDto;
  name: string;
  priceLimit: number;
}

export interface SubCategoryOptionDto {
  id: string;
  name: string;
  priceLimit: number;
  categoryId: string;
}

export interface UserDto {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  isLocked: boolean;
}

export interface UserOptionDto {
  id: string;
  name: string;
  username: string;
}

export interface IncomingGoodsOperatorDto {
  id: string;
  name: string;
}

export interface IncomingGoodsItemDto {
  id: string;
  lineNo: number;
  itemCode: string;
  name: string;
  unitPrice: number;
  quantity: number;
  uom: string;
  lineTotal: number;
  expiredDate: string | null;
}

export interface IncomingGoodsAttachmentDto {
  fileName: string;
  size: number;
}

export interface IncomingGoodsDetailDto {
  id: string;
  transactionDate: string;
  origin: string;
  letterNumber: string | null;
  unit: string;
  operator: IncomingGoodsOperatorDto;
  category: CategoryDto;
  subCategory: { id: string; name: string; priceLimit: number };
  totalAmount: number;
  isVerified: boolean;
  hasAttachment: boolean;
  attachment: IncomingGoodsAttachmentDto | null;
  items: IncomingGoodsItemDto[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[] | Record<string, unknown>;
  requestId?: string;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}
