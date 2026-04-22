const pmKey = 'pingme_accounts_v1';
const wtKey = 'wetalk_accounts_v1';

console.log('=== PingMe 诊断 ===');
const pmRaw = $persistentStore.read(pmKey);
if (!pmRaw) {
  console.log('无数据');
} else {
  console.log('数据长度:', pmRaw.length);
  console.log('前 100 字符:', pmRaw.substring(0, 100));
  try {
    const pm = JSON.parse(pmRaw);
    console.log('类型:', Array.isArray(pm) ? '数组' : typeof pm);
    if (Array.isArray(pm)) {
      console.log('数组长度:', pm.length);
      if (pm[0]) console.log('第一项 keys:', Object.keys(pm[0]).join(', '));
    } else if (pm.accounts) {
      console.log('accounts 类型:', typeof pm.accounts);
      console.log('order 长度:', pm.order ? pm.order.length : 0);
    }
  } catch (e) {
    console.log('解析失败:', e.message);
  }
}

console.log('\n=== WeTalk 诊断 ===');
const wtRaw = $persistentStore.read(wtKey);
if (!wtRaw) {
  console.log('无数据');
} else {
  console.log('数据长度:', wtRaw.length);
  console.log('前 100 字符:', wtRaw.substring(0, 100));
  try {
    const wt = JSON.parse(wtRaw);
    console.log('类型:', Array.isArray(wt) ? '数组' : typeof wt);
    if (Array.isArray(wt)) {
      console.log('数组长度:', wt.length);
      if (wt[0]) console.log('第一项 keys:', Object.keys(wt[0]).join(', '));
    } else if (wt.accounts) {
      console.log('accounts 类型:', typeof wt.accounts);
      console.log('order 长度:', wt.order ? wt.order.length : 0);
    }
  } catch (e) {
    console.log('解析失败:', e.message);
  }
}

$done();
