//2026/04/23
/*
@Name：检查 Cookie 抓取开关状态
@Desc：诊断工具，查看当前开关值
*/

const pingmeSwitch = $persistentStore.read('pingme_cookie_capture');
const wetalkSwitch = $persistentStore.read('wetalk_cookie_capture');

const result = `
【PingMe Cookie 抓取开关】
键名：pingme_cookie_capture
当前值：${pingmeSwitch === null ? '(未设置)' : `"${pingmeSwitch}"`}
类型：${typeof pingmeSwitch}
是否为 'true'：${pingmeSwitch === 'true' ? '✅ 是' : '❌ 否'}

【WeTalk Cookie 抓取开关】
键名：wetalk_cookie_capture
当前值：${wetalkSwitch === null ? '(未设置)' : `"${wetalkSwitch}"`}
类型：${typeof wetalkSwitch}
是否为 'true'：${wetalkSwitch === 'true' ? '✅ 是' : '❌ 否'}
`;

console.log(result);
$notification.post('Cookie 抓取开关诊断', '', result);
$done({});
