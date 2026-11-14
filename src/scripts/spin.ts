type Pick = { name: string; meta: string; order: string; url: string };

const calm = matchMedia('(prefers-reduced-motion: reduce)');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (const root of document.querySelectorAll<HTMLElement>('[data-spin]')) {
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const picks: Pick[] = JSON.parse($('[data-spin-picks]').textContent!);
  const card = $('[data-spin-card]');
  const meta = $('[data-spin-meta]');
  const name = $('[data-spin-name]');
  const order = $('[data-spin-order]');
  const go = $<HTMLAnchorElement>('[data-spin-go]');
  const status = $('[data-spin-status]');
  const buttons = [
    $<HTMLButtonElement>('[data-spin-start]'),
    $<HTMLButtonElement>('[data-spin-again]'),
  ];
  const art = document.querySelector('.burrito-art');
  let last = -1;
  let busy = false;

  const draw = () => {
    let i = Math.floor(Math.random() * picks.length);
    if (i === last) i = (i + 1) % picks.length;
    return (last = i);
  };

  async function spin() {
    if (busy) return;
    busy = true;
    card.hidden = false;
    card.classList.remove('landed');
    status.textContent = '';
    if (!calm.matches) {
      art?.classList.add('is-spinning');
      card.classList.add('spinning');
      meta.textContent = 'Unwrapping…';
      order.textContent = ' ';
      // Fast at first, then slowing down like a wheel.
      for (let t = 0; t < 14; t++) {
        name.textContent = picks[draw()].name;
        await wait(45 + t * t * 1.4);
      }
      art?.classList.remove('is-spinning');
      card.classList.remove('spinning');
    }
    const pick = picks[draw()];
    meta.textContent = pick.meta;
    name.textContent = pick.name;
    order.textContent = pick.order;
    go.href = pick.url;
    card.classList.add('landed');
    status.textContent = `Your pick: ${pick.name}, ${pick.meta}. Suggested order: ${pick.order}.`;
    busy = false;
  }

  buttons.forEach((b) => b.addEventListener('click', spin));
  $('[data-spin-fallback]').hidden = true;
  buttons[0].hidden = false;
}
