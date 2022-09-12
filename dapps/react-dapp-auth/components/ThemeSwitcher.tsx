import { Flex, Switch } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moon from "../public/moon.svg";
import sun from "../public/sun.svg";

const ThemeSwitcher: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const switchRef = useRef(null);

  const darkTheme = useMemo(
    () => ({
      "--primary-bg": "#1e1e1e",
      "--secondary-bg": "#272a2a",
      "--qr-bg": "#141414",
      "--text-color": "white",
      "--wc-btn-bg": "#19324d",
      "--wc-btn-brdr": "#0f4b8a",
      "--wc-btn-clr": "#66b1ff",
    }),
    []
  );

  const lightTheme = useMemo(
    () => ({
      "--primary-bg": "#F1F3F3",
      "--secondary-bg": "white",
      "--qr-bg": "#c8d0d0",
      "--text-color": "black",
      "--wc-btn-bg": "#E8F2FC",
      "--wc-btn-brdr": "#CDE5FE",
      "--wc-btn-clr": "#3396FF",
    }),
    []
  );

  const setTheme = useCallback((theme: Record<string, string>) => {
    Object.entries(theme).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, []);

  useEffect(() => {
    if (darkMode) {
      setTheme(darkTheme);
    } else {
      setTheme(lightTheme);
    }
  }, [darkMode, setTheme, darkTheme, lightTheme]);

  return (
    <Switch
      size="lg"
      ref={switchRef}
      isChecked={darkMode}
      colorScheme="blackAlpha"
      className={`theme-switcher theme-switcher-${darkMode ? "dark" : "light"}`}
      onChange={({ target }) => {
        setDarkMode(target.checked);
      }}
    />
  );
};

export default ThemeSwitcher;
