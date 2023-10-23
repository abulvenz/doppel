import m from "mithril";
import tagl from "tagl-mithril";
import alphas from "./alphas";

const { keys } = Object;
const { sqrt, trunc, random, max, min } = Math;
const { h1, h2, input, button, div, table, tr, td, a, small } = tagl(m);

const use = (v, f) => f(v);

const range = (N) => {
  const r = [];
  for (let i = 0; i < N; i++) {
    r.push(i);
  }
  return r;
};

const randomElement = (arr) => arr[trunc(random() * arr.length)]
const without = (arr, el) => arr.filter(e => e !== el)

const shuffle = (arr, result = []) =>
  arr.length === 0 ? result :
    use(randomElement(arr), next =>
      shuffle(without(arr, next), [...result, next]));

const last = arr => arr[arr.length - 1];

const offset = 0;

let selectedAlphabet = undefined;

let alphabet = [
  ...(alphas[1].symbols),
  ...  'GEWONNEN'.split(''),
];

const winCard = range(8).map(e => e + alphabet.indexOf('G') - offset);

const histogram = (arr = []) => arr.reduce((hist, v) => {
  hist[v] = (hist[v] || 0) + 1;
  return hist;
}, {});

const values = a => keys(a).map(k => a[k]);

const isDoppel = (a1, a2) => use(
  histogram(values(histogram([...a1, ...a2]))), hist =>
  (hist[1] + hist[2] + 1 === a1.length + a2.length) && (hist[2] === 1)
);

const createCards = (N) => {
  let n = N - 1;
  const cards = [range(n + 1)];
  let mat = range(n).map(r => range(n).map(c => r * n + c + n + 1))
  const at = (mat, r, c) => use(mat[r % mat.length], row => row[c % row.length]);
  /**
   * ABC diag AEI diag AFH
   * DEF  =>  BFG  =>  EGC
   * GHI      CDH      IBD
   */
  const diag = mat => mat[0].map((v, i) => range(mat.length).map(r => at(mat, r, i + r)))
  //  mat.forEach(row => console.log(row.join(",")))
  range(n + 1).forEach(master => {
    mat.forEach(row => {
      const next = [master, ...row];
      if (cards.length === 0 || cards.every(card => isDoppel(next, card)))
        cards.push(shuffle(next))
      else
        console.log("Discarding ", next)
    });
    mat = diag(mat);
  });
  console.log("Erzeugte Karten: " + cards.length + " " + (cards.map(card => max(...card)).reduce((a, b) => max(a, b), 0) + 1) + " Symbole");
  return cards;
};


const cards = shuffle(createCards(8));

const distribute = (players, cards) => {
  let mCards = shuffle(cards.slice(0, cards.length))
  players.forEach(p => p.cards = []);

  while (mCards.length > players.length) {
    players.forEach(player => {
      const next = randomElement(mCards)
      mCards = without(mCards, next);
      player.cards.push(next)
    })
  }
  return mCards;
};


const players = [
  {
    name: 'Spieler 1',
    keys: '12345678',
    malus: 0,
    cls: 'red'
  },
  {
    name: 'Spieler 2',
    keys: 'qwertzui',
    malus: 0,
    cls: 'green'
  },
  {
    name: 'Spieler 3',
    keys: 'asdfghjk',
    malus: 0,
    cls: 'blue'
  },
  {
    name: 'Spieler 4',
    keys: 'yxcvbnm,',
    malus: 0,
    cls: 'yellow'
  }
];

let deck = [];

const handleClick = (key) => {
  if (deck.length === 0)
    return;
  const player = players.find(p => p.keys.indexOf(key) >= 0);
  if (player) {
    if (player.cards.length === 0) { console.log('Already won'); return; }
    const selectedSymbol = last(player.cards)[player.keys.indexOf(key)];

    if (last(deck).indexOf(selectedSymbol) >= 0) {
      deck.push(player.cards.splice(player.cards.length - 1, 1)[0])
    } else {
      player.malus = player.malus + 1;
    }
    console.log("Wrong symbol");
    while (deck.length > 1 && player.malus > 0) {
      player.cards = [...deck.splice(0, 1), ...player.cards]
      player.malus = player.malus - 1;
    }
  } else {
    console.log("No player", key);
  }
};

window.addEventListener("keypress", key => {
  handleClick(key.key);
  m.redraw();
})

const cardC = (vnode) => ({
  view: ({ attrs: { card, keys = "        " } }) => {
    const k = keys.split('');
    return div.container(
      card.map((item, idx) => [
        a.item({ onclick: e => handleClick(k[idx]) }, alphabet[item + offset]),
        small(k[idx]),
      ])
    );
  }
});

const plural = (n, s, p, z = p) => n
  + ' ' + (n === 0 ? z : (n === 1 ? s : p));

m.mount(document.getElementById("app"), {
  view: (vnode) => div.pageContainer([
    h1("DOPPELGÄNGER"),
    deck.length > 0 ?
      [
        div("Stapel: ", plural(deck.length, "Karte", "Karten"),
          m(cardC, { card: last(deck) }),
        ),
        div(
          players.map(player =>
            div.player[player.cls](div.playerText(player.name, ': ', plural(player.cards.length, "Karte", "Karten") + ', ', player.malus, ' Malus'), m(cardC, { card: last(player.cards) || winCard, keys: player.keys }),)
          )
        )
      ] :
      [
        h2("Spieler"),
        table(
          players.map(player => tr(
            td(button({ onclick: e => players.splice(players.indexOf(player), 1) }, '×')),
            td(input({ onchange: e => player.name = e.target.value, type: 'text', value: player.name })),
            td(input({ onchange: e => player.keys = e.target.value, type: 'text', value: player.keys }))
          ))
        ),
        h2("Karten ", alphabet.filter((a, i) => i < 5).join(" ")),
        table(tr(alphas.map((alpha, idx) => button({ onclick: e => alphabet = [...alphas[idx].symbols, ...'GEWONNEN'.split('')] }, alpha.symbols)))),
        h2("Anfangen!"),
        button({ onclick: e => deck = distribute(players, cards) }, "Spiel starten")
      ]
  ])
});
