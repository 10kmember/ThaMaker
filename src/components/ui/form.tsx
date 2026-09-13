'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('palma-label text-taupe-deep block', className)}
      {...props}
    />
  );
}

/**
 * Field behaviour: the border firms on hover, deepens to the institution's
 * accent on focus, and the whole control lifts a hair — the same tactile
 * language as a button, at input scale.
 */
const fieldBase = [
  'w-full border border-stone-deep bg-ivory-bright px-3.5 py-3 text-[0.9375rem] text-ink',
  'transition-[border-color,box-shadow,transform] duration-200 ease-(--ease-ceremonial)',
  'placeholder:text-taupe hover:border-taupe-deep',
  'focus:border-olive focus:outline-none focus:shadow-[0_1px_0_0_var(--color-olive)]',
  'disabled:opacity-50 aria-[invalid=true]:border-red-800',
].join(' ');

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(fieldBase, 'h-12', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(fieldBase, 'min-h-32 resize-y leading-relaxed', className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        fieldBase,
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 8%22 fill=%22none%22 stroke=%22%238C8478%22 stroke-width=%221.4%22><path d=%22M1 1.5 6 6.5 11 1.5%22/></svg>')] h-12 appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'border-stone-deep bg-ivory-bright mt-0.5 size-4.5 shrink-0 appearance-none border transition-colors',
        'checked:border-olive checked:bg-olive',
        "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 10%22 fill=%22none%22 stroke=%22%23F4F0E8%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M1 5 4.5 8.5 11 1.5%22/></svg>')] checked:bg-[length:11px] checked:bg-center checked:bg-no-repeat",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn('palma-field-shell flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor} className="palma-field-label">
        {label}
        {required ? <span className="text-champagne-deep ml-1">*</span> : null}
      </Label>
      {hint ? (
        <p id={hintId} className="text-taupe-deep text-[0.8125rem] leading-relaxed">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-[0.8125rem] font-medium text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxField({
  id,
  name,
  label,
  description,
  error,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  description?: string;
  error?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <Checkbox
          id={id}
          name={name}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? `${id}-description` : undefined}
        />
        <span className="text-ink text-[0.9375rem] leading-relaxed">
          {label}
          {description ? (
            <span id={`${id}-description`} className="text-taupe-deep mt-1 block text-[0.8125rem]">
              {description}
            </span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p role="alert" className="pl-7.5 text-[0.8125rem] font-medium text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
