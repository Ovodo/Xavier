import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "xavier",
  description: "Minimal public-post collector + dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell ">
          <header className="header">
            <Link href="/" className="brand">
              <span className="brand-x">X</span>avier
            </Link>
          </header>
          <main className="main flex">{children}</main>
          <footer className="footer">
            <span>For small-scale testing only.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
