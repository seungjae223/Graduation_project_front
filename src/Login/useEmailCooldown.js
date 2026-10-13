import { useEffect, useState } from "react";
import { EMAIL_RESEND_SECONDS, getEmailRetrySeconds } from "../utils/emailCooldown";

export default function useEmailCooldown(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const [cooldown, setCooldown] = useState({ email: "", until: 0 });
  const [now, setNow] = useState(Date.now);
  const remaining = cooldown.email === normalizedEmail
    ? Math.max(0, Math.ceil((cooldown.until - Math.max(now, Date.now())) / 1000)) : 0;

  useEffect(() => {
    if (cooldown.email !== normalizedEmail || cooldown.until <= Date.now()) return;
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= cooldown.until) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [cooldown.email, cooldown.until, normalizedEmail]);

  const start = (seconds = EMAIL_RESEND_SECONDS) => {
    if (!normalizedEmail || !Number.isInteger(seconds) || seconds < 1 || seconds > EMAIL_RESEND_SECONDS) return;
    const currentTime = Date.now();
    setNow(currentTime);
    setCooldown({ email: normalizedEmail, until: currentTime + seconds * 1000 });
  };
  const blockFromError = error => start(getEmailRetrySeconds(error));
  return { remaining, start, blockFromError };
}
