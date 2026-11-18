import type { ReactNode } from "react";

export const metadata = {
  title: "NIS2 Compliance-Agent",
  description: "NIS2-Compliance-Agent für Microsoft 365",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
