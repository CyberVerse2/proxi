import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';

export async function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategoryBySlug(slug: string) {
  const [c] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return c ?? null;
}
