/* Image paths stored by the admin are either bundled paths ("img/hero.jpg")
   or absolute URLs ("https://…"). Bundled paths resolve against the
   deployed base URL. */
export const assetUrl = (p) => {
  if (!p) return ''
  if (/^(https?:)?\/\//i.test(p) || p.startsWith('data:')) return p
  return `${import.meta.env.BASE_URL}${p.replace(/^\/+/, '')}`
}
