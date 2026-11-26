import { TransformFnParams } from 'class-transformer';

/** 字串欄位去除前後空白（DTO 用 @Transform(trimString)） */
export function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
