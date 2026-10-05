import { Cta } from '@/components/sections/cta'
import { Hero } from '@/components/sections/hero'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Schemas } from '@/components/sections/schemas'
import { Security } from '@/components/sections/security'
import { Shell } from '@/components/shell'

const Home = () => (
  <Shell>
    <Hero />
    <HowItWorks />
    <Schemas />
    <Security />
    <Cta />
  </Shell>
)

export default Home
