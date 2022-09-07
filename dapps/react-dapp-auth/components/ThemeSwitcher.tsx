import { Flex, Switch } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const ThemeSwitcher: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);

  const darkTheme = useMemo(
    () => ({
      "--primary-bg": "#1e1e1e",
      "--secondary-bg": "#272a2a",
      "--qr-bg": "#141414",
      "--text-color": "white",
    }),
    []
  );

  const lightTheme = useMemo(
    () => ({
      "--primary-bg": "#F1F3F3",
      "--secondary-bg": "white",
      "--qr-bg": "#c8d0d0",
      "--text-color": "black",
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
      isChecked={darkMode}
      colorScheme="blackAlpha"
      onChange={({ target }) => {
        setDarkMode(target.checked);
      }}
    />
  );
};

export default ThemeSwitcher;
