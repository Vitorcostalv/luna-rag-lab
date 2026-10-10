export function normalize(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export function searchNormalize(text: string) {
  return normalize(text)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
export function words(text: string) {
  return searchNormalize(text).match(/[a-z0-9_]+/g) || [];
}
const stopWords = new Set(
  "a o as os e de da do das dos em no na nos nas um uma uns umas que qual quais como para por com entre foi teve tem ser se ao mais maior menor periodo agora segunda segundo explique diferenca significa representa exatamente somente considere ontem hoje".split(
    " ",
  ),
);
export function meaningfulWords(text: string) {
  return words(text).filter((w) => w.length > 2 && !stopWords.has(w));
}
export function tokenCount(text: string) {
  return Math.ceil(text.length / 4);
}
