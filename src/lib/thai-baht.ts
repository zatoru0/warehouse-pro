/**
 * แปลงตัวเลขเป็นข้อความภาษาไทย (บาท/สตางค์)
 * เช่น 1234.50 → "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์"
 */
export function thaiBaht(n: number): string {
  if (n === 0) return "ศูนย์บาทถ้วน";

  const units = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const places = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  function read(num: number): string {
    if (num === 0) return "";
    if (num >= 1_000_000) return read(Math.floor(num / 1_000_000)) + "ล้าน" + read(num % 1_000_000);
    let s = "";
    const digits = String(num).split("").reverse();
    for (let i = digits.length - 1; i >= 0; i--) {
      const d = parseInt(digits[i]);
      if (d === 0) continue;
      if (i === 1 && d === 1) s += "สิบ";
      else if (i === 1 && d === 2) s += "ยี่สิบ";
      else if (i === 0 && d === 1 && digits.length > 1) s += "เอ็ด";
      else s += units[d] + places[i];
    }
    return s;
  }

  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);
  let result = read(intPart) + "บาท";
  if (decPart > 0) result += read(decPart) + "สตางค์";
  else result += "ถ้วน";
  return result;
}
