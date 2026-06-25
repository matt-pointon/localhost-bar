import { execSync, spawn } from 'child_process'
import { clipboard, Notification, dialog } from 'electron'
import type { WebContents } from 'electron'
import type { DeployTarget } from './store'
import { setLastDeploy, getLastDeploy } from './store'
import { detectDeployTarget } from './stack-detector'

export { detectDeployTarget, getLastDeploy }
export type { DeployTarget }

function hasCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { timeout: 2000, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

export function getInstalledDeployCLIs() {
  return {
    vercel: hasCommand('vercel'),
    railway: hasCommand('railway'),
    netlify: hasCommand('netlify')
  }
}

const URL_PATTERNS: Record<DeployTarget, RegExp> = {
  vercel: /https?:\/\/\S+\.vercel\.app/,
  railway: /https?:\/\/\S+\.railway\.app/,
  netlify: /https?:\/\/\S+\.netlify\.app/
}

const DEPLOY_COMMANDS: Record<DeployTarget, { cmd: string; args: string[] }> = {
  vercel: { cmd: 'vercel', args: ['--yes'] },
  railway: { cmd: 'railway', args: ['up'] },
  netlify: { cmd: 'netlify', args: ['deploy', '--build'] }
}

export function runDeploy(cwd: string, target: DeployTarget, sender: WebContents): void {
  const { cmd, args } = DEPLOY_COMMANDS[target]

  let output = ''
  let url: string | null = null

  const send = (data: object) => {
    if (!sender.isDestroyed()) sender.send('deploy:progress', { cwd, ...data })
  }

  send({ status: 'deploying' })

  let child: ReturnType<typeof spawn>
  try {
    child = spawn(cmd, args, { cwd, shell: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    send({ status: 'error', output: msg })
    return
  }

  const handleData = (chunk: Buffer) => {
    const text = chunk.toString()
    output += text
    const match = text.match(URL_PATTERNS[target])
    if (match) url = match[0]
  }

  child.stdout?.on('data', handleData)
  child.stderr?.on('data', handleData)

  child.on('error', err => {
    send({ status: 'error', output: err.message })
  })

  child.on('close', code => {
    // Final URL scan on full output in case it was split across chunks
    if (!url) {
      const m = output.match(URL_PATTERNS[target])
      if (m) url = m[0]
    }

    if (code === 0 && url) {
      setLastDeploy({ cwd, target, url, timestamp: Date.now() })
      clipboard.writeText(url)
      new Notification({ title: 'Deployed', body: url }).show()
      send({ status: 'success', url })
    } else {
      const lastLines = output.split('\n').filter(l => l.trim()).slice(-3).join('\n')
      const errorMsg = lastLines || `${cmd} exited with code ${code}`
      dialog.showErrorBox('Deploy failed', errorMsg)
      send({ status: 'error', output: errorMsg })
    }
  })
}
