/*

xxx autogen rss
xxx mobile size tables
xxx `{{< youtube ..`
xxx .newest only defined 2nd request / when localStorage is read from prior 1st request as of now

Your posts or directories of posts, should ideally natural sort in time order, examples:
  2022-11-03-a-birthday.md
  2020-10-31-halloween-fun.md

  2022/11/03/a-birthday.md
  2020/10/31/halloween-fun.md


goals: 0 config/0 build; pull in info from multiple blogs; parents can do it


xxx ignore markdown files w/o frontmatter

wgeto 'https://api.github.com/repos/traceypooh/blogtini/git/trees/main?recursive=true'

tech terminal try-out:
  wget https://raw.githubusercontent.com/traceypooh/test1/main/index.html
  wget https://raw.githubusercontent.com/traceypooh/test1/main/README.md
  [edit 1st real post in README.md]
  [open in Safari; Developer Menu; check `Disable Cross-Origin Restrictions` during development
  open index.html
  [Developer Menu; uncheck `Disable Cross-Origin Restrictions` when done


existing GH repo try-out: /?preview=github/repo-name    (we'll use GH API to find .md files)
existing WP try-out: /?preview=URL/feed (atom or RSS)

could host entire thing in codepen, etc.?!

xxx go to blogtini.com -> enter in your username and repo and show them how it looks!

nav search box that prefills google search site:xxx AND ..


xxx gist: either: public GH repo w/ dir of .md files *or* WP/private and parse atom feed..
xxx pagination
xxx JS/CSS versioning..

github.com cookie: dotcom_user
https://jekyll.github.io/github-metadata/site.github/

minimum:
setup GH account
visit: https://github.com/traceypooh/blogtini
press [Y Fork] button in upper right
(fork to your account)
hit [⚙️ Settings] in upper right
[🗂️ Pages] left menu
enable GH actions xxx

[pipeline will start..]

wait a few minutes, visit your site at:
https://[YOUR-GITHUB-USERNAME].github.io/blogtini/?setup


# parse username from location.host/name ;-)


# make a new file, 'Name your file....' like YYYY-MM-DD-first-test-post.md
https://github.com/xxx/blogtini/new/main/posts
---
title: first test post
date: xxx
tags: blogging, testing, blogtini
---
# scroll down, hit [Commit new file]

https://github.com/xxx/blogtini/edit/main/posts/2022-02-02.md
[<> Code] upper left tab
[📁  posts]
click 2022-02-02.md
upper-mid right [✏️] (hover shows "Edit this file")

change, to taste:
title:
date:
tags:

(scroll down, find [Commit changes] button and press)

https://github.com/xxx/blogtini/edit/main/config.yml
change, to taste:
`title`
`user`
(scroll down, find [Commit changes] button and press)
---

PAT / tokens for ~30/hr => ~5k/hr rate limits
- https://github.com/settings/tokens
- https://api.github.com/repos/traceypooh/blogtini/git/trees/main?recursive=true&token=TOKEN
- https://raw.githubusercontent.com/traceypooh/blogtini/main/README.md?token=TOKEN


[layout]
posts
img

pages
css
js


- 15y, 112 posts, 500k txt, 60k gzip (twitter tp cold load 2.7MB)
- xxx SEO!?
- xxx presently assumes posts list has filenames that are reverse sorted by date/time YYYY-MM-DD-..
- import xxx from 'https://esm.archive.org/blogtini'
- xxx can still use site w/o .md copied into webroot via api
  https://api.github.com/repos/traceypooh/blogtini/contents look for type: dir and dir with 20\d\d...md

- fill out nav & sidebar
- parse 10 most recent posts, fill out main page
- parse front-matter from remaining posts for tag cloud, category list (fills-in later) (cache)
  - consider range requests for ~just front-matter retrieval & parsing?
  - GH pages serves over http2 at least

- put into local storage (cache <= 24h): each post's: title, date, tags, cats, img
  - ... but we only need to parse most recent 2-10 posts from each subscriber
- top page: show most recent 10 posts' summaries
  - page 2: posts 10..20, etc.
- open followers' websites /posts dir to parse their 2-10 most recent .md, eg:
  - https://api.github.com/repos/ajaquith/securitymetrics/contents/source/_posts
  - https://hunterleebrown.com/blog/feed
  - https://blog.archive.org/feed/
  - https://hugo-fresh.vercel.app/blog/index.xml
  - https://feeds.feedburner.com/securitymetrics-org

  xxx posts w/o dates examples
  - eg: https://api.github.com/repos/stefma/hugo-fresh/contents/exampleSite/content/blog
        https://github.com/StefMa/hugo-fresh/tree/master/exampleSite/content/blog
        https://hugo-fresh.vercel.app/blog/index.xml   ** BUT! :) **


jekyll (GitHub Pages) plugins:
  https://pages.github.com/versions/
  https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll#plugins

   could be useful vv, but not in accept list ^^ :(
  https://github.com/jekyll/jekyll-sitemap
  https://github.com/jekyll/jekyll-feed

  https://jekyll.github.io/github-metadata/site.github/
*/

/* eslint-disable no-continue */
import yml from 'https://esm.archive.org/js-yaml'
import lunr from 'https://esm.archive.org/lunr'
import dayjs from 'https://esm.archive.org/dayjs'
import showdown from 'https://esm.archive.org/showdown'
import hljs from 'https://esm.archive.org/highlightjs'


import { friendly_truncate, krsort } from 'https://av.prod.archive.org/js/util/strings.js'

// eslint-disable-next-line no-console
const log = console.log.bind(console)
const state = {
  tags: {},
  cats: {},
  file_prefix: '',
  use_github_api_for_files: null,
  try_github_api_tree: false,
  num_posts: 0,
  pathrel: '',
}
const SEARCH = decodeURIComponent(location.search)
const filter_tag  = (SEARCH.match(/^\?tags\/([^&]+)/)        || ['', ''])[1]
const filter_cat  = (SEARCH.match(/^\?categories\/([^&]+)/)  || ['', ''])[1]
const filter_post = (location.pathname.match(/\/(20\d\d-.*)/) || ['', ''])[1] // xxx generalize

const STORAGE = SEARCH.match(/[&?]recache=1/i) ? {} :
  JSON.parse(localStorage.getItem('blogtini')) ?? {}
let STORED = 10000

let searcher

// defaults
let cfg = {
  user: '',
  repo: '',
  branch: 'main', // xxxx autodetect or 'master'
  title: 'welcome to my blog',
  attribution: "Theme: <a href='https://github.com/pacollins/hugo-future-imperfect-slim' target='_blank' rel='noopener'>Hugo Future Imperfect Slim</a><br>A <a href='https://html5up.net/future-imperfect' target='_blank' rel='noopener'>HTML5 UP port</a> | Powered by <a href='https://blogtini.com/'  target='_blank' rel='noopener'>blogtini.com</a>",
  img_site: '',
  posts_per_page: 10,
  site_header: 'https://traceypooh.github.io/blogtini/img/blogtini.png', // xxx
  reading_time: true,
  summary_length: 500,
  sidebar: {
    post_amount: 5,
    categories: true,
    categories_by_count: true,
  },
  social: {},
  view_more_posts_link: '/post/', // xxx
}

const MD2HTM = new showdown.Converter({ tables: true, simplifiedAutoLink: true })

function PR(str, val) {
  return val === '' || val === undefined || val === null ? '' : `${str[0]}${val}${str[1]}`
}

async function fetcher(url)  {
  const text = !url.match(/\.(json)$/i) || url.endsWith('/')

  try {
    const ret = await fetch(url.concat(url.endsWith('/') ? 'index.html' : ''))

    if (!ret.ok) {
      // safari file:// doesnt set .ok properly...
      if (!location.protocol.startsWith('file') || url.startsWith('http'))
        return null
    }
    const tmp = (text ? await ret.text() : await ret.json())
    return tmp

    /* eslint-disable-next-line no-empty */ // deno-lint-ignore no-empty
  } catch {}
  return null
}

async function main() {
  let tmp

  const dirs = location.pathname.split('/').filter((e) => e !== '')
  state.filedev = location.protocol === 'file:'
  // eslint-disable-next-line no-nested-ternary
  state.is_topdir = location.protocol === 'file:'
    ? dirs.slice(-2, -1)[0] === 'blogtini' // eg: .../blogtini/index.html
    : (location.hostname.endsWith('.github.io') ? dirs.length <= 1 : !dirs.length)
  state.pathrel = state.is_topdir ? '' : '../' // xxxx generalize
  state.toprel = state.pathrel.concat(state.filedev ? 'index.html' : '')

  // eslint-disable-next-line no-use-before-define
  head_insert_generics()

  if (state.is_topdir) {
    if (SEARCH.match(/^\?20\d\d-\d\d-\d\d-/)) {
      // prior SPA type blogtini method.  so now do a soft 404
      // https://developers.google.com/search/docs/advanced/javascript/javascript-seo-basics#avoid-soft-404s
      window.location.href = '/not-found' // redirect to 404 page on the server
      return
    }

    // eslint-disable-next-line no-use-before-define
    head_insert_titles('Tracey Jaquith - blogtini') // xxx
  }


  // default expect github pages hostname - user can override via their own `config.yml` file
  [tmp, cfg.user, cfg.repo] = location.href.match(/^https:\/\/(.*)\.github\.io\/([^/]+)/) || ['', '', '']

  tmp = yml.load(await fetcher(`${state.pathrel}config.yml`))
  if (tmp)
    cfg = { ...cfg, ...tmp } // xxx deep merge `sidebar` value hashmap, too

  const prefix = cfg.repo === 'blogtini' ? state.pathrel : 'https://blogtini.com/'
  // eslint-disable-next-line no-use-before-define
  add_css(`${prefix}css/blogtini.css`) // xxxx theme.css


  document.getElementsByTagName('body')[0].innerHTML = `
    ${'' /* eslint-disable-next-line no-use-before-define */}
    ${site_start()}

    <div id="posts"></div>

    ${'' /* eslint-disable-next-line no-use-before-define */}
    ${site_end()}`


/*
cfg.repo = 'blogtini'
cfg.user = 'ajaquith'; cfg.repo = 'securitymetrics'; cfg.branch = 'master'
log('xxxx testitos', await find_posts_from_github_api_tree()); return
*/

  if (!Object.keys(STORAGE).length || STORAGE.created !== dayjs().format('MMM D, YYYY')) {
    // eslint-disable-next-line no-use-before-define
    await storage_create()
    STORAGE.docs = krsort(STORAGE.docs)
  }

  // eslint-disable-next-line no-use-before-define
  await storage_loop()

  // eslint-disable-next-line no-use-before-define
  finish()
}


async function storage_create() {
  STORAGE.created = dayjs().format('MMM D, YYYY')
  STORAGE.docs = STORAGE.docs || {}

  for (const pass of [1, 0]) {
    // eslint-disable-next-line no-use-before-define
    const latest = pass ? await find_posts() : await find_posts_from_github_api_tree()

    let proms = []
    let files = []
    for (let n = 0; n < latest.length; n++) {
      const md = latest[n]
      const url = `${state.file_prefix}${md}`
      const mat = url.match(/^(.*)\/([^/]+)$/) || url.match(/^()([^/]+)$/)
      const file = state.sitemap_htm ? latest[n] : mat[2]

      // very first markdown file fetch -- let's autodetect if we can load markdown files directly
      // from the website or need to fallback to the github raw url
      let contents
      if (state.use_github_api_for_files === null) {
        contents = await fetcher(file)
        state.use_github_api_for_files = !contents
      }
      files.push(file)

      const fetchee = // eslint-disable-next-line no-nested-ternary
      (state.use_github_api_for_files
        ? `https://raw.githubusercontent.com/${cfg.user}/${cfg.repo}/${cfg.branch}/`
        : (state.sitemap_htm && !url.startsWith('https://') && !url.startsWith('http://') ? state.pathrel : '')
      ).concat(url)
      log({ file, url, fetchee })

      proms.push(contents || fetch(fetchee))

      if (((n + 1) % cfg.posts_per_page) && n < latest.length - 1)
        continue // keep building up requests

      // now make the requests in parallel and wait for them all to answer.
      const vals = await Promise.all(proms)
      const file2markdown = files.reduce((obj, key, idx) => ({ ...obj, [key]: vals[idx] }), {})

      // eslint-disable-next-line no-use-before-define
      await parse_posts(file2markdown)

      files = []
      proms = []
    }
    log({ state })
    if (state.num_posts)
      break
  }
  localStorage.setItem('blogtini', JSON.stringify(STORAGE))
}


async function find_posts() {
  const FILES = []

  if (!FILES.length) {
    const sitemap_urls = (await fetcher(`${state.pathrel}sitemap.xml`))?.split('<loc>').slice(1)
      .map((e) => e.split('</loc>').slice(0, 1).join(''))
      // eslint-disable-next-line no-confusing-arrow
      .map((e) => e.replace('https://blogtini.com/', '').replace(/https:\/\/[^.]+\.github\.io\/[^/]+\//, ''))
      .filter((e) => e !== '')
      // eslint-disable-next-line no-confusing-arrow
      .map((e) => e.endsWith('/') ? e.concat('index.html') : e)
      // eslint-disable-next-line no-confusing-arrow
      .map((e) => e.replace(/http:\/\/localhost:\d\d\d\d\//, '')) // xxxx

    state.try_github_api_tree = false
    state.use_github_api_for_files = false

    if (sitemap_urls) {
      log({ sitemap_urls })
      FILES.push(...sitemap_urls)
      state.sitemap_htm = true
    } else {
      FILES.push(location.pathname) // xxx
      state.sitemap_htm = false
    }
  }

  // check for simple dir of .md/.markdown files -- w/ webserver that responds w/ dir listings:
  if (!FILES.length) {
    const txt = await fetcher('posts/')
    if (txt) {
      // local dev or something that replies with a directory listing (yay)
      FILES.push(...[...txt.matchAll(/<a href="([^"]+.md)"/g)].map((e) => e[1])) // xxx .markdown too
      state.file_prefix = './posts' // chexxxx
    } else {
      state.try_github_api_tree = true
    }
  }

  // try 1+ post inside the main README.md
  if (!FILES.length) {
    FILES.push('README.md')
    state.try_github_api_tree = true
  }

  log({ cfg, state })

  const latest = FILES.filter((e) => e && e.match(/\.(md|markdown|html|htm)$/i)).sort().reverse() // xxx assumes file*names*, reverse sorted, is latest post first...
  log(latest.slice(0, cfg.posts_per_page))

  return latest
}


async function find_posts_from_github_api_tree() {
  const listing = await fetcher(
    `https://api.github.com/repos/${cfg.user}/${cfg.repo}/git/trees/${cfg.branch}?recursive=true`,
  )
  // xxx NOTE: tree listing has sha details on branch and each file and more. useful?
  const files = listing?.tree?.map((e) => e.path) ?? []
  log({ files })

  // prefer one of these, in this order:
  // - prefer posts/  (excluding any README.md)
  // - 2###.*.md/markdown files
  // - any .md/markdown files  (excluding any README.md)
  // - /README.md

  let mds = files.filter((e) => e.startsWith('posts/') && !e.endsWith('README.md'))
  mds = mds.length ? mds : files.filter((e) => `/${e}`.match(/\/2\d\d\d[^/]+\.(md|markdown)$/))
  mds = mds.length ? mds : files.filter((e) => e.match(/\.(md|markdown)$/) && !e.endsWith('README.md'))
  mds = mds.length ? mds : files.filter((e) => e === 'README.md')

  return mds.sort().reverse() // xxx assumes file*names*, reverse sorted, is latest post first...
}


async function parse_posts(markdowns) {
  for (const [file, markdown] of Object.entries(markdowns)) {
    // the very first post might have been loaded into text if the webserver served the markdown
    // file directly.  the rest are fetch() results.
    const yaml = typeof markdown === 'string' ? markdown : await markdown.text()

    const chunks = yaml.split('\n---')

    const multiples = (file === 'README.md' && !(chunks.length % 2) && // xxx handle \n--- corner cases (hr, tables..)
        !(chunks.filter((_e, idx) => !(idx % 2)).filter((e) => !e.match(/\ntitle:/m)).length))
    const parts = multiples ? chunks : [chunks.shift(), chunks.join('\n---')]
    if (multiples) {
      if (parts.length > 2 && parts[1].trim() === '' && parts[0].match(/^---\ntitle:[^\n]+$/)) {
        // prolly doing local dev -- pull dummy front-matter that GH Pages deploy's jekyll removes..
        parts.shift()
        parts.shift()
      }
      log('looks like single file with', parts.length / 2, 'posts')
    }

    while (parts.length) {
      const front_matter = parts.shift()
      const body_raw = parts.shift()
      let parsed
      try {
        parsed = yml.load(front_matter)
      } catch {
        // no front-matter or not parseable -- skip
        log('not parseable', { file, front_matter })
        continue
      }
      const json = parsed
      log({ json })

      const title      = json.title?.trim() ?? ''
      const tags       = (json.tags       ?? []).map((e) => e.trim().replace(/ /g, '-').toLowerCase())
      const categories = (json.categories ?? []).map((e) => e.trim().replace(/ /g, '-').toLowerCase())
      const date       = json.date || json.created_at || '' // xxx any more possibilities should do?

      if (!date) {
        log('no date', { file, front_matter })
        continue
      }

      // eslint-disable-next-line no-use-before-define
      const ymd = date2ymd(new Date(date))
      if (!STORAGE.newest || ymd > STORAGE.newest)
        STORAGE.newest = ymd

      // hugo uses 'images' array - xxx reconcile & copy over related 0th element featuredalt, etc.
      // eslint-disable-next-line no-nested-ternary
      const featured = json.featured?.trim() || json.featured_image?.trim() || (json.images
        ? (typeof json.images === 'object' ? json.images.shift() : json.images.trim())
        : '')
      log({ date, featured })
      // author xxx

      // eslint-disable-next-line no-use-before-define
      const url = multiples ? `${ymd}-${slugify(title)}` : file.replace(/\.md$/, '')

      const post = {
        url, title, date, body_raw, tags, categories, featured,
      }
      for (const key of ['featuredcaption', 'class'])
        if (key in json) post[key] = json[key]
      // keep stored hashmap small as possible - delete key/val where val is empty
      for (const key of Object.keys(post))
        if (post[key] === '' || post[key] === undefined || post[key] === null) delete post[key]

      // eslint-disable-next-line no-use-before-define
      storage_add(post)

      state.num_posts += 1
    }
  }
}

async function storage_loop() {
  showdown.setFlavor('github') // xxx?

  let htm = ''
  for (const post of Object.values(STORAGE.docs)) {
    for (const tag of post.tags) {
      state.tags[tag] = state.tags[tag] || []
      state.tags[tag].push(post.url)
    }
    for (const cat of post.categories) {
      state.cats[cat] = state.cats[cat] || []
      state.cats[cat].push(post.url)
    }

    if (filter_tag.length  &&       !(post.tags.includes(filter_tag))) continue
    if (filter_cat.length  && !(post.categories.includes(filter_cat))) continue
    if (filter_post && post.url !== filter_post
      && !post.url.endsWith(`${filter_post}index.html`) // xxxx
    )
      continue

    if (filter_post) {
      // eslint-disable-next-line no-use-before-define
      head_insert_titles(post.title)
    } else if (filter_tag.length) {
      // eslint-disable-next-line no-use-before-define
      head_insert_titles(`posts tagged: ${filter_tag} - blogtini.com`) // xxx
    } else if (filter_cat.length) {
      // eslint-disable-next-line no-use-before-define
      head_insert_titles(`posts in category: ${filter_cat} - blogtini.com`) // xxx
    }


    post.type = 'post' // xxx
    // const postxxx = date: post.date.toString().split(' ').slice(0, 4).join(' ')

    if (filter_post) {
      document.getElementsByTagName('body')[0].innerHTML =
        // eslint-disable-next-line no-use-before-define
        await post_full(post)
    } else {
      // eslint-disable-next-line no-use-before-define
      htm +=  post1(post)
    }
  }

  if (!filter_post)
    document.getElementById('posts').insertAdjacentHTML('beforeend', htm)
}


function storage_add(post) { // xxx use snippet
  const ts = Math.round(new Date(post.date) / 1000)
  const key = isNaN(ts) ? (post.url ?? '') : ts
  STORAGE.docs[`p${key || STORED}`] = post
  STORED += 1
}

function search_setup() {
  // Build the index so Lunr can search it.  The `ref` field will hold the URL
  // to the page/post.  title, excerpt, and body will be fields searched.
  searcher = lunr(function adder() {
    this.ref('url')
    this.field('title')
    this.field('date') // xxx typo in source!
    this.field('body_raw')
    this.field('tags')
    this.field('categories')

    // Loop through all documents and add them to index so they can be searched
    for (const doc of Object.values(STORAGE.docs))
      this.add(doc)
  })

  for (const query of ['bike', 'geek', 'family'])
    log({ query }, searcher.search(query))
}

async function post_full(post) {
  const body = MD2HTM.makeHtml(post.body_raw)

  const entryId = post.url.replace(/\/index.html*$/, '')
  // eslint-disable-next-line no-use-before-define
  const comments_htm = await comments_markup(entryId)
  // eslint-disable-next-line no-use-before-define
  const comments_form = await create_comment_form(entryId, comments_htm)

  return `
    ${'' /* eslint-disable-next-line no-use-before-define */}
    ${site_start()}

    <article>
      <div class="post single">
        ${'' /* eslint-disable-next-line no-use-before-define */}
        ${post_header(post)}
        ${'' /* eslint-disable-next-line no-use-before-define */}
        ${post_featured(post)}

        <div>
          ${body}
        </div>

        <footer>
          ${'' /* eslint-disable-next-line no-use-before-define */}
          ${post_stats(post)}
        </footer>

      </div>

      ${comments_form}
    </article>

    ${'' /* eslint-disable-next-line no-use-before-define */}
    ${site_end()}`
}


function post1(post) {
  // eslint-disable-next-line no-param-reassign
  post.url = location.protocol === 'file:' ? post.url : post.url.replace(/\/index.html*$/, '') // xxx

  const body_md = MD2HTM.makeHtml(post.body_raw)
  const para1 = (body_md.match(/<p.*?>(.|\n)*?<\/p>/) || [undefined])[0]
  const summary = friendly_truncate(para1 || body_md, cfg.summary_length).replace(/&amp;/g, '&')

  return `
<article class="post">
  ${'' /* eslint-disable-next-line no-use-before-define */}
  ${post_header(post)}
  <div class="content">
    ${'' /* eslint-disable-next-line no-use-before-define */}
    ${post_featured(post)}
    ${summary}
  </div>
  <footer>
    <a href="${post.url}" class="button big">Read More</a>
    ${'' /* eslint-disable-next-line no-use-before-define */}
    ${post_stats(post)}
  </footer>
</article>
`
}

function post_header(post) {
  return `
<header>
  <div class="title">
    <h2><a href="${post.url}">${post.title}</a></h2>
    ${PR`<p>${post.description}</p>` /* chexxx */}
  </div>
  ${post.type === 'post' ? `
    <div class="meta">
      ${'' /* eslint-disable-next-line no-use-before-define */}
      <time datetime="${post.date /* xxx 2022-01-23T04:44:06.937Z */}">${datetime(post.date)}</time>
      ${PR`<p>${post.author}</p>` /* chexxx */}
      ${'' /* eslint-disable-next-line no-use-before-define */}
      ${cfg.reading_time ? `<p>${Math.round((212 + wordcount(post.body_raw)) / 213)}-Minute Read</p>` : ''}
    </div>` : ''}
</header>
`
}

function post_featured(post) {
  let src = ''
  let alt = ''
  let blur
  let stretch = cfg.image_stretch ?? ''

  if (post.featured) {
    // eslint-disable-next-line max-len
    // xxx original: {{- $src = (path.Join "img" (cond (eq .Params.featuredpath "date") (.Page.Date.Format "2006/01") (.Params.featuredpath)) .Params.featured) | relURL -}}
    src = post.featured?.match(/\//) ? post.featured : `${state.pathrel}img/${post.featured}` // xxx img/ parameterize

    alt = post.featuredalt
    stretch = (post.featuredstretch ?? '').toLowerCase()
    blur = post.removeBlur ?? (cfg.remove_blur ?? '')
  } else if (post.images) {
    src = `${state.pathrel}${post.images[0].src}`
    alt = post.images[0].alt
    stretch = (post.images[0].stretch ?? '').toLowerCase()
    blur = post.images[0].removeBlur ?? (cfg.remove_blur ?? '')
  } else if (cfg.img_site) {
    src = `${state.pathrel}${cfg.img_site}`
    blur = post.removeBlur ?? (cfg.remove_blur ?? '')
  } else {
    return ''
  }

  // eslint-disable-next-line no-nested-ternary
  const cls = (stretch === 'vertical' || stretch === 'v'
    ? 'class="stretchV"'
    // eslint-disable-next-line no-nested-ternary
    : (stretch === 'horizontal' || stretch === 'h'
      ? 'class="stretchH"'
      : (stretch === 'cover' || stretch === 'c'
        ? 'class="cover"'
        : '')))

  return `
  <a href="${post.url}" class="image featured ${post.class ?? '' /* xxx traceyism */}"
    ${blur ? '' : `style="--bg-image: url('${src}')"`}>
    <img src="${src}" alt="${alt}" ${cls}>
  </a>
  ${PR`<center>${post.featuredcaption}</center>`}`
}


function post_stats(post) {
  const taglinks =       post.tags.map((e) => `<li><a class="article-terms-link" href="${state.toprel}?tags/${e}">${e}</a></li>`/*  */).join(' ').trim()
  const catlinks = post.categories.map((e) => `<li><a class="article-terms-link" href="${state.toprel}?categories/${e}">${e}</a></li>`).join(' ').trim()

  return `
  <div class="stats">
  <ul class="categories">
    ${catlinks}
  </ul>
  <ul class="tags">
    ${taglinks}
  </ul>
  </div>`
}


function SOC(str, svc) {
  const val = cfg.social[svc]
  return (val === '' || val === undefined || val === null ? '' :
    `<li><a ${str[0]}${val}${str[1]} target="_blank" rel="noopener"></a></li>`)
}
function SOC2(str, arg, svc) {
  const val = cfg.social[svc]
  return (val === '' || val === undefined || val === null ? '' :
    `<li><a ${str[0]}${arg}${str[1]}${val}${str[2]} target="_blank" rel="noopener"></a></li>`)
}

function socnet_icon() {
  // TODO: WeChat and QQ Check

  return `
${SOC`href="https://github.com/${'github'}" title="GitHub" class="fab fa-github"`}
${SOC`href="https://gitlab.com/${'gitlab'}" title="GitLab" class="fab fa-gitlab"`}
${SOC`href="https://stackoverflow.com/users/${'stackoverflow'}" title="Stack Overflow" class="fab fa-stack-overflow"`}
${SOC`href="https://bitbucket.com/${'bitbucket'}" title="Bitbucket" class="fab fa-bitbucket"`}
${SOC`href="https://jsfiddle.com/${'jsfiddle'}" title="JSFiddle" class="fab fa-jsfiddle"`}
${SOC`href="https://codepen.io/${'codepen'}" title="CodePen" class="fab fa-codepen"`}
${SOC`href="https://${'deviantart'}.deviantart.com/" title="DeviantArt" class="fab fa-deviantart"`}
${SOC`href="https://flickr.com/photos/${'flickr'}" title="Flickr" class="fab fa-flickr"`}
${SOC`href="https://behance.net/${'behance'}" title="Behance" class="fab fa-behance"`}
${SOC`href="https://dribbble.com/${'dribbble'}" title="Dribbble" class="fab fa-dribbble"`}
${SOC`href="https://${'wordpress'}.wordpress.com" title="WordPress" class="fab fa-wordpress"`}
${SOC`href="https://medium.com/@${'medium'}" title="Medium" class="fab fa-medium"`}
${SOC`href="https://www.linkedin.com/in/${'linkedin'}" title="LinkedIn" class="fab fa-linkedin"`}
${SOC`href="https://linkedin.com/company/${'linkedin_company'}" title="LinkedIn Company" class="fab fa-linkedin"`}
${SOC`href="https://foursquare.com/${'foursquare'}" title="Foursquare" class="fab fa-foursquare"`}
${SOC`href="https://xing.com/profile/${'xing'}" title="Xing" class="fab fa-xing"`}
${SOC`href="https://slideshare.com/${'slideshare'}" title="SlideShare" class="fab fa-slideshare"`}
${SOC`href="https://facebook.com/${'facebook'}" title="Facebook" class="fab fa-facebook"`}
${SOC`href="https://reddit.com/user/${'reddit'}" title="Reddit" class="fab fa-reddit"`}
${SOC`href="https://quora.com/profile/${'quora'}" title="Quora" class="fab fa-quora"`}
${SOC`href="https://youtube.com/${'youtube'}" title="YouTube" class="fab fa-youtube"`}
${SOC`href="https://vimeo.com/${'vimeo'}" title="Vimeo" class="fab fa-vimeo"`}
${SOC`href="https://api.whatsapp.com/send?phone=${'whatsapp'}" title="WhatsApp" class="fab fa-whatsapp"`}
${SOC`href="weixin://contacts/profile/${'wechat'}" title="WeChat" class="fab fa-weixin"`}
${SOC`href="https://wpa.qq.com/msgrd?v=3&amp;uin=${'qq'}&amp;site=qq&amp;menu=yes" title="QQ" class="fab fa-qq"`}
${SOC`href="https://instagram.com/${'instagram'}" title="Instagram" class="fab fa-instagram"`}
${SOC`href="https://${'tumblr'}.tumblr.com" title="Tumblr" class="fab fa-tumblr"`}
${SOC`href="https://twitter.com/${'twitter'}" title="Twitter" class="fab fa-twitter"`}
${SOC`href="https://strava.com/athletes/${'strava'}" title="Strava" class="fab fa-strava"`}
${SOC`href="skype:${'skype'}?userinfo" title="Skype" class="fab fa-skype"`}
${SOC`href="https://snapchat.com/add/${'snapchat'}" title="snapchat" class="fab fa-snapchat"`}
${SOC`href="https://www.pinterest.com/${'pinterest'}" title="Pinterest" class="fab fa-pinterest-p"`}
${SOC`href="https://telegram.me/${'telegram'}" title="telegram" class="fab fa-telegram"`}
${SOC`href="https://vine.co/${'vine'}" title="Vine" class="fab fa-vine"`}
${SOC`href="https://keybase.io/${'keybase'}" title="keybase" class="fab fa-keybase"`}
${SOC`href="https://${'mastodon'}" title="mastodon" class="fab fa-mastodon"`}
${SOC`href="mailto:${'email'}" target="_blank" title="Email" class="far fa-envelope"`}

${SOC`href="https://scholar.google.com/citations?user=${'googlescholar'}" title="Google Scholar"`}
${SOC`href="https://orcid.org/${'orcid'}" title="ORCID"`}
${SOC`href="https://researchgate.net/profile/${'researchgate'}" title="Research Gate"`}
`
}

function rss_icon() {
  return SOC2`href="${state.pathrel}${'rss'}" type="application/rss+xml" title="RSS" class="fas fa-rss"`
}


async function comments_markup(path) {
  let posts_with_comments
  try {
    posts_with_comments = (await fetcher(`${state.pathrel}comments/index.txt`))?.split('\n')
    // eslint-disable-next-line no-empty
  } catch {}
  if (!posts_with_comments?.includes(path)) return null

  const comments = (await fetcher(`${state.pathrel}comments/${path}/index.json`))?.filter((e) => Object.keys(e).length)

  const refId = 'xxx'

  return comments.map((e) => `
<article id="${refId}" class="comment" data-reply-thread="${refId}">
  <header>
    <img class="comment-avatar circle" src="https://www.gravatar.com/avatar/${e.email}?s=100" alt="${e.name}'s Gravatar">
    <div>
      <div class="comment-author-container">
        <h3 class="comment-author">${e.name}</h3>
        <a class="comment-date" href="#${refId}" title="Permalink to this comment">
          ${'' /* eslint-disable-next-line no-use-before-define */}
          <time datetime="${e.date /* xxx 2022-01-23T04:44:06.937Z */}">${datetime(e.date)}</time>
        </a>
      </div>
      <a class="comment-reply-btn" href="#say-something">Reply</a>
    </div>
  </header>
  <div class="comment-content">
    ${e.body}
  </div>
</article>`).join('')
}


async function create_comment_form(entryId, comments) {
  if (!cfg.staticman?.enabled)
    return ''

  window.cfg = cfg // xxx

  const xxx = '' // reply stuff
  return `
  <div class="post">
    <div>
      <h2 id="say-something">Say Something</h2>
      <form id="comment-form" class="new-comment" method="POST">
        <h3 class="reply-notice hidden">
          <span class="reply-name"></span>
          <a class="reply-close-btn button"><i class="fas fa-times"></i></a>
        </h3>

        <input type="hidden" name="options[entryId]"    value="${entryId}">
        <input type="hidden" name="fields[replyThread]" value="${xxx}">
        <input type="hidden" name="fields[replyID]"     value="${xxx}">
        <input type="hidden" name="fields[replyName]"   value="${xxx}">

        <input required="" name="fields[name]" type="text" placeholder="Your Name">
        <input name="fields[website]" type="text" placeholder="Your Website">
        <input required="" name="fields[email]" type="email" placeholder="Your Email">
        <textarea required="" name="fields[body]" placeholder="Your Message" rows="10"></textarea>

        <div class="submit-notice">
          <strong class="submit-notice-text submit-success hidden">Thanks for your comment! It will be shown on the site once it has been approved.</strong>
          <strong class="submit-notice-text submit-failed hidden">Sorry, there was an error with your submission. Please make sure all required fields have been completed and try again.</strong>
        </div>

        <button type="button" id="comment-form-submit" class="button">Submit</button>
        <button type="button" id="comment-form-submitted" class="hidden button" disabled="">Submitted</button>
        <button type="reset"  id="comment-form-reset" class="button">Reset</button>
      </form>
    </div>


    <div class="comments-container">
      <h2>Comments</h2>
      ${comments ?? '<p>Nothing yet.</p>'}
    </div>

  </div>`
}


function site_start() {
  return `
  <div id="wrapper">
    <!--
    <section id="site-intro" {{ if (and (.Site.Params.intro.hideWhenSingleColumn) (not (and .Page.IsHome .Site.Params.intro.alwaysOnHomepage))) }}class="hidden-single-column"{{ end }}>
      {{ with .Site.Params.intro.pic }}<a href="{{ "/" | relLangURL}}"><img src="{{ .src | relURL }}"{{ with .shape}} class="{{ . }}"{{ end }} width="{{ .width | default "100" }}" alt="{{ .alt }}" /></a>{{ end }}
      <header>
        {{ with .Site.Params.intro.header }}<h1>{{ . | safeHTML }}</h1>{{ end }}
      </header>
      <main>
        {{ with .Site.Params.intro.paragraph }}<p>{{ . | safeHTML }}</p>{{ end }}
      </main>
    {{ if or (.Site.Params.intro.rssIntro) (.Site.Params.intro.socialIntro) }}
        <footer>
          <ul class="socnet-icons"> -->

    <section id="site-intro">
      <header>
        <img id="blogtini" src="${cfg.site_header}">
        <h1>
          <a href="${state.toprel}">
            ${cfg.img_site ? `<img src="${state.pathrel}${cfg.img_site}">` : ''}<br>
            ${cfg.title}
          </a>
        </h1>
      </header>

      ${PR`<main><p>${cfg.intro.paragraph}</p></main>`}

      ${cfg.intro.rss || cfg.intro.social ? `
        <footer>
          <ul class="socnet-icons">
            ${cfg.intro.rss ? rss_icon() : ''}
            ${cfg.intro.social ? socnet_icon() : ''}
          </ul>` : ''}
      </footer>
    </section>
    <main id="site-main">`
}

function site_end() {
  return `
    </main>
    ${'' /* eslint-disable-next-line no-use-before-define */}
    ${site_sidebar()}

    <footer id="site-footer">
      ${cfg.footer.rss || cfg.footer.social ? `
        <ul class="socnet-icons">
          ${cfg.footer.rss ? rss_icon() : ''}
          ${cfg.footer.social ? socnet_icon() : ''}
        </ul>` : ''}
      <p class="copyright">
        ${cfg.copyright ?? `\u00A9 ${STORAGE.newest?.slice(0, 4) ?? ''} ${cfg.author ?? cfg.title}`}
        <br>
        ${cfg.attribution ?? ''}
      </p>
    </footer>
  </div><!--//#wrapper-->

  <a id="back-to-top" href="#" class="fas fa-arrow-up fa-2x" style="display:inline"></a>`
}

function site_sidebar() {
  return `
<section id="site-sidebar">

  ${cfg.sidebar.post_amount ? '<section id="recent-posts"></section>' : ''}
  ${cfg.sidebar.categories ? '<section id="categories"></section>' : ''}
  <section id="tags" style="text-align:center"></section>

  ${cfg.sidebar.about ? `
    <section id="mini-bio">
      <header>
        <h1>About</h1>
      </header>
      ${'' /* eslint-disable-next-line no-use-before-define */}
      <p> ${safeHTML(cfg.sidebar.about)}</p>
      <footer>
        <a href="${state.toprel}about" class="button">Learn More</a>
      </footer>
    </section>` : ''}
</section>`
}

function safeHTML(str) { return str } // xxx

function slugify(str) {
  return str.toLowerCase()
    .replace(/'s/g, 's')
    .replace(/[^a-z0-9-]/g, '-') // xxx i18l
    .replace(/--+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '')
}

function date2ymd(date) {
  return [
    date.getUTCFullYear(),
    `${1 + date.getUTCMonth()}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0'),
  ].join('-')
}

function datetime(date) {
  const fmt = typeof date === 'string' && (date.length <= 10 || date.endsWith('T00:00:00.000Z'))
    ? 'dddd, MMM D, YYYY'
    : 'dddd, MMM D, YYYY h:mm A'

  return dayjs(date).format(fmt)
}

function wordcount(str) {
  return str?.match(/(\w+)/g).length ?? 0
}

function finish() {
  let htm

  if (cfg.sidebar.post_amount) {
    const docs = Object.values(STORAGE.docs)
    const more = docs.length > cfg.sidebar.post_amount

    document.getElementById('recent-posts')?.insertAdjacentHTML('beforeend', `
  <header>
    <h1>Recent Posts</h1>
  </header>
  ${docs.slice(0, cfg.sidebar.post_amount).map((post) => `
  <article class="mini-post">
    ${post_featured(post)}
    <header>
      <h2><a href="${post.url}">${post.title}</a></h2>
      <time class="published" datetime="${post.date /* xxx 2022-01-23T04:44:06.937Z */}">${datetime(post.date)}</time>
    </header>
  </article>`).join('')}
  ${more ? `
  <footer>
    <a href="${cfg.view_more_posts_link}" class="button">See More</a>
  </footer>` : ''}`)
  }


  if (cfg.sidebar.categories) { // xxx could support cfg.sidebar.categories_by_count option..
    htm = `
    <header>
      <h1><a href="${state.toprel}?categories">Categories</a></h1>
    </header>
    <ul>`

    for (const cat of Object.keys(state.cats).sort())
      htm += `<li><a href="${state.toprel}?categories/${cat}">${cat.toLowerCase()}</a> <span class="count">${state.cats[cat].length}</span></li>`
    htm += '</ul>'
    document.getElementById('categories')?.insertAdjacentHTML('beforeend', htm)
  }


  htm = `
  <header>
    <h1><a href="${state.toprel}?tags">Tags</a></h1>
  </header>`
  const rem_min = 1
  const rem_max = 2.5

  const counts = Object.values(state.tags).map((e) => e.length)
  const cnt_min = Math.min(...counts)
  const cnt_max = 1 + Math.max(...counts)

  for (const tag of Object.keys(state.tags).sort()) {
    const count = state.tags[tag].length
    const weight = (Math.log(count) - Math.log(cnt_min)) / (Math.log(cnt_max) - Math.log(cnt_min))
    const size = (rem_min + ((rem_max - rem_min) * weight)).toFixed(1)
    htm += `<a href="${state.toprel}?tags/${tag}" style="font-size: ${size}rem">${tag.toLowerCase()}</a> `
  }
  document.getElementById('tags')?.insertAdjacentHTML('beforeend', htm)

  document.querySelectorAll('pre code').forEach(hljs.highlightBlock)

  import('./staticman.js')

  search_setup()
}


function add_css(file) {
  const { head } = document
  const e = document.createElement('link')
  e.type = 'text/css'
  e.rel = 'stylesheet'
  e.href = file
  head.appendChild(e)
}

function head_insert_generics() {
  {
    const e = document.createElement('meta') // xxxx no worky
    e.setAttribute('charset', 'utf-8')
    document.head.appendChild(e)
  }
  {
    const e = document.createElement('meta')
    e.setAttribute('name', 'viewport')
    e.setAttribute('content', 'width=device-width, initial-scale=1')
    document.head.appendChild(e)
  }
}

function head_insert_titles(title) {
  document.title = title // xxx &gt; &lt;

  {
    const e = document.createElement('title') // chexxx
    e.textContent = title // xxx &gt; &lt;
    document.head.appendChild(e)
  }
  {
    const e = document.createElement('meta') // chexxx
    e.setAttribute('name', 'twitter:title')
    e.setAttribute('content', title) // xxx quote escape, etc.
    document.head.appendChild(e)
  }
  {
    const e = document.createElement('meta') // chexxx
    e.setAttribute('property', 'og:title')
    e.setAttribute('content', title) // xxx quote escape, etc.
    document.head.appendChild(e)
  }
}

function head_insert_specifics() {
  // document.getElementsByTagName('meta')['keywords'].content = 'updated keywords xxx'
  // document.getElementsByTagName('meta')['description'].content = 'updated description xxx'
}


// eslint-disable-next-line no-void
void main()
