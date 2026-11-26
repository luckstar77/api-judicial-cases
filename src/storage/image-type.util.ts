/** 依檔案開頭的 magic bytes 判斷圖片格式，不信任用戶端宣告的 Content-Type */
const SIGNATURES: { mimetype: string; matches: (buffer: Buffer) => boolean }[] = [
  { mimetype: 'image/jpeg', matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  {
    mimetype: 'image/png',
    matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mimetype: 'image/gif',
    matches: (buffer) => buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')),
  },
  {
    mimetype: 'image/webp',
    matches: (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

export function detectImageType(buffer: Buffer): string | undefined {
  return SIGNATURES.find((signature) => signature.matches(buffer))?.mimetype;
}
