import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const mel = await db.user.upsert({
    where: { email: "mel@example.com" },
    update: {},
    create: {
      email: "mel@example.com",
      username: "mel",
      displayName: "Mel",
      passwordHash: password,
      bio: "Building Mompuffs 🚀",
    },
  });

  const ana = await db.user.upsert({
    where: { email: "ana@example.com" },
    update: {},
    create: {
      email: "ana@example.com",
      username: "ana",
      displayName: "Ana",
      passwordHash: password,
      bio: "Sticker & tee designer.",
    },
  });

  const shop = await db.shop.upsert({
    where: { ownerId: ana.id },
    update: {},
    create: {
      ownerId: ana.id,
      name: "Ana's Print Shop",
      slug: "anas-print-shop",
      description: "Cute stickers and cozy tees, made to order.",
    },
  });

  const existingProducts = await db.product.count({ where: { shopId: shop.id } });
  if (existingProducts === 0) {
    await db.product.createMany({
      data: [
        {
          shopId: shop.id,
          title: "Sunshine Sticker Pack",
          description: "Set of 5 waterproof vinyl stickers.",
          priceCents: 899,
          imageUrl: "https://images.unsplash.com/photo-1523419409543-a5e549c1faa8?w=600",
          source: "MANUAL",
        },
        {
          shopId: shop.id,
          title: "Cozy Cat Tee",
          description: "Soft cotton tee with a cozy cat print.",
          priceCents: 2499,
          imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
          source: "MANUAL",
        },
      ],
    });
  }

  const postCount = await db.post.count();
  if (postCount === 0) {
    await db.post.create({
      data: {
        authorId: ana.id,
        body: "Just opened my shop! Check out my new sticker pack 🌞",
      },
    });
    await db.post.create({
      data: {
        authorId: mel.id,
        body: "Welcome to Mompuffs — post, connect, and shop all in one place.",
      },
    });
  }

  console.log("Seed complete. Demo login: mel@example.com / password123 (or ana@example.com / password123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
