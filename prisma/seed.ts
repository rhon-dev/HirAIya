import "dotenv/config";
import { PrismaClient, Category, Status } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.statusChange.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: { name: "Alex Admin", email: "alex@hiraiya.dev", role: "ADMIN" },
  });
  const member1 = await prisma.user.create({
    data: { name: "Mia Member", email: "mia@hiraiya.dev", role: "MEMBER" },
  });
  const member2 = await prisma.user.create({
    data: { name: "Sam Member", email: "sam@hiraiya.dev", role: "MEMBER" },
  });

  const authors = [admin, member1, member2];
  const categories = Object.values(Category);
  const statuses = Object.values(Status);

  const feedbackSeeds = [
    { title: "Add dark mode toggle", description: "Would love a dark mode option for late-night browsing sessions.", category: Category.UI, status: Status.PLANNED },
    { title: "Improve mobile nav spacing", description: "The nav links are cramped on small screens and hard to tap accurately.", category: Category.UX, status: Status.SUGGESTION },
    { title: "Bulk export feedback as CSV", description: "Admins should be able to export all feedback items to CSV for offline reporting.", category: Category.FEATURE, status: Status.IN_PROGRESS },
    { title: "Fix duplicate vote counter", description: "Vote count sometimes shows one extra vote after refreshing the page quickly.", category: Category.BUG, status: Status.SUGGESTION },
    { title: "Add keyboard shortcuts", description: "Power users want keyboard shortcuts for voting and navigating the board.", category: Category.ENHANCEMENT, status: Status.SUGGESTION },
    { title: "Support markdown in descriptions", description: "Let authors format feedback descriptions with basic markdown like bold and lists.", category: Category.FEATURE, status: Status.PLANNED },
    { title: "Slow initial page load", description: "The board takes a few seconds to render on first load with many items.", category: Category.BUG, status: Status.IN_PROGRESS },
    { title: "Add avatar upload", description: "Users should be able to upload a custom avatar instead of a generated one.", category: Category.ENHANCEMENT, status: Status.LIVE },
    { title: "Consistent status badge colors", description: "Status badge colors don't match across the board and detail pages.", category: Category.UI, status: Status.LIVE },
    { title: "Simplify comment reply flow", description: "Replying to a comment takes too many clicks; streamline the interaction.", category: Category.UX, status: Status.PLANNED },
  ];

  const createdFeedback = [];
  for (let i = 0; i < feedbackSeeds.length; i++) {
    const seed = feedbackSeeds[i];
    const author = authors[i % authors.length];
    const feedback = await prisma.feedback.create({
      data: {
        title: seed.title,
        description: seed.description,
        category: seed.category,
        status: seed.status,
        authorId: author.id,
      },
    });
    createdFeedback.push(feedback);
  }

  console.log(`Seeded ${authors.length} users and ${createdFeedback.length} feedback items.`);
  console.log(`Categories used: ${categories.join(", ")}`);
  console.log(`Statuses used: ${statuses.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
