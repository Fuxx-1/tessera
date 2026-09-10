import { useMemo, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import { Icon } from "../Icon";
import { Tooltip } from "../Tooltip";
import "./style.css";

export type QRCodeErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type QRCodeStatus = "active" | "loading" | "expired" | "error";

export interface QRCodeProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  value: string;
  backgroundColor?: string;
  border?: boolean | number;
  color?: string;
  download?: boolean;
  downloadFileName?: string;
  downloadLabel?: string;
  level?: QRCodeErrorCorrectionLevel;
  size?: number;
  status?: QRCodeStatus;
  statusLabel?: ReactNode;
}

type EccConfig = {
  dataCodewords: number;
  eccCodewordsPerBlock: number;
  blocks: number;
};

type EncodedQRCode = {
  modules: boolean[][];
  version: number;
};

const MIN_SIZE = 96;
const MAX_SIZE = 360;
const DEFAULT_BORDER_MODULES = 4;
const SAFE_SVG_COLOR_PATTERN =
  /^(#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\(\s*[0-9.%+-]+(?:\s*,\s*|\s+)[0-9.%+-]+(?:\s*,\s*|\s+)[0-9.%+-]+(?:\s*(?:,|\/)\s*[0-9.%+-]+)?\s*\)|black|white|transparent|currentColor)$/;

const ECC_CONFIGS: Record<QRCodeErrorCorrectionLevel, EccConfig[]> = {
  L: [
    { dataCodewords: 19, eccCodewordsPerBlock: 7, blocks: 1 },
    { dataCodewords: 34, eccCodewordsPerBlock: 10, blocks: 1 },
    { dataCodewords: 55, eccCodewordsPerBlock: 15, blocks: 1 },
    { dataCodewords: 80, eccCodewordsPerBlock: 20, blocks: 1 },
  ],
  M: [
    { dataCodewords: 16, eccCodewordsPerBlock: 10, blocks: 1 },
    { dataCodewords: 28, eccCodewordsPerBlock: 16, blocks: 1 },
    { dataCodewords: 44, eccCodewordsPerBlock: 26, blocks: 1 },
    { dataCodewords: 64, eccCodewordsPerBlock: 18, blocks: 2 },
  ],
  Q: [
    { dataCodewords: 13, eccCodewordsPerBlock: 13, blocks: 1 },
    { dataCodewords: 22, eccCodewordsPerBlock: 22, blocks: 1 },
    { dataCodewords: 34, eccCodewordsPerBlock: 18, blocks: 2 },
    { dataCodewords: 48, eccCodewordsPerBlock: 26, blocks: 2 },
  ],
  H: [
    { dataCodewords: 9, eccCodewordsPerBlock: 17, blocks: 1 },
    { dataCodewords: 16, eccCodewordsPerBlock: 28, blocks: 1 },
    { dataCodewords: 26, eccCodewordsPerBlock: 22, blocks: 2 },
    { dataCodewords: 36, eccCodewordsPerBlock: 16, blocks: 4 },
  ],
};

const FORMAT_ECC_BITS: Record<QRCodeErrorCorrectionLevel, number> = {
  M: 0,
  L: 1,
  H: 2,
  Q: 3,
};

function clampSize(size: number) {
  if (!Number.isFinite(size)) {
    return 160;
  }

  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(size)));
}

function getBorderModules(border: boolean | number) {
  if (border === false) {
    return 0;
  }

  if (typeof border === "number") {
    return Math.min(8, Math.max(0, Math.round(border)));
  }

  return DEFAULT_BORDER_MODULES;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push((value >>> index) & 1);
  }
}

function getUtf8Bytes(value: string) {
  return Array.from(new TextEncoder().encode(value));
}

function createDataCodewords(value: string, capacity: number) {
  const bytes = getUtf8Bytes(value);
  const capacityBits = capacity * 8;
  const bits: number[] = [];

  if (bytes.length > 255) {
    throw new Error("QRCode supports up to 255 UTF-8 bytes in this lightweight encoder.");
  }

  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  if (bits.length > capacityBits) {
    throw new Error("QRCode value is too long for versions 1-4 at the selected error correction level.");
  }

  const terminatorLength = Math.min(4, capacityBits - bits.length);
  appendBits(bits, 0, terminatorLength);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(Number.parseInt(bits.slice(index, index + 8).join(""), 2));
  }

  for (let padIndex = 0; codewords.length < capacity; padIndex += 1) {
    codewords.push(padIndex % 2 === 0 ? 0xec : 0x11);
  }

  return codewords;
}

function gfMultiply(left: number, right: number) {
  let product = 0;
  let a = left;
  let b = right;

  while (b > 0) {
    if ((b & 1) !== 0) {
      product ^= a;
    }
    a = (a << 1) ^ ((a >>> 7) * 0x11d);
    b >>>= 1;
  }

  return product & 0xff;
}

function reedSolomonGenerator(degree: number) {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;

  for (let index = 0; index < degree; index += 1) {
    for (let offset = 0; offset < degree; offset += 1) {
      result[offset] = gfMultiply(result[offset], root);
      if (offset + 1 < degree) {
        result[offset] ^= result[offset + 1];
      }
    }
    root = gfMultiply(root, 0x02);
  }

  return result;
}

function reedSolomonRemainder(data: number[], degree: number) {
  const generator = reedSolomonGenerator(degree);
  const result = new Array<number>(degree).fill(0);

  data.forEach((codeword) => {
    const factor = codeword ^ result.shift()!;
    result.push(0);
    generator.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  });

  return result;
}

function createCodewords(dataCodewords: number[], config: EccConfig) {
  const blockSize = config.dataCodewords / config.blocks;
  const dataBlocks: number[][] = [];
  const eccBlocks: number[][] = [];

  for (let block = 0; block < config.blocks; block += 1) {
    const dataBlock = dataCodewords.slice(block * blockSize, (block + 1) * blockSize);
    dataBlocks.push(dataBlock);
    eccBlocks.push(reedSolomonRemainder(dataBlock, config.eccCodewordsPerBlock));
  }

  const result: number[] = [];
  for (let index = 0; index < blockSize; index += 1) {
    dataBlocks.forEach((block) => result.push(block[index]));
  }
  for (let index = 0; index < config.eccCodewordsPerBlock; index += 1) {
    eccBlocks.forEach((block) => result.push(block[index]));
  }

  return result;
}

function createMatrix(size: number) {
  return {
    modules: Array.from({ length: size }, () => Array<boolean>(size).fill(false)),
    reserved: Array.from({ length: size }, () => Array<boolean>(size).fill(false)),
  };
}

function setFunctionModule(modules: boolean[][], reserved: boolean[][], x: number, y: number, dark: boolean) {
  if (y < 0 || y >= modules.length || x < 0 || x >= modules.length) {
    return;
  }

  modules[y][x] = dark;
  reserved[y][x] = true;
}

function drawFinderPattern(modules: boolean[][], reserved: boolean[][], centerX: number, centerY: number) {
  for (let y = -4; y <= 4; y += 1) {
    for (let x = -4; x <= 4; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      setFunctionModule(modules, reserved, centerX + x, centerY + y, distance !== 2 && distance !== 4);
    }
  }
}

function drawAlignmentPattern(modules: boolean[][], reserved: boolean[][], centerX: number, centerY: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      setFunctionModule(modules, reserved, centerX + x, centerY + y, distance !== 1);
    }
  }
}

function reserveFormatModules(modules: boolean[][], reserved: boolean[][]) {
  const size = modules.length;

  for (let index = 0; index <= 8; index += 1) {
    if (index !== 6) {
      setFunctionModule(modules, reserved, 8, index, false);
      setFunctionModule(modules, reserved, index, 8, false);
    }
  }

  for (let index = 0; index < 8; index += 1) {
    setFunctionModule(modules, reserved, size - 1 - index, 8, false);
    setFunctionModule(modules, reserved, 8, size - 1 - index, false);
  }
}

function drawFunctionPatterns(version: number) {
  const size = version * 4 + 17;
  const { modules, reserved } = createMatrix(size);

  drawFinderPattern(modules, reserved, 3, 3);
  drawFinderPattern(modules, reserved, size - 4, 3);
  drawFinderPattern(modules, reserved, 3, size - 4);

  for (let index = 8; index < size - 8; index += 1) {
    setFunctionModule(modules, reserved, index, 6, index % 2 === 0);
    setFunctionModule(modules, reserved, 6, index, index % 2 === 0);
  }

  if (version > 1) {
    drawAlignmentPattern(modules, reserved, size - 7, size - 7);
  }

  reserveFormatModules(modules, reserved);
  setFunctionModule(modules, reserved, 8, size - 8, true);

  return { modules, reserved };
}

function getMaskBit(mask: number, x: number, y: number) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function drawCodewords(modules: boolean[][], reserved: boolean[][], codewords: number[], mask: number) {
  const size = modules.length;
  let bitIndex = 0;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right -= 1;
    }

    for (let vertical = 0; vertical < size; vertical += 1) {
      const upward = ((right + 1) & 2) === 0;
      const y = upward ? size - 1 - vertical : vertical;

      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (!reserved[y][x]) {
          const bit = bitIndex < codewords.length * 8 ? ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0 : false;
          modules[y][x] = bit !== getMaskBit(mask, x, y);
          bitIndex += 1;
        }
      }
    }
  }
}

function getFormatBits(level: QRCodeErrorCorrectionLevel, mask: number) {
  const data = (FORMAT_ECC_BITS[level] << 3) | mask;
  let remainder = data;

  for (let index = 0; index < 10; index += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }

  return ((data << 10) | remainder) ^ 0x5412;
}

function drawFormatBits(modules: boolean[][], level: QRCodeErrorCorrectionLevel, mask: number) {
  const size = modules.length;
  const bits = getFormatBits(level, mask);

  for (let index = 0; index <= 5; index += 1) {
    modules[index][8] = ((bits >>> index) & 1) !== 0;
  }
  modules[7][8] = ((bits >>> 6) & 1) !== 0;
  modules[8][8] = ((bits >>> 7) & 1) !== 0;
  modules[8][7] = ((bits >>> 8) & 1) !== 0;
  for (let index = 9; index < 15; index += 1) {
    modules[8][14 - index] = ((bits >>> index) & 1) !== 0;
  }

  for (let index = 0; index < 8; index += 1) {
    modules[8][size - 1 - index] = ((bits >>> index) & 1) !== 0;
  }
  for (let index = 8; index < 15; index += 1) {
    modules[size - 15 + index][8] = ((bits >>> index) & 1) !== 0;
  }
}

function cloneModules(modules: boolean[][]) {
  return modules.map((row) => [...row]);
}

function cloneReserved(reserved: boolean[][]) {
  return reserved.map((row) => [...row]);
}

function scorePenalty(modules: boolean[][]) {
  const size = modules.length;
  let penalty = 0;

  for (let y = 0; y < size; y += 1) {
    let runColor = modules[y][0];
    let runLength = 1;
    for (let x = 1; x < size; x += 1) {
      if (modules[y][x] === runColor) {
        runLength += 1;
        if (runLength === 5) penalty += 3;
        else if (runLength > 5) penalty += 1;
      } else {
        runColor = modules[y][x];
        runLength = 1;
      }
    }
  }

  for (let x = 0; x < size; x += 1) {
    let runColor = modules[0][x];
    let runLength = 1;
    for (let y = 1; y < size; y += 1) {
      if (modules[y][x] === runColor) {
        runLength += 1;
        if (runLength === 5) penalty += 3;
        else if (runLength > 5) penalty += 1;
      } else {
        runColor = modules[y][x];
        runLength = 1;
      }
    }
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = modules[y][x];
      if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1]) {
        penalty += 3;
      }
    }
  }

  const finderPattern = [true, false, true, true, true, false, true, false, false, false, false];
  const reversePattern = [...finderPattern].reverse();
  const matchesPattern = (line: boolean[], start: number, pattern: boolean[]) => pattern.every((value, index) => line[start + index] === value);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x <= size - finderPattern.length; x += 1) {
      if (matchesPattern(modules[y], x, finderPattern) || matchesPattern(modules[y], x, reversePattern)) {
        penalty += 40;
      }
    }
  }

  for (let x = 0; x < size; x += 1) {
    const column = modules.map((row) => row[x]);
    for (let y = 0; y <= size - finderPattern.length; y += 1) {
      if (matchesPattern(column, y, finderPattern) || matchesPattern(column, y, reversePattern)) {
        penalty += 40;
      }
    }
  }

  const darkCount = modules.flat().filter(Boolean).length;
  const darkPercent = (darkCount * 100) / (size * size);
  penalty += Math.floor(Math.abs(darkPercent - 50) / 5) * 10;

  return penalty;
}

function encodeQRCode(value: string, level: QRCodeErrorCorrectionLevel): EncodedQRCode {
  if (!value) {
    throw new Error("QRCode requires a non-empty value.");
  }

  const versionIndex = ECC_CONFIGS[level].findIndex((config) => {
    const byteLength = getUtf8Bytes(value).length;
    return 4 + 8 + byteLength * 8 <= config.dataCodewords * 8;
  });

  if (versionIndex < 0) {
    throw new Error("QRCode value is too long for the lightweight encoder. Shorten the value or use a dedicated QR encoder.");
  }

  const version = versionIndex + 1;
  const config = ECC_CONFIGS[level][versionIndex];
  const dataCodewords = createDataCodewords(value, config.dataCodewords);
  const codewords = createCodewords(dataCodewords, config);
  const base = drawFunctionPatterns(version);
  let bestModules = base.modules;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const modules = cloneModules(base.modules);
    const reserved = cloneReserved(base.reserved);
    drawCodewords(modules, reserved, codewords, mask);
    drawFormatBits(modules, level, mask);
    const penalty = scorePenalty(modules);

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestModules = modules;
    }
  }

  return { modules: bestModules, version };
}

function escapeAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function createSvgMarkup(modules: boolean[][], quietZone: number, color: string, backgroundColor: string, label: string) {
  const symbolSize = modules.length + quietZone * 2;
  const rects = modules
    .flatMap((row, y) =>
      row.map((active, x) =>
        active ? `<rect x="${x + quietZone}" y="${y + quietZone}" width="1" height="1" />` : "",
      ),
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeAttribute(label)}" viewBox="0 0 ${symbolSize} ${symbolSize}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${escapeAttribute(backgroundColor)}"/><g fill="${escapeAttribute(color)}">${rects}</g></svg>`;
}

function getSafeSvgColor(value: string, fallback: string) {
  const normalized = value.trim();
  return SAFE_SVG_COLOR_PATTERN.test(normalized) ? normalized : fallback;
}

function safeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const baseName = normalized || "qr-code";
  return baseName.toLowerCase().endsWith(".svg") ? baseName : `${baseName}.svg`;
}

function getStatusLabel(status: QRCodeStatus, customLabel?: ReactNode) {
  if (customLabel !== undefined && customLabel !== null) {
    return customLabel;
  }

  if (status === "loading") return "生成中";
  if (status === "expired") return "已过期";
  if (status === "error") return "无法生成";
  return null;
}

export function QRCode({
  "aria-label": ariaLabel,
  backgroundColor = "#ffffff",
  border = true,
  className,
  color = "#111110",
  download = false,
  downloadFileName = "qr-code",
  downloadLabel = "Download SVG",
  level = "M",
  size = 160,
  status = "active",
  statusLabel,
  style,
  value,
  ...props
}: QRCodeProps) {
  const renderedSize = clampSize(size);
  const quietZone = getBorderModules(border);
  const label = ariaLabel ?? `QR code for ${value || "empty value"}`;
  const result = useMemo(() => {
    try {
      return { code: encodeQRCode(value, level), error: null };
    } catch (error) {
      return { code: null, error: error instanceof Error ? error.message : "Unable to generate QRCode." };
    }
  }, [level, value]);
  const resolvedStatus: QRCodeStatus = result.error ? "error" : status;
  const inactive = resolvedStatus !== "active";
  const foreground = getSafeSvgColor(color, "#111110");
  const background = getSafeSvgColor(backgroundColor, "#ffffff");
  const svgMarkup = result.code ? createSvgMarkup(result.code.modules, quietZone, foreground, background, label) : "";
  const dataUrl = svgMarkup ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}` : undefined;
  const symbolSize = result.code ? result.code.modules.length + quietZone * 2 : 0;
  const statusContent = result.error ?? getStatusLabel(resolvedStatus, statusLabel);

  return (
    <div
      className={cx("c-qrcode", inactive && "c-qrcode--inactive", className)}
      style={{ ...style, "--qr-size": `${renderedSize}px` } as CSSProperties}
      {...props}
    >
      <div className="c-qrcode__canvas" aria-busy={resolvedStatus === "loading" ? true : undefined}>
        {result.code ? (
          <span className="c-qrcode__svg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={label}
              viewBox={`0 0 ${symbolSize} ${symbolSize}`}
              shapeRendering="crispEdges"
            >
              <rect width="100%" height="100%" fill={background} />
              <g fill={foreground}>
                {result.code.modules.map((row, y) =>
                  row.map((active, x) =>
                    active ? (
                      <rect
                        key={`${x}-${y}`}
                        x={x + quietZone}
                        y={y + quietZone}
                        width="1"
                        height="1"
                      />
                    ) : null,
                  ),
                )}
              </g>
            </svg>
          </span>
        ) : (
          <span className="c-qrcode__placeholder" aria-hidden="true" />
        )}
        {inactive ? (
          <span className="c-qrcode__status" role="status" aria-live="polite">
            {statusContent}
          </span>
        ) : null}
      </div>
      {download && dataUrl && resolvedStatus === "active" ? (
        <div className="c-qrcode__floating-tools c-local-tools" aria-label="QR code tools">
          <Tooltip content={downloadLabel} placement="top">
            <a aria-label={downloadLabel} className="c-qrcode__download" href={dataUrl} download={safeFileName(downloadFileName)}>
              <Icon decorative name="download" />
            </a>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}
