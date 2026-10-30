# Third-party notices

offprompt.dev's own code is under the MIT License, in `LICENSE` at the root of this
repository. These parts of the site are other people's work, under their own terms. The site
serves this file at `/third-party-notices.txt`, since its minified scripts leave the notices
in the libraries' sources out.

## Geist and JetBrains Mono

The site is set in [Geist](https://github.com/vercel/geist-font) and
[JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), which `next/font` downloads
at build time and serves from the site. The social cards draw with WOFF files of both, from
Fontsource 5.3.0, in `src/og/fonts`, which have their kerning and ligatures taken out. Both are
under the [SIL Open Font License, Version 1.1](https://openfontlicense.org):

```
Geist: Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font)
JetBrains Mono: Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)
```

## Lucide

The site's icons come from [Lucide](https://lucide.dev), through `lucide-react`, under the
ISC License:

```
Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.
```

## Logos

The provider and agent logos come from offprompt's own registry, and so from the projects
`packages/offprompt/THIRD_PARTY_NOTICES.md` lists. The marks belong to their owners, and
the site only uses them to name the providers and agents offprompt works with, and the tools
/compare sets it beside.

Infisical's mark, in `src/components/marks.tsx`, is the infinity sign from
`docs/logo/light.svg` in [Infisical's repository](https://github.com/Infisical/infisical),
under the MIT License:

```
Copyright (c) 2022 Infisical Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Everything else

The rest of what the site runs on, such as Next.js and React, is open source, each package
under the licence in its own `package.json`.
