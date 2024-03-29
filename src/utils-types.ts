export type NonOptional<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};
