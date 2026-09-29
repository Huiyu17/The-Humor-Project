// Read only: prints accessible table/column definitions, never keys or row data.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const response = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!response.ok) {
  console.log(`Schema request failed: ${response.status}`);
  for (const table of [
    "jokes",
    "profiles",
    "captions",
    "images",
    "caption_votes",
  ]) {
    const check = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log(`${table}: ${check.status}`);
  }
  process.exit(1);
}
const schema = await response.json();
console.log(JSON.stringify(schema.definitions ?? {}, null, 2));
