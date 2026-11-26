import { TAIWAN_CITY_DISTRICTS, TaiwanCity } from '../../utils/taiwanDistricts';

/** 判決資料（judicialFileset.city）使用的縣市名稱：臺字、不含市/縣 */
export const JUDGMENT_CITIES = [
  '臺北',
  '新北',
  '桃園',
  '臺中',
  '臺南',
  '高雄',
  '基隆',
  '新竹',
  '苗栗',
  '彰化',
  '南投',
  '雲林',
  '嘉義',
  '屏東',
  '宜蘭',
  '花蓮',
  '臺東',
  '澎湖',
  '金門',
  '連江',
] as const;

const CITY_SUFFIX_PATTERN = /[市縣]$/;

/** 台北市 / 臺北市 / 臺北 → 臺北 */
export function toJudgmentCity(city: string): string {
  return city.trim().replace(/台/g, '臺').replace(CITY_SUFFIX_PATTERN, '');
}

export function isTaiwanCity(city: string): city is TaiwanCity {
  return Object.prototype.hasOwnProperty.call(TAIWAN_CITY_DISTRICTS, city);
}

export function isDistrictOfCity(city: string, district: string): boolean {
  if (!isTaiwanCity(city)) return false;
  const districts: readonly string[] = TAIWAN_CITY_DISTRICTS[city];
  return districts.includes(district);
}

export const TAIWAN_CITIES = Object.keys(TAIWAN_CITY_DISTRICTS) as TaiwanCity[];
