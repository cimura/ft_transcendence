import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../helpers/auth'

test.describe('通信の安全性', () => {
  test('ページから出る通信に混在コンテンツ (http / ws) が含まれない', async ({
    page,
    request,
  }) => {
    const insecureRequests: string[] = []
    page.on('request', (req) => {
      const url = req.url()
      if (url.startsWith('http://') || url.startsWith('ws://')) {
        insecureRequests.push(url)
      }
    })

    await loginAsNewUser(page, request, 'httpsuser')
    await page.goto('/home')
    expect(page.url()).toMatch(/^https:\/\//)

    // Socket.IO の接続が確立されるのを待ち、そのハンドシェイクも含めて確認する
    await page.waitForTimeout(1500)

    expect(
      insecureRequests,
      `insecure (non-HTTPS/WSS) requests detected:\n${insecureRequests.join('\n')}`
    ).toEqual([])
  })
})
