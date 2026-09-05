import type { Metadata } from "next";
import { FollowingView } from "@/components/following/FollowingView";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getServerLocale());
  return { title: `${t.follow.pageTitle} — EXTRA TIME` };
}

export default function FollowingPage() {
  return <FollowingView />;
}
