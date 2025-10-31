export interface Product<T> {
  create: () => T;
  update: () => void;
  get: (id: string) => void;
  delete: (id: string) => void;
}
