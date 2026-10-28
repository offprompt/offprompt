import type { Template } from '../../schema.js'

/**
 * The API keys page of one project. The studio's own settings menu links there as
 * `/project/${ref}/settings/api-keys`, and the docs give a project's address as
 * `https://supabase.com/dashboard/project/<project-id>`. The CLI holds a ref to exactly 20
 * lowercase letters.
 */
export const projectApiKeys: Template = {
  url: 'https://supabase.com/dashboard/project/{project}/settings/api-keys',
  params: {
    project: {
      label: 'the project ref',
      found:
        'the subdomain of SUPABASE_URL (https://<ref>.supabase.co), or supabase/.temp/project-ref once supabase link has run. The project_id at the top of supabase/config.toml is a local name, not the ref',
      pattern: '^[a-z]{20}$',
      message: '20 lowercase letters',
      max: 20,
    },
  },
}
