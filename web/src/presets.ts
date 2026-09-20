export interface Preset {
  id: string;
  title: string;
  description: string;
  markdown: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'noritz',
    title: 'お湯はり完了メロディー（人形の夢と目覚め）',
    description: 'ノーリツ給湯器「お風呂が沸きました」の公式デモ',
    markdown: `---
Title: "お湯はり完了メロディー（人形の夢と目覚め）"

---

- [クラシック音楽を含む音声で初めて、音商標に登録 「お風呂が沸きました」でおなじみの "お湯はり完了メロディー" | ニュースリリース | ノーリツ](https://www.noritz.co.jp/company/news/2021/20210428-004325.html)

| name | 1             | 2           | 3          | 4           | 5        |
| ---- | ------------- | ----------- | ---------- | ----------- | -------- |
| A    | @11l8o4v120gf | e4g>c<b4g>d | c4e4r4c<b  | a4>fdc4<b4> | c2r2     |
| B    | @11l8o3v100r4 | rgggrggg    | >rcccrccc  | rdddrerf    | rggfe4r4 |
| C    | @11l8o3v100r4 | reeerfff    | rgggrggg   | raaa>rcrd   | reedc4r4 |
| D    | @11l2o3v100r4 | cd          | ee         | fg4g4       | >c4r4r2  |
`,
  },
  {
    id: 'frog',
    title: 'かえるの合唱（輪唱）',
    description: '4小節遅れで追いかける3パート輪唱',
    markdown: `---
Title: "かえるの合唱"
Tempo: 120

---

| name   | 1           | 2        | 3        | 4        | 5                    |
| ------ | ----------- | -------- | -------- | -------- | -------------------- |
| Part 1 | @81l4o4v110 | cdefedcr | efgagfer | crcrcrcr | c8c8d8d8e8e8f8f8edcr |
| Part 2 | @81l4o4v95  | r1       | cdefedcr | efgagfer | crcrcrcr             |
| Part 3 | @81l4o3v90  | r1       | r1       | cdefedcr | efgagfer             |
`,
  },
  {
    id: 'twinkle',
    title: 'きらきら星（2声ハーモニー）',
    description: '主旋律とベースラインの2声アンサンブル',
    markdown: `---
Title: "きらきら星"
Tempo: 108

---

| name   | 1              | 2              | 3                 | 4                 |
| ------ | -------------- | -------------- | ----------------- | ----------------- |
| Melody | @1l4o4v110     | ccgga2         | ffeedd2           | [ggffeed2]2       |
| Bass   | @1l4o3v90      | c>e<g>e<f>c<c2 | d>d<c>c<g>d<g2    | [e>c<d>c<c>c<g2]2 |
`,
  },
  {
    id: 'chiptune',
    title: '8-bit Retro Game Loop',
    description: 'ファミコン風の軽快なコード＆アルペジオ＆ベース',
    markdown: `---
Title: "8-bit Retro Arcade"
Tempo: 144

---

| name   | 1                     | 2                     | 3                     | 4                     |
| ------ | --------------------- | --------------------- | --------------------- | --------------------- |
| Lead   | @81l16o5v110          | [ceg>c<]2 [dfa>d<]2   | [egb>e<]2 [fac>f<]2   | [gb>df<]2 [fac>f<]2   | [egb>e<]2 [ceg>c<]2   |
| Chords | @82l4o4v90            | {ceg}2 {dfa}2         | {egb}2 {fac}2         | {gb>d<}2 {fac}2       | {egb}2 {ceg}2         |
| Bass   | @39l8o3v115           | c.r c.r d.r d.r       | e.r e.r f.r f.r       | g.r g.r f.r f.r       | e.r e.r c4r4          |
`,
  },
];
