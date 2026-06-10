// src/types/telnyx.types.ts

export interface TelnyxWebhookEnvelope {
  id: string
  occurred_at: string
  payload: TelnyxEventPayload
}

export type TelnyxEventPayload =
  | TelnyxCallInitiatedPayload
  | TelnyxCallAnsweredPayload
  | TelnyxCallHangupPayload
  | TelnyxCallFailedPayload
  | TelnyxCallGatherEndedPayload
  | TelnyxCallRecordingSavedPayload
  | TelnyxCallSpeakEndedPayload
  | TelnyxMessageReceivedPayload

export interface TelnyxCallBase {
  call_control_id: string
  call_leg_id: string
  call_session_id: string
  connection_id: string
  from: string
  to: string
  direction: 'inbound' | 'outbound'
  state: string
  client_state?: string
}

export interface TelnyxCallInitiatedPayload extends TelnyxCallBase {
  event_type: 'call.initiated'
  start_time: string
}

export interface TelnyxCallAnsweredPayload extends TelnyxCallBase {
  event_type: 'call.answered'
  start_time: string
}

export interface TelnyxCallHangupPayload extends TelnyxCallBase {
  event_type: 'call.hangup'
  end_time: string
  hangup_cause: string
  hangup_source: string
  sip_hangup_cause: string
}

export interface TelnyxCallFailedPayload extends TelnyxCallBase {
  event_type: 'call.failed'
  end_time: string
  hangup_cause: string
}

export interface TelnyxCallGatherEndedPayload extends TelnyxCallBase {
  event_type: 'call.gather.ended'
  digits: string
  status: 'valid' | 'invalid' | 'timeout'
}

export interface TelnyxCallRecordingSavedPayload extends TelnyxCallBase {
  event_type: 'call.recording.saved'
  recording_urls: {
    mp3: string
    wav: string
  }
  duration_millis: string
  recording_started_at: string
  recording_ended_at: string
  channels: 'single' | 'dual'
  source: string
}

export interface TelnyxCallSpeakEndedPayload extends TelnyxCallBase {
  event_type: 'call.speak.ended'
  status: string
}

export interface TelnyxMessageReceivedPayload {
  event_type: 'message.received'
  id: string
  from: {
    phone_number: string
    carrier: string
    line_type: string
  }
  to: Array<{
    phone_number: string
    status: string
  }>
  text: string
  direction: 'inbound'
  type: string
  received_at: string
}

export interface TelnyxInitiateCallParams {
  connection_id: string
  to: string
  from: string
  webhook_url?: string
  webhook_url_method?: 'GET' | 'POST'
  client_state?: string
  timeout_secs?: number
}

export interface TelnyxSpeakParams {
  language: string
  voice: string
  payload: string
  payload_type?: 'text' | 'ssml'
}

export interface TelnyxGatherParams {
  minimum_digits?: number
  maximum_digits?: number
  timeout_millis?: number
  terminating_digit?: string
  valid_digits?: string
  action_on_empty_result?: boolean
}

export interface TelnyxTransferParams {
  to: string
  from?: string
  timeout_secs?: number
  webhook_url?: string
}

export interface TelnyxRecordingParams {
  format?: 'mp3' | 'wav'
  channels?: 'single' | 'dual'
  play_beep?: boolean
}