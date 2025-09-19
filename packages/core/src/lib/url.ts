export function appendSearchParams(params: {
  url: string;
  searchParams: URLSearchParams;
}) {
  const parsedUrl = new URL(params.url.replace(/\/$/, ""));

  const combinedSearchParams = new URLSearchParams(parsedUrl.search);

  params.searchParams.forEach((value, key) => {
    combinedSearchParams.set(key, value);
  });

  parsedUrl.search = combinedSearchParams.toString();

  return parsedUrl.toString();
}
