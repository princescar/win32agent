const ffi = require('ffi-napi');
const { DTypes: W } = require('win32-api');

const user32e = ffi.Library('user32', {
  // GetDlgItem: [W.HWND, [W.HWND, W.INT]],
  // SetDlgItemTextW: [W.BOOL, [W.HWND, W.INT, W.LPCWSTR]],
  GetDC: [W.HDC, [W.HWND]],
  // GetWindowDC: [W.HDC, [W.HWND]],
  ReleaseDC: [W.INT, [W.HWND, W.HDC]],
  // OpenClipboard: [W.BOOL, [W.HWND]],
  // EmptyClipboard: [W.BOOL, []],
  // SetClipboardData: [W.HANDLE, [W.UINT, W.HANDLE]],
  // CloseClipboard: [W.BOOL, []]
});

module.exports = user32e;
