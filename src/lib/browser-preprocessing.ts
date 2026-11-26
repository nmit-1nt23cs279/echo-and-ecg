import { ECG_FEATURE_COUNT } from "./validation";

/** StandardScaler rounds after each in-place operation on the original float32 input. */
export function scaleEcg(values: number[], scaler: { mean: number[]; scale: number[] }): Float32Array {
  if (values.length !== ECG_FEATURE_COUNT || scaler.mean.length !== 140 || scaler.scale.length !== 140)
    throw new Error("ECG requires exactly 140 features and the original fitted scaler.");
  return Float32Array.from(values, (value, i) => {
    const mean = scaler.mean[i];
    const scale = scaler.scale[i];
    if (!Number.isFinite(value) || mean === undefined || scale === undefined || !Number.isFinite(mean) || !Number.isFinite(scale) || scale <= 0)
      throw new Error("ECG features and scaler values must be finite.");
    const result = Math.fround(Math.fround(Math.fround(value) - mean) / scale);
    if (!Number.isFinite(result)) throw new Error("ECG value exceeds float32 range.");
    return result;
  });
}

function cubic(x: number) {
  x = Math.abs(x);
  if (x < 1) return (1.5 * x - 2.5) * x * x + 1;
  if (x < 2) return (((x - 5) * x + 8) * x - 4) * -0.5;
  return 0;
}

// Pillow RGB resize: bicubic, antialias downsampling, 22-bit coefficients,
// horizontal then vertical with uint8 rounding/clipping between passes.
function coefficients(size: number, output: number) {
  const scale = size / output;
  const filterScale = Math.max(1, scale);
  const support = 2 * filterScale;
  return Array.from({ length: output }, (_, i) => {
    const center = (i + 0.5) * scale;
    const start = Math.max(0, Math.trunc(center - support + 0.5));
    const end = Math.min(size, Math.trunc(center + support + 0.5));
    const weights = Array.from({ length: end - start }, (_, k) => cubic((k + start - center + 0.5) / filterScale));
    const sum = weights.reduce((a, b) => a + b, 0);
    return { start, weights: weights.map((w) => {
      const n = sum === 0 ? w : w / sum;
      return Math.trunc(n * 4194304 + (n < 0 ? -0.5 : 0.5));
    }) };
  });
}

export function resizeRgb(rgb: Uint8Array, width: number, height: number, output = 224): Uint8Array {
  if (width <= 0 || height <= 0 || rgb.length !== width * height * 3) throw new Error("Invalid RGB image.");
  const clip = (n: number) => Math.max(0, Math.min(255, Math.floor(n / 4194304)));
  const horizontal = new Uint8Array(output * height * 3);
  const xs = coefficients(width, output);
  for (let y = 0; y < height; y++) for (let x = 0; x < output; x++) {
    const entry = xs[x];
    if (!entry) throw new Error("Invalid resize coefficients.");
    for (let c = 0; c < 3; c++) {
      let sum = 2097152;
      entry.weights.forEach((w, k) => { sum += (rgb[(y * width + entry.start + k) * 3 + c] ?? 0) * w; });
      horizontal[(y * output + x) * 3 + c] = clip(sum);
    }
  }
  const result = new Uint8Array(output * output * 3);
  const ys = coefficients(height, output);
  for (let y = 0; y < output; y++) {
    const entry = ys[y];
    if (!entry) throw new Error("Invalid resize coefficients.");
    for (let x = 0; x < output; x++) for (let c = 0; c < 3; c++) {
      let sum = 2097152;
      entry.weights.forEach((w, k) => { sum += (horizontal[((entry.start + k) * output + x) * 3 + c] ?? 0) * w; });
      result[(y * output + x) * 3 + c] = clip(sum);
    }
  }
  return result;
}

export async function preprocessEcho(bytes: Uint8Array): Promise<Float32Array> {
  let width: number, height: number, rgb: Uint8Array;
  if (bytes[0] === 137 && bytes[1] === 80) {
    const { decode } = await import("fast-png");
    const image = decode(bytes, { checkCrc: true });
    ({ width, height } = image);
    rgb = new Uint8Array(width * height * 3);
    for (let p = 0; p < width * height; p++) {
      const offset = p * image.channels;
      const palette = image.palette?.[image.data[offset] ?? 0];
      for (let c = 0; c < 3; c++) {
        const raw = image.data[offset + (image.channels <= 2 ? 0 : c)] ?? 0;
        // Pillow's I/16 -> RGB conversion clips (does not rescale) grayscale.
        rgb[p * 3 + c] = palette ? (palette[c] ?? 0) : image.depth === 16
          ? image.channels <= 2 ? Math.min(255, raw) : raw >>> 8
          : image.depth < 8 ? Math.round(raw * 255 / (2 ** image.depth - 1)) : raw;
      }
    }
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    // Chromium's libjpeg decoder is closer to Pillow/libjpeg than jpeg-js.
    // Decode at native dimensions; do not use browser canvas image resizing.
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(bytes)]), {
      imageOrientation: "none", premultiplyAlpha: "none", colorSpaceConversion: "none",
    });
    try {
      width = bitmap.width; height = bitmap.height;
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image decoding is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0);
      const rgba = context.getImageData(0, 0, width, height).data;
      rgb = new Uint8Array(width * height * 3);
      for (let p = 0; p < width * height; p++) for (let c = 0; c < 3; c++) rgb[p * 3 + c] = rgba[p * 4 + c] ?? 0;
    } finally { bitmap.close(); }
  } else throw new Error("Only readable JPG and PNG ECHO images are supported.");
  return Float32Array.from(resizeRgb(rgb, width, height), (v) => Math.fround(v / 255));
}