import { addons } from "storybook/manager-api";

import { fermataTheme } from "./fermata-theme";

addons.setConfig({
  theme: fermataTheme,
});
