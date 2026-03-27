const CHECK_URL = 'https://aistudio.google.com/prompts/new_chat?hl=zh-cn'
const BLOCKED_PART = 'ai.google.dev/gemini-api/docs/available-regions'

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
        result.content = '网络错误，请检查节点'
        resolve()
        return
      }

      const finalUrl = response.url || ''

      if (finalUrl.includes(BLOCKED_PART)) {
        result.style = 'alert'
        result.content = '❌ 不支持 GPT'
      } else if (response.status === 200) {
        result.style = 'good'
        result.content = '✅ 支持使用 GPT'
      } else {
        result.style = 'alert'
        result.content = `检测异常（状态码: ${response.status}）`
      }

      resolve()
    })
  }).finally(() => {
    $done(result)
  })
})()
