(() => {
  const storageKey = 'kusuriso:preferences:v1'
  const fallbackImage = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=78'
  const defaults = { favorites: [], recent: [], view: 'grid', filter: 'all', scrollPositions: {} }
  const grid = document.querySelector('[data-medicine-grid]')
  const originalCards = grid ? [...grid.querySelectorAll('[data-medicine-card]')] : []
  let savedRequest = 0
  let recentRequest = 0
  let restoreInitialScroll = null

  function loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
      const value = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
      const scrollPositions = value.scrollPositions && typeof value.scrollPositions === 'object' && !Array.isArray(value.scrollPositions)
        ? Object.fromEntries(Object.entries(value.scrollPositions)
          .filter(([key, position]) => typeof key === 'string' && Number.isFinite(Number(position)) && Number(position) >= 0)
          .slice(-24))
        : {}

      return {
        favorites: [...new Set(Array.isArray(value.favorites) ? value.favorites.filter((item) => typeof item === 'string') : [])].slice(0, 500),
        recent: [...new Set(Array.isArray(value.recent) ? value.recent.filter((item) => typeof item === 'string') : [])].slice(0, 8),
        view: value.view === 'list' ? 'list' : 'grid',
        filter: value.filter === 'saved' ? 'saved' : 'all',
        scrollPositions,
      }
    } catch {
      return { ...defaults, scrollPositions: {} }
    }
  }

  const preferences = loadPreferences()

  function savePreferences() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences))
    } catch {
      // Keep the page usable when browser storage is unavailable or full.
    }
  }

  function refreshFavoriteButtons() {
    document.querySelectorAll('[data-favorite-toggle]').forEach((button) => {
      const saved = preferences.favorites.includes(button.dataset.slug)
      button.setAttribute('aria-pressed', String(saved))
      button.setAttribute('aria-label', `${saved ? 'Bỏ lưu' : 'Lưu'} ${button.dataset.name}`)
      button.title = saved ? 'Bỏ lưu thuốc' : 'Lưu thuốc'
      const icon = button.querySelector('span')
      if (icon) icon.textContent = saved ? '★' : '☆'
    })

    const count = document.querySelector('[data-saved-count]')
    if (count) count.textContent = String(preferences.favorites.length)
  }

  function safeImageUrl(value) {
    if (typeof value !== 'string' || !value) return fallbackImage
    try {
      const url = new URL(value, location.origin)
      return ['http:', 'https:'].includes(url.protocol) ? url.href : fallbackImage
    } catch {
      return fallbackImage
    }
  }

  function createMedicineCard(medicine) {
    const slug = String(medicine.slug || '')
    const name = String(medicine.name || 'Thuốc chưa có tên')
    const category = String(medicine.category || 'Chưa phân nhóm')
    const detailUrl = `/thuoc/${encodeURIComponent(slug)}`
    const card = document.createElement('article')
    card.className = 'medicine-card'
    card.dataset.medicineCard = ''
    card.dataset.slug = slug

    const imageWrap = document.createElement('div')
    imageWrap.className = 'card-image-wrap'
    const imageLink = document.createElement('a')
    imageLink.className = 'card-image-link'
    imageLink.href = detailUrl
    imageLink.tabIndex = -1
    imageLink.setAttribute('aria-hidden', 'true')
    const image = document.createElement('img')
    image.className = 'card-image'
    image.src = safeImageUrl(medicine.image_url)
    image.alt = ''
    image.loading = 'lazy'
    imageLink.append(image)

    const categoryLabel = document.createElement('span')
    categoryLabel.className = 'card-category'
    categoryLabel.textContent = category
    const favoriteButton = document.createElement('button')
    favoriteButton.className = 'favorite-toggle'
    favoriteButton.type = 'button'
    favoriteButton.dataset.favoriteToggle = ''
    favoriteButton.dataset.slug = slug
    favoriteButton.dataset.name = name
    favoriteButton.setAttribute('aria-pressed', 'true')
    favoriteButton.setAttribute('aria-label', `Bỏ lưu ${name}`)
    favoriteButton.title = 'Bỏ lưu thuốc'
    const favoriteIcon = document.createElement('span')
    favoriteIcon.setAttribute('aria-hidden', 'true')
    favoriteIcon.textContent = '★'
    favoriteButton.append(favoriteIcon)
    imageWrap.append(imageLink, categoryLabel, favoriteButton)

    const content = document.createElement('div')
    content.className = 'card-content'
    const contentLink = document.createElement('a')
    contentLink.className = 'card-content-link'
    contentLink.href = detailUrl
    const nameRow = document.createElement('div')
    nameRow.className = 'card-name-row'
    const heading = document.createElement('h3')
    heading.textContent = name
    const arrow = document.createElement('span')
    arrow.className = 'card-arrow'
    arrow.setAttribute('aria-hidden', 'true')
    arrow.textContent = '↗'
    nameRow.append(heading, arrow)

    const summary = document.createElement('p')
    summary.className = 'card-summary'
    summary.textContent = String(medicine.summary || '')
    contentLink.append(nameRow)

    if (medicine.generic_name && medicine.generic_name !== name) {
      const generic = document.createElement('p')
      generic.className = 'generic-name'
      generic.textContent = String(medicine.generic_name)
      contentLink.append(generic)
    }
    contentLink.append(summary)

    const brands = Array.isArray(medicine.brands) ? medicine.brands.filter((brand) => typeof brand === 'string') : []
    if (brands.length) {
      const brandList = document.createElement('p')
      brandList.className = 'brand-list'
      brandList.textContent = `Thường gặp: ${brands.join(' · ')}`
      contentLink.append(brandList)
    }

    const readMore = document.createElement('span')
    readMore.className = 'read-more'
    readMore.textContent = 'Xem thông tin'
    contentLink.append(readMore)
    content.append(contentLink)
    card.append(imageWrap, content)
    return card
  }

  function setSavedStatus(message, showRetry = false) {
    const status = document.querySelector('[data-saved-status]')
    if (!status) return
    status.hidden = !message
    const text = status.querySelector('[data-saved-status-text]')
    const retry = status.querySelector('[data-retry-saved]')
    if (text) text.textContent = message
    if (retry) retry.hidden = !showRetry
  }

  async function renderSavedItems() {
    if (!grid) return
    const request = ++savedRequest
    const noResults = document.querySelector('[data-no-results]')
    const noSaved = document.querySelector('[data-no-saved]')
    const resultCount = document.querySelector('[data-result-count]')
    const retryButton = document.querySelector('[data-retry-saved]')
    if (noResults) noResults.hidden = true
    if (noSaved) noSaved.hidden = true
    if (retryButton) retryButton.hidden = true
    grid.replaceChildren()
    grid.setAttribute('aria-busy', 'true')

    if (!preferences.favorites.length) {
      grid.removeAttribute('aria-busy')
      setSavedStatus('')
      if (noSaved) noSaved.hidden = false
      if (resultCount) resultCount.textContent = '0 mục đã lưu'
      restoreInitialScroll?.()
      return
    }

    setSavedStatus('Đang tải các mục đã lưu...')
    if (resultCount) resultCount.textContent = 'Đang tải...'

    try {
      const slugs = preferences.favorites.map((slug) => encodeURIComponent(slug)).join(',')
      const response = await fetch(`/api/medicines/by-slug?slugs=${slugs}`, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('Không thể tải thư viện đã lưu.')
      const medicines = await response.json()
      if (request !== savedRequest) return

      const cards = Array.isArray(medicines) ? medicines.map(createMedicineCard) : []
      grid.replaceChildren(...cards)
      setSavedStatus('')
      if (noSaved) noSaved.hidden = cards.length > 0
      if (resultCount) resultCount.textContent = `${cards.length} mục đã lưu`
      refreshFavoriteButtons()
      restoreInitialScroll?.()
    } catch {
      if (request !== savedRequest) return
      setSavedStatus('Không tải được thư viện đã lưu. Vui lòng thử lại.', true)
      if (resultCount) resultCount.textContent = `${preferences.favorites.length} mục đã lưu`
      restoreInitialScroll?.()
    } finally {
      if (request === savedRequest) grid.removeAttribute('aria-busy')
    }
  }

  function refreshLibrary() {
    if (!grid) return

    const noResults = document.querySelector('[data-no-results]')
    const noSaved = document.querySelector('[data-no-saved]')
    const resultCount = document.querySelector('[data-result-count]')

    if (preferences.filter === 'saved') {
      renderSavedItems()
    } else {
      savedRequest += 1
      grid.removeAttribute('aria-busy')
      grid.replaceChildren(...originalCards)
      originalCards.forEach((card) => { card.hidden = false })
      setSavedStatus('')
      if (noSaved) noSaved.hidden = true
      if (noResults) noResults.hidden = originalCards.length > 0
      if (resultCount) resultCount.textContent = `${originalCards.length} mục thông tin`
    }

    grid.classList.toggle('is-list', preferences.view === 'list')
    document.querySelectorAll('[data-view-mode]').forEach((button) => {
      const selected = button.dataset.viewMode === preferences.view
      button.classList.toggle('is-active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
    document.querySelectorAll('[data-library-filter]').forEach((button) => {
      const selected = button.dataset.libraryFilter === preferences.filter
      button.classList.toggle('is-active', selected)
      button.setAttribute('aria-selected', String(selected))
    })
  }

  async function renderRecentItems() {
    const section = document.querySelector('[data-recent-section]')
    const list = document.querySelector('[data-recent-list]')
    if (!section || !list) return
    const request = ++recentRequest
    if (!preferences.recent.length) {
      list.replaceChildren()
      section.hidden = true
      return
    }

    const medicines = await Promise.all(preferences.recent.map(async (slug) => {
      try {
        const response = await fetch(`/api/medicines/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } })
        return response.ok ? await response.json() : null
      } catch {
        return null
      }
    }))
    if (request !== recentRequest) return

    list.replaceChildren()
    for (const medicine of medicines.filter(Boolean)) {
      const link = document.createElement('a')
      link.className = 'recent-card'
      link.href = `/thuoc/${encodeURIComponent(medicine.slug)}`

      const image = document.createElement('img')
      image.src = safeImageUrl(medicine.image_url)
      image.alt = ''
      image.loading = 'lazy'

      const copy = document.createElement('span')
      copy.className = 'recent-copy'
      const name = document.createElement('strong')
      name.textContent = String(medicine.name || '')
      const category = document.createElement('span')
      category.textContent = String(medicine.category || '')
      copy.append(name, category)
      link.append(image, copy)
      list.append(link)
    }
    section.hidden = list.childElementCount === 0
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    const favoriteButton = target?.closest('[data-favorite-toggle]')
    if (favoriteButton) {
      const slug = favoriteButton.dataset.slug
      if (!slug) return
      preferences.favorites = preferences.favorites.includes(slug)
        ? preferences.favorites.filter((item) => item !== slug)
        : [slug, ...preferences.favorites].slice(0, 500)
      savePreferences()
      refreshFavoriteButtons()
      refreshLibrary()
      return
    }

    const filterButton = target?.closest('[data-library-filter]')
    if (filterButton) {
      preferences.filter = filterButton.dataset.libraryFilter === 'saved' ? 'saved' : 'all'
      savePreferences()
      refreshLibrary()
      return
    }

    const viewButton = target?.closest('[data-view-mode]')
    if (viewButton) {
      preferences.view = viewButton.dataset.viewMode === 'list' ? 'list' : 'grid'
      savePreferences()
      refreshLibrary()
      return
    }

    if (target?.closest('[data-retry-saved]')) {
      renderSavedItems()
      return
    }

    if (target?.closest('[data-clear-history]')) {
      preferences.recent = []
      savePreferences()
      recentRequest += 1
      const section = document.querySelector('[data-recent-section]')
      if (section) section.hidden = true
    }
  })

  window.addEventListener('storage', (event) => {
    if (event.key && event.key !== storageKey) return
    Object.assign(preferences, loadPreferences())
    refreshFavoriteButtons()
    refreshLibrary()
    if (document.body.dataset.page === 'home') renderRecentItems()
  })

  refreshFavoriteButtons()
  refreshLibrary()

  if (document.body.dataset.page === 'detail') {
    const slug = document.body.dataset.medicineSlug
    if (slug) {
      preferences.recent = [slug, ...preferences.recent.filter((item) => item !== slug)].slice(0, 8)
      savePreferences()
    }
  }

  if (document.body.dataset.page === 'home') {
    renderRecentItems()

    const scrollKey = `${location.pathname}${location.search}`
    const navigation = performance.getEntriesByType('navigation')[0]
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

    const shouldRestoreScroll = (navigation?.type === 'reload' || navigation?.type === 'back_forward') && !location.hash
    let restoredScroll = false
    restoreInitialScroll = () => {
      if (!shouldRestoreScroll || restoredScroll) return
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const savedY = Number(preferences.scrollPositions[scrollKey])
        if (Number.isFinite(savedY) && savedY > 0) window.scrollTo(0, savedY)
        restoredScroll = true
      }))
    }

    if (preferences.filter !== 'saved' || !preferences.favorites.length) restoreInitialScroll()

    let scrollTimer = 0
    const saveScroll = () => {
      preferences.scrollPositions[scrollKey] = window.scrollY
      const keys = Object.keys(preferences.scrollPositions)
      for (const oldKey of keys.slice(0, Math.max(0, keys.length - 24))) {
        delete preferences.scrollPositions[oldKey]
      }
      savePreferences()
    }

    window.addEventListener('scroll', () => {
      window.clearTimeout(scrollTimer)
      scrollTimer = window.setTimeout(saveScroll, 180)
    }, { passive: true })
    window.addEventListener('pagehide', () => {
      window.clearTimeout(scrollTimer)
      saveScroll()
    })
  }
})()
