// src/lib/telnyx.ts
import { Telnyx } from 'telnyx'
import { env } from '../config/env'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import type {
  TelnyxInitiateCallParams,
  TelnyxSpeakParams,
  TelnyxTransferParams,
  TelnyxRecordingParams,
} from '../types/telnyx.types'

declare global {
  // eslint-disable-next-line no-var
  var __telnyx: Telnyx | undefined
}

function createTelnyxClient() {
  return new Telnyx({ apiKey: env.TELNYX_API_KEY })
}

export const telnyx = globalThis.__telnyx ?? createTelnyxClient()

if (env.NODE_ENV !== 'production') {
  globalThis.__telnyx = telnyx
}

function mapTelnyxError(error: unknown): AppError {
  const message =
    error instanceof Error ? error.message : 'Telnyx API error'
  return new AppError(ErrorCode.TELNYX_ERROR, message, error)
}

export const calls = {
  async initiate(
    params: TelnyxInitiateCallParams
  ): Promise<Result<{ callControlId: string; callSessionId: string }, AppError>> {
    try {
      const response = await telnyx.calls.dial({
        connection_id: params.connection_id,
        to: params.to,
        from: params.from,
        webhook_url: params.webhook_url,
        webhook_url_method: params.webhook_url_method ?? 'POST',
        client_state: params.client_state
          ? Buffer.from(params.client_state).toString('base64')
          : undefined,
        timeout_secs: params.timeout_secs ?? 30,
      })
      const data = response.data
      if (!data) {
        return err(new AppError(ErrorCode.TELNYX_ERROR, 'No data in response'))
      }
      return ok({
        callControlId: data.call_control_id,
        callSessionId: data.call_session_id,
      })
    } catch (error) {
      return err(mapTelnyxError(error))
    }
  },

  async speak(
    callControlId: string,
    params: TelnyxSpeakParams
  ): Promise<Result<void, AppError>> {
    try {
      await telnyx.calls.actions.speak(callControlId, {
        payload: params.payload,
        voice: params.voice,
        language: params.language as any,
        payload_type: params.payload_type ?? 'text',
      })
      return ok(undefined)
    } catch (error) {
      return err(mapTelnyxError(error))
    }
  },

  async hangup(callControlId: string): Promise<Result<void, AppError>> {
    try {
      await telnyx.calls.actions.hangup(callControlId, {})
      return ok(undefined)
    } catch (error) {
      return err(mapTelnyxError(error))
    }
  },

  async transfer(
    callControlId: string,
    params: TelnyxTransferParams
  ): Promise<Result<void, AppError>> {
    try {
      await telnyx.calls.actions.transfer(callControlId, {
        to: params.to,
        from: params.from,
        timeout_secs: params.timeout_secs ?? 30,
      })
      return ok(undefined)
    } catch (error) {
      return err(mapTelnyxError(error))
    }
  },

  async bridge(
    callControlId: string,
    targetCallControlId: string
  ): Promise<Result<void, AppError>> {
    try {
      await telnyx.calls.actions.bridge(callControlId, {
        call_control_id_to_bridge_with: targetCallControlId,
      })
      return ok(undefined)
    } catch (error) {
      return err(mapTelnyxError(error))
    }
  },

  async startRecording(
    callControlId: string,
    params: TelnyxRecordingParams = {}
  ): Promise<Result<void, AppError>> {
    try {
      await telnyx.calls.actions.startRecording(callControlId, {
        format: params.format ?? 'mp3',
        channels: params.channels ?? 'single',
      })
      return ok(undefined)
    } catch (error) {
      return err(mapTelnyxError(error))
    }
  },

  async stopRecording(callControlId: string): Promise<Result<void, AppError>> {
    try {
      await telnyx.calls.actions.stopRecording(callControlId, {})
      return ok(undefined)
    } catch (error) {
      return err(mapTelnyxError(error))
    }
  },
}