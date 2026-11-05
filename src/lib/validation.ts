export const isValidName = (v: string) => v.trim().length >= 2
/** Indian mobile: optional +91/91/0 prefix, then 10 digits starting 6-9. */
export const normalisePhone = (v: string) => {
  const d = v.replace(/[\s\-()]/g, '')
  const m = d.match(/^(?:\+?91|0)?([6-9]\d{9})$/)
  return m ? m[1] : null
}
export const isValidPhone = (v: string) => normalisePhone(v) !== null
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
