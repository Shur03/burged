import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Бүргэд хаалга", template: "%s | Бүргэд хаалга" },
  description: "Смарт цоожтой, орон сууцны болон гадна хаалганы каталог.",
  icons: { icon: "/brand.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="mn" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
