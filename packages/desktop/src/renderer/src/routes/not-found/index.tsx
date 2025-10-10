import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-foreground">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">We couldn’t find that workspace</h1>
        <p className="text-sm text-muted-foreground">
          The workspace you’re trying to access isn’t available. Pick another workspace or try
          refreshing your session.
        </p>
        <Button asChild variant="outline">
          <Link to="/sessions">Return to sessions</Link>
        </Button>
      </div>
    </div>
  );
}

export default NotFoundPage;
