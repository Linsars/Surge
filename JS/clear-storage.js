// 清空 PingMe 和 WeTalk 的存储数据
const pmKey = 'pingme_accounts_v1';
const wtKey = 'wetalk_accounts_v1';

console.log('=== 清空存储数据 ===');

const pmRaw = $persistentStore.read(pmKey);
if (pmRaw) {
  $persistentStore.write('', pmKey);
  console.log('✅ PingMe 数据已清空');
} else {
  console.log('⚠️ PingMe 无数据');
}

const wtRaw = $persistentStore.read(wtKey);
if (wtRaw) {
  $persistentStore.write('', wtKey);
  console.log('✅ WeTalk 数据已清空');
} else {
  console.log('⚠️ WeTalk 无数据');
}

console.log('请重新打开 PingMe 和 WeTalk 进入个人主页，重新抓取 Cookie');
$done();
