import { useState, useCallback } from "react";

type BitLength = 8 | 16;
type InputMode = "decimal" | "binary";

interface StepResult {
  originalBin: string;
  onesComplement: string;
  twosComplement: string;
  decimalValue: number;
  absValue: number;
  isNegative: boolean;
  isPositive: boolean;
}

function padBin(bin: string, bits: number): string {
  return bin.padStart(bits, "0");
}

function formatBin(bin: string): string {
  return bin.match(/.{1,4}/g)!.join(" ");
}

function twosComplementSteps(decimal: number, bits: BitLength): StepResult {
  const isNegative = decimal < 0;
  const isPositive = decimal >= 0;
  const absValue = Math.abs(decimal);

  const originalBin = padBin(absValue.toString(2), bits);

  let onesComplement: string;
  let twosComplement: string;

  if (isPositive) {
    onesComplement = originalBin;
    twosComplement = originalBin;
  } else {
    onesComplement = originalBin
      .split("")
      .map((b) => (b === "0" ? "1" : "0"))
      .join("");
    const twosVal = BigInt("0b" + onesComplement) + 1n;
    twosComplement = padBin(twosVal.toString(2), bits).slice(-bits);
  }

  return {
    originalBin,
    onesComplement,
    twosComplement,
    decimalValue: decimal,
    absValue,
    isNegative,
    isPositive,
  };
}

function parseBinaryAsSignedDecimal(binStr: string, bits: BitLength): number {
  const padded = padBin(binStr, bits);
  const isNeg = padded[0] === "1";
  const unsigned = parseInt(padded, 2);
  if (isNeg) {
    return unsigned - Math.pow(2, bits);
  }
  return unsigned;
}

function validateDecimal(value: number, bits: BitLength): string | null {
  const max = Math.pow(2, bits - 1) - 1;
  const min = -Math.pow(2, bits - 1);
  if (value > max || value < min) {
    return `超出 ${bits}-bit 有效範圍 (${min} 至 ${max})`;
  }
  return null;
}

// Bit cell with highlight
function BitCell({
  bit,
  index,
  highlight,
  changed,
}: {
  bit: string;
  index: number;
  highlight?: boolean;
  changed?: boolean;
}) {
  return (
    <span
      key={index}
      className={`inline-flex items-center justify-center w-8 h-9 rounded font-mono font-bold text-lg border transition-all duration-300 ${
        highlight
          ? "bg-indigo-600 text-white border-indigo-700 shadow-md"
          : changed
          ? "bg-amber-100 text-amber-800 border-amber-300"
          : "bg-white text-indigo-700 border-indigo-200"
      }`}
    >
      {bit}
    </span>
  );
}

function BinaryDisplay({
  bin,
  compareTo,
  highlight,
}: {
  bin: string;
  compareTo?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {bin.split("").map((bit, i) => (
        <BitCell
          key={i}
          bit={bit}
          index={i}
          highlight={highlight}
          changed={compareTo ? compareTo[i] !== bit : false}
        />
      ))}
    </div>
  );
}

function StepCard({
  stepNum,
  title,
  bin,
  compareTo,
  explanation,
  accent,
}: {
  stepNum: number;
  title: string;
  bin: string;
  compareTo?: string;
  explanation: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-indigo-400 bg-indigo-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            accent
              ? "bg-indigo-600 text-white"
              : "bg-gray-300 text-gray-700"
          }`}
        >
          {stepNum}
        </span>
        <h4
          className={`text-sm font-semibold tracking-wide ${
            accent ? "text-indigo-700" : "text-gray-500"
          }`}
        >
          {title}
        </h4>
      </div>
      <BinaryDisplay bin={bin} compareTo={compareTo} highlight={accent} />
      <p
        className={`text-xs text-center mt-2 ${
          accent ? "text-indigo-600 font-semibold" : "text-gray-400"
        }`}
      >
        {explanation}
      </p>
    </div>
  );
}

function ArrowStep({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 my-1">
      <div className="w-px h-3 bg-gray-300" />
      <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
        {label}
      </span>
      <div className="w-px h-3 bg-gray-300" />
      <span className="text-gray-300 text-lg leading-none">▼</span>
    </div>
  );
}

export default function App() {
  const [bits, setBits] = useState<BitLength>(8);
  const [mode, setMode] = useState<InputMode>("decimal");

  // Two separate inputs — always both editable
  const [decInput, setDecInput] = useState("");
  const [binInput, setBinInput] = useState("");
  const [decError, setDecError] = useState("");
  const [binError, setBinError] = useState("");

  const [result, setResult] = useState<StepResult | null>(null);

  const maxVal = Math.pow(2, bits - 1) - 1;
  const minVal = -Math.pow(2, bits - 1);

  // When decimal input changes → update binary display live
  const handleDecChange = useCallback(
    (raw: string) => {
      setDecInput(raw);
      setDecError("");
      setBinError("");

      if (raw === "" || raw === "-") {
        setBinInput("");
        setResult(null);
        return;
      }

      if (!/^-?\d+$/.test(raw)) {
        setDecError("請輸入有效的10進制整數");
        setBinInput("");
        setResult(null);
        return;
      }

      const val = parseInt(raw, 10);
      const err = validateDecimal(val, bits);
      if (err) {
        setDecError(err);
        setBinInput("");
        setResult(null);
        return;
      }

      // Compute two's complement representation
      const steps = twosComplementSteps(val, bits);
      setBinInput(steps.twosComplement);
      setResult(steps);
    },
    [bits]
  );

  // When binary input changes → update decimal display live
  const handleBinChange = useCallback(
    (raw: string) => {
      // Strip spaces so user can paste formatted or unformatted
      const clean = raw.replace(/\s/g, "");
      setBinInput(clean);
      setDecError("");
      setBinError("");

      if (clean === "") {
        setDecInput("");
        setResult(null);
        return;
      }

      if (!/^[01]+$/.test(clean)) {
        setBinError("只能輸入 0 或 1");
        setDecInput("");
        setResult(null);
        return;
      }

      if (clean.length > bits) {
        setBinError(`超過 ${bits}-bit 位元數 (最多 ${bits} 位)`);
        setDecInput("");
        setResult(null);
        return;
      }

      // Interpret as two's complement signed integer
      const decimal = parseBinaryAsSignedDecimal(clean, bits);
      setDecInput(String(decimal));

      // Build steps: the binary IS the two's complement representation
      // We want to show: |decimal| → originalBin → onesComplement → twosComplement
      const steps = twosComplementSteps(decimal, bits);
      setResult(steps);
    },
    [bits]
  );

  // When bit length changes, reset
  const handleBitsChange = (newBits: BitLength) => {
    setBits(newBits);
    setDecInput("");
    setBinInput("");
    setDecError("");
    setBinError("");
    setResult(null);
  };

  const handleModeSwitch = (newMode: InputMode) => {
    setMode(newMode);
    setDecInput("");
    setBinInput("");
    setDecError("");
    setBinError("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg mb-3">
            <span className="text-white text-2xl font-bold font-mono">2C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">二補碼即時計算機</h1>
          <p className="text-sm text-gray-500 mt-1">
            Two's Complement Real-time Converter
          </p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          {/* Bit length selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
              位元長度
            </span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {([8, 16] as BitLength[]).map((b) => (
                <button
                  key={b}
                  onClick={() => handleBitsChange(b)}
                  className={`px-5 py-2 text-sm font-bold transition-colors ${
                    bits === b
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-500 hover:bg-indigo-50"
                  }`}
                >
                  {b}-bit
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto">
              範圍：{minVal} ~ {maxVal}
            </span>
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-semibold">
            <button
              onClick={() => handleModeSwitch("decimal")}
              className={`flex-1 py-2 transition-colors ${
                mode === "decimal"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-500 hover:bg-indigo-50"
              }`}
            >
              10進制輸入
            </button>
            <button
              onClick={() => handleModeSwitch("binary")}
              className={`flex-1 py-2 transition-colors ${
                mode === "binary"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-500 hover:bg-indigo-50"
              }`}
            >
              2進制輸入
            </button>
          </div>

          {/* ── Decimal input ── */}
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-600">
              10進制 (Decimal)
            </label>
            <div className="relative">
              <input
                type="text"
                value={decInput}
                onChange={(e) => {
                  if (mode === "decimal") {
                    handleDecChange(e.target.value);
                  }
                }}
                readOnly={mode === "binary"}
                placeholder={mode === "decimal" ? `輸入整數，例如 -20 或 64` : "自動計算"}
                className={`w-full px-4 py-3 rounded-xl border text-base font-mono transition-all outline-none ${
                  mode === "decimal"
                    ? decError
                      ? "border-red-400 bg-red-50 focus:border-red-500"
                      : "border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                }`}
              />
              {mode === "decimal" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-300 font-sans">
                  DEC
                </span>
              )}
            </div>
            {decError && (
              <p className="text-xs text-red-500 pl-1">⚠ {decError}</p>
            )}
          </div>

          {/* Live sync indicator */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
            <span className="text-xs text-indigo-400 font-semibold px-2">
              ⇅ 即時轉換
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
          </div>

          {/* ── Binary input ── */}
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-600">
              2進制 / 二補碼 (Binary / Two's Complement)
            </label>
            <div className="relative">
              <input
                type="text"
                value={binInput}
                onChange={(e) => {
                  if (mode === "binary") {
                    handleBinChange(e.target.value);
                  }
                }}
                readOnly={mode === "decimal"}
                placeholder={
                  mode === "binary"
                    ? `輸入 ${bits}-bit 二補碼，例如 11101100`
                    : "自動計算"
                }
                className={`w-full px-4 py-3 rounded-xl border text-base font-mono tracking-widest transition-all outline-none ${
                  mode === "binary"
                    ? binError
                      ? "border-red-400 bg-red-50 focus:border-red-500"
                      : "border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                }`}
              />
              {mode === "binary" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-300 font-sans">
                  BIN
                </span>
              )}
            </div>
            {binError && (
              <p className="text-xs text-red-500 pl-1">⚠ {binError}</p>
            )}
            {/* bit counter */}
            {mode === "binary" && binInput && !binError && (
              <p className="text-xs text-gray-400 pl-1 font-mono">
                已輸入 {binInput.length} / {bits} 位元
                {binInput.length < bits && (
                  <span className="text-indigo-400">
                    {" "}
                    （前端補 {bits - binInput.length} 個 0 對齊）
                  </span>
                )}
              </p>
            )}
          </div>

          {/* ── Steps ── */}
          {result && (
            <div className="space-y-1 pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                推導步驟
              </p>

              {result.isPositive ? (
                // Positive number flow
                <div className="space-y-2">
                  <div className="rounded-xl border border-indigo-400 bg-indigo-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                        ✓
                      </span>
                      <h4 className="text-sm font-semibold text-indigo-700">
                        正數 / 零 的二補碼
                      </h4>
                    </div>
                    <BinaryDisplay bin={result.twosComplement} highlight />
                    <p className="text-xs text-center mt-2 text-indigo-600 font-semibold">
                      正數的二補碼 = 原始二進制（最高位為 0 表示正數）
                    </p>
                    <p className="text-xs text-center mt-1 text-indigo-500">
                      十進制：{result.decimalValue}
                    </p>
                  </div>
                </div>
              ) : (
                // Negative number flow
                <div className="space-y-0">
                  <StepCard
                    stepNum={1}
                    title={`絕對值 ${result.absValue} 的原始二進制`}
                    bin={result.originalBin}
                    explanation={`|${result.decimalValue}| = ${result.absValue} → 轉為 ${bits}-bit 二進制`}
                  />
                  <ArrowStep label="反轉所有位元 (0→1, 1→0)" />
                  <StepCard
                    stepNum={2}
                    title="一補碼 (1's Complement)"
                    bin={result.onesComplement}
                    compareTo={result.originalBin}
                    explanation="每個位元取反"
                  />
                  <ArrowStep label="加 1 (+1)" />
                  <StepCard
                    stepNum={3}
                    title={`二補碼 (2's Complement) = ${result.decimalValue} 的儲存格式`}
                    bin={result.twosComplement}
                    compareTo={result.onesComplement}
                    explanation={`${result.decimalValue} 在電腦中以此二補碼儲存（最高位 1 表示負數）`}
                    accent
                  />
                </div>
              )}

              {/* Summary row */}
              <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex flex-wrap gap-4 justify-around text-center text-xs">
                <div>
                  <div className="text-gray-400 mb-0.5">十進制</div>
                  <div className="font-bold text-gray-800 text-base font-mono">
                    {result.decimalValue}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">十六進制</div>
                  <div className="font-bold text-gray-800 text-base font-mono uppercase">
                    0x
                    {(result.isNegative
                      ? parseInt(result.twosComplement, 2)
                      : result.absValue
                    )
                      .toString(16)
                      .padStart(bits / 4, "0")
                      .toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">八進制</div>
                  <div className="font-bold text-gray-800 text-base font-mono">
                    0o
                    {(result.isNegative
                      ? parseInt(result.twosComplement, 2)
                      : result.absValue
                    )
                      .toString(8)
                      .padStart(Math.ceil(bits / 3), "0")}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">二補碼 (格式)</div>
                  <div className="font-bold text-indigo-700 text-sm font-mono">
                    {formatBin(result.twosComplement)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          輸入時即時計算 · 支援 8-bit 及 16-bit · 二補碼有號整數
        </p>
      </div>
    </div>
  );
}
