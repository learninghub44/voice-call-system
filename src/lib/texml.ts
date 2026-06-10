// src/lib/texml.ts
import type {
  TeXMLNode,
  TeXMLSayNode,
  TeXMLPlayNode,
  TeXMLGatherNode,
  TeXMLGatherOptions,
  TeXMLRedirectNode,
  TeXMLRecordNode,
  TeXMLRecordOptions,
  TeXMLHangupNode,
  TeXMLDialNode,
  TeXMLVoice,
  TeXMLLanguage,
} from '../types/texml.types'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function attrs(obj: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
    .join('')
}

function serializeNode(node: TeXMLNode): string {
  switch (node.type) {
    case 'Say': {
      const a = attrs({
        voice: node.voice,
        language: node.language,
        loop: node.loop,
      })
      return `<Say${a}>${escapeXml(node.text)}</Say>`
    }

    case 'Play': {
      const a = attrs({ loop: node.loop })
      return `<Play${a}>${escapeXml(node.url)}</Play>`
    }

    case 'Gather': {
      const o = node.options
      const a = attrs({
        action: o.action,
        method: o.method ?? 'POST',
        numDigits: o.numDigits,
        timeout: o.timeout,
        finishOnKey: o.finishOnKey,
      })
      const children = (o.children ?? [])
        .map((child) => serializeNode(child as TeXMLNode))
        .join('')
      return `<Gather${a}>${children}</Gather>`
    }

    case 'Redirect': {
      const a = attrs({ method: node.method ?? 'POST' })
      return `<Redirect${a}>${escapeXml(node.url)}</Redirect>`
    }

    case 'Record': {
      const o = node.options
      const a = attrs({
        action: o.action,
        method: o.method ?? 'POST',
        timeout: o.timeout,
        maxLength: o.maxLength,
        playBeep: o.playBeep,
        finishOnKey: o.finishOnKey,
        transcribe: o.transcribe,
      })
      return `<Record${a}/>`
    }

    case 'Hangup':
      return `<Hangup/>`

    case 'Dial': {
      const a = attrs({
        timeout: node.timeout,
        callerId: node.callerId,
        record: node.record,
        action: node.action,
      })
      return `<Dial${a}>${escapeXml(node.number)}</Dial>`
    }
  }
}

export function say(
  text: string,
  voice: TeXMLVoice = 'alice',
  language: TeXMLLanguage = 'en-US'
): TeXMLSayNode {
  return { type: 'Say', text, voice, language }
}

export function play(url: string, loop?: number): TeXMLPlayNode {
  return { type: 'Play', url, loop }
}

export function gather(options: TeXMLGatherOptions): TeXMLGatherNode {
  return { type: 'Gather', options }
}

export function redirect(url: string, method: 'GET' | 'POST' = 'POST'): TeXMLRedirectNode {
  return { type: 'Redirect', url, method }
}

export function record(options: TeXMLRecordOptions = {}): TeXMLRecordNode {
  return { type: 'Record', options }
}

export function hangup(): TeXMLHangupNode {
  return { type: 'Hangup' }
}

export function dial(number: string, options: Omit<TeXMLDialNode, 'type' | 'number'> = {}): TeXMLDialNode {
  return { type: 'Dial', number, ...options }
}

export function response(nodes: TeXMLNode[]): string {
  const body = nodes.map(serializeNode).join('\n  ')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  ${body}\n</Response>`
}