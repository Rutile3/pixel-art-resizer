"use strict";

(() => {
  const fileInput = document.getElementById("file");
  const drop = document.getElementById("drop");
  const srcCanvas = document.getElementById("src");
  const dstCanvas = document.getElementById("dst");
  const scaleInput = document.getElementById("scale");
  const formatSel = document.getElementById("format");
  const qualityInput = document.getElementById("quality");
  const downloadBtn = document.getElementById("download");
  const dlLink = document.getElementById("dlLink");
  const meta = document.getElementById("meta");
  const fit2 = document.getElementById("fit2x");
  const fit3 = document.getElementById("fit3x");
  const fit4 = document.getElementById("fit4x");
  const fit5 = document.getElementById("fit5x");
  const fit10 = document.getElementById("fit10x");

  let fileName = "image";
  let srcImg = null;

  const ctxSrc = srcCanvas.getContext("2d");
  const ctxDst = dstCanvas.getContext("2d");

  // 補間無効（にじみ防止）
  function disableSmoothing(ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = "low";
  }
  disableSmoothing(ctxSrc);
  disableSmoothing(ctxDst);

  function setStatus(w, h, s) {
    meta.textContent = `入力: ${w}×${h}px / 倍率: ${s} / 出力: ${w * s}×${
      h * s
    }px`;
  }

  function drawDst() {
    if (!srcImg) return;
    const s = Math.max(1, Math.floor(Number(scaleInput.value) || 1));
    scaleInput.value = s;

    const sw = srcImg.width,
      sh = srcImg.height;
    srcCanvas.width = sw;
    srcCanvas.height = sh;
    ctxSrc.clearRect(0, 0, sw, sh);
    ctxSrc.drawImage(srcImg, 0, 0);

    dstCanvas.width = sw * s;
    dstCanvas.height = sh * s;
    ctxDst.clearRect(0, 0, dstCanvas.width, dstCanvas.height);

    disableSmoothing(ctxDst);
    // 最近傍で拡大縮小
    ctxDst.drawImage(srcCanvas, 0, 0, sw, sh, 0, 0, sw * s, sh * s);

    setStatus(sw, sh, s);
  }

  // ファイル名のサニタイズ
  function sanitizeName(name) {
    return (name || "image").replace(/\.[^.]+$/, "").replace(/[^\w\-]+/g, "_");
  }

  // 画像の読み込み
  function handleFile(file) {
    fileName = sanitizeName(file.name);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      srcImg = img;
      drawDst();
      URL.revokeObjectURL(url);
    };
    img.onerror = () => alert("画像の読み込みに失敗しました。");
    img.src = url;
  }

  // ファイル選択
  fileInput.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  });

  // クリック/Enter/Spaceでファイル選択
  drop.addEventListener("click", () => fileInput.click());
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  // ドラッグ＆ドロップ
  function prevent(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, prevent)
  );
  drop.addEventListener("dragenter", () => drop.classList.add("drag"));
  drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
  drop.addEventListener("drop", (e) => {
    drop.classList.remove("drag");
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  });

  // クリップボードからのコピペに対応
  window.addEventListener("paste", (e) => {
    const items = [...(e.clipboardData?.items || [])];
    const it = items.find((i) => i.type?.startsWith("image/"));
    if (it) {
      const f = it.getAsFile();
      if (f) handleFile(f);
    }
  });

  // 倍率変更
  scaleInput.addEventListener("input", drawDst);
  fit2.addEventListener("click", () => {
    scaleInput.value = 2;
    drawDst();
  });
  fit3.addEventListener("click", () => {
    scaleInput.value = 3;
    drawDst();
  });
  fit4.addEventListener("click", () => {
    scaleInput.value = 4;
    drawDst();
  });
  fit5.addEventListener("click", () => {
    scaleInput.value = 5;
    drawDst();
  });
  fit10.addEventListener("click", () => {
    scaleInput.value = 10;
    drawDst();
  });

  // 品質(WebP)のON/OFF
  function syncQualityUI() {
    const isWebP = formatSel.value === "image/webp";
    qualityInput.disabled = !isWebP;
    qualityInput.title = isWebP ? "" : "PNGでは品質設定は無効です";
  }
  formatSel.addEventListener("change", syncQualityUI);
  syncQualityUI();

  // 市松模様背景のON/OFF
  const ichimatsuToggle = document.getElementById("ichimatsuToggle");
  ichimatsuToggle?.addEventListener("change", () => {
    [srcCanvas, dstCanvas].forEach((c) =>
      c.classList.toggle("ichimatsu", ichimatsuToggle.checked)
    );
  });

  // ダウンロードボタン
  function canvasToBlob(canvas, type, quality) {
    return new Promise((res, rej) => {
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error("toBlob失敗"))),
        type,
        quality
      );
    });
  }
  async function downloadCurrent() {
    if (!srcImg) {
      alert("先に画像を読み込んでね。");
      return;
    }
    const type = formatSel.value;
    const sfx = type === "image/png" ? "png" : "webp";
    const q = Number(qualityInput.value) || 0.95;
    try {
      const blob = await canvasToBlob(dstCanvas, type, q);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const s = Math.floor(Number(scaleInput.value) || 1);
      a.href = url;
      a.download = `${fileName}_x${s}.${sfx}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      console.error(e);
      alert("エクスポートに失敗しました。");
    }
  }
  downloadBtn.addEventListener("click", downloadCurrent);

  // 初期メッセージ
  setStatus(0, 0, Number(scaleInput.value));
})();
