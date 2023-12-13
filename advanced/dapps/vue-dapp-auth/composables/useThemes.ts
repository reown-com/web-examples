export enum Theme {
  light = 'light',
  dark = 'dark',
}

export const themeModes = [
  'system',
  ...Object.values(Theme),
]
