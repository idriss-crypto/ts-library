export const convertPhone = (input: string) => {
  // allow for letters because secret word can follow phone number
  return '+' + input.replace(/[^\dA-Za-z]/, '');
};
