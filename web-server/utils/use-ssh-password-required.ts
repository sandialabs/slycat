import { useEffect, useState } from "react";
import client from "js/slycat-web-client";

export const useSshPasswordRequired = () => {
  const [passwordRequired, setPasswordRequired] = useState(true);

  useEffect(() => {
    let mounted = true;
    void client.get_password_requirements_fetch().then(({ ssh }: { ssh: boolean }) => {
      if (mounted) {
        setPasswordRequired(ssh);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return passwordRequired;
};
