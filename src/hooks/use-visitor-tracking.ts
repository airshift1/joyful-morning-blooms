import { useEffect } from "react";

const generateUserCode = () => {
  const prefix = "JMB";
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
};

export function useVisitorTracking() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      let code = localStorage.getItem("visitor_user_code");
      if (!code) {
        code = generateUserCode();
        localStorage.setItem("visitor_user_code", code);
      }
    } catch (err) {
      // Ignore browser storage issues and keep the page functional.
      console.warn("Visitor tracking storage unavailable:", err);
    }
  }, []);
}
