export default function maskHalf(value: string): string {
    const len = value.length;
    if (len <= 1) return '*';
    const hideLen = Math.floor(len / 2);
    const start = Math.floor((len - hideLen) / 2);
    return value.slice(0, start) + '*'.repeat(hideLen) + value.slice(start + hideLen);
}
