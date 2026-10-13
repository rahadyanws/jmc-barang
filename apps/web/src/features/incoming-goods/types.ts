export interface ItemFormValues {
  id?: string;
  name: string;
  unitPrice: number | null;
  quantity: number | null;
  uom: string;
  expiredDate?: string | null;
}

export interface IncomingGoodsFormValues {
  operatorId: string;
  categoryId: string;
  subCategoryId: string;
  origin: string;
  letterNumber?: string | null;
  items: ItemFormValues[];
}
