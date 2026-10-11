/**
 * Splits a diary text into consecutive page-sized pieces. `fits(candidate, pageIndex)` says whether a piece fits the
 * page it would be on (page 0 is the page with the photos and title, so it has less room). Nothing is cut: the pieces
 * joined back together hold every word of the text, in order.
 *
 * `firstPageHoldsText: false` keeps page 0 free of text (the photos get a page of their own).
 */
export function splitTextIntoPages(text: string, fits: (candidate: string, pageIndex: number) => boolean, firstPageHoldsText = true): string[] {
  const tokens = text.match(/\s+|\S+/g) ?? [];
  const pages: string[] = [];
  let start = 0;
  let pageIndex = 0;

  for (;;) {
    if (pageIndex === 0 && !firstPageHoldsText) {
      pages.push("");
      pageIndex = 1;
      continue;
    }
    while (start < tokens.length && /^\s+$/.test(tokens[start])) start += 1; // a page never starts with a blank
    if (start >= tokens.length) break;

    // largest run of whole tokens that fits (a longer run only ever fits worse)
    let low = 0;
    let high = tokens.length - start;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (fits(tokens.slice(start, start + middle).join(""), pageIndex)) low = middle;
      else high = middle - 1;
    }

    if (low > 0) {
      pages.push(tokens.slice(start, start + low).join("").trimEnd());
      start += low;
    } else {
      // not even one word fits: break the word by characters, and never stall
      const word = tokens[start];
      let chars = 0;
      let highChars = word.length;
      while (chars < highChars) {
        const middle = Math.ceil((chars + highChars) / 2);
        if (fits(word.slice(0, middle), pageIndex)) chars = middle;
        else highChars = middle - 1;
      }
      if (chars === 0 && pageIndex === 0) {
        pages.push(""); // the first page has no room for text at all: carry on from the next page
        pageIndex = 1;
        continue;
      }
      chars = Math.max(1, chars);
      pages.push(word.slice(0, chars));
      if (chars < word.length) tokens[start] = word.slice(chars);
      else start += 1;
    }
    pageIndex += 1;
  }

  return pages.length > 0 ? pages : [""];
}
