import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapGroups, markerRadius } from '../lib/map.mjs';
import { placeLabels, groupLabel, boxesOverlap } from '../lib/map-labels.mjs';
import { filterMapStops, mapStyles } from '../lib/map-filters.mjs';

type Stop = {
  id: string;
  placeId: string;
  name: string;
  address: string;
  neighborhood: string;
  x: number;
  y: number;
  priority: number;
  url: string;
  order: string | null;
  directions: string;
  styles: string[];
  reviews: {
    kind: string;
    label: string;
    summary: string;
    sources: { title: string; url: string; publishedOn: string | null }[];
  }[];
};
const stops: Stop[] = JSON.parse(document.querySelector('#field-map-data')!.textContent!);
const host = document.querySelector<HTMLElement>('#map-drawing')!;
const fallback = host.querySelector<SVGSVGElement>('svg')!;
const search = document.querySelector<HTMLInputElement>('#map-search')!;
const status = document.querySelector<HTMLElement>('#map-status')!;
const panel = document.querySelector<HTMLElement>('#map-selection')!;
const panelTitle = document.querySelector<HTMLElement>('#map-selection-title')!;
const panelBody = document.querySelector<HTMLElement>('#map-selection-body')!;
const zoomSelection = document.querySelector<HTMLButtonElement>('#zoom-selection')!;
const clear = document.querySelector<HTMLButtonElement>('#map-clear')!;
const close = document.querySelector<HTMLButtonElement>('#close-selection')!;
const styleInputs = [...document.querySelectorAll<HTMLInputElement>('input[name="map-style"]')];
const highlight = document.querySelector<HTMLInputElement>('#map-highlight-reviews')!;
const reset = document.querySelector<HTMLButtonElement>('#map-reset')!;
const neighborhoodButton = document.querySelector<HTMLButtonElement>('#map-neighborhood')!;
const params = new URLSearchParams(window.location.search);
const initialStyle = params.get('style');
if (mapStyles.some((style) => style.id === initialStyle))
  styleInputs.forEach((input) => (input.checked = input.value === initialStyle));
search.value = params.get('q') ?? '';
highlight.checked = params.get('reviews') === '1';
let neighborhood = stops.some((stop) => stop.neighborhood === params.get('neighborhood'))
  ? params.get('neighborhood')!
  : '';
const currentStyle = () => styleInputs.find((input) => input.checked)!.value;
const coarse = matchMedia('(pointer:coarse)');
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d')!;
const base = fallback.cloneNode(true) as SVGSVGElement;
base.querySelectorAll('a,.restaurant-label,.stop,.water-label').forEach((e) => e.remove());
base.querySelectorAll('g.decor').forEach((g) => {
  if (g.querySelector('text')) g.remove();
});
base.setAttribute('aria-hidden', 'true');
base.removeAttribute('aria-labelledby');
base.classList.add('interactive-basemap');
let selected: Stop[] = [],
  filtered = stops,
  map: any,
  selectedFocus: string | null = null;
const bounds = L.latLngBounds([
  [-945, 30],
  [-195, 1070],
]);
const xy = (l: Stop) => L.latLng(-l.y, l.x);
try {
  host.replaceChildren();
  host.classList.add('interactive-field-map');
  host.parentElement!.classList.add('is-interactive');
  map = L.map(host, {
    crs: L.CRS.Simple,
    minZoom: -3,
    maxZoom: 4,
    zoomSnap: 0.1,
    zoomDelta: 0.5,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    maxBounds: [
      [-1100, -180],
      [-70, 1280],
    ],
    maxBoundsViscosity: 0.8,
  });
  L.svgOverlay(base, bounds, { interactive: false }).addTo(map);
  const pane = map.createPane('restaurant-labels');
  pane.style.zIndex = '450';
  const content = document.createElement('div');
  content.className = 'field-map-points';
  pane.append(content);
  const districts = [...base.querySelectorAll<SVGTextElement>('.district')];
  let frame = 0;
  let cityView = true;
  const requestRender = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(render);
  };
  function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function reviewBadge(stop: Stop) {
    const badge = node(
      'span',
      '★ ' + [...new Set(stop.reviews.map((review) => review.label))].join(' · '),
    );
    badge.className = 'map-review-badge';
    return badge;
  }
  function syncFilters() {
    reset.hidden =
      !search.value.trim() && currentStyle() === 'all' && !highlight.checked && !neighborhood;
    neighborhoodButton.hidden = !neighborhood;
    neighborhoodButton.textContent = `${neighborhood} ×`;
    neighborhoodButton.setAttribute('aria-label', `Clear ${neighborhood} neighborhood filter`);
    document
      .querySelector('.field-map-figure')!
      .classList.toggle('reviews-highlighted', highlight.checked);
    const next = new URLSearchParams();
    if (search.value.trim()) next.set('q', search.value.trim());
    if (currentStyle() !== 'all') next.set('style', currentStyle());
    if (neighborhood) next.set('neighborhood', neighborhood);
    if (highlight.checked) next.set('reviews', '1');
    const query = next.toString();
    history.replaceState(
      null,
      '',
      `${location.pathname}${query ? '?' + query : ''}${location.hash}`,
    );
  }
  function showSelection(members: Stop[], focusPanel = false) {
    selected = members;
    panel.hidden = false;
    close.hidden = false;
    panelTitle.textContent =
      members.length === 1 ? members[0].name : `${members.length} nearby locations`;
    panelBody.replaceChildren();
    for (const stop of members) {
      const article = node('article');
      article.className = 'map-detail';
      article.classList.toggle('has-review', stop.reviews.length > 0);
      article.dataset.locationId = stop.id;
      const heading = node('h3');
      const title = node('a', stop.name);
      title.href = stop.url;
      heading.append(title);
      const address = node('p', `${stop.address} · ${stop.neighborhood}`);
      address.className = 'map-detail-address';
      const order = node(
        'p',
        stop.order ?? 'See the field notes for branch-specific order recommendations.',
      );
      order.className = 'map-detail-order';
      const links = node('div');
      links.className = 'map-detail-links';
      const read = node('a', 'Field notes & hours →');
      read.href = stop.url;
      const directions = node('a', 'Directions ↗');
      directions.href = stop.directions;
      links.append(read, directions);
      const find = node('button', 'Focus this stop');
      find.type = 'button';
      find.className = 'quiet-button';
      find.addEventListener('click', () => {
        selected = [stop];
        map.setView(xy(stop), Math.max(map.getZoom(), 1.8), { animate: false });
        showSelection([stop], true);
        requestRender();
      });
      article.append(heading, address, order, links);
      if (stop.reviews.length) {
        article.append(reviewBadge(stop));
        const coverage = node('details');
        coverage.className = 'map-review-sources';
        coverage.append(node('summary', 'Read the coverage'));
        coverage.append(
          node('p', 'Coverage applies to this branch, not necessarily the selected burrito style.'),
        );
        for (const review of stop.reviews) {
          coverage.append(node('h4', review.label), node('p', review.summary));
          const sources = node('ul');
          for (const source of review.sources) {
            const item = node('li');
            const link = node('a', source.title);
            link.href = source.url;
            item.append(link, node('small', source.publishedOn ?? 'Publication date not listed'));
            sources.append(item);
          }
          coverage.append(sources);
        }
        article.append(coverage);
      } else article.append(node('p', 'No branch-specific critical review recorded.'));
      if (members.length > 1) article.append(find);
      panelBody.append(article);
    }
    zoomSelection.hidden = members.length < 2;
    requestRender();
    if (focusPanel) {
      panelTitle.focus({ preventScroll: true });
      if (coarse.matches) panel.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
  function render() {
    if (!map._loaded) return;
    const box = host.getBoundingClientRect(),
      size = map.getSize();
    const markerOptions = coarse.matches
      ? { single: 22, group: 22, gap: 6 }
      : { single: 13, group: 16, gap: 6 };
    syncFilters();
    const screen = filtered.map((s) => {
      const p = map.latLngToContainerPoint(xy(s));
      return {
        ...s,
        x: p.x,
        y: p.y,
        priority: s.priority + (highlight.checked && s.reviews.length ? 100 : 0),
      };
    });
    const groups = mapGroups(screen, markerOptions).filter(
      (g) =>
        g.x >= markerRadius(g, markerOptions) + 2 &&
        g.y >= markerRadius(g, markerOptions) + 2 &&
        g.x <= size.x - markerRadius(g, markerOptions) - 2 &&
        g.y <= size.y - markerRadius(g, markerOptions) - 2,
    );
    const selectedIds = new Set(selected.map((s) => s.id));
    const markers = groups.map((g) => ({
      x: g.x - markerRadius(g, markerOptions),
      y: g.y - markerRadius(g, markerOptions),
      w: markerRadius(g, markerOptions) * 2,
      h: markerRadius(g, markerOptions) * 2,
    }));
    // Geographic labels retain a fixed screen size and give way to restaurants.
    const scale = base.getBoundingClientRect().width / 1040;
    const geographic = [];
    const geographicNodes: { element: SVGTextElement; box: any }[] = [];
    for (const district of districts) {
      district.style.display = '';
      district.style.fontSize = `${11 / scale}px`;
      district.style.letterSpacing = `${1 / scale}px`;
      district.style.strokeWidth = `${2 / scale}px`;
      [...district.querySelectorAll('tspan')].forEach((t, i) =>
        t.setAttribute('dy', String(i ? 14 / scale : 0)),
      );
      const r = district.getBoundingClientRect(),
        rect = { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
      if (
        rect.x < 5 ||
        rect.y < 5 ||
        rect.x + rect.w > size.x - 5 ||
        rect.y + rect.h > size.y - 5 ||
        [...markers, ...geographic].some((other) => boxesOverlap(rect, other, 4))
      ) {
        district.style.display = 'none';
        continue;
      }
      geographic.push(rect);
      geographicNodes.push({ element: district, box: rect });
    }
    context.font = '600 12px Arial';
    const items = groups.map((g) => ({
      ...g,
      text:
        (highlight.checked && g.locations.some((stop) => stop.reviews.length) ? '★ ' : '') +
        groupLabel(g),
      r: markerRadius(g, markerOptions),
      priority:
        (g.locations.some((l) => selectedIds.has(l.id)) ? 1000 : 0) +
        Math.max(...g.locations.map((l) => l.priority ?? 0)),
    }));
    const { placed } = placeLabels(items, {
      bounds: { x: 6, y: 6, w: size.x - 12, h: size.y - 12 },
      obstacles: markers,
      measure: (text) => context.measureText(text).width,
      height: coarse.matches ? 44 : 28,
      padding: 9,
      gap: 5,
    });
    for (const candidate of geographicNodes)
      if (placed.some((label) => boxesOverlap(label, candidate.box, 5)))
        candidate.element.style.display = 'none';
    const oldFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.dataset.mapKey
        : undefined;
    content.replaceChildren();
    const at = (el: HTMLElement, x: number, y: number) => {
      const layer = map.containerPointToLayerPoint([x, y]);
      el.style.left = `${layer.x}px`;
      el.style.top = `${layer.y}px`;
    };
    const buttons = new Map();
    for (const group of groups) {
      const members = group.locations.map((l) => stops.find((s) => s.id === l.id)!);
      const reviewCount = members.filter((stop) => stop.reviews.length).length;
      const reviewed = highlight.checked && reviewCount > 0;
      const button = node(
        'button',
        members.length > 1 ? String(members.length) : reviewed ? '★' : '',
      );
      button.type = 'button';
      button.className = 'field-map-pin';
      button.dataset.mapKey = group.id;
      button.dataset.ids = members.map((s) => s.id).join(' ');
      button.dataset.reviewCount = String(reviewCount);
      button.classList.toggle('is-reviewed', reviewed);
      button.classList.toggle(
        'is-selected',
        members.some((s) => selectedIds.has(s.id)),
      );
      button.classList.toggle('is-cluster', members.length > 1);
      const radius = markerRadius(group, markerOptions);
      button.style.width = `${radius * 2}px`;
      button.style.height = `${radius * 2}px`;
      at(button, group.x - radius, group.y - radius);
      button.setAttribute(
        'aria-label',
        members.length === 1
          ? `${members[0].name}, ${members[0].address}`
          : `${members.length} nearby locations: ${members.map((s) => s.name).join(', ')}`,
      );
      if (reviewed)
        button.setAttribute(
          'aria-label',
          `${button.getAttribute('aria-label')}. ${reviewCount} with critical coverage; select for review types and sources.`,
        );
      button.setAttribute('aria-controls', 'map-selection');
      button.setAttribute('aria-expanded', String(members.some((s) => selectedIds.has(s.id))));
      button.title = button.getAttribute('aria-label')!;
      button.addEventListener('click', () => {
        selectedFocus = group.id;
        showSelection(members, true);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') event.stopPropagation();
      });
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.disableScrollPropagation(button);
      content.append(button);
      buttons.set(group.id, button);
    }
    for (const label of placed) {
      const line = node('span');
      line.className = 'map-label-leader';
      const dx = label.edge.x - label.anchor.x,
        dy = label.edge.y - label.anchor.y;
      at(line, label.anchor.x, label.anchor.y);
      line.style.width = `${Math.hypot(dx, dy)}px`;
      line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      content.prepend(line);
      const button = node('button', label.text);
      button.type = 'button';
      button.className = 'field-map-name';
      button.dataset.mapKey = label.id + '-label';
      button.dataset.groupId = label.id;
      button.classList.toggle(
        'is-reviewed',
        buttons.get(label.id).classList.contains('is-reviewed'),
      );
      button.style.width = `${label.w}px`;
      button.style.height = `${label.h}px`;
      at(button, label.x, label.y);
      button.classList.toggle(
        'is-selected',
        label.locations.some((l) => selectedIds.has(l.id)),
      );
      button.setAttribute('aria-label', buttons.get(label.id).getAttribute('aria-label'));
      button.title = buttons.get(label.id).title;
      button.setAttribute('aria-controls', 'map-selection');
      button.setAttribute('aria-expanded', buttons.get(label.id).getAttribute('aria-expanded'));
      button.addEventListener('click', () => buttons.get(label.id).click());
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') event.stopPropagation();
      });
      for (const type of ['pointerenter', 'focus'])
        button.addEventListener(type, () => buttons.get(label.id).classList.add('is-highlighted'));
      for (const type of ['pointerleave', 'blur'])
        button.addEventListener(type, () =>
          buttons.get(label.id).classList.remove('is-highlighted'),
        );
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.disableScrollPropagation(button);
      content.append(button);
    }
    if (oldFocus) {
      const restore = [...content.querySelectorAll<HTMLElement>('[data-map-key]')].find(
        (b) => b.dataset.mapKey === oldFocus,
      );
      restore?.focus({ preventScroll: true });
    }
    const visible = groups.reduce((sum, g) => sum + g.locations.length, 0);
    const reviewCount = filtered.filter((stop) => stop.reviews.length).length;
    status.textContent = filtered.length
      ? `${visible} of ${filtered.length} matching locations in view${highlight.checked ? ` · ${reviewCount} with critical coverage (gold)` : ''} · zoom in for more names`
      : 'No matching locations. Change the style, clear your search, or reset filters.';
    host.dataset.matchingLocations = String(filtered.length);
    host.dataset.reviewedLocations = String(reviewCount);
    host.dataset.visibleLabels = String(placed.length);
    host.dataset.visibleMarkers = String(groups.length);
    host.dataset.zoom = String(map.getZoom());
    document.querySelector<HTMLButtonElement>('#map-zoom-out')!.disabled =
      map.getZoom() <= map.getMinZoom();
    document.querySelector<HTMLButtonElement>('#map-zoom-in')!.disabled =
      map.getZoom() >= map.getMaxZoom();
  }
  function fitCity() {
    map.setMinZoom(-3);
    map.fitBounds(bounds, { padding: [12, 12], animate: false });
    map.setMinZoom(map.getZoom());
    cityView = true;
    requestRender();
  }
  function zoomMembers(members: Stop[]) {
    if (!members.length) return;
    const b = L.latLngBounds(members.map(xy));
    map.fitBounds(b, {
      padding: [65, 65],
      maxZoom: Math.min(3, map.getZoom() + 2),
      animate: false,
    });
    requestRender();
  }
  map.on('moveend zoomend resize', requestRender);
  map.on('dragstart zoomstart', () => {
    cityView = false;
  });
  document.querySelector('#map-zoom-in')!.addEventListener('click', () => map.zoomIn());
  document.querySelector('#map-zoom-out')!.addEventListener('click', () => map.zoomOut());
  document.querySelector('#map-fit')!.addEventListener('click', fitCity);
  zoomSelection.addEventListener('click', () => {
    zoomMembers(selected);
    if (coarse.matches) host.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  close.addEventListener('click', () => {
    const previousKey = selectedFocus;
    selected = [];
    filter(false);
    const previous = [...content.querySelectorAll<HTMLElement>('[data-map-key]')].find(
      (b) => b.dataset.mapKey === previousKey,
    );
    (previous ?? host).focus({ preventScroll: true });
  });
  for (const element of [host, panel])
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && selected.length) {
        event.preventDefault();
        close.click();
      }
    });
  let timer: ReturnType<typeof setTimeout>;
  function filter(refit = true) {
    const query = search.value.trim();
    filtered = filterMapStops(stops, { query, style: currentStyle(), neighborhood });
    clear.hidden = !query;
    selected = [];
    selectedFocus = null;
    if (query || currentStyle() !== 'all' || neighborhood) {
      panelTitle.textContent = filtered.length
        ? `${filtered.length} matching locations`
        : 'No matching stops';
      panelBody.replaceChildren();
      close.hidden = true;
      zoomSelection.hidden = true;
      for (const stop of filtered) {
        const b = node('button');
        b.type = 'button';
        b.className = 'map-search-result';
        b.dataset.locationId = stop.id;
        b.classList.toggle('has-review', stop.reviews.length > 0);
        b.append(node('strong', stop.name), node('span', `${stop.address} · ${stop.neighborhood}`));
        if (stop.reviews.length) b.append(reviewBadge(stop));
        b.addEventListener('click', () => {
          selected = [stop];
          map.setView(xy(stop), Math.max(map.getZoom(), 1.8), { animate: false });
          showSelection([stop], true);
        });
        panelBody.append(b);
      }
      if (!filtered.length)
        panelBody.append(
          node('p', 'Try another style or search term, or reset filters to see every stop.'),
        );
      if (refit && filtered.length)
        map.fitBounds(L.latLngBounds(filtered.map(xy)), {
          padding: [80, 70],
          maxZoom: 2,
          animate: false,
        });
    } else {
      panelTitle.textContent = 'Find your next stop.';
      panelBody.replaceChildren(
        node(
          'p',
          'Select a restaurant name or a marker for its address, suggested order and field notes.',
        ),
      );
      close.hidden = true;
      zoomSelection.hidden = true;
      if (refit) fitCity();
    }
    render();
  }
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(filter, 120);
  });
  document.querySelector('#map-search-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(timer);
    filter();
  });
  clear.addEventListener('click', () => {
    clearTimeout(timer);
    search.value = '';
    filter();
    search.focus();
  });
  for (const input of styleInputs)
    input.addEventListener('change', () => {
      clearTimeout(timer);
      filter();
    });
  highlight.addEventListener('change', render);
  neighborhoodButton.addEventListener('click', () => {
    neighborhood = '';
    clearTimeout(timer);
    filter();
  });
  reset.addEventListener('click', () => {
    clearTimeout(timer);
    search.value = '';
    styleInputs.forEach((input) => (input.checked = input.value === 'all'));
    highlight.checked = false;
    neighborhood = '';
    filter();
    styleInputs[0].focus();
  });
  const observer = new ResizeObserver(() => {
    map.invalidateSize({ pan: false });
    if (cityView) fitCity();
    else {
      map.setMinZoom(-3);
      map.setMinZoom(map.getBoundsZoom(bounds, false, L.point(24, 24)));
    }
    requestRender();
  });
  observer.observe(host);
  coarse.addEventListener('change', requestRender);
  document.querySelector<HTMLElement>('#interactive-map-controls')!.hidden = false;
  panel.hidden = false;
  fitCity();
  filter();
  host.dataset.ready = 'true';
} catch (error) {
  if (map) map.remove();
  host.classList.remove('interactive-field-map');
  host.parentElement!.classList.remove('is-interactive');
  host.replaceChildren(fallback);
  document.querySelector<HTMLElement>('#interactive-map-controls')!.hidden = true;
  panel.hidden = true;
  status.textContent =
    'The interactive map could not load. The static map and stop index still work.';
  console.error(error);
}
