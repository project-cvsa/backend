import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const interSans = Inter({
	variable: "--font-inter-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "中V大盘",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${interSans.variable} ${geistMono.variable} h-full antialiased dark`}
		>
			<body className="min-h-full flex flex-col  bg-[#0a0a0a] text-white">{children}</body>
		</html>
	);
}
