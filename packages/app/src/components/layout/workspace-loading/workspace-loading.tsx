import * as React from "react";
import { Loader2 } from "lucide-react";

export function WorkspaceLoading() {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`flex h-dvh w-screen flex-col items-center justify-center gap-4 transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}
