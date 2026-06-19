-- Knowledge Hub: both prompts and links are jsonb arrays
-- prompts items: { text: string, createdAt: string }
-- links   items: { url: string, label: string, createdAt: string }
alter table videos
  add column if not exists prompts jsonb,
  add column if not exists links   jsonb;
