import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "The Humor Project | A better punchline",
  description:
    "A picture sets the scene. A caption steals the show. Explore captions, share your verdict, and find your next laugh.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
