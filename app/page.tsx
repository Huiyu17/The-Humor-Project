import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: jokes, error } = await supabase
    .from("jokes")
    .select("*");

  if (error) {
    return (
      <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
        <h1>Error loading jokes</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "700px",
        margin: "40px auto",
        padding: "0 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: "24px" }}>Humor List</h1>

      <div style={{ display: "grid", gap: "16px" }}>
        {jokes?.map((joke) => (
          <div
            key={joke.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "18px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                marginBottom: "8px",
              }}
            >
              {joke.setup}
            </h2>

            <p
              style={{
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {joke.punchline}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}