import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ordinal } from '@/lib/utils';
import { STAGE_LABEL } from '@/domain/season';
import type { CategoryView } from '@/server/data/types';

export function CategoryCard({
  category,
  index,
  href,
}: {
  category: CategoryView;
  index: number;
  href?: string;
}) {
  const target = href ?? `/categories/${category.slug}`;

  return (
    <Card interactive className="group h-full">
      <Link href={target} className="flex h-full flex-col gap-5 p-7 focus:outline-none">
        <div className="flex items-start justify-between gap-4">
          <span className="palma-label text-taupe-deep">{ordinal(index)}</span>
          <Badge variant={category.isOpen ? 'olive' : 'muted'}>
            {category.isOpen ? 'Open for nominations' : STAGE_LABEL[category.stage]}
          </Badge>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="group-hover:text-olive text-2xl leading-tight transition-colors">
            {category.name}
          </h3>
          {category.strapline ? (
            <p className="font-display text-taupe-deep text-[1.0625rem] leading-snug">
              {category.strapline}
            </p>
          ) : null}
        </div>

        <p className="text-taupe-deep line-clamp-3 text-sm leading-relaxed">
          {category.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-2">
          {category.partner ? (
            <span className="palma-label text-taupe">Partner · {category.partner.name}</span>
          ) : (
            <span />
          )}
          <ArrowRight
            className="text-taupe size-4 transition-transform duration-300 ease-(--ease-ceremonial) group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>
      </Link>
    </Card>
  );
}
