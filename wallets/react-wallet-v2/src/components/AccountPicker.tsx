import { ReactEventHandler } from 'react'

interface IProps {
  value: number
  onChange: ReactEventHandler<HTMLSelectElement>
}

export default function AccountPicker({ value, onChange }: IProps) {
  return (
    <select value={Number(value)} onChange={onChange}>
      <option value={0}>Account 1</option>
      <option value={1}>Account 2</option>
    </select>
  )
}
