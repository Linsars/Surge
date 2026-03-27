const CHECK_URL = 'https://aistudio.google.com/prompts/new_chat?hl=zh-cn'
const BLOCKED_PART = 'ai.google.dev/gemini-api/docs/available-regions'

const group = $argument && $argument.trim() !== '' ? $argument : '未指定策略组（当前全局节点）'

;(async () => {
  let result = {
    title: 'GPT / Gemini 支持检测',
    style: 'error',
    content: '检测失败，请重试',
  }

  await new Promise((resolve) => {
    $httpClient.get({
      url: CHECK_URL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
      },
    }, (error, response) => {
      if (error) {
        result.style = 'error'
        result.content = `策略组: ${group}\n网络错误，请检查节点`
        resolve()
        return
      }

      const finalUrl = response.url || ''

      if (finalUrl.includes(BLOCKED_PART)) {
        result.style = 'alert'
        result.content = `策略组: ${group}\n❌ 不支持 GPT / Gemini（地区限制，已自动跳转）`
      } else if (response.status === 200) {
        result.style = 'good'
        result.content = `策略组: ${group}\n✅ 支持使用 GPT / Gemini（可正常访问 AI Studio）`
      } else {
        result.style = 'alert'
        result.content = `策略组: ${group}\n检测异常（状态码: ${response.status}）`
      }

      resolve()
    })
  }).finally(() => {
    $done(result)
  })
})()
