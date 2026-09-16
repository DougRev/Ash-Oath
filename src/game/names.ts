// Reject explicit abuse, including common spacing and leetspeak evasions.
// Word boundaries avoid blocking innocent substrings such as "Scunthorpe".
const blocked =
  /\b(f+u+c+k+\w*|sh+i+t+\w*|b+i+t+c+h+\w*|c+u+n+t+\w*|asshole\w*|motherf\w*|nigg\w*|fagg\w*|whore\w*|rape|rapist|nazi|hitler)\b/i;
export function acceptableName(value: string) {
  const text = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(
      /[0134578]/g,
      (c) => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b' })[c]!,
    );
  const separated = text.replace(/[^a-z]+/g, ' ');
  const initialsJoined = separated.replace(/\b(?:[a-z] ){2,}[a-z]\b/g, (s) => s.replace(/ /g, ''));
  return !blocked.test(separated) && !blocked.test(initialsJoined);
}
