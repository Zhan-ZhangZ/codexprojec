import { GenTemplateRange } from '@/stores/setting';

/**
 * 获取模板范围的国际化标签
 * @param range 模板范围枚举值
 * @param t 翻译函数
 * @returns 国际化后的标签文本
 */
export function getTemplateRangeLabel(range: GenTemplateRange, t: (key: string) => string): string {
  const keyMap = {
    [GenTemplateRange.All]: 'settings.template.range.all',
    [GenTemplateRange.Today]: 'settings.template.range.today',
    [GenTemplateRange.Week]: 'settings.template.range.week',
    [GenTemplateRange.Month]: 'settings.template.range.month',
    [GenTemplateRange.ThreeMonth]: 'settings.template.range.threeMonth',
    [GenTemplateRange.Year]: 'settings.template.range.year',
  };
  if (!Object.values(GenTemplateRange).includes(range)) {
    return t('settings.template.range.all');
  }
  
  return t(keyMap[range]);
}

/**
 * 获取所有模板范围选项的国际化标签
 * @param t 翻译函数
 * @returns 包含值和标签的选项数组
 */
export function getTemplateRangeOptions(t: (key: string) => string) {
  return Object.values(GenTemplateRange).map(value => ({
    value,
    label: getTemplateRangeLabel(value, t)
  }));
}
