export const PSA_GRADE_OPTIONS = Array.from({ length: 10 }, (_, index) => {
  const value = String(index + 1);

  return {
    value,
    label: value,
  };
});
