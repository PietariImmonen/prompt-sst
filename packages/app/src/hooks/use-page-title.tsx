import * as React from "react";
import { useLocation } from "react-router";

interface UsePageTitleParams {
  title?: string | undefined;
}

export function usePageTitle({ title }: UsePageTitleParams) {
  const location = useLocation();

  React.useEffect(() => {
    if (title) document.title = title;
  }, [title, location]);

  return null;
}
