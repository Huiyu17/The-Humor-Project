// Isolated PostgreSQL/RLS regression test. Never connects to the hosted database.
// npm install --prefix artifacts/my-humor-check --no-save --package-lock=false @electric-sql/pglite
// node scripts/check-my-humor-db.mjs
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PGlite } from "../artifacts/my-humor-check/node_modules/@electric-sql/pglite/dist/index.js";

const db = new PGlite();
const author = "10000000-0000-4000-8000-000000000001";
const fan = "10000000-0000-4000-8000-000000000002";
const photo = "20000000-0000-4000-8000-000000000001";
const generation = "30000000-0000-4000-8000-000000000001";
let checks = 0;
async function asUser(id, role = "authenticated") {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
}
async function scalar(sql, params = []) {
  const { rows } = await db.query(sql, params);
  return Object.values(rows[0])[0];
}
async function denied(sql, params = []) {
  await assert.rejects(db.query(sql, params));
  checks++;
}
try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table public.profiles (id uuid primary key, first_name text, last_name text, avatar_url text, updated_at timestamptz);
    create table public.jokes (id uuid primary key);
    create schema storage;
    create table storage.objects (id uuid primary key, bucket_id text, name text);
    create function storage.foldername(text) returns text[] language sql as 'select string_to_array($1, ''/'')';
    insert into public.profiles (id, first_name, last_name) values
      ('${author}', 'Author', 'One'), ('${fan}', 'Reader', 'Two');
  `);
  for (const name of ["002_caption_rating.sql", "004_week4_schema_and_rls.sql", "005_publish_generation.sql", "006_caption_previews.sql", "007_my_humor.sql"]) {
    await db.exec(await readFile(new URL(`../supabase/${name}`, import.meta.url), "utf8"));
  }
  // Reapplying the migration must preserve existing schema and policies.
  await db.exec(await readFile(new URL("../supabase/007_my_humor.sql", import.meta.url), "utf8"));
  await db.query("insert into public.images (id, url, alt_text) values ($1, 'https://example.com/photo.jpg', 'A sample')", [photo]);
  await asUser(author);
  await db.query("insert into public.generations (id, user_id, image_id, user_input, prompt, model, generated_content) values ($1, $2, $3, 'Finals are over', 'Private prompt', 'test', 'Finally free.')", [generation, author, photo]);
  const caption = await scalar("select public.humor_publish_preview($1)", [generation]);
  assert.equal(await scalar("select public.humor_publish_preview($1)", [generation]), caption); checks++;
  await asUser(fan);
  assert.equal(await scalar("select count(*)::int from public.generations"), 0); checks++;
  await denied("select public.humor_delete_caption($1)", [caption]);
  await denied("select public.humor_publish_preview($1)", [generation]);
  await db.query("insert into public.caption_votes (user_id, caption_id, value) values ($1, $2, 1)", [fan, caption]);
  assert.equal(await scalar("select count(*)::int from public.caption_votes v join public.captions c on c.id = v.caption_id where v.value = 1"), 1); checks++;
  await asUser(author);
  await db.query("delete from public.caption_votes where caption_id = $1", [caption]);
  await asUser(fan);
  assert.equal(await scalar("select count(*)::int from public.caption_votes"), 1); checks++;
  await db.query("delete from public.caption_votes where user_id = $1 and caption_id = $2 and value = 1", [fan, caption]);
  assert.equal(await scalar("select count(*)::int from public.caption_votes"), 0); checks++;
  await db.query("insert into public.caption_votes (user_id, caption_id, value) values ($1, $2, 1)", [fan, caption]);
  await asUser(author);
  assert.equal(await scalar("select public.humor_delete_caption($1)", [caption]), true); checks++;
  assert.equal(await scalar("select public.humor_delete_caption($1)", [caption]), true); checks++;
  assert.equal(await scalar("select count(*)::int from public.captions"), 0); checks++;
  assert.equal(await scalar("select count(*)::int from public.images"), 1); checks++;
  await denied("select public.humor_publish_preview($1)", [generation]);
  await denied("insert into public.captions (image_id, content, generation_id) values ($1, 'Retry', $2)", [photo, generation]);
  await denied("update public.captions set deleted_at = null where id = $1", [caption]);
  await asUser(fan);
  assert.equal(await scalar("select count(*)::int from public.captions"), 0); checks++;
  assert.equal(await scalar("select count(*)::int from public.caption_votes"), 0); checks++;
  await denied("insert into public.caption_votes (user_id, caption_id, value) values ($1, $2, 1) on conflict (user_id, caption_id) do update set value = 1", [fan, caption]);
  await asUser("", "anon");
  assert.equal(await scalar("select count(*)::int from public.captions"), 0); checks++;
  await denied("select public.humor_delete_caption($1)", [caption]);
  await denied("select public.humor_publish_preview($1)", [generation]);
  console.log(`PASS: ${checks} ownership, likes, deletion, RLS, and stale-publication checks.`);
} finally {
  await db.close();
}
