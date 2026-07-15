import { useEffect } from "react";

function RedirectSignedInUser({ to = "/" }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

export default RedirectSignedInUser;
