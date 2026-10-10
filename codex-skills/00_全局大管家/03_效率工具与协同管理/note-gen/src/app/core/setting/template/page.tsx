'use client';

import { LayoutTemplate } from "lucide-react"
import { SettingTemplate } from "./setting-template";

export default function TemplatePage() {
  return <SettingTemplate id="template" icon={<LayoutTemplate />} />
}
