// Demo data for the development database (DEV-WF-01). Run with `pnpm seed`.
// Idempotent: existing demo rows are left as they are.
import bcrypt from "bcrypt";
import { v7 } from "uuid";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";
import type { Question } from "../src/types.js";

if (env.NODE_ENV === "production") {
  console.error("The demo seed never runs with NODE_ENV=production.");
  process.exit(1);
}

const DEMO_EMAIL = "demo@example.com";

const questions: Question[] = [
  {
    id: 1,
    name: "How satisfied are you with your team?",
    type: "SINGLE_SELECT",
    options: [
      { id: 1, content: "Very satisfied" },
      { id: 2, content: "Satisfied" },
      { id: 3, content: "Not satisfied" },
    ],
    isRequired: true,
  },
  {
    id: 2,
    name: "Which benefits do you use?",
    type: "MULTI_SELECT",
    options: [
      { id: 1, content: "Gym" },
      { id: 2, content: "Lunch" },
      { id: 3, content: "Training" },
    ],
    isRequired: false,
  },
  {
    id: 3,
    name: "Anything else you want to tell us?",
    type: "TEXT_ANSWER",
    isRequired: false,
  },
];

const surveys = [
  {
    name: "Team Satisfaction Survey",
    slug: "team-satisfaction-survey",
    is_active: true,
    is_locked: true,
    activated_at: new Date(),
  },
  {
    name: "Office Relocation Survey",
    slug: "office-relocation-survey",
    is_active: false,
    is_locked: true,
    activated_at: null,
  },
  {
    name: "Training Needs Draft",
    slug: "training-needs-draft",
    is_active: false,
    is_locked: false,
    activated_at: null,
  },
];

const answers = [
  {
    origin_ip: "198.51.100.1",
    responses: [
      { id: 1, content: [1] },
      { id: 2, content: [1, 2] },
      { id: 3, content: "Great place to work" },
    ],
  },
  {
    origin_ip: "198.51.100.2",
    responses: [
      { id: 1, content: [2] },
      { id: 2, content: [3] },
    ],
  },
  { origin_ip: "198.51.100.3", responses: [{ id: 1, content: [3] }] },
];

async function main() {
  const existingUser = await prisma.users.findFirst({
    where: { email: DEMO_EMAIL, deleted_at: null },
  });
  if (!existingUser) {
    await prisma.users.create({
      data: {
        id: v7(),
        email: DEMO_EMAIL,
        username: "demo",
        password: await bcrypt.hash("demo12345", 10),
      },
    });
  }

  for (const survey of surveys) {
    const existing = await prisma.surveys.findUnique({
      where: { slug: survey.slug },
    });
    if (!existing) {
      await prisma.surveys.create({
        data: { id: v7(), questions, ...survey },
      });
    }
  }

  const active = await prisma.surveys.findUniqueOrThrow({
    where: { slug: "team-satisfaction-survey" },
  });
  for (const answer of answers) {
    await prisma.answers.upsert({
      where: {
        survey_id_origin_ip: { survey_id: active.id, origin_ip: answer.origin_ip },
      },
      update: {},
      create: { id: v7(), survey_id: active.id, ...answer },
    });
  }

  console.log(
    `Demo data ready: log in as ${DEMO_EMAIL} / demo12345 (${surveys.length} surveys, ${answers.length} answers).`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
