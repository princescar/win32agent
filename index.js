const { execFile } = require('child_process');
const ref = require('ref-napi');
const StructDi = require('ref-struct-di');
const { U, CS, DStruct: DS } = require('win32-api');
const Struct = StructDi(ref);
const user32 = U.load();
const user32e = require('./user32e');
const gdi32 = require('./gdi32');

test();

async function test() {
  const window = await findWindow('计算器');
  screenshot(window, 'calc.bmp');
  screenshot2(window, 'calc2.bmp');
}

async function findWindow(title) {
  console.log('looking for window with title', title);
  const hwnd = user32.FindWindowExW(0, 0, null, strBuf(title));
  if (isValidHandle(hwnd)) {
    console.log('hwnd', hwnd.toString(16));
    return hwnd;
  } else {
    console.log('try again in 500ms.');
    return new Promise(resolve => {
      setTimeout(() => resolve(findWindow(title)), 500);
    });
  }
}

function isValidHandle(hwnd) {
  return typeof hwnd === 'number' && hwnd > 0
    || typeof hwnd === 'bigint' && hwnd > 0
    || typeof hwnd === 'string' && hwnd.length > 0;
}

function strBuf(str) {
  return Buffer.from(str + '\0', 'ucs2');
}

function screenshot(hwnd, filePath) {
  const { width, height } = getWindowSize(hwnd);

  const hdcFrom = user32e.GetDC(hwnd);
  const hdcTo = gdi32.CreateCompatibleDC(hdcFrom);
  const hBitmap = gdi32.CreateCompatibleBitmap(hdcFrom, width, height);
  const hLocalBitmap = gdi32.SelectObject(hdcTo, hBitmap);
  const SRCCOPY = 0x00CC0020;
  gdi32.BitBlt(hdcTo, 0, 0, width, height, hdcFrom, 0, 0, SRCCOPY);
  gdi32.SelectObject(hdcTo, hLocalBitmap);
  gdi32.DeleteDC(hdcTo);
  user32e.ReleaseDC(hwnd, hdcFrom);

  const bytes = (width * height) * 4;
  const bmpBuf = Buffer.alloc(bytes);
  gdi32.GetBitmapBits(hBitmap, bytes, bmpBuf);
  gdi32.DeleteObject(hBitmap);

  saveBmp(bmpBuf, width, height, filePath);
}

async function screenshot2(hwnd, filePath) {
  const { width, height } = getWindowSize(hwnd);

  const hdc = user32e.GetDC(hwnd);
  const hdcMem = gdi32.CreateCompatibleDC(hdc);
  const hbitmap = gdi32.CreateCompatibleBitmap(hdc, width, height);
  gdi32.SelectObject(hdcMem, hbitmap);
  user32.PrintWindow(hwnd, hdcMem, 0);

  const bytes = (width * height) * 4;
  const bmpBuf = Buffer.alloc(bytes);
  gdi32.GetBitmapBits(hbitmap, bytes, bmpBuf);
  console.log(bmpBuf);

  gdi32.DeleteObject(hbitmap);
  gdi32.DeleteObject(hdcMem);
  user32e.ReleaseDC(hwnd, hdc);

  saveBmp(bmpBuf, width, height, filePath);
}

function getWindowSize(hwnd) {
  const rect = new Struct(DS.RECT)();
  user32.GetWindowRect(hwnd, rect.ref());
  console.log('rect', rect.left, rect.right, rect.top, rect.bottom);

  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;

  return { width, height };
}

function saveBmp(buf, width, height, filePath) {
  const imgBuf = require('image-encode')(buf, [width, height], 'bmp');
  require('fs').writeFileSync(filePath, Buffer.from(imgBuf));
}
