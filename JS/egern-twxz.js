#!name=探味闲置 𝕏
#!desc=对 "真二手" 交易平台 深度学习探索;
#!openUrl=https://apps.apple.com/app/id6746157667
#!author=linsar
#!icon=https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/2b/e4/8c/2be48c55-7fae-22f0-f95d-8100f971a88b/AppIcon-0-0-1x_U007emarketing-0-6-0-0-85-220.png/400x400ia-75.webp
#!date = 2026-4-24 01:40:00

[Argument]
VIP = switch, false, tag = [启用]会员, desc = 关闭开关将不对此选项生效
Video = switch, false, tag = [视频-付费], desc = 关闭开关将不对此选项生效

[Script]
http-response ^https:\/\/admin\.tanweixianzhi\.com\/prod\/api\/centre\/userInfo script-path=https://raw.githubusercontent.com/Linsars/Surge/main/JS/egern-twxz.js, requires-body=true, timeout=60, tag=会员, enable={VIP}
http-response ^https:\/\/admin\.tanweixianzhi\.com\/prod\/api\/video\/info script-path=https://raw.githubusercontent.com/Linsars/Surge/main/JS/egern-twxz.js, requires-body=true, timeout=60, tag=付费, enable={Video}

[Mitm]
hostname= admin.tanweixianzhi.com
