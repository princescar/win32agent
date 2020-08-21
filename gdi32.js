const ffi = require('ffi-napi');
const { DTypes: W } = require('win32-api');

const gdi32 = ffi.Library('gdi32', {
  CreateCompatibleDC: [W.HDC, [W.HDC]],
  CreateCompatibleBitmap: [W.HBITMAP, [W.HDC, W.INT, W.INT]],
  SelectObject: [W.HGDIOBJ, [W.HDC, W.HGDIOBJ]],
  DeleteObject: [W.BOOL, [W.HGDIOBJ]],
  BitBlt: [W.BOOL, [W.HDC, W.INT, W.INT, W.INT, W.INT, W.HDC, W.INT, W.INT, W.DWORD]],
  DeleteDC: [W.BOOL, [W.HDC]],
  GetBitmapBits: [W.LONG, [W.HBITMAP, W.LONG, W.LPVOID]]
});

module.exports = gdi32;
