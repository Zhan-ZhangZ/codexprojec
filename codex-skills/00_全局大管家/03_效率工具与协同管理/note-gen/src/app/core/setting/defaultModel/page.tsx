'use client';
import { SettingType } from "../components/setting-base";
import { Setting } from "./setting";
import { Package } from "lucide-react"
import { useTranslations } from "next-intl";

export default function DefaultModelPage() {
  const t = useTranslations('settings.defaultModel');

  return <SettingType id="defaultModel" icon={<Package />} title={t('title')} desc={t('desc')}>
    <Setting />
  </SettingType>
}
