import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Cinzel } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trail Gliders Academy | Excellence as You Glide Beyond Limits",
  description:
    "Trail Gliders Academy, Nsukka — a premier Nigerian primary school nurturing confident, curious, and creative learners. Discover our programs, campus life, and admissions.",
  keywords: [
    "Trail Gliders Academy",
    "Nsukka primary school",
    "Nigeria primary school",
    "best primary school Nsukka",
    "Nigerian education",
    "primary school Enugu",
    "Trail Gliders",
  ],
  authors: [{ name: "Trail Gliders Academy" }],
  openGraph: {
    title: "Trail Gliders Academy | Excellence as You Glide Beyond Limits",
    description:
      "A premier Nigerian primary school in Nsukka nurturing confident, curious, and creative learners.",
    url: "https://trailgliders.edu.ng",
    siteName: "Trail Gliders Academy",
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trail Gliders Academy",
    description: "Excellence as You Glide Beyond Limits — Nsukka, Nigeria",
  },
  icons: {
    icon: "/crest/school-crest.png",
    apple: "/crest/school-crest.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${playfair.variable} ${cinzel.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
