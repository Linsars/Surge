// ==UserScript==
// @name         智慧重命名 - GeoIP + 创意命名 v6.0
// @version      6.0
// @description  SubStore 节点重命名：增强 GeoIP + GPT 判断 + 多创意模式
// @author       Linsar
// @example      #gm=诡秘&qz=机场&hz=GPT
// ==/UserScript==

const args = $arguments || {};
const U = {};
for (const k in args) {
  if (Object.prototype.hasOwnProperty.call(args, k)) {
    U[k.toUpperCase()] = decodeURI(args[k]).trim();
  }
}

const SEP = U.FGF || '｜';
const PREFIX = U.QZ ? U.QZ + SEP : '';
const SUFFIX = U.HZ ? SEP + U.HZ : '';
const HZ_TEXT = U.HZ || '';
const IS_GPT = HZ_TEXT.toUpperCase() === 'GPT';
const GM_MODE = U.GM || '';
const CUSTOM_LIST = U.CUSTOM ? U.CUSTOM.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
const NAME_SEP = U.FGF ? SEP : ' ? ';

const UNSUPPORTED = new Set(['HK','TW','MO','CN','RU','IR','KP','CU','BY','SY','AF','MM','LY','YE','SD','ER','CF','TD','SS','MK']);

const ZODIAC = ['子鼠','丑牛','寅虎','卯兔','辰龙','巳蛇','午马','未羊','申猴','酉鸡','戌狗','亥猪'];
const TAROT = ['愚者','魔术师','女祭司','皇后','皇帝','教皇','恋人','战车','力量','隐士','命运之轮','正义','倒吊人','死神','节制','恶魔','塔','星星','月亮','太阳','审判','世界'];
const ANGELS = ['米迦勒','加百列','拉斐尔','乌列尔','拉贵尔','萨列尔','雷米尔','扎基尔','约菲尔','卡麦尔','哈尼尔','巴拉基勒'];
const SOLAR = ['立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒'];
const DOUBATTLE = ['魂士','魂师','大魂师','魂尊','魂宗','魂王','魂帝','魂圣','魂斗罗','封号斗罗','神级','斗之气','斗者','斗师','大斗师','斗灵','斗王','斗皇','斗宗','斗尊','斗圣','斗帝'];
const GUA_64 = ['乾','坤','屯','蒙','需','讼','师','比','小畜','履','泰','否','同人','大有','谦','豫','随','蛊','临','观','噬嗑','贲','剥','复','无妄','大畜','颐','大过','坎','离','咸','恒','遁','大壮','晋','明夷','家人','睽','蹇','解','损','益','夬','姤','萃','升','困','井','革','鼎','震','艮','渐','归妹','丰','旅','巽','兑','涣','节','中孚','小过','既济','未济'];
const SINS = ['傲慢','嫉妒','暴怒','懒惰','贪婪','暴食','色欲'];
const TANG = ['宰相','尚书','侍郎','郎中','员外郎','御史','太守','刺史','县令','主簿','司空','司徒','司马','太尉','中书令','门下侍中','尚书令','给事中','谏议大夫','大夫','卿','将军','校尉','都督'];
const CONSTELLATIONS_88 = ['仙女','唧筒','天燕','宝瓶','天鹰','天坛','白羊','御夫','牧夫','雕具','鹿豹','巨蟹','猎犬','大犬','小犬','摩羯','船底','仙后','半人马','仙王','鲸鱼','蝘蜓','圆规','天鸽','后发','南冕','北冕','乌鸦','巨爵','南十字','天鹅','海豚','箭鱼','天龙','小马','波江','天炉','双子','天鹤','武仙','时钟','长蛇','水蛇','印第安','蝎虎','狮子','小狮','天兔','天秤','豺狼','天猫','天琴','山案','显微镜','麒麟','苍蝇','矩尺','南极','蛇夫','猎户','孔雀','飞马','英仙','凤凰','绘架','双鱼','南鱼','船尾','罗盘','网罟','天箭','人马','天蝎','玉夫','盾牌','巨蛇','六分仪','金牛','望远镜','三角','南三角','杜鹃','大熊','小熊','室女','飞鱼','狐狸','船帆'];

const CHIHUO = ['凤凰趴窝','龙肝凤髓','红烧麒麟面','红梅珠香','宫保野兔','祥龙双飞','爆炒田鸡','芫爆仔鸽','金丝烧麦','佛手金卷','龙凤柔情','明珠豆腐','砂锅煨鹿筋','红烧猴头蘑','鸡丝银耳','桂花鱼条','八宝兔酱','玉笋蕨菜','罗汉大虾','花菇鸭掌','五彩牛柳','挂炉走油鸡','麻辣牛肉','红烧鲍鱼','清蒸鳜鱼','松鼠鳜鱼','翠玉豆糕','栗子糕','双色豆糕','如意卷','绣球乾贝','炒珍珠鸡','奶汁鱼片','干连福海参','花菇鲟龙鱼','龙舟镢鱼','滑溜贝球','酱焖鹌鹑','蟹肉双笋丝','砂锅鱼翅','红烧鸡棕菌','牡丹银耳汤','清汤燕窝','凤尾鱼翅','金蟾玉鲍','一品鲍鱼羹','龙井竹荪','玉掌献寿','鸡枞菌汤','草菇西兰花','杏仁豆腐','挂炉烤鸭','燕窝八珍汤','桂花糕','荷花酥','莲子糕','杏仁露','冰糖银耳','拔丝苹果','一品官燕','奶汤蒲菜','御膳八珍','红烧肘子','清蒸龙虾'];

const XISHEN_PATHS = ['书','医','兵','黄','青','巧','弈','戏','偶','巫','力','卜','盗','娼','帝','鬼','天','邪'];
const XISHEN_RANKS = ['I阶','II阶','III阶','IV阶','V阶','VI阶','VII阶','VIII阶','半神'];
const JIUYUN_LORDS = [['若水君','温若水'],['极光君','杨宵'],['红尘君','苏知微'],['无极君','楼羽'],['悬玉君','姬悬'],['南海君','褚常青'],['灵虚君','吴同源'],['天枢君','陆循'],['藏云君','齐暮云']];
const JIUYUN_GEN = ['初代','二代','三代','四代','五代','六代'];
const JIUYUN_BEYOND = ['人','半神','神','鬼','尸体'];
const XISHEN = [];
for (let l = 0; l < JIUYUN_LORDS.length; l++) XISHEN.push(JIUYUN_LORDS[l][0] + '·' + JIUYUN_LORDS[l][1]);
for (let r = 0; r < XISHEN_RANKS.length; r++) for (let p = 0; p < XISHEN_PATHS.length; p++) XISHEN.push(XISHEN_PATHS[p] + '神道·' + XISHEN_RANKS[r]);
for (let l = 0; l < JIUYUN_LORDS.length; l++) for (let g = 0; g < JIUYUN_GEN.length; g++) XISHEN.push(JIUYUN_LORDS[l][0] + '·' + JIUYUN_LORDS[l][1] + '·' + JIUYUN_GEN[g]);
for (let l = 0; l < JIUYUN_LORDS.length; l++) for (let g = 0; g < JIUYUN_GEN.length; g++) for (let b = 0; b < JIUYUN_BEYOND.length; b++) XISHEN.push(JIUYUN_LORDS[l][0] + '·' + JIUYUN_LORDS[l][1] + '·' + JIUYUN_GEN[g] + '·' + JIUYUN_BEYOND[b]);

const GUIMI_PATHS = [['愚者','占卜家','小丑','魔术师','无面人','秘偶大师','诡法师','古代学者','奇迹师','诡秘侍者'],['门','学徒','诈骗师','戏法大师','记录官','旅行家','秘术导师','神话学专家','旅法师','门之主'],['错误','偷盗者','诈骗师','盗火人','窃梦家','盗贼','寄生者','神偷','解密学者','错误'],['空想家','观众','读心者','心理医生','催眠师','梦境行者','操纵师','织梦人','洞察者','作家'],['白塔','阅读者','博学者','秘术导师','知识皇帝','智者','全知者','天国使者','视界主宰','白塔'],['倒吊人','秘祈人','倾听者','隐修士','蔷薇主教','牧羊人','黑骑士','三首圣堂','秽语长老','暗天使'],['暴君','水手','暴风祭司','航海家','风暴使者','海洋歌者','灾祸祭司','海神','灾难主宰','雷霆之主'],['太阳','歌颂者','祈光人','太阳神官','公证人','光之祭司','无暗之火','巡夜人','圣者','太阳'],['真理','通识者','考古学家','环境分析师','机械专家','物理学家','工匠','博学者','知识教皇','贤者'],['死神','收尸人','掘墓人','不死者','幽魂','怨魂','不死之王','冥使','死亡执政官','死神'],['黑皇帝','律师','野蛮人','贿赂者','警长','仲裁人','堕落伯爵','混乱导师','暴君','黑皇帝'],['审判者','仲裁人','治安官','审判者','公证人','执法者','秩序之首','法官','秩序执法官','裁决者'],['魔女','刺客','潜行者','女巫','欢愉魔女','痛苦魔女','绝望魔女','不老魔女','灾祸魔女','黑魔女'],['战神','猎人','格斗家','纵火家','阴谋家','狼人','猎魔者','征服者','天气支配者','铁血骑士'],['命运之轮','怪物','诈骗师','机器之心','预言家','幸运儿','灾祸之主','神秘学家','智慧之眼','命运之轮'],['大地母神','耕种者','工匠','知识导师','农业学者','自然行者','神谕使','荒野之神','丰收女神','大地之母'],['大地神','药师','医生','药理学家','魔药师','德鲁伊','药王','植物学家','神医','丰收之子'],['战士','战士','格斗家','武器大师','封印师','光之祭司','无暗之火','耀骑士','荣耀战神','铁血骑士'],['隐者','窥秘人','占星人','神秘学家','隐者','星象师','先知','智者','视界主宰','知识皇帝'],['深渊','罪犯','变异人','纵火家','恐惧使者','恐惧之王','梦魇','恶魔','灾祸之主','堕落之主'],['黑夜女神','不眠者','午夜诗人','梦魇','守夜人','灵巫','恐惧之王','隐秘之仆','梦境执政官','黑夜女神'],['红祭司','猎人','格斗家','纵火家','阴谋家','狼人','猎魔者','征服者','天气支配者','铁血骑士']];
const GUIMI = [];
for (let r = 0; r < 9; r++) for (let p = 0; p < GUIMI_PATHS.length; p++) GUIMI.push(GUIMI_PATHS[p][0] + '·' + GUIMI_PATHS[p][r + 1]);

const QING_EMPERORS = ['天命','天聪','崇德','顺治','康熙','雍正','乾隆','嘉庆','道光','咸丰','同治','光绪','宣统','努尔哈赤','皇太极','多尔衮','孝庄','康熙帝','雍正帝','乾隆帝','和珅','嘉庆帝','道光帝','咸丰帝','慈禧','同治帝','光绪帝','溥仪'];
const NONGYAO = ['廉颇','小乔','赵云','墨子','妲己','嬴政','孙尚香','鲁班七号','庄周','刘禅','高渐离','阿轲','钟无艳','孙膑','扁鹊','白起','芈月','吕布','周瑜','夏侯惇','甄姬','曹操','典韦','宫本武藏','李白','马可波罗','狄仁杰','达摩','项羽','武则天','老夫子','关羽','貂蝉','安琪拉','程咬金','露娜','姜子牙','刘邦','韩信','王昭君','兰陵王','花木兰','张良','不知火舞','娜可露露','橘右京','亚瑟','孙悟空','牛魔','后羿','刘备','张飞','李元芳','虞姬','钟馗','杨玉环','杨戬','女娲','哪吒','干将莫邪','雅典娜','蔡文姬','太乙真人','东皇太一','鬼谷子','诸葛亮','大乔','黄忠','铠','百里守约','百里玄策','苏烈','梦奇','明世隐','公孙离','裴擒虎','狂铁','米莱狄','元歌','孙策','司马懿','盾山','伽罗','李信','上官婉儿','嫦娥','猪八戒','盘古','瑶','云中君','曜','马超','西施','鲁班大师','蒙犽','蒙恬','镜','澜','阿古朵','夏洛特','司空震','艾琳','云缨','金蝉','暃','桑启','戈娅','海月','赵怀真','莱西奥','姬小满','亚连','朵莉亚','海诺','敖隐','大司命','元流之子','少司缘','影','苍','空空儿','蚩奼','大禹','孙权','沈梦溪'];
const KILL_STREAKS = ['首杀','单杀','双杀','三杀','四杀','五杀','团灭'];
const NONGYAO_HELPERS = KILL_STREAKS.concat(DOUBATTLE);

const GENSHIN = ['风主','岩主','雷主','草主','水主','火主','冰主','旅行者','空','荧','钟离','温迪','雷电将军','纳西妲','芙宁娜','那维莱特','胡桃','甘雨','魈','荒泷一斗','八重神子','神里绫华','宵宫','申鹤','夜兰','行秋','香菱','班尼特','迪卢克','刻晴','莫娜','七七','可莉','优菈'];
const HONKAI_BASE = ['芽衣','琪亚娜','布洛妮娅','希儿','德丽莎','符华','渡鸦','空之律者','雷之律者','炎之律者','识之律者','终焉之律者','理之律者','死之律者','言灵'];

const RANK_LOW = ['一阶','二阶','三阶','四阶','五阶','六阶','七阶','八阶','九阶','大圆满'];
const RANK_HIGH = ['半步','一转','二转','三转','四转','五转','六转','七转','八转','九转','•真','•极'];
const XIUXIAN_REALMS = ['凡人','练气','筑基','金丹','元婴','化神','炼虚','合道','大乘','渡劫','真仙','仙王','仙帝','仙尊','混沌圣体'];
const XIUXIAN = [];
for (let i = 0; i < XIUXIAN_REALMS.length; i++) {
  const realm = XIUXIAN_REALMS[i];
  if (i === 0) { XIUXIAN.push(realm); continue; }
  const ranks = i <= 9 ? RANK_LOW : RANK_HIGH;
  for (let r = 0; r < ranks.length; r++) XIUXIAN.push(realm + '·' + ranks[r]);
}

const CTHULHU = ['克苏鲁','阿撒托斯','犹格索托斯','奈亚拉托提普','莎布·尼古拉丝','茨密戈','哈斯塔','达贡','印斯茅斯','拉莱耶','深潜者','古神低语','不可名状','旧日支配者'];

function mergeArrays(main, helpers) {
  const result = [];
  for (let c = 0; ; c++) {
    const suffix = c === 0 ? '' : (helpers && c - 1 < helpers.length ? SEP + helpers[c - 1] : SEP + c);
    let added = false;
    for (const m of main) { result.push(m + suffix); added = true; }
    if (!added || !helpers || c > helpers.length) break;
  }
  return result;
}

const MODES = {
  '生肖': mergeArrays(ZODIAC, GUA_64),
  '塔罗': mergeArrays(TAROT, CONSTELLATIONS_88),
  '天使': mergeArrays(ANGELS, SINS),
  '农药': mergeArrays(NONGYAO, NONGYAO_HELPERS),
  '节气': mergeArrays(SOLAR, TANG),
  '吃货': mergeArrays(CHIHUO, QING_EMPERORS),
  '戏神': XISHEN,
  '诡秘': GUIMI,
  '崩坏': mergeArrays(HONKAI_BASE, GENSHIN),
  '修仙': mergeArrays(XIUXIAN, CTHULHU),
  '克系': mergeArrays(CTHULHU, XIUXIAN),
};
const MODE_KEYS = Object.keys(MODES);

const SUP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
function sup(n) {
  if (n <= 0) return '';
  let s = '';
  for (const c of n.toString()) s += SUP[c] || c;
  return s;
}

function cc2flag(cc) {
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(...cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
}

const nameCC = {
  '🇭🇰':'HK','香港':'HK','港':'HK','HK':'HK','hong kong':'HK',
  '🇹🇼':'TW','台湾':'TW','台':'TW','TW':'TW','taiwan':'TW',
  '🇲🇴':'MO','澳门':'MO','MO':'MO','macau':'MO',
  '🇨🇳':'CN','中国':'CN','CN':'CN','china':'CN',
  '🇺🇸':'US','美国':'US','US':'US','usa':'US','america':'US','united states':'US',
  '🇯🇵':'JP','日本':'JP','JP':'JP','japan':'JP',
  '🇰🇷':'KR','韩国':'KR','KR':'KR','korea':'KR','south korea':'KR',
  '🇸🇬':'SG','新加坡':'SG','SG':'SG','singapore':'SG',
  '🇬🇧':'GB','英国':'GB','UK':'GB','GB':'GB','britain':'GB','united kingdom':'GB',
  '🇩🇪':'DE','德国':'DE','DE':'DE','germany':'DE',
  '🇫🇷':'FR','法国':'FR','FR':'FR','france':'FR',
  '🇨🇦':'CA','加拿大':'CA','CA':'CA','canada':'CA',
  '🇦🇺':'AU','澳大利亚':'AU','AU':'AU','australia':'AU',
  '🇳🇱':'NL','荷兰':'NL','NL':'NL','netherlands':'NL',
  '🇸🇪':'SE','瑞典':'SE','SE':'SE','sweden':'SE',
  '🇳🇴':'NO','挪威':'NO','NO':'NO','norway':'NO',
  '🇫🇮':'FI','芬兰':'FI','FI':'FI','finland':'FI',
  '🇨🇭':'CH','瑞士':'CH','CH':'CH','switzerland':'CH',
  '🇮🇹':'IT','意大利':'IT','IT':'IT','italy':'IT',
  '🇪🇸':'ES','西班牙':'ES','ES':'ES','spain':'ES',
  '🇵🇹':'PT','葡萄牙':'PT','PT':'PT','portugal':'PT',
  '🇧🇪':'BE','比利时':'BE','BE':'BE','belgium':'BE',
  '🇦🇹':'AT','奥地利':'AT','AT':'AT','austria':'AT',
  '🇮🇪':'IE','爱尔兰':'IE','IE':'IE','ireland':'IE',
  '🇱🇺':'LU','卢森堡':'LU','LU':'LU','luxembourg':'LU',
  '🇩🇰':'DK','丹麦':'DK','DK':'DK','denmark':'DK',
  '🇵🇱':'PL','波兰':'PL','PL':'PL','poland':'PL',
  '🇨🇿':'CZ','捷克':'CZ','CZ':'CZ','czech':'CZ','czechia':'CZ',
  '🇭🇺':'HU','匈牙利':'HU','HU':'HU','hungary':'HU',
  '🇷🇴':'RO','罗马尼亚':'RO','RO':'RO','romania':'RO',
  '🇧🇬':'BG','保加利亚':'BG','BG':'BG','bulgaria':'BG',
  '🇬🇷':'GR','希腊':'GR','GR':'GR','greece':'GR',
  '🇹🇷':'TR','土耳其':'TR','TR':'TR','turkey':'TR',
  '🇷🇺':'RU','俄罗斯':'RU','RU':'RU','russia':'RU',
  '🇺🇦':'UA','乌克兰':'UA','UA':'UA','ukraine':'UA',
  '🇮🇱':'IL','以色列':'IL','IL':'IL','israel':'IL',
  '🇦🇪':'AE','阿联酋':'AE','AE':'AE','uae':'AE',
  '🇸🇦':'SA','沙特':'SA','SA':'SA','saudi':'SA',
  '🇮🇳':'IN','印度':'IN','IN':'IN','india':'IN',
  '🇹🇭':'TH','泰国':'TH','TH':'TH','thailand':'TH',
  '🇲🇾':'MY','马来西亚':'MY','MY':'MY','malaysia':'MY',
  '🇵🇭':'PH','菲律宾':'PH','PH':'PH','philippines':'PH',
  '🇻🇳':'VN','越南':'VN','VN':'VN','vietnam':'VN',
  '🇮🇩':'ID','印尼':'ID','ID':'ID','indonesia':'ID',
  '🇧🇷':'BR','巴西':'BR','BR':'BR','brazil':'BR',
  '🇦🇷':'AR','阿根廷':'AR','AR':'AR','argentina':'AR',
  '🇨🇱':'CL','智利':'CL','CL':'CL','chile':'CL',
  '🇲🇽':'MX','墨西哥':'MX','MX':'MX','mexico':'MX',
  '🇨🇴':'CO','哥伦比亚':'CO','CO':'CO','colombia':'CO',
  '🇿🇦':'ZA','南非':'ZA','ZA':'ZA','south africa':'ZA',
  '🇪🇬':'EG','埃及':'EG','EG':'EG','egypt':'EG',
  '🇳🇬':'NG','尼日利亚':'NG','NG':'NG','nigeria':'NG',
  '🇰🇪':'KE','肯尼亚':'KE','KE':'KE','kenya':'KE',
  '🇵🇰':'PK','巴基斯坦':'PK','PK':'PK','pakistan':'PK',
  '🇧🇩':'BD','孟加拉':'BD','BD':'BD','bangladesh':'BD',
  '🇱🇰':'LK','斯里兰卡':'LK','LK':'LK',
  '🇳🇵':'NP','尼泊尔':'NP','NP':'NP',
  '🇲🇲':'MM','缅甸':'MM','MM':'MM',
  '🇰🇭':'KH','柬埔寨':'KH','KH':'KH',
  '🇱🇦':'LA','老挝':'LA','LA':'LA',
  '🇳🇿':'NZ','新西兰':'NZ','NZ':'NZ','new zealand':'NZ',
  '🇮🇸':'IS','冰岛':'IS','IS':'IS','iceland':'IS',
  '🇪🇪':'EE','爱沙尼亚':'EE','EE':'EE',
  '🇱🇻':'LV','拉脱维亚':'LV','LV':'LV',
  '🇱🇹':'LT','立陶宛':'LT','LT':'LT',
  '🇸🇰':'SK','斯洛伐克':'SK','SK':'SK',
  '🇭🇷':'HR','克罗地亚':'HR','HR':'HR',
  '🇸🇮':'SI','斯洛文尼亚':'SI','SI':'SI',
  '🇷🇸':'RS','塞尔维亚':'RS','RS':'RS',
  '🇺🇾':'UY','乌拉圭':'UY','UY':'UY',
  '🇵🇪':'PE','秘鲁':'PE','PE':'PE',
  '🇪🇨':'EC','厄瓜多尔':'EC','EC':'EC',
};

async function operator(proxies = [], targetPlatform, env) {
  if (!proxies?.length) return proxies;
  const $ = $substore;
  const cache = scriptResourceCache;
  const cacheEnabled = !!$arguments.cache;

  let vlessCount = 0;
  if (U.RV === '1') {
    const before = proxies.length;
    proxies = proxies.filter(p => p.type !== 'vless');
    vlessCount = before - proxies.length;
  }
  if (!proxies.length) return proxies;

  const servers = [...new Set(proxies.map(p => p.server))];
  const ccMap = {};
  const geoFromAPI = new Set();

  async function geoQuery(host) {
    let ip = host;
    const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.indexOf(':') !== -1;
    if (!isIP) {
      const dnsList = [
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
        `https://dns.alidns.com/resolve?name=${encodeURIComponent(host)}&type=A`,
        `https://doh.pub/dns-query?name=${encodeURIComponent(host)}&type=A`,
      ];
      for (const url of dnsList) {
        try {
          const dr = await $.http.get({ url, timeout: 5000, headers: { 'Accept': 'application/dns-json' } });
          const dj = typeof dr.body === 'string' ? JSON.parse(dr.body) : dr.body;
          if (dj?.Answer?.some(a => a.type === 1)) { ip = dj.Answer.find(a => a.type === 1).data; break; }
        } catch (e) {}
      }
    }

    const apis = [
      `https://ipwho.is/${ip}`,
      `https://ipinfo.io/${ip}/json`,
      `http://ip-api.com/json/${host}?fields=countryCode,city&lang=zh-CN`,
      `https://api.ip.sb/geoip/${ip}`,
    ];

    for (const url of apis) {
      try {
        const resp = await $.http.get({ url, timeout: 6000 });
        const data = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body;
        let cc = data?.country_code || data?.countryCode || data?.country || '';
        if (typeof cc === 'string') cc = cc.toUpperCase();
        if (cc && cc !== 'XX') {
          if (cc === 'CN') {
            try {
              const r4 = await $.http.get({ url: `http://ip-api.com/json/${host}?fields=countryCode,city&lang=zh-CN`, timeout: 5000 });
              const d4 = typeof r4.body === 'string' ? JSON.parse(r4.body) : r4.body;
              if (d4?.countryCode) return { cc: 'CN', city: d4.city || '' };
            } catch (e) {}
          }
          return { cc, city: data?.city || '' };
        }
      } catch (e) {}
    }
    return null;
  }

  async function geoLookup(host) {
    const geo = await geoQuery(host);
    if (geo) { ccMap[host] = geo; geoFromAPI.add(host); return; }
    ccMap[host] = { cc: 'XX', city: '' };
  }

  const start = Date.now();
  for (let i = 0; i < servers.length; i += 5) {
    if (Date.now() - start > 40000) break;
    await Promise.all(servers.slice(i, i + 5).map(h => geoLookup(h)));
    if (i + 5 < servers.length) await new Promise(r => setTimeout(r, 200));
  }

  let geoNodeCount = 0, nameNodeCount = 0, failNodeCount = 0;

  for (const proxy of proxies) {
    const srv = proxy.server;
    const existing = ccMap[srv];
    if (existing && existing.cc && existing.cc !== 'XX') {
      if (geoFromAPI.has(srv)) geoNodeCount++;
      else nameNodeCount++;
      continue;
    }
    const nameStr = decodeURIComponent(proxy.name || '').toUpperCase();
    let found = false;
    for (const kw in nameCC) {
      if (nameStr.indexOf(kw.toUpperCase()) !== -1) { ccMap[srv] = { cc: nameCC[kw], city: '' }; nameNodeCount++; found = true; break; }
    }
    if (!found) { ccMap[srv] = { cc: 'XX', city: '' }; failNodeCount++; }
  }

  function geoLabel(server) {
    const geo = ccMap[server];
    if (!geo || !geo.cc || geo.cc === 'XX') return null;
    if (geo.cc === 'CN' && geo.city) return geo.city;
    return cc2flag(geo.cc);
  }

  function isSupported(server) {
    const geo = ccMap[server];
    return geo && geo.cc && geo.cc !== 'XX' && !UNSUPPORTED.has(geo.cc);
  }

  const result = [];
  const isRandomMode = GM_MODE === '随机';

  if (isRandomMode) {
    const countryGroups = {};
    for (const proxy of proxies) {
      const flag = geoLabel(proxy.server) || '无旗';
      if (!countryGroups[flag]) countryGroups[flag] = [];
      countryGroups[flag].push(proxy);
    }

    for (const flag in countryGroups) {
      const group = countryGroups[flag];
      const list = flag === '无旗' ? MODES['吃货'] : MODES[MODE_KEYS[Math.floor(Math.random() * MODE_KEYS.length)]];
      for (let i = 0; i < group.length; i++) {
        const p = group[i];
        const item = list[i % list.length];
        const cycle = Math.floor(i / list.length);
        const base = cycle > 0 ? item + sup(cycle + 1) : item;
        const cc = geoLabel(p.server);
        p.name = PREFIX + (cc ? cc + NAME_SEP : '') + base;
        result.push(p);
      }
    }
  } else if (CUSTOM_LIST.length > 0) {
    for (let i = 0; i < proxies.length; i++) {
      const p = proxies[i];
      const item = CUSTOM_LIST[i % CUSTOM_LIST.length];
      const cycle = Math.floor(i / CUSTOM_LIST.length);
      const base = cycle > 0 ? item + sup(cycle + 1) : item;
      const cc = geoLabel(p.server);
      p.name = PREFIX + (cc ? cc + NAME_SEP : '') + base;
      result.push(p);
    }
  } else if (GM_MODE && MODES[GM_MODE]) {
    const list = MODES[GM_MODE];
    for (let i = 0; i < proxies.length; i++) {
      const p = proxies[i];
      const item = list[i % list.length];
      const cycle = Math.floor(i / list.length);
      const base = cycle > 0 ? item + sup(cycle + 1) : item;
      const cc = geoLabel(p.server);
      p.name = PREFIX + (cc ? cc + NAME_SEP : '') + base;
      result.push(p);
    }
  } else {
    const counter = {};
    for (const p of proxies) {
      const cc = geoLabel(p.server);
      if (cc) {
        if (!counter[cc]) counter[cc] = 0;
        counter[cc]++;
        p.name = PREFIX + cc + '-' + String(counter[cc]).padStart(2, '0');
      } else {
        p.name = PREFIX + p.name.trim();
      }
      result.push(p);
    }
  }

  if (HZ_TEXT) {
    if (IS_GPT) {
      for (const p of result) { if (isSupported(p.server)) p.name += SUFFIX; }
    } else {
      for (const p of result) { p.name += SUFFIX; }
    }
  }

  let notifyMsg = `v6.0 改名${result.length}`;
  if (geoNodeCount > 0) notifyMsg += ` geo${geoNodeCount}/${result.length}`;
  if (nameNodeCount > 0) notifyMsg += ` 原名${nameNodeCount}`;
  if (failNodeCount > 0) notifyMsg += ` 失败${failNodeCount}`;
  notifyMsg += ` 服务器${geoFromAPI.size}/${servers.length}`;
  if (vlessCount > 0) notifyMsg += ` 屏蔽${vlessCount}`;
  $.notify('智慧重命名', '', notifyMsg);

  return result;
}
