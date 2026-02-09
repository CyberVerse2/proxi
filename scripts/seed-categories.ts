/**
 * Seed the categories table with the default proxy categories.
 *
 * Usage:
 *   npx tsx scripts/seed-categories.ts
 */

import dotenv from "dotenv";
dotenv.config();

import postgres from "postgres";

const CATEGORIES = [
  { name: "Top Creators", slug: "top-creators", icon: "Crown", sortOrder: 1 },
  { name: "Founders", slug: "founders", icon: "Rocket", sortOrder: 2 },
  { name: "Influencers", slug: "influencers", icon: "Megaphone", sortOrder: 3 },
  { name: "Traders", slug: "traders", icon: "TrendingUp", sortOrder: 4 },
  { name: "Investors", slug: "investors", icon: "PiggyBank", sortOrder: 5 },
  { name: "UI/UX Design", slug: "ui-ux-design", icon: "Palette", sortOrder: 6 },
  { name: "Athletes", slug: "athletes", icon: "Trophy", sortOrder: 7 },
  { name: "Solana", slug: "solana", icon: "Coins", sortOrder: 8 },
  { name: "Musicians", slug: "musicians", icon: "Music", sortOrder: 9 },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  console.log("Seeding categories...\n");

  for (const cat of CATEGORIES) {
    const [existing] = await sql`
      SELECT id FROM categories WHERE slug = ${cat.slug}
    `;

    if (existing) {
      await sql`
        UPDATE categories SET
          name = ${cat.name},
          icon = ${cat.icon},
          sort_order = ${cat.sortOrder}
        WHERE slug = ${cat.slug}
      `;
      console.log(`  ♻️  Updated: ${cat.name}`);
    } else {
      await sql`
        INSERT INTO categories (name, slug, icon, sort_order)
        VALUES (${cat.name}, ${cat.slug}, ${cat.icon}, ${cat.sortOrder})
      `;
      console.log(`  ✅ Created: ${cat.name}`);
    }
  }

  console.log(`\nDone! ${CATEGORIES.length} categories seeded.`);
  await sql.end();
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
