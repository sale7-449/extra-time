import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export default async function NotFound() {
  const t = getMessages(await getServerLocale());

  return (
    <div className="container-page py-24">
      <EmptyState
        title={t.common.notFoundTitle}
        description={t.common.notFoundDesc}
        action={<Button href="/">{t.common.backHome}</Button>}
      />
    </div>
  );
}
