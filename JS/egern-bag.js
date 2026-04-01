/**
 * WallpaperWidget for Egern
 * ACG 二次元壁纸小组件
 * 数据来源：loliapi.com
 *
 * 环境变量（可选）:
 *   IMAGE_ID       - 指定图片 ID（1~9999），留空或设为 0 表示随机
 *   REFRESH_INTERVAL - 刷新间隔（秒），默认 300，最小 60
 */

export default async function (ctx) {
  // ── 读取配置 ──────────────────────────────────────────────
  const imageIdEnv = ctx.env.IMAGE_ID || ctx.storage.get('image_id') || '0';
  const refreshEnv = ctx.env.REFRESH_INTERVAL || ctx.storage.get('refresh_interval') || '300';

  const imageId = parseInt(imageIdEnv, 10) || 0;
  const refreshInterval = Math.max(60, parseInt(refreshEnv, 10) || 300);

  // ── 决定请求的图片 ID ──────────────────────────────────────
  const targetId = imageId > 0
    ? imageId
    : Math.floor(Math.random() * 9999) + 1;

  // ── 计算下次刷新时间（ISO 8601）──────────────────────────────
  const refreshAfter = new Date(
    Date.now() + refreshInterval * 1000
  ).toISOString();

  // ── 获取图片 URL ───────────────────────────────────────────
  let imageBase64 = null;
  let fetchError = null;

  try {
    // Step 1: 从 API 获取图片 URL
    const apiUrl = `https://www.loliapi.com/acg/pc/?id=${targetId}&type=json`;
    const apiResp = await ctx.http.get(apiUrl, { timeout: 10000 });

    if (apiResp.status !== 200) {
      throw new Error(`API 返回状态码 ${apiResp.status}`);
    }

    const apiData = await apiResp.json();
    const imageUrl = apiData.url;

    if (!imageUrl) {
      throw new Error('API 未返回图片 URL');
    }

    // Step 2: 下载图片为 ArrayBuffer，转为 base64
    const imgResp = await ctx.http.get(imageUrl, { timeout: 20000 });
    if (imgResp.status !== 200) {
      throw new Error(`图片下载失败，状态码 ${imgResp.status}`);
    }

    const imgBuffer = await imgResp.arrayBuffer();
    const bytes = new Uint8Array(imgBuffer);

    // ArrayBuffer → base64
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);

    // 判断图片类型
    const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
    const mime = contentType.split(';')[0].trim() || 'image/jpeg';

    imageBase64 = `data:${mime};base64,${b64}`;

    // 缓存成功的图片（备用）
    ctx.storage.set('cached_image', imageBase64);
    ctx.storage.set('cached_id', String(targetId));

  } catch (err) {
    fetchError = err.message || String(err);
    // 尝试使用缓存图片
    imageBase64 = ctx.storage.get('cached_image') || null;
  }

  // ── 构建 DSL ───────────────────────────────────────────────
  const family = ctx.widgetFamily || 'systemMedium';
  const isLockScreen = family.startsWith('accessory');

  // 根据小组件尺寸调整字体
  const captionFont = { size: 'caption2', weight: 'medium' };
  const footnoteFont = { size: 'footnote', weight: 'regular' };

  // ── 无图片时的占位界面 ─────────────────────────────────────
  if (!imageBase64) {
    return {
      type: 'widget',
      backgroundColor: '#1a1a2e',
      padding: 12,
      children: [
        {
          type: 'stack',
          direction: 'column',
          alignItems: 'center',
          flex: 1,
          children: [
            {
              type: 'spacer',
            },
            {
              type: 'image',
              src: 'sf-symbol:photo.fill',
              color: '#ffffff80',
              width: 32,
              height: 32,
            },
            {
              type: 'spacer',
              length: 8,
            },
            {
              type: 'text',
              text: '壁纸加载失败',
              font: captionFont,
              textColor: '#ffffff80',
              textAlign: 'center',
            },
            fetchError ? {
              type: 'text',
              text: fetchError.substring(0, 40),
              font: { size: 'caption2' },
              textColor: '#ffffff40',
              textAlign: 'center',
              maxLines: 2,
            } : { type: 'spacer', length: 0 },
            {
              type: 'spacer',
            },
          ],
        },
      ],
      refreshAfter,
    };
  }

  // ── 锁屏小组件（无背景图，用色块）─────────────────────────
  if (isLockScreen) {
    return {
      type: 'widget',
      backgroundColor: '#2d2d2d',
      padding: 4,
      children: [
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          children: [
            {
              type: 'image',
              src: 'sf-symbol:photo.artframe',
              color: '#ffffff',
              width: 16,
              height: 16,
            },
            { type: 'spacer', length: 4 },
            {
              type: 'text',
              text: `ACG #${targetId}`,
              font: captionFont,
              textColor: '#ffffff',
              maxLines: 1,
            },
          ],
        },
      ],
      refreshAfter,
    };
  }

  // ── 主屏幕小组件（纯图片，无任何覆盖文字）─────────────────────
  return {
    type: 'widget',
    backgroundImage: imageBase64,
    padding: 0,
    children: [],
    refreshAfter,
  };
}
