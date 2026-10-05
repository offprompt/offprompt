import { registryEntries } from '@/lib/registry'

import { Card, Fade } from '../card'
import { FRAME } from '../frame'
import { FLOATING, PagePreview } from '../page-preview'
import { RegistryExplorer } from '../registry-explorer'

/** offprompt's own fields, where a card's picture goes. */
const Fields = ({ sample, usable }: { readonly sample: 'overwrite' | 'generated'; readonly usable?: string }) => (
  <PagePreview
    sample={sample}
    height={360}
    {...(usable === undefined ? {} : { usable })}
    className={`absolute top-2.5 lg:top-[21px] ${FLOATING}`}
  />
)

export const Schemas = () => (
  <section id="rich-fields" className="scroll-mt-6">
    <div className={`${FRAME} flex flex-col gap-7 pt-[72px] pb-20 lg:gap-14 lg:py-32`}>
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-[34px] leading-[38px] tracking-[-1px] text-ink lg:text-5xl lg:leading-[53px] lg:tracking-[-1.4px]">
          Rich fields.
        </h2>
        <p className="text-base leading-[25px] text-body lg:max-w-[440px] lg:text-lg lg:leading-7">
          Every secret comes with an intention: the agent says why it needs it, and the page shows that before you
          type. Checks are optional, for the keys and formats offprompt knows, and a key the file already holds is
          flagged before it&apos;s replaced.
        </p>
      </div>
      <Card
        eyebrow="SCHEMAS"
        title="Known keys come with their checks, and a link to the page where you make them. Pick one, and change its key."
        className="h-[720px] lg:h-[460px]"
        decorative={false}
      >
        <RegistryExplorer entries={registryEntries()} />
        <Fade className="h-[140px] lg:h-[110px]" />
      </Card>
      <div className="flex flex-col gap-3.5 md:flex-row md:*:flex-1 lg:gap-4">
        <Card
          eyebrow="OVERWRITES"
          title="Orange when the file already has a value, before anything is replaced"
          className="h-[390px] lg:h-[440px]"
          decorative={false}
        >
          <Fields
            sample="overwrite"
            usable="offprompt's page with a VERCEL_TOKEN the file already holds: type a new one, and show or hide it"
          />
          <Fade />
        </Card>
        <Card
          eyebrow="GENERATED SECRETS"
          title="Random values like JWT_SECRET are made right on the page. Press Regenerate for another."
          className="h-[390px] lg:h-[440px]"
          decorative={false}
        >
          <Fields sample="generated" usable="offprompt's page making a JWT_SECRET, with a Regenerate button that makes another" />
          <Fade />
        </Card>
      </div>
    </div>
  </section>
)
