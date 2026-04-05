/*
 * Egern — 油价+金价 小组件
 * 使用方法：
 * 可选配置变量（在 widget 配置中设置 env）：
 *
 *  - region：手动指定城市（如 guangdong/guangzhou、beijing），留空则自动获取本地 IP 地区油价。  
 *  - SHOW_TREND：true（默认）显示油价调整提示，false隐藏。  
 *  - KLT：K线周期（仅大组件有效），可选 15、30、60、101（日K）、102（周K）、103（月K），默认 15 分。
 * 自动定位基于 https://myip.ipip.net
 * 油价来源于 http://m.qiyoujiage.com
 * 金价来源于东方财富（现货黄金 XAU）
 *
 * 1️⃣ 环境变量配置
 * 在 Egern 小组件配置中添加：不是在脚本改！
 *
 * 名称：region
 * 值：省份/城市（拼音，用 / 分隔）
 *
 * 名称：SHOW_TREND
 * 值：true（显示调价趋势）或 false（不显示）
 *
 * 名称：KLT
 * 值：15（刷新间隔，分钟）或 101
 *
 *
 * 2️⃣ 地区代码对照表
 *
 * 【直辖市】
 * • 北京：beijing  • 上海：shanghai
 * • 天津：tianjin  • 重庆：chongqing
 *
 * 【省份 - 省会城市】
 * • 广东：guangdong/guangzhou
 * • 江苏：jiangsu/nanjing
 * • 浙江：zhejiang/hangzhou
 * • 山东：shandong/jinan
 * • 河南：henan/zhengzhou
 * • 河北：hebei/shijiazhuang
 * • 四川：sichuan/chengdu
 * • 湖北：hubei/wuhan
 * • 湖南：hunan/changsha
 * • 安徽：anhui/hefei
 * • 福建：fujian/fuzhou
 * • 江西：jiangxi/nanchang
 * • 辽宁：liaoning/shenyang
 * • 陕西：shanxi-3/xian  ⚠️
 * • 海南：hainan/haikou
 * • 山西：shanxi-1/taiyuan  ⚠️
 * • 吉林：jilin/changchun
 * • 黑龙江：heilongjiang/haerbin
 * • 云南：yunnan/kunming
 * • 贵州：guizhou/guiyang
 * • 广西：guangxi/nanning
 * • 甘肃：gansu/lanzhou
 * • 青海：qinghai/xining
 * • 宁夏：ningxia/yinchuan
 * • 新疆：xinjiang/wulumuqi
 * • 西藏：xizang/lasa
 * • 内蒙古：neimenggu/huhehaote
 * • 也可以去 http://m.qiyoujiage.com/shanxi-3.shtml 查看自己省份拼音
 * 
 */
export default async function (ctx) {
  const widgetFamily = ctx.widgetFamily || "systemMedium";
  const isSmall = widgetFamily.includes("Small") || widgetFamily.includes("Accessory");
  const isLarge = widgetFamily.includes("Large");

  if (isSmall) {
    return {
      type: "widget",
      padding: 16,
      backgroundColor: { light: "#FFFFFF", dark: "#1C1C1E" },
      children: [
        { type: "text", text: "请使用中号或大号组件", font: { size: "callout" }, textColor: "#1A1A1A", textAlign: "center" }
      ]
    };
  }

  const regionParamRaw = ctx.env.region || "";
  const SHOW_TREND = (ctx.env.SHOW_TREND || "true").trim() !== "false";
  const KLT = (function () {
    const raw = ctx.env.KLT;
    const kltNum = Number(raw);
    const allowed = [15, 30, 60, 101, 102, 103];
    if (allowed.includes(kltNum)) return kltNum;
    return 15;
  })();

  const refreshTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const backgroundColor = { light: "#FFFFFF", dark: "#1C1C1E" };

  const COLORS = {
    primary: { light: "#1A1A1A", dark: "#FFFFFF" },
    secondary: { light: "#666666", dark: "#CCCCCC" },
    card: { light: "#F5F5F7", dark: "#2C2C2E" },
    cardBorder: { light: "#E0E0E0", dark: "#3A3A3C" },
    p92: { light: "#FF9F0A", dark: "#FFB347" },
    p95: { light: "#FF6B35", dark: "#FF8A5C" },
    p98: { light: "#FF3B30", dark: "#FF6B6B" },
    diesel: { light: "#30D158", dark: "#5CD67D" },
    trend: { light: "#2C2C2E", dark: "#FFFFFF" },
  };

  const CACHE_KEY = `qiyoujiage_oil_${regionParamRaw || "local"}`;

  let prices = { p92: null, p95: null, p98: null, diesel: null };
  let regionName = "";
  let trendInfo = "";
  let hasCache = false;
  let fetchError = false;
  let errorMsg = "";

  try {
    const cached = ctx.storage.getJSON(CACHE_KEY);
    if (cached && cached.prices) {
      prices = cached.prices;
      regionName = cached.regionName || "";
      trendInfo = cached.trendInfo || "";
      hasCache = true;
    }
  } catch (_) {}

  let regionParam = regionParamRaw;
  if (!regionParam || regionParam.trim() === "") {
    let localProvince = "";
    let localCity = "";
    try {
      const lRes = await ctx.http.get("https://myip.ipip.net/json", { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 4000 });
      const body = JSON.parse(await lRes.text());
      if (body?.data) {
        const locArr = body.data.location || [];
        localProvince = locArr[1] || "";
        localCity = locArr[2] || "";
      }
    } catch (_) {}
    if (!localProvince) {
      try {
        const res126 = await ctx.http.get("https://ipservice.ws.126.net/locate/api/getLocByIp", { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 4000 });
        const body126 = JSON.parse(await res126.text());
        if (body126?.result) {
          localProvince = body126.result.province || "";
          localCity = body126.result.city || "";
        }
      } catch (_) {}
    }
    const locationToParam = {
      "北京": "beijing",
      "上海": "shanghai",
      "天津": "tianjin",
      "重庆": "chongqing",
      "广东": "guangdong/guangzhou",
      "江苏": "jiangsu/nanjing",
      "浙江": "zhejiang/hangzhou",
      "山东": "shandong/jinan",
      "河南": "henan/zhengzhou",
      "河北": "hebei/shijiazhuang",
      "四川": "sichuan/chengdu",
      "湖北": "hubei/wuhan",
      "湖南": "hunan/changsha",
      "安徽": "anhui/hefei",
      "福建": "fujian/fuzhou",
      "江西": "jiangxi/nanchang",
      "辽宁": "liaoning/shenyang",
      "陕西": "shanxi-3/xian",
      "海南": "hainan/haikou",
      "山西": "shanxi-1/taiyuan",
      "吉林": "jilin/changchun",
      "黑龙江": "heilongjiang/haerbin",
      "云南": "yunnan/kunming",
      "贵州": "guizhou/guiyang",
      "广西": "guangxi/nanning",
      "甘肃": "gansu/lanzhou",
      "青海": "qinghai/xining",
      "宁夏": "ningxia/yinchuan",
      "新疆": "xinjiang/wulumuqi",
      "西藏": "xizang/lasa",
      "内蒙古": "neimenggu/huhehaote",
    };
    regionParam = locationToParam[localProvince] || locationToParam[localCity] || "hainan/haikou";
  }

  try {
    const queryAddr = `http://m.qiyoujiage.com/${regionParam}.shtml`;
    const resp = await ctx.http.get(queryAddr, {
      headers: {
        referer: "http://m.qiyoujiage.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      timeout: 15000,
    });
    if (resp.status !== 200) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();

    const titleMatch = html.match(/<title>([^_]+)_/);
    if (titleMatch && titleMatch[1]) {
      let rawName = titleMatch[1].trim();
      regionName = rawName.replace(/(油价|实时|今日|最新|查询|价格)/g, "").trim();
    }

    const regPrice = /<dl>[\s\S]+?<dt>(.*油)<\/dt>[\s\S]+?<dd>(.*)\(元\)<\/dd>/gm;
    const priceList = [];
    let m = null;
    while ((m = regPrice.exec(html)) !== null) {
      if (m.index === regPrice.lastIndex) regPrice.lastIndex++;
      priceList.push({ name: m[1].trim(), value: m[2].trim() });
    }

    if (priceList.length >= 3) {
      const nameMap = {
        "92 号": "p92", "92": "p92",
        "95 号": "p95", "95": "p95",
        "98 号": "p98", "98": "p98",
        "0 号": "diesel", "柴油": "diesel",
      };
      prices = { p92: null, p95: null, p98: null, diesel: null };
      priceList.forEach((item) => {
        const key = Object.keys(nameMap).find((k) => item.name.includes(k));
        if (key) {
          const priceVal = parseFloat(item.value);
          if (!isNaN(priceVal)) prices[nameMap[key]] = priceVal;
        }
      });

      if (SHOW_TREND) {
        const regTrend = /<div class="tishi">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<br\/>([\s\S]+?)<br\/>/;
        const trendMatch = html.match(regTrend);
        if (trendMatch && trendMatch.length >= 3) {
          const datePart = trendMatch[1].split("价")[1]?.slice(0, -2) || "";
          const valuePart = trendMatch[2];
          const trend = (valuePart.includes("下调") || valuePart.includes("下跌")) ? "Downward" : "Upward";
          let amount = "";
          const allPrices = valuePart.match(/([\d\.]+)\s*元\/升/g);
          if (allPrices && allPrices.length >= 2) {
            const nums = allPrices.map((p) => p.match(/([\d\.]+)/)[1]);
            amount = `${nums[0]}-${nums[1]}`;
          } else {
            const allTons = valuePart.match(/([\d]+)\s*元(?:\/吨)?/g);
            if (allTons && allTons.length >= 2) {
              const nums = allTons.map((p) => p.match(/([\d]+)/)[1]);
              amount = `${nums[0]}-${nums[1]}元/吨`;
            } else {
              const singleMatch = valuePart.match(/([\d\.]+)\s*元\/升/);
              if (singleMatch) amount = `${singleMatch[1]}元/L`;
            }
          }
          trendInfo = `${datePart}调整 ${trend} ${amount}`.trim();
        }
      }
      ctx.storage.setJSON(CACHE_KEY, { prices, regionName, trendInfo });
      fetchError = false;
    } else if (!hasCache) {
      fetchError = true;
      errorMsg = "解析失败";
    }
  } catch (e) {
    if (!hasCache) {
      fetchError = true;
      errorMsg = e.message;
    }
  }

  const titleText = regionName ? `${regionName}实时油价` : "实时油价";
  const rows = [
    { label: "92 号", price: prices.p92, color: COLORS.p92 },
    { label: "95 号", price: prices.p95, color: COLORS.p95 },
    { label: "98 号", price: prices.p98, color: COLORS.p98 },
    { label: "柴油", price: prices.diesel, color: COLORS.diesel },
  ].filter((r) => r.price !== null);

  function priceCard(row) {
    return {
      type: "stack",
      direction: "column",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      padding: [8, 4, 8, 4],
      backgroundColor: COLORS.card,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: COLORS.cardBorder,
      children: [
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 22,
          backgroundColor: { light: row.color.light + "28", dark: row.color.dark + "28" },
          borderRadius: 6,
          borderWidth: 0.5,
          borderColor: { light: row.color.light + "55", dark: row.color.dark + "55" },
          children: [
            {
              type: "text",
              text: row.label,
              font: { size: "caption2", weight: "bold" },
              textColor: row.color,
              textAlign: "center",
            },
          ],
        },
        {
          type: "text",
          text: row.price !== null ? row.price.toFixed(2) : "--",
          font: { size: "title3", weight: "semibold" },
          textColor: COLORS.primary,
          textAlign: "center",
          lineLimit: 1,
          minScale: 0.7,
        },
      ],
    };
  }

  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  const SECID = "122.XAU";
  const LIMIT = 37;
  const end = "20991231";
  const klineUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${encodeURIComponent(SECID)}&klt=${encodeURIComponent(String(KLT))}&fqt=1&lmt=${encodeURIComponent(String(LIMIT))}&end=${end}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`;

  let data = null;
  let hasKlines = false;
  const kl = [];
  try {
    const resp = await ctx.http.get(klineUrl, { timeout: 8000, headers: { "User-Agent": UA, Accept: "*/*", Referer: "https://quote.eastmoney.com/" } });
    const j = await resp.json();
    data = j && j.data ? j.data : null;
    hasKlines = !!(data && Array.isArray(data.klines) && data.klines.length >= 2);
    if (hasKlines) {
      for (const s of data.klines) {
        const arr = String(s).split(",");
        if (arr.length < 5) continue;
        const open = Number(arr[1]);
        const close = Number(arr[2]);
        const high = Number(arr[3]);
        const low = Number(arr[4]);
        if ([open, close, high, low].some((x) => !isFinite(x))) continue;
        kl.push({ open, close, high, low });
      }
    }
  } catch (_) {}

  const snapUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${encodeURIComponent(SECID)}&fields=f43,f59,f60,f169,f170,f58,f57`;
  let snap = {};
  try {
    const snapResp = await ctx.http.get(snapUrl, { timeout: 5000, headers: { "User-Agent": UA, Accept: "*/*", Referer: "https://quote.eastmoney.com/" } });
    const snapJson = await snapResp.json();
    snap = snapJson?.data ?? {};
  } catch (_) {}

  const dec = typeof data?.decimal === "number" ? data.decimal : 2;
  const snapPct = typeof snap.f170 === "number" ? snap.f170 / 100 : NaN;
  const snapDec = typeof snap.f59 === "number" ? snap.f59 : dec;
  const snapScale = Math.pow(10, snapDec);
  const snapLast = typeof snap.f43 === "number" ? snap.f43 / snapScale : NaN;

  function fmtPrice(x, d) {
    if (!isFinite(x)) return "--";
    return x.toFixed(typeof d === "number" ? d : 2);
  }

  function kltLabel(k) {
    if (k === 101) return "日K";
    if (k === 102) return "周K";
    if (k === 103) return "月K";
    return `${k}分K`;
  }

  async function canvasToDataURI(canvas) {
    if (canvas && typeof canvas.convertToBlob === "function") {
      const blob = await canvas.convertToBlob({ type: "image/png" });
      return await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("FileReader error"));
        r.readAsDataURL(blob);
      });
    }
    if (canvas && typeof canvas.toDataURL === "function") return canvas.toDataURL("image/png");
    throw new Error("No canvas export");
  }

  function drawCandles(ctx2d, ohlc, w, h) {
    const padX = 2;
    const padY = 6;
    const px = (v) => Math.round(v) + 0.5;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;
    const minBodyH = 2;
    if (!ohlc || ohlc.length < 2) {
      ctx2d.clearRect(0, 0, w, h);
      return;
    }
    let minP = Infinity;
    let maxP = -Infinity;
    for (const b of ohlc) {
      if (b.low < minP) minP = b.low;
      if (b.high > maxP) maxP = b.high;
    }
    if (!isFinite(minP) || !isFinite(maxP) || maxP <= minP) {
      minP = 0;
      maxP = 1;
    }
    const span = maxP - minP;
    const padSpan = span * 0.03;
    minP -= padSpan;
    maxP += padSpan;
    const n = ohlc.length;
    const candleW = Math.max(2, Math.floor((innerW / Math.max(n, 1)) * 0.7));
    const usableW = Math.max(0, innerW - candleW);
    const xStep = n > 1 ? usableW / (n - 1) : 0;
    const yClamp = (y) => Math.max(padY, Math.min(padY + innerH, y));
    const yOf = (p) => {
      const t = (p - minP) / (maxP - minP);
      return yClamp(px(padY + (1 - t) * innerH));
    };
    ctx2d.clearRect(0, 0, w, h);
    ctx2d.globalAlpha = 0.22;
    ctx2d.strokeStyle = "#7F7F85";
    ctx2d.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const y = padY + (innerH * i) / 6;
      ctx2d.beginPath();
      ctx2d.moveTo(padX, y);
      ctx2d.lineTo(padX + innerW, y);
      ctx2d.stroke();
    }
    ctx2d.globalAlpha = 1;
    for (let i = 0; i < ohlc.length; i++) {
      const b = ohlc[i];
      const xCenter = px(padX + (candleW / 2) + xStep * i);
      const xLeft = Math.round(xCenter - candleW / 2);
      const yOpen = yOf(b.open);
      const yClose = yOf(b.close);
      const yHigh = yOf(b.high);
      const yLow = yOf(b.low);
      const up = b.close >= b.open;
      const color = up ? "#FF3B30" : "#34C759";
      ctx2d.strokeStyle = color;
      ctx2d.lineWidth = 1.3;
      ctx2d.beginPath();
      ctx2d.moveTo(xCenter, yHigh);
      ctx2d.lineTo(xCenter, yLow);
      ctx2d.stroke();
      const top = Math.min(yOpen, yClose);
      const bottom = Math.max(yOpen, yClose);
      const bodyH = Math.max(minBodyH, bottom - top);
      let bodyTop = top;
      if (bodyTop + bodyH > padY + innerH) bodyTop = padY + innerH - bodyH;
      if (bodyTop < padY) bodyTop = padY;
      ctx2d.fillStyle = color;
      ctx2d.fillRect(xLeft, bodyTop, candleW, bodyH);
    }
    ctx2d.save();
    ctx2d.font = "bold 10px -apple-system";
    ctx2d.textAlign = "right";
    ctx2d.fillStyle = "#1A1A1A";
    const labelX = w - 6;
    ctx2d.fillText(`高 ${maxP.toFixed(2)}`, labelX, padY + 12);
    ctx2d.fillText(`低 ${minP.toFixed(2)}`, labelX, padY + innerH - 12);
    ctx2d.restore();
  }

  const W = 380;
  const H = 126;
  const SCALE = 2;
  let dataURI = "";
  if (isLarge) {
    try {
      let canvas;
      if (typeof OffscreenCanvas !== "undefined") {
        canvas = new OffscreenCanvas(W * SCALE, H * SCALE);
      } else if (typeof document !== "undefined" && document.createElement) {
        canvas = document.createElement("canvas");
        canvas.width = W * SCALE;
        canvas.height = H * SCALE;
      }
      if (canvas) {
        const g = canvas.getContext("2d");
        if (g) {
          g.scale(SCALE, SCALE);
          if (hasKlines && kl.length >= 2) {
            drawCandles(g, kl, W, H);
            dataURI = await canvasToDataURI(canvas);
          }
        }
      }
    } catch (e) {
      dataURI = "";
    }
  }

  let trendText = "-";
  let trendColor = "#999999";
  let mainColor = "#FFFFFF";
  if (isFinite(snapPct)) {
    if (snapPct > 0) {
      trendText = `↑ +${snapPct.toFixed(2)}%`;
      trendColor = "#FF3B30";
    } else if (snapPct < 0) {
      trendText = `↓ ${snapPct.toFixed(2)}%`;
      trendColor = "#34C759";
    } else {
      trendText = "0.00%";
      trendColor = "#FF9F0A";
    }
    mainColor = trendColor;
  }
  const gramPrice = isFinite(snapLast) ? fmtPrice(snapLast / 31.1035, 2) : "--";

  const oilSection = rows.length > 0
    ? {
        type: "stack",
        direction: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        padding: [6, 0, 6, 0],
        children: rows.map(priceCard),
      }
    : {
        type: "stack",
        direction: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: [20, 10, 20, 10],
        children: [
          { type: "image", src: "sf-symbol:exclamationmark.triangle.fill", width: 24, height: 24, color: COLORS.p98 },
          { type: "text", text: fetchError ? "数据获取失败" : "暂无数据", font: { size: "body" }, textColor: COLORS.secondary },
        ],
      };

  const goldPriceBar = {
    type: "stack",
    direction: "row",
    height: 34,
    alignItems: "center",
    children: [
      { type: "image", src: "sf-symbol:diamond.circle.fill", width: 15, height: 15, color: "#FFD166" },
      { type: "spacer", length: 6 },
      { type: "text", text: "现货黄金", font: { size: 15, weight: "black" }, textColor: COLORS.primary, maxLines: 1, minScale: 0.6 },
      { type: "spacer", length: 12 },
      { type: "text", text: kltLabel(KLT), font: { size: "caption2", weight: "medium" }, textColor: COLORS.secondary, maxLines: 1, minScale: 0.6 },
      { type: "spacer", length: 6 },
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 3,
        children: [
          { type: "image", src: "sf-symbol:clock.arrow.circlepath", width: 9, height: 9, color: COLORS.secondary },
          { type: "date", date: new Date().toISOString(), format: "relative", font: { size: "caption2", weight: "medium" }, textColor: COLORS.secondary },
        ],
      },
      { type: "spacer" },
      { type: "text", text: fmtPrice(snapLast, snapDec), font: { size: "headline", weight: "semibold", design: "rounded" }, textColor: mainColor, textAlign: "right", maxLines: 1, minScale: 0.6 },
      { type: "spacer", length: 8 },
      {
        type: "stack",
        padding: [2, 6, 2, 6],
        backgroundColor: trendColor,
        borderRadius: 8,
        children: [{ type: "text", text: trendText, font: { size: "caption1", weight: "bold" }, textColor: "#FFFFFF", textAlign: "right", maxLines: 1, minScale: 0.6 }],
      },
    ],
  };

  const gramLine = {
    type: "stack",
    direction: "row",
    alignItems: "center",
    padding: [0, 4, 0, 4],
    children: [
      { type: "spacer" },
      { type: "text", text: `约 ${gramPrice} 元/克`, font: { size: "caption2", weight: "medium" }, textColor: COLORS.secondary },
    ],
  };

  const children = [
    {
      type: "stack",
      direction: "row",
      alignItems: "center",
      gap: 4,
      padding: [0, 4, 0, 4],
      children: [
        { type: "image", src: "sf-symbol:fuelpump.fill", width: 13, height: 13, color: COLORS.p92 },
        { type: "text", text: titleText, font: { size: "caption2", weight: "semibold" }, textColor: COLORS.secondary },
        { type: "spacer" },
        ...(SHOW_TREND && trendInfo ? [{ type: "text", text: trendInfo, font: { size: "caption2" }, textColor: COLORS.trend, textAlign: "right", lineLimit: 1, minScale: 0.8 }] : []),
        ...(fetchError ? [{ type: "text", text: errorMsg, font: { size: "caption2" }, textColor: COLORS.p98 }] : []),
      ].filter(Boolean),
    },
    oilSection,
    { type: "spacer", length: 12 },
    goldPriceBar,
    gramLine,
  ];

  if (isLarge) {
    children.push(
      dataURI
        ? {
            type: "stack",
            direction: "column",
            height: 120,
            children: [{ type: "image", src: dataURI, height: 120, resizeMode: "contain", borderRadius: 12 }],
          }
        : {
            type: "stack",
            direction: "column",
            alignItems: "center",
            justifyContent: "center",
            height: 120,
            children: [{ type: "text", text: "暂无金价图表", font: { size: "caption2" }, textColor: COLORS.secondary }],
          }
    );
  }

  return {
    type: "widget",
    padding: [10, 8, 10, 8],
    gap: 8,
    backgroundColor: backgroundColor,
    refreshAfter: refreshTime,
    children: children,
  };
}
