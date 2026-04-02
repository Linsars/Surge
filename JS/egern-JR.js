/*
 * Egern — 油价+金价 小组件
 * 使用方法：
 * 1. 可选配置变量（在 widget 配置中设置 env）：
 *    - region：指定油价地区 slug（如 "guangdong/guangzhou" 或 "beijing"），留空则自动根据 IP 获取当地城市
 *    - SHOW_TREND：true / false，是否显示油价调价趋势，默认 true
 *    - KLT：金价K线周期（15/30/60/101/102/103），默认15分钟
 * 2. 自动定位基于 https://myip.ipip.net
 * 3. 油价来源于 http://m.qiyoujiage.com
 * 4. 金价来源于东方财富（现货黄金 XAU）
 * 5. 完整组件：显示油价（四种）+ 金价 K线 + 价格信息
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
  let regionParam = ctx.env.region || "";
  const SHOW_TREND = (ctx.env.SHOW_TREND || "true").trim() !== "false";
  const KLT = Number(ctx.env.KLT) || 15;

  if (!regionParam || regionParam.trim() === "") {
    try {
      const geoRes = await ctx.http.get('https://myip.ipip.net/json', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
      const geoBody = JSON.parse(await geoRes.text());
      if (geoBody?.ret === "ok" && geoBody.data?.location && geoBody.data.location.length >= 3) {
        const locArr = geoBody.data.location;
        if (locArr[0] === "中国") {
          let city = (locArr[2] || locArr[1] || "").replace(/市$|省$|自治区$|特别行政区$/, "");
          const map = {"广州":"guangdong/guangzhou","深圳":"guangdong/shenzhen","成都":"sichuan/chengdu","杭州":"zhejiang/hangzhou","南京":"jiangsu/nanjing","武汉":"hubei/wuhan","西安":"shanxi-3/xian","沈阳":"liaoning/shenyang","长沙":"hunan/changsha","北京":"beijing","上海":"shanghai","天津":"tianjin","重庆":"chongqing"};
          regionParam = map[city] || city.toLowerCase();
        }
      }
    } catch (e) {}
    if (!regionParam) regionParam = "hainan/haikou";
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const refreshTime = new Date(Date.now() + 6*60*60*1000).toISOString();

  const backgroundColor = { light: "#FFFFFF", dark: "#1C1C1E" };
  const COLORS = {
    primary: { light: "#1A1A1A", dark: "#FFFFFF" },
    secondary: { light: "#666666", dark: "#CCCCCC" },
    tertiary: { light: "#999999", dark: "#888888" },
    card: { light: "#F5F5F7", dark: "#2C2C2E" },
    cardBorder: { light: "#E0E0E0", dark: "#3A3A3C" },
    p92: { light: "#FF9F0A", dark: "#FFB347" },
    p95: { light: "#FF6B35", dark: "#FF8A5C" },
    p98: { light: "#FF3B30", dark: "#FF6B6B" },
    diesel: { light: "#30D158", dark: "#5CD67D" },
    gold: { light: "#FFD700", dark: "#FFEA80" },
    trend: { light: "#2C2C2E", dark: "#FFFFFF" },
  };

  const CACHE_KEY_OIL = `qiyoujiage_oil_${regionParam}`;
  let prices = {p92:null, p95:null, p98:null, diesel:null};
  let regionName = "";
  let trendInfo = "";
  let hasOilCache = false;

  try {
    const cached = ctx.storage.getJSON(CACHE_KEY_OIL);
    if (cached && cached.prices) {
      prices = cached.prices;
      regionName = cached.regionName || "";
      trendInfo = cached.trendInfo || "";
      hasOilCache = true;
    }
  } catch(_) {}

  let oilError = false;
  let oilErrorMsg = "";

  try {
    const queryAddr = `http://m.qiyoujiage.com/${regionParam}.shtml`;
    const resp = await ctx.http.get(queryAddr, {
      headers: {
        'referer': 'http://m.qiyoujiage.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 15000
    });
    if (resp.status !== 200) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const html = await resp.text();

    const titleMatch = html.match(/<title>([^_]+)_/);
    if (titleMatch && titleMatch[1]) {
      let rawName = titleMatch[1].trim();
      regionName = rawName.replace(/(油价|实时|今日|最新|查询|价格)/g, '').trim();
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
        "0 号": "diesel", "柴油": "diesel"
      };
      prices = {p92:null, p95:null, p98:null, diesel:null};
      priceList.forEach(item => {
        const key = Object.keys(nameMap).find(k => item.name.includes(k));
        if (key) {
          const priceVal = parseFloat(item.value);
          if (!isNaN(priceVal)) {
            prices[nameMap[key]] = priceVal;
          }
        }
      });

      if (SHOW_TREND) {
        const regTrend = /<div class="tishi">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<br\/>([\s\S]+?)<br\/>/;
        const trendMatch = html.match(regTrend);
        if (trendMatch && trendMatch.length >= 3) {
          const datePart = trendMatch[1].split('价')[1]?.slice(0, -2) || "";
          const valuePart = trendMatch[2];
          const trend = (valuePart.includes('下调') || valuePart.includes('下跌')) ? '↓' : '↑';
          let amount = "";
          const allPrices = valuePart.match(/([\d\.]+)\s*元\/升/g);
          if (allPrices && allPrices.length >= 2) {
            const nums = allPrices.map(p => p.match(/([\d\.]+)/)[1]);
            amount = `${nums[0]}-${nums[1]}`;
          }
          trendInfo = `${datePart}调整 ${trend} ${amount}`.trim();
        }
      }

      ctx.storage.setJSON(CACHE_KEY_OIL, { prices, regionName, trendInfo });
      oilError = false;
    } else {
      if (!hasOilCache) {
        oilError = true;
        oilErrorMsg = `解析失败`;
      }
    }
  } catch (e) {
    if (!hasOilCache) {
      oilError = true;
      oilErrorMsg = e.message;
    }
  }

  const titleText = regionName ? `${regionName}实时油价` : "实时油价";
  const oilRows = [
    {label:"92 号", price:prices.p92, color:COLORS.p92},
    {label:"95 号", price:prices.p95, color:COLORS.p95},
    {label:"98 号", price:prices.p98, color:COLORS.p98},
    {label:"柴油", price:prices.diesel, color:COLORS.diesel},
  ].filter(r => r.price !== null);

  let goldPriceUSD = null;
  let goldChange = "";
  let goldYuanPerGram = null;
  let goldKlineURI = null;

  try {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    const SECID = '122.XAU';
    const LIMIT = 37;

    const snapshotRes = await ctx.http.get(`https://push2.eastmoney.com/api/qt/stock/get?secid=${SECID}&fields=f43,f170`, {
      headers: { 'User-Agent': UA },
      timeout: 8000
    });
    const snapData = JSON.parse(await snapshotRes.text());
    if (snapData?.data) {
      goldPriceUSD = snapData.data.f43 ? (snapData.data.f43 / 100).toFixed(2) : null;
      const changePct = snapData.data.f170 ? (snapData.data.f170 / 100).toFixed(2) : "0.00";
      goldChange = `${changePct}%`;
    }

    const klineRes = await ctx.http.get(`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${SECID}&klt=${KLT}&fqt=1&fields1=f1,f2,f3,f4,f5&fields2=f51,f52,f53,f54,f55,f56,f57,f58&beg=0&end=20500101&lmt=${LIMIT}`, {
      headers: { 'User-Agent': UA },
      timeout: 10000
    });
    const klineData = JSON.parse(await klineRes.text());
    let ohlc = [];
    if (klineData?.data?.klines) {
      ohlc = klineData.data.klines.map(line => {
        const arr = line.split(',');
        return {
          time: arr[0],
          open: parseFloat(arr[1]),
          close: parseFloat(arr[2]),
          high: parseFloat(arr[3]),
          low: parseFloat(arr[4])
        };
      });
    }

    if (ohlc.length >= 2 && ctx.canvas) {
      const canvas = ctx.canvas.create(300, 120);
      const ctx2d = canvas.getContext('2d');

      const padX = 2;
      const padY = 6;
      const innerW = 300 - padX * 2;
      const innerH = 120 - padY * 2;

      let minP = Infinity, maxP = -Infinity;
      for (const b of ohlc) {
        if (b.low < minP) minP = b.low;
        if (b.high > maxP) maxP = b.high;
      }
      const span = maxP - minP;
      minP -= span * 0.03;
      maxP += span * 0.03;

      const n = ohlc.length;
      const candleW = Math.max(2, Math.floor((innerW / Math.max(n, 1)) * 0.7));
      const xStep = n > 1 ? (innerW - candleW) / (n - 1) : 0;

      const yOf = (p) => {
        const t = (p - minP) / (maxP - minP);
        return padY + (1 - t) * innerH;
      };

      ctx2d.clearRect(0, 0, 300, 120);

      for (let i = 0; i < ohlc.length; i++) {
        const b = ohlc[i];
        const xCenter = padX + (candleW / 2) + xStep * i;
        const xLeft = Math.round(xCenter - candleW / 2);

        const yOpen = yOf(b.open);
        const yClose = yOf(b.close);
        const yHigh = yOf(b.high);
        const yLow = yOf(b.low);

        const up = b.close >= b.open;
        const color = up ? '#FF3B30' : '#34C759';

        ctx2d.strokeStyle = color;
        ctx2d.lineWidth = 1.3;
        ctx2d.beginPath();
        ctx2d.moveTo(xCenter, yHigh);
        ctx2d.lineTo(xCenter, yLow);
        ctx2d.stroke();

        const top = Math.min(yOpen, yClose);
        const bottom = Math.max(yOpen, yClose);
        ctx2d.fillStyle = color;
        ctx2d.fillRect(xLeft, top, candleW, Math.max(2, bottom - top));
      }

      goldKlineURI = await canvas.toDataURL('image/png');
    }

    if (goldPriceUSD) {
      try {
        const usdToCnyRes = await ctx.http.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 });
        const rateData = JSON.parse(await usdToCnyRes.text());
        const usdToCny = rateData?.rates?.CNY || 7.1;
        goldYuanPerGram = ((goldPriceUSD * usdToCny) / 31.1035).toFixed(2);
      } catch(e) {}
    }
  } catch (e) {}

  function priceCard(row){
    return {
      type:"stack",
      direction:"column",
      alignItems:"center",
      justifyContent:"center",
      flex:1,
      padding:[8,4,8,4],
      backgroundColor: COLORS.card,
      borderRadius:12,
      borderWidth: 0.5,
      borderColor: COLORS.cardBorder,
      children:[
        {
          type:"stack",
          direction:"row",
          alignItems:"center",
          justifyContent:"center",
          width:44,
          height:22,
          backgroundColor: {
            light: row.color.light + "28",
            dark: row.color.dark + "28"
          },
          borderRadius:6,
          borderWidth:0.5,
          borderColor: {
            light: row.color.light + "55",
            dark: row.color.dark + "55"
          },
          children:[{
            type:"text",
            text:row.label,
            font:{size:"caption2",weight:"bold"},
            textColor: row.color,
            textAlign:"center"
          }]
        },
        {
          type:"text",
          text:row.price !== null ? row.price.toFixed(2) : "--",
          font:{size:"title3",weight:"semibold"},
          textColor: COLORS.primary,
          textAlign:"center",
          lineLimit:1,
          minScale:0.7
        }
      ]
    }
  }

  const children = [];

  children.push({
    type:"stack",
    direction:"row",
    alignItems:"center",
    gap:4,
    padding:[0,4,0,4],
    children:[
      {type:"image",src:"sf-symbol:fuelpump.fill",width:13,height:13,color:COLORS.p92},
      {type:"text",text:titleText,font:{size:"caption2",weight:"semibold"},textColor:COLORS.secondary},
      {type:"spacer"},
      ...(SHOW_TREND && trendInfo ? [{
        type:"text",
        text: trendInfo,
        font:{size:"caption2"},
        textColor: COLORS.trend,
        textAlign:"right",
        lineLimit:1,
        minScale: 0.8
      }] : []),
      ...(oilError ? [{
        type:"text",text:oilErrorMsg,font:{size:"caption2"},textColor:COLORS.p98
      }] : [])
    ].filter(Boolean)
  });

  if (oilRows.length > 0) {
    children.push({
      type:"stack",
      direction:"row",
      alignItems:"center",
      justifyContent:"space-between",
      gap:6,
      padding:[6,0,6,0],
      children: oilRows.map(priceCard)
    });
  } else if (oilError) {
    children.push({
      type:"stack",
      direction:"column",
      alignItems:"center",
      justifyContent:"center",
      padding:[20,10,20,10],
      children:[
        {type:"image",src:"sf-symbol:exclamationmark.triangle.fill",width:24,height:24,color:COLORS.p98},
        {type:"text",text:"油价获取失败",font:{size:"body"},textColor:COLORS.secondary}
      ]
    });
  }

  if (goldPriceUSD || goldKlineURI) {
    children.push({
      type:"stack",
      direction:"column",
      gap:6,
      children: [
        goldKlineURI ? {
          type:"image",
          src: goldKlineURI,
          width: 300,
          height: 120,
          cornerRadius: 8
        } : null,
        {
          type:"stack",
          direction:"row",
          alignItems:"center",
          gap:8,
          padding:[4,4,4,4],
          children:[
            {type:"image",src:"sf-symbol:chart.line.uptrend.xyaxis",width:14,height:14,color:COLORS.gold},
            {type:"text",text:"现货黄金",font:{size:"caption2",weight:"semibold"},textColor:COLORS.secondary},
            {type:"text",text:goldPriceUSD ? `$${goldPriceUSD}` : "--",font:{size:"title2",weight:"semibold"},textColor:COLORS.gold},
            {type:"text",text:goldChange,font:{size:"caption1"},textColor: goldChange.startsWith('-') ? COLORS.p98 : "#34C759"},
            {type:"spacer"},
            {type:"text",text:goldYuanPerGram ? `${goldYuanPerGram}元/克` : "",font:{size:"caption2"},textColor:COLORS.gold}
          ].filter(Boolean)
        }
      ].filter(Boolean)
    });
  }

  children.push({
    type:"stack",
    direction:"row",
    alignItems:"center",
    padding:[0,4,0,4],
    children:[
      {type:"text",text:`${timeStr} 更新`,font:{size:"caption2"},textColor:COLORS.tertiary},
      {type:"spacer"},
      {type:"text",text:"油价 元/升    金价 USD/oz | 元/克",font:{size:"caption2"},textColor:COLORS.tertiary}
    ]
  });

  return {
    type:"widget",
    padding:[10,8,10,8],
    gap:6,
    backgroundColor: backgroundColor,
    refreshAfter:refreshTime,
    children: children
  }
}
