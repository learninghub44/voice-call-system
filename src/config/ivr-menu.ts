// src/config/ivr-menu.ts

export interface IvrMenuOption {
  skill: string
  label: string
}

export type IvrMenu = Record<string, IvrMenuOption>

export const ivrMenu: IvrMenu = {
  '1': { skill: 'sales', label: 'Sales' },
  '2': { skill: 'support', label: 'Support' },
  '3': { skill: 'billing', label: 'Billing' },
}

export function getIvrMenuPrompt(): string {
  const options = Object.entries(ivrMenu)
    .map(([digit, { label }]) => `Press ${digit} for ${label}`)
    .join(', ')
  return `${options}. Press 0 to leave a voicemail.`
}

export function getSkillForDigit(digit: string): string | undefined {
  return ivrMenu[digit]?.skill
}

export function getLabelForDigit(digit: string): string | undefined {
  return ivrMenu[digit]?.label
}