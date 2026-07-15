import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FEELINGS_POOL = [
  "Anxious", "Grateful", "Tired", "Motivated", "Content",
  "Stressed", "Relaxed", "Hopeful", "Overwhelmed", "Proud",
];

function pickFeelings(seedIndex: number): string[] {
  const a = FEELINGS_POOL[seedIndex % FEELINGS_POOL.length];
  const b = FEELINGS_POOL[(seedIndex + 3) % FEELINGS_POOL.length];
  return a === b ? [a] : [a, b];
}

async function main() {
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { name: "Ahron", avatar: null },
  });

  const moods = [3, 4, 2, 5, 3, 3, 4, 2, 5, 4, 3, 4, 2, 5];
  const sleepHours = [7, 8, 5.5, 8.5, 6, 7, 7.5, 5, 9, 8, 6.5, 7, 5.5, 8];

  const today = new Date();
  const createdEntries = [];
  for (let i = 0; i < moods.length; i++) {
    const daysAgo = moods.length - 1 - i;
    const date = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - daysAgo
    ));
    const entry = await prisma.moodEntry.create({
      data: {
        userId: user.id,
        date,
        mood: moods[i],
        sleepHours: sleepHours[i],
        feelings: pickFeelings(i),
        reflection: i % 2 === 0 ? "A pretty typical day overall." : null,
      },
    });
    createdEntries.push(entry);
  }

  console.log(`Seeded 1 user and ${createdEntries.length} mood entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
