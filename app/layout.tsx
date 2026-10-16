import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Columbia Chuckles | Campus life. Better punchlines.",
  description:
    "AI-generated captions inspired by life at Columbia University. Turn campus moments into punchlines, share your captions, and vote for the ones that make you laugh.",
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
