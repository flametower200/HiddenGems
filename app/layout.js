import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "HiddenGems | Scouting calcistico",
  description: "Connetti giocatori, allenatori, scout e società nel mondo del calcio.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={`${manrope.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
