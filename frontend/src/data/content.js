/* Default website content (news, sponsor tiers, FAQs). The live site reads
   this from the API (admin-managed, seeded from the same JSON in
   backend/database/data/site_content.json); this copy only backs the
   explicit demo preview build. */
import rows from './site_content.json'

export const demoContent = (type) => rows
  .filter((r) => r.type === type)
  .map((r, i) => ({ id: `${type}-${i + 1}`, is_published: true, ...r }))
