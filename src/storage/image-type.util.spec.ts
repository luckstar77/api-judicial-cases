import { detectImageType } from './image-type.util';

describe('detectImageType', () => {
  it('should detect supported formats by magic bytes', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe('image/jpeg');
    expect(detectImageType(Buffer.from('89504e470d0a1a0a0000', 'hex'))).toBe('image/png');
    expect(detectImageType(Buffer.from('GIF89a....'))).toBe('image/gif');
    expect(detectImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))).toBe('image/webp');
  });

  it('should reject anything else, including disguised scripts and empty files', () => {
    expect(detectImageType(Buffer.from('<svg onload=alert(1)>'))).toBeUndefined();
    expect(detectImageType(Buffer.from('#!/bin/sh\nrm -rf /'))).toBeUndefined();
    expect(detectImageType(Buffer.alloc(0))).toBeUndefined();
  });
});
