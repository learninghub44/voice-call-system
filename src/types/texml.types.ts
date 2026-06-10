// src/types/texml.types.ts

export type TeXMLVoice =
  | 'male'
  | 'female'
  | 'alice'
  | 'man'
  | 'woman'
  | 'Polly.Joanna'
  | 'Polly.Matthew'

export type TeXMLLanguage = 'en-US' | 'en-GB' | 'es-ES' | 'fr-FR' | 'de-DE'

export interface TeXMLSayNode {
  type: 'Say'
  text: string
  voice?: TeXMLVoice
  language?: TeXMLLanguage
  loop?: number
}

export interface TeXMLPlayNode {
  type: 'Play'
  url: string
  loop?: number
}

export interface TeXMLGatherOptions {
  action: string
  method?: 'GET' | 'POST'
  numDigits?: number
  timeout?: number
  finishOnKey?: string
  children?: Array<TeXMLSayNode | TeXMLPlayNode>
}

export interface TeXMLGatherNode {
  type: 'Gather'
  options: TeXMLGatherOptions
}

export interface TeXMLRedirectNode {
  type: 'Redirect'
  url: string
  method?: 'GET' | 'POST'
}

export interface TeXMLRecordOptions {
  action?: string
  method?: 'GET' | 'POST'
  timeout?: number
  maxLength?: number
  playBeep?: boolean
  finishOnKey?: string
  transcribe?: boolean
}

export interface TeXMLRecordNode {
  type: 'Record'
  options: TeXMLRecordOptions
}

export interface TeXMLHangupNode {
  type: 'Hangup'
}

export interface TeXMLDialNode {
  type: 'Dial'
  number: string
  timeout?: number
  callerId?: string
  record?: 'record-from-ringing' | 'record-from-answer' | 'do-not-record'
  action?: string
}

export type TeXMLNode =
  | TeXMLSayNode
  | TeXMLPlayNode
  | TeXMLGatherNode
  | TeXMLRedirectNode
  | TeXMLRecordNode
  | TeXMLHangupNode
  | TeXMLDialNode