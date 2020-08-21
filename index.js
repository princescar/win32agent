const { execFile } = require('child_process');
const ref = require('ref-napi');
const StructDi = require('ref-struct-di');
const { U, CS, DStruct: DS } = require('win32-api');
const Struct = StructDi(ref);
const user32 = U.load();
const user32e = require('./user32e');
const gdi32 = require('./gdi32');
const config = require('./config.json');
const credentials = require('./credentials.json');

execFile(config.execFilePath);
login();

async function login() {
  const window = await findWindow(config.loginWindowText);
  const controls = getControls(window, config.loginControlIndices);

  input(controls.account, credentials.account);
  await delay(100);
  input(controls.password, credentials.password);
  const captcha = await getCaptcha(controls.captchaImage);
  input(controls.captcha, captcha);

  click(controls.submit);
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

function getControls(hwnd, indices) {
  const GW_CHILD = 5;
  const GW_HWNDNEXT = 2;

  const controls = {};

  const map = [];
  for (let key in indices) {
    map[indices[key]] = key;
  }

  let childhwnd = user32.GetWindow(hwnd, GW_CHILD);
  let index = 0;
  while (isValidHandle(childhwnd)) {
    if (map[index]) {
      controls[map[index]] = childhwnd;
      console.log(map[index], childhwnd.toString(16));
    }
    childhwnd = user32.GetWindow(childhwnd, GW_HWNDNEXT);
    index++;
  }

  return controls;
}

function input(hwnd, text) {
  user32.SendMessageW(hwnd, CS.WM_SETTEXT, 0, ref.address(strBuf(text)));
}

async function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function click(hwnd) {
  const BM_CLICK = 0x00F5;
  user32.SendMessageW(hwnd, BM_CLICK, 0, 0);
}

async function getCaptcha(hwnd) {
  screenshot(hwnd, 'captcha.bmp');
  const text = await require("node-tesseract-ocr").recognize('captcha.bmp', { lang: 'eng', oem: 1, psm: 3 })
  console.log('ocr result', text);
  const captcha = text.trim();
  return captcha;
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

  const hdc = user32e.GetDC(hWnd);
  const hdcMem = gdi32.CreateCompatibleDC(hdc);
  const hbitmap = gdi32.CreateCompatibleBitmap(hdc, width, height);
  gdi32.SelectObject(hdcMem, hbitmap);
  user32.PrintWindow(hWnd, hdcMem, 0);

  const bytes = (width * height) * 4;
  const bmpBuf = Buffer.alloc(bytes);
  gdi32.GetBitmapBits(hbitmap, bytes, bmpBuf);
  console.log(bmpBuf);

  gdi32.DeleteObject(hbitmap);
  gdi32.DeleteObject(hdcMem);
  user32e.ReleaseDC(hWnd, hdc);

  saveBmp(bmpBuf, width, height, filePath);
}

function getWindowSize(hwnd) {
  const rect = new Struct(DS.RECT)();
  user32.GetWindowRect(hwnd, rect.ref());
  console.log('rect', rect.left, rect.right, rect.top, rect.bottom);

  const width = rect.right - rect.left - 13;
  const height = rect.bottom - rect.top;

  return { width, height };
}

function saveBmp(buf, width, height, filePath) {
  const imgBuf = require('image-encode')(buf, [width, height], 'bmp');
  require('fs').writeFileSync(filePath, Buffer.from(imgBuf));
}
